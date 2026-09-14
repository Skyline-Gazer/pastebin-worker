import { feishuAdapter, feishuEndpoints } from "./providers/feishu"
import { larkAdapter, larkEndpoints } from "./providers/lark"
import { providerRegistry } from "./providers/registry"
import type { ProviderCredentialEnvironment, ProviderId, ProviderOAuthConfig } from "./providers/types"

export type Platform = ProviderId
export type { ProviderCredentialEnvironment, ProviderId }

export interface PlatformEndpoints {
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl: string
  openApiOrigin: string
  brand: "Feishu" | "Lark"
}

export interface ProviderConfig extends PlatformEndpoints {
  provider: Platform
  appId: string
  appSecret: string
  encryptKey: string
  verificationToken: string
  allowedTenantKeys: string
  oauthRedirectUri: string
  allowedOrigins: string
}

export class InvalidPlatformError extends Error {
  constructor() {
    super("INVALID_PLATFORM")
  }
}

export class MissingProviderConfigError extends Error {
  constructor() {
    super("MISSING_PROVIDER_CONFIG")
  }
}

export class InvalidBrowserAuthProvidersError extends Error {
  constructor() {
    super("INVALID_BROWSER_AUTH_PROVIDERS")
  }
}

/** Exact tokens only; unknown values fail closed. Unset/empty means no allowlist (not PLATFORM-only mode). */
export function parseBrowserAuthProviders(value: unknown): Platform[] | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") throw new InvalidBrowserAuthProvidersError()
  const tokens = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  if (tokens.length === 0) return undefined
  const providers: Platform[] = []
  for (const token of tokens) {
    if (!providerRegistry.require(token)) throw new InvalidBrowserAuthProvidersError()
    if (!providers.includes(token as Platform)) providers.push(token as Platform)
  }
  return providers
}

function allowlisted(env: ProviderCredentialEnvironment, id: Platform): boolean {
  const allow = parseBrowserAuthProviders(env.BROWSER_AUTH_PROVIDERS)
  return !allow || allow.includes(id)
}

/** OAuth-ready providers, optionally filtered by BROWSER_AUTH_PROVIDERS kill-switch. */
export function enabledBrowserAuthProviders(env: ProviderCredentialEnvironment): Platform[] {
  parseBrowserAuthProviders(env.BROWSER_AUTH_PROVIDERS)
  return providerRegistry.adapters
    .filter((adapter) => adapter.oauthReadiness(env).ready && allowlisted(env, adapter.id))
    .map((adapter) => adapter.id)
}

/** Legacy alias input only. Not provider enablement. */
export function resolvePlatform(value: unknown): PlatformEndpoints & { provider: Platform } {
  if (value === "feishu") return feishuEndpoints()
  if (value === "lark") return larkEndpoints()
  throw new InvalidPlatformError()
}

/** Full webhook+OAuth snapshot for a named provider. No cross-provider fallback. */
export function resolveProviderConfig(env: ProviderCredentialEnvironment, provider?: Platform): ProviderConfig {
  const id = provider ?? resolvePlatform(env.PLATFORM).provider
  const adapter = providerRegistry.require(id)
  if (!adapter) throw new InvalidPlatformError()
  const webhook = adapter.webhookReadiness(env)
  const oauth = adapter.oauthReadiness(env)
  if (!webhook.ready || !oauth.ready) throw new MissingProviderConfigError()
  const extra = id === "lark" ? larkEndpoints() : feishuEndpoints()
  return {
    provider: id,
    brand: extra.brand,
    openApiOrigin: extra.openApiOrigin,
    appId: oauth.config.appId,
    appSecret: oauth.config.appSecret,
    encryptKey: webhook.config.encryptKey,
    verificationToken: webhook.config.verificationToken,
    allowedTenantKeys: webhook.config.allowedTenantKeys,
    oauthRedirectUri: oauth.config.oauthRedirectUri,
    allowedOrigins: oauth.config.allowedOrigins,
    authorizeUrl: oauth.config.authorizeUrl,
    tokenUrl: oauth.config.tokenUrl,
    userInfoUrl: oauth.config.userInfoUrl,
  }
}

export function oauthConfig(env: ProviderCredentialEnvironment, id: Platform): ProviderOAuthConfig | undefined {
  if (!allowlisted(env, id)) return undefined
  const adapter = providerRegistry.require(id)
  const readiness = adapter?.oauthReadiness(env)
  return readiness?.ready ? readiness.config : undefined
}

export { feishuAdapter, larkAdapter, providerRegistry }
