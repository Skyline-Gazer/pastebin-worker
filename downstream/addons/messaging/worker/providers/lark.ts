import type { ProviderCredentialEnvironment } from "./types"
import {
  buildAuthorizeUrl,
  exchangeOpenPlatformCode,
  oauthFromFields,
  resolveOpenPlatformIdentity,
  text,
  webhookFromFields,
} from "./open-platform"
import type { ProviderAdapter } from "./types"

const endpoints = {
  authorizeUrl: "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
  tokenUrl: "https://open.larksuite.com/open-apis/authen/v2/oauth/token",
  userInfoUrl: "https://open.larksuite.com/open-apis/authen/v1/user_info",
  openApiOrigin: "https://open.larksuite.com",
} as const

export const larkAdapter: ProviderAdapter = {
  id: "lark",
  brand: "Lark",
  webhookPath: "/api/lark/events",
  webhookReadiness(env: ProviderCredentialEnvironment) {
    return webhookFromFields("lark", "Lark", {
      encryptKey: text(env.LARK_ENCRYPT_KEY),
      verificationToken: text(env.LARK_VERIFICATION_TOKEN),
      appId: text(env.LARK_APP_ID),
      allowedTenantKeys: text(env.LARK_ALLOWED_TENANT_KEYS),
    })
  },
  oauthReadiness(env: ProviderCredentialEnvironment) {
    return oauthFromFields("lark", "Lark", endpoints, {
      appId: text(env.LARK_APP_ID),
      appSecret: text(env.LARK_APP_SECRET),
      oauthRedirectUri: text(env.LARK_OAUTH_REDIRECT_URI),
      allowedOrigins: text(env.LARK_ALLOWED_ORIGINS),
    })
  },
  buildAuthorizeUrl,
  exchangeAuthorizationCode: exchangeOpenPlatformCode,
  resolveUserIdentity: resolveOpenPlatformIdentity,
}

export function larkEndpoints() {
  return { provider: "lark" as const, brand: "Lark" as const, ...endpoints }
}
