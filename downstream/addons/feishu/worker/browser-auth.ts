import type { BrowserTrustStore } from "./browser-store"
import { type BrowserSession } from "./browser-store"
import { derivePrincipalKey } from "./principal"

const TOKEN_URL = "https://accounts.feishu.cn/oauth/v3/token"
const AUTHORIZE_URL = "https://accounts.feishu.cn/open-apis/authen/v1/authorize"
const USER_INFO_URL = "https://open.feishu.cn/open-apis/authen/v1/user_info"
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const STATE_TTL_MS = 10 * 60 * 1000

export interface BrowserAuthEnvironment {
  FEISHU_APP_ID: string
  FEISHU_APP_SECRET: string
  FEISHU_OAUTH_REDIRECT_URI: string
  FEISHU_ALLOWED_ORIGINS: string
  FEISHU_PRINCIPAL_KEY: string
  FEISHU_SESSION_COOKIE_NAME?: string
}
export class BrowserAuthError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code)
  }
}
function random() {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "")
}
function validConfig(env: BrowserAuthEnvironment) {
  if (
    ![env.FEISHU_APP_ID, env.FEISHU_APP_SECRET, env.FEISHU_OAUTH_REDIRECT_URI, env.FEISHU_PRINCIPAL_KEY].every(Boolean)
  )
    throw new BrowserAuthError("UNAVAILABLE", 503)
  try {
    new URL(env.FEISHU_OAUTH_REDIRECT_URI)
  } catch {
    throw new BrowserAuthError("UNAVAILABLE", 503)
  }
}
export function sessionCookieName(env: BrowserAuthEnvironment) {
  return env.FEISHU_SESSION_COOKIE_NAME || "feishu_addon_session"
}
export function sessionCookie(env: BrowserAuthEnvironment, id: string, expiresAt: string) {
  return `${sessionCookieName(env)}=${id}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${new Date(expiresAt).toUTCString()}`
}
function clearCookie(env: BrowserAuthEnvironment) {
  return `${sessionCookieName(env)}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}
function cookie(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}
function same(a: string, b: string) {
  const x = new TextEncoder().encode(a),
    y = new TextEncoder().encode(b)
  if (x.length !== y.length) return false
  let d = 0
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]
  return d === 0
}
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

export async function requireBrowserSession(
  request: Request,
  env: BrowserAuthEnvironment,
  store: BrowserTrustStore,
): Promise<BrowserSession> {
  validConfig(env)
  const id = cookie(request, sessionCookieName(env))
  if (!id) throw new BrowserAuthError("UNAUTHENTICATED", 401)
  const session = await store.getSession(id, new Date().toISOString())
  if (!session) throw new BrowserAuthError("UNAUTHENTICATED", 401)
  return session
}
export async function authorizeBrowserMutation(
  request: Request,
  env: BrowserAuthEnvironment,
  store: BrowserTrustStore,
  entryScopeId: string,
) {
  const session = await requireBrowserSession(request, env, store)
  requireBrowserRequestProtection(request, env, session)
  if (!(await store.scopes(session.principalKey)).includes(entryScopeId)) throw new BrowserAuthError("FORBIDDEN", 403)
  return session
}
export function requireBrowserRequestProtection(
  request: Request,
  env: BrowserAuthEnvironment,
  session: BrowserSession,
) {
  const origins = env.FEISHU_ALLOWED_ORIGINS.split(",")
    .map((v) => v.trim())
    .filter(Boolean)
  if (!origins.includes(request.headers.get("origin") || "")) throw new BrowserAuthError("INVALID_ORIGIN", 403)
  if (!same(request.headers.get("x-csrf-token") || "", session.csrfToken))
    throw new BrowserAuthError("INVALID_CSRF", 403)
}

export function createBrowserAuthHandler(env: BrowserAuthEnvironment, store: BrowserTrustStore) {
  return {
    async fetch(request: Request): Promise<Response | null> {
      const url = new URL(request.url)
      try {
        if (url.pathname === "/api/auth/login" && request.method === "GET") {
          validConfig(env)
          const state = random()
          await store.saveOAuthState(state, new Date(Date.now() + STATE_TTL_MS).toISOString())
          const target = new URL(AUTHORIZE_URL)
          target.search = new URLSearchParams({
            client_id: env.FEISHU_APP_ID,
            response_type: "code",
            redirect_uri: env.FEISHU_OAUTH_REDIRECT_URI,
            state,
          }).toString()
          return Response.redirect(target, 302)
        }
        if (url.pathname === "/api/auth/callback" && request.method === "GET") {
          validConfig(env)
          const state = url.searchParams.get("state")
          const code = url.searchParams.get("code")
          if (!state || !code || !(await store.consumeOAuthState(state, new Date().toISOString())))
            throw new BrowserAuthError("OAUTH_DENIED", 401)
          const tokenResponse = await fetch(TOKEN_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              grant_type: "authorization_code",
              client_id: env.FEISHU_APP_ID,
              client_secret: env.FEISHU_APP_SECRET,
              code,
              redirect_uri: env.FEISHU_OAUTH_REDIRECT_URI,
            }),
          })
          const token = record(await tokenResponse.json())
          if (!tokenResponse.ok || typeof token?.access_token !== "string")
            throw new BrowserAuthError("OAUTH_FAILED", 401)
          const identityResponse = await fetch(USER_INFO_URL, {
            headers: { authorization: `Bearer ${token.access_token}` },
          })
          const identity = record(await identityResponse.json())
          const nested = record(identity?.data)
          const raw = nested || identity
          if (!identityResponse.ok || typeof raw?.open_id !== "string" || typeof raw.tenant_key !== "string")
            throw new BrowserAuthError("OAUTH_FAILED", 401)
          const now = new Date()
          const session = {
            id: random(),
            principalKey: await derivePrincipalKey(
              env.FEISHU_PRINCIPAL_KEY,
              env.FEISHU_APP_ID,
              raw.tenant_key,
              raw.open_id,
            ),
            csrfToken: random(),
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
          }
          await store.createSession(session)
          return new Response(null, {
            status: 302,
            headers: { Location: "/", "Set-Cookie": sessionCookie(env, session.id, session.expiresAt) },
          })
        }
        if (url.pathname === "/api/auth/session" && request.method === "GET") {
          const session = await requireBrowserSession(request, env, store)
          return Response.json({ csrfToken: session.csrfToken, expiresAt: session.expiresAt })
        }
        if (url.pathname === "/api/auth/logout" && request.method === "POST") {
          const session = await requireBrowserSession(request, env, store)
          requireBrowserRequestProtection(request, env, session)
          await store.deleteSession(session.id)
          return new Response(null, { status: 204, headers: { "Set-Cookie": clearCookie(env) } })
        }
        return null
      } catch (error) {
        const safe = error instanceof BrowserAuthError ? error : new BrowserAuthError("UNAVAILABLE", 503)
        return Response.json({ code: safe.code }, { status: safe.status })
      }
    },
  }
}
