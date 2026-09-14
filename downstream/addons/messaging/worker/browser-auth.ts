import type { BrowserTrustStore } from "./browser-store"
import { type BrowserSession } from "./browser-store"
import {
  InvalidBrowserAuthProvidersError,
  InvalidPlatformError,
  enabledBrowserAuthProviders,
  oauthConfig,
  parseBrowserAuthProviders,
  providerRegistry,
  resolvePlatform,
  type Platform,
  type ProviderCredentialEnvironment,
} from "./platform"
import { derivePrincipalKey } from "./principal"
import type { ProviderOAuthConfig } from "./providers/types"

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
function configError(error: unknown): boolean {
  return error instanceof InvalidPlatformError || error instanceof InvalidBrowserAuthProvidersError
}

function requireOAuth(env: BrowserAuthEnvironment, provider: Platform): ProviderOAuthConfig {
  if (!env.FEISHU_PRINCIPAL_KEY) throw new BrowserAuthError("UNAVAILABLE", 503)
  try {
    parseBrowserAuthProviders(env.BROWSER_AUTH_PROVIDERS)
  } catch (error) {
    if (configError(error)) throw new BrowserAuthError("UNAVAILABLE", 503)
    throw error
  }
  const config = oauthConfig(env, provider)
  if (!config) throw new BrowserAuthError("UNAVAILABLE", 503)
  return config
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

function sessionProvider(session: BrowserSession): Platform {
  return session.provider === "lark" ? "lark" : "feishu"
}

function rejectProviderMismatch(session: BrowserSession) {
  const provider = sessionProvider(session)
  if (provider === "lark" && session.principalKey.startsWith("feishu:v1:"))
    throw new BrowserAuthError("UNAUTHENTICATED", 401)
  if (provider === "feishu" && session.principalKey.startsWith("lark:v1:"))
    throw new BrowserAuthError("UNAUTHENTICATED", 401)
}

function loginProvider(env: BrowserAuthEnvironment, requested: Platform | undefined): ProviderOAuthConfig {
  try {
    const chosen = requested ?? resolvePlatform(env.PLATFORM).provider
    return requireOAuth(env, chosen)
  } catch (error) {
    if (error instanceof BrowserAuthError) throw error
    if (configError(error)) throw new BrowserAuthError("UNAVAILABLE", 503)
    throw error
  }
}

export async function requireBrowserSession(
  request: Request,
  env: BrowserAuthEnvironment,
  store: BrowserTrustStore,
): Promise<BrowserSession> {
  if (!env.FEISHU_PRINCIPAL_KEY) throw new BrowserAuthError("UNAVAILABLE", 503)
  try {
    parseBrowserAuthProviders(env.BROWSER_AUTH_PROVIDERS)
  } catch (error) {
    if (configError(error)) throw new BrowserAuthError("UNAVAILABLE", 503)
    throw error
  }
  const id = cookie(request, sessionCookieName(env))
  if (!id) throw new BrowserAuthError("UNAUTHENTICATED", 401)
  const session = await store.getSession(id, new Date().toISOString())
  if (!session) throw new BrowserAuthError("UNAUTHENTICATED", 401)
  rejectProviderMismatch(session)
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
  const origins = requireOAuth(env, sessionProvider(session))
    .allowedOrigins.split(",")
    .map((v) => v.trim())
    .filter(Boolean)
  if (!origins.includes(request.headers.get("origin") || "")) throw new BrowserAuthError("INVALID_ORIGIN", 403)
  if (!same(request.headers.get("x-csrf-token") || "", session.csrfToken))
    throw new BrowserAuthError("INVALID_CSRF", 403)
}

function unauthenticatedBrand(env: BrowserAuthEnvironment): string | undefined {
  try {
    return requireOAuth(env, resolvePlatform(env.PLATFORM).provider).brand
  } catch {
    const ready = enabledBrowserAuthProviders(env)
    const first = ready[0]
    return first ? providerRegistry.adapter(first)?.brand : undefined
  }
}

export function createBrowserAuthHandler(env: BrowserAuthEnvironment, store: BrowserTrustStore) {
  return {
    async fetch(request: Request): Promise<Response | null> {
      const url = new URL(request.url)
      try {
        const loginMatch = /^\/api\/auth\/login(?:\/(feishu|lark))?$/.exec(url.pathname)
        if (loginMatch && request.method === "GET") {
          const config = loginProvider(env, loginMatch[1] as Platform | undefined)
          const adapter = providerRegistry.require(config.provider)
          if (!adapter) throw new BrowserAuthError("UNAVAILABLE", 503)
          const state = random()
          await store.saveOAuthState(state, new Date(Date.now() + STATE_TTL_MS).toISOString(), config.provider)
          return Response.redirect(adapter.buildAuthorizeUrl(config, state), 302)
        }
        if (url.pathname === "/api/auth/callback" && request.method === "GET") {
          const state = url.searchParams.get("state")
          const code = url.searchParams.get("code")
          const consumed = state ? await store.consumeOAuthState(state, new Date().toISOString()) : null
          if (!state || !code || !consumed) throw new BrowserAuthError("OAUTH_DENIED", 401)
          const adapter = providerRegistry.require(consumed.provider)
          if (!adapter) throw new BrowserAuthError("UNAVAILABLE", 503)
          const config = requireOAuth(env, adapter.id)
          let bearer: string
          let identity: { openId: string; tenantKey: string }
          try {
            bearer = await adapter.exchangeAuthorizationCode(config, code)
            identity = await adapter.resolveUserIdentity(config, bearer)
          } catch {
            throw new BrowserAuthError("OAUTH_FAILED", 401)
          }
          const now = new Date()
          const session = {
            id: random(),
            principalKey: await derivePrincipalKey(
              env.FEISHU_PRINCIPAL_KEY,
              config.appId,
              identity.tenantKey,
              identity.openId,
              config.provider,
            ),
            csrfToken: random(),
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
            provider: config.provider,
          }
          await store.createSession(session)
          return new Response(null, {
            status: 302,
            headers: { Location: "/", "Set-Cookie": sessionCookie(env, session.id, session.expiresAt) },
          })
        }
        if (url.pathname === "/api/auth/session" && request.method === "GET") {
          const session = await requireBrowserSession(request, env, store)
          const brand = sessionProvider(session) === "lark" ? "Lark" : "Feishu"
          return Response.json({
            csrfToken: session.csrfToken,
            expiresAt: session.expiresAt,
            brand,
            providers: enabledBrowserAuthProviders(env),
          })
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
        if (safe.code === "UNAUTHENTICATED") {
          const brand = unauthenticatedBrand(env)
          let providers: Platform[] | undefined
          try {
            providers = enabledBrowserAuthProviders(env)
          } catch {
            providers = undefined
          }
          return Response.json(
            brand
              ? { code: safe.code, brand, ...(providers ? { providers } : {}) }
              : { code: safe.code, ...(providers ? { providers } : {}) },
            { status: safe.status },
          )
        }
        return Response.json({ code: safe.code }, { status: safe.status })
      }
    },
  }
}
