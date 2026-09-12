import type { BrowserTrustStore } from "./browser-store"
import { type BrowserSession } from "./browser-store"
import {
  InvalidPlatformError,
  MissingProviderConfigError,
  resolveProviderConfig,
  type ProviderConfig,
  type ProviderCredentialEnvironment,
} from "./platform"
import { derivePrincipalKey } from "./principal"

const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const STATE_TTL_MS = 10 * 60 * 1000

export interface BrowserAuthEnvironment extends ProviderCredentialEnvironment {
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
function requireProvider(env: BrowserAuthEnvironment): ProviderConfig {
  if (!env.FEISHU_PRINCIPAL_KEY) throw new BrowserAuthError("UNAVAILABLE", 503)
  try {
    return resolveProviderConfig(env)
  } catch (error) {
    if (error instanceof InvalidPlatformError || error instanceof MissingProviderConfigError)
      throw new BrowserAuthError("UNAVAILABLE", 503)
    throw error
  }
}

function accessToken(value: Record<string, unknown> | null): string | null {
  if (typeof value?.access_token === "string") return value.access_token
  const nested = record(value?.data)
  return typeof nested?.access_token === "string" ? nested.access_token : null
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
  requireProvider(env)
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
  const origins = requireProvider(env)
    .allowedOrigins.split(",")
    .map((v) => v.trim())
    .filter(Boolean)
  if (!origins.includes(request.headers.get("origin") || "")) throw new BrowserAuthError("INVALID_ORIGIN", 403)
  if (!same(request.headers.get("x-csrf-token") || "", session.csrfToken))
    throw new BrowserAuthError("INVALID_CSRF", 403)
}

export function createBrowserAuthHandler(env: BrowserAuthEnvironment, store: BrowserTrustStore) {
  const provider = (() => {
    try {
      return requireProvider(env)
    } catch {
      return null
    }
  })()
  function resolved() {
    if (!provider) throw new BrowserAuthError("UNAVAILABLE", 503)
    return provider
  }
  return {
    async fetch(request: Request): Promise<Response | null> {
      const url = new URL(request.url)
      try {
        if (url.pathname === "/api/auth/login" && request.method === "GET") {
          const config = resolved()
          const state = random()
          await store.saveOAuthState(state, new Date(Date.now() + STATE_TTL_MS).toISOString())
          const target = new URL(config.authorizeUrl)
          target.search = new URLSearchParams({
            client_id: config.appId,
            response_type: "code",
            redirect_uri: config.oauthRedirectUri,
            state,
          }).toString()
          return Response.redirect(target, 302)
        }
        if (url.pathname === "/api/auth/callback" && request.method === "GET") {
          const config = resolved()
          const state = url.searchParams.get("state")
          const code = url.searchParams.get("code")
          if (!state || !code || !(await store.consumeOAuthState(state, new Date().toISOString())))
            throw new BrowserAuthError("OAUTH_DENIED", 401)
          const tokenResponse = await fetch(config.tokenUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              grant_type: "authorization_code",
              client_id: config.appId,
              client_secret: config.appSecret,
              code,
              redirect_uri: config.oauthRedirectUri,
            }),
          })
          const token = record(await tokenResponse.json())
          const bearer = accessToken(token)
          if (!tokenResponse.ok || !bearer) throw new BrowserAuthError("OAUTH_FAILED", 401)
          const identityResponse = await fetch(config.userInfoUrl, {
            headers: { authorization: `Bearer ${bearer}` },
          })
          const identity = record(await identityResponse.json())
          const nested = record(identity?.data)
          const raw = nested || identity
          if (!identityResponse.ok || typeof raw?.open_id !== "string" || typeof raw.tenant_key !== "string")
            throw new BrowserAuthError("OAUTH_FAILED", 401)
          const now = new Date()
          const session = {
            id: random(),
            principalKey: await derivePrincipalKey(env.FEISHU_PRINCIPAL_KEY, config.appId, raw.tenant_key, raw.open_id),
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
          const config = resolved()
          const session = await requireBrowserSession(request, env, store)
          return Response.json({ csrfToken: session.csrfToken, expiresAt: session.expiresAt, brand: config.brand })
        }
        if (url.pathname === "/api/auth/logout" && request.method === "POST") {
          resolved()
          const session = await requireBrowserSession(request, env, store)
          requireBrowserRequestProtection(request, env, session)
          await store.deleteSession(session.id)
          return new Response(null, { status: 204, headers: { "Set-Cookie": clearCookie(env) } })
        }
        return null
      } catch (error) {
        const safe = error instanceof BrowserAuthError ? error : new BrowserAuthError("UNAVAILABLE", 503)
        if (safe.code === "UNAUTHENTICATED" && provider)
          return Response.json({ code: safe.code, brand: provider.brand }, { status: safe.status })
        return Response.json({ code: safe.code }, { status: safe.status })
      }
    },
  }
}
