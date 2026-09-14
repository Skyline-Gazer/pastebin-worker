import type { ProviderId, ProviderOAuthConfig, WebhookReadiness, OAuthReadiness } from "./types"

export function text(value: string | undefined): string {
  return typeof value === "string" ? value : ""
}

export function boundedIdentity(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Array.from(value).length >= 1 &&
    Array.from(value).length <= 256 &&
    Array.from(value).every((character) => {
      const point = character.codePointAt(0)!
      return point > 31 && (point < 127 || point > 159)
    })
  )
}

export function parseTenantKeys(value: string): string[] | null {
  const tenants = value.split(",")
  if (!tenants.length || tenants.some((tenant) => !boundedIdentity(tenant)) || new Set(tenants).size !== tenants.length)
    return null
  return tenants
}

export function webhookFromFields(
  provider: ProviderId,
  brand: string,
  fields: { encryptKey: string; verificationToken: string; appId: string; allowedTenantKeys: string },
): WebhookReadiness {
  const tenants = parseTenantKeys(fields.allowedTenantKeys)
  if (
    !boundedIdentity(fields.encryptKey) ||
    !boundedIdentity(fields.verificationToken) ||
    !boundedIdentity(fields.appId) ||
    !tenants
  )
    return { ready: false }
  return {
    ready: true,
    config: {
      provider,
      brand,
      encryptKey: fields.encryptKey,
      verificationToken: fields.verificationToken,
      appId: fields.appId,
      allowedTenantKeys: fields.allowedTenantKeys,
    },
  }
}

export function oauthFromFields(
  provider: ProviderId,
  brand: string,
  endpoints: { authorizeUrl: string; tokenUrl: string; userInfoUrl: string },
  fields: { appId: string; appSecret: string; oauthRedirectUri: string; allowedOrigins: string },
): OAuthReadiness {
  if (![fields.appId, fields.appSecret, fields.oauthRedirectUri, fields.allowedOrigins].every(Boolean))
    return { ready: false }
  try {
    new URL(fields.oauthRedirectUri)
  } catch {
    return { ready: false }
  }
  return {
    ready: true,
    config: {
      provider,
      brand,
      ...fields,
      ...endpoints,
    },
  }
}

export function buildAuthorizeUrl(config: ProviderOAuthConfig, state: string): string {
  const target = new URL(config.authorizeUrl)
  target.search = new URLSearchParams({
    client_id: config.appId,
    response_type: "code",
    redirect_uri: config.oauthRedirectUri,
    state,
  }).toString()
  return target.toString()
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function accessToken(value: Record<string, unknown> | null): string | null {
  if (typeof value?.access_token === "string") return value.access_token
  const nested = record(value?.data)
  return typeof nested?.access_token === "string" ? nested.access_token : null
}

/** Shared Feishu/Lark Open Platform OAuth JSON. Slack/WeCom/DingTalk must not reuse this. */
export async function exchangeOpenPlatformCode(config: ProviderOAuthConfig, code: string): Promise<string> {
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
  if (!tokenResponse.ok || !bearer) throw new Error("OAUTH_FAILED")
  return bearer
}

export async function resolveOpenPlatformIdentity(
  config: ProviderOAuthConfig,
  access: string,
): Promise<{ openId: string; tenantKey: string }> {
  const identityResponse = await fetch(config.userInfoUrl, {
    headers: { authorization: `Bearer ${access}` },
  })
  const identity = record(await identityResponse.json())
  const nested = record(identity?.data)
  const raw = nested || identity
  if (!identityResponse.ok || typeof raw?.open_id !== "string" || typeof raw.tenant_key !== "string")
    throw new Error("OAUTH_FAILED")
  return { openId: raw.open_id, tenantKey: raw.tenant_key }
}
