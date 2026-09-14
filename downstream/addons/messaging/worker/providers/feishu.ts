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
  authorizeUrl: "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
  tokenUrl: "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
  userInfoUrl: "https://open.feishu.cn/open-apis/authen/v1/user_info",
  openApiOrigin: "https://open.feishu.cn",
} as const

export const feishuAdapter: ProviderAdapter = {
  id: "feishu",
  brand: "Feishu",
  webhookPath: "/api/feishu/events",
  webhookReadiness(env: ProviderCredentialEnvironment) {
    return webhookFromFields("feishu", "Feishu", {
      encryptKey: text(env.FEISHU_ENCRYPT_KEY),
      verificationToken: text(env.FEISHU_VERIFICATION_TOKEN),
      appId: text(env.FEISHU_APP_ID),
      allowedTenantKeys: text(env.FEISHU_ALLOWED_TENANT_KEYS),
    })
  },
  oauthReadiness(env: ProviderCredentialEnvironment) {
    return oauthFromFields("feishu", "Feishu", endpoints, {
      appId: text(env.FEISHU_APP_ID),
      appSecret: text(env.FEISHU_APP_SECRET),
      oauthRedirectUri: text(env.FEISHU_OAUTH_REDIRECT_URI),
      allowedOrigins: text(env.FEISHU_ALLOWED_ORIGINS),
    })
  },
  buildAuthorizeUrl,
  exchangeAuthorizationCode: exchangeOpenPlatformCode,
  resolveUserIdentity: resolveOpenPlatformIdentity,
}

export function feishuEndpoints() {
  return { provider: "feishu" as const, brand: "Feishu" as const, ...endpoints }
}
