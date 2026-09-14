export type ProviderId = "feishu" | "lark"

/** Provider credential + legacy compatibility inputs. Binding names stay historically prefixed. */
export interface ProviderCredentialEnvironment {
  PLATFORM: string
  BROWSER_AUTH_PROVIDERS?: string
  FEISHU_APP_ID?: string
  FEISHU_APP_SECRET?: string
  FEISHU_ENCRYPT_KEY?: string
  FEISHU_VERIFICATION_TOKEN?: string
  FEISHU_ALLOWED_TENANT_KEYS?: string
  FEISHU_OAUTH_REDIRECT_URI?: string
  FEISHU_ALLOWED_ORIGINS?: string
  LARK_APP_ID?: string
  LARK_APP_SECRET?: string
  LARK_ENCRYPT_KEY?: string
  LARK_VERIFICATION_TOKEN?: string
  LARK_ALLOWED_TENANT_KEYS?: string
  LARK_OAUTH_REDIRECT_URI?: string
  LARK_ALLOWED_ORIGINS?: string
}

export interface ProviderWebhookConfig {
  provider: ProviderId
  brand: string
  encryptKey: string
  verificationToken: string
  appId: string
  allowedTenantKeys: string
}

export interface ProviderOAuthConfig {
  provider: ProviderId
  brand: string
  appId: string
  appSecret: string
  oauthRedirectUri: string
  allowedOrigins: string
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl: string
}

export type WebhookReadiness = { ready: true; config: ProviderWebhookConfig } | { ready: false }
export type OAuthReadiness = { ready: true; config: ProviderOAuthConfig } | { ready: false }

export interface ProviderUserIdentity {
  openId: string
  tenantKey: string
}

export interface ProviderAdapter {
  readonly id: ProviderId
  readonly brand: string
  readonly webhookPath: string
  webhookReadiness(env: ProviderCredentialEnvironment): WebhookReadiness
  oauthReadiness(env: ProviderCredentialEnvironment): OAuthReadiness
  buildAuthorizeUrl(config: ProviderOAuthConfig, state: string): string
  exchangeAuthorizationCode(config: ProviderOAuthConfig, code: string): Promise<string>
  resolveUserIdentity(config: ProviderOAuthConfig, accessToken: string): Promise<ProviderUserIdentity>
}

export interface ProviderReadiness {
  id: ProviderId
  webhook: boolean
  oauth: boolean
}
