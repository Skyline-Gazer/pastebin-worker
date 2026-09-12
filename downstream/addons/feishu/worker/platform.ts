export type Platform = "feishu" | "lark"

export interface PlatformEndpoints {
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl: string
  openApiOrigin: string
  brand: "Feishu" | "Lark"
}

export interface ProviderCredentialEnvironment {
  PLATFORM: string
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

const endpoints = {
  feishu: {
    authorizeUrl: "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
    tokenUrl: "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
    userInfoUrl: "https://open.feishu.cn/open-apis/authen/v1/user_info",
    openApiOrigin: "https://open.feishu.cn",
    brand: "Feishu",
  },
  lark: {
    authorizeUrl: "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
    tokenUrl: "https://open.larksuite.com/open-apis/authen/v2/oauth/token",
    userInfoUrl: "https://open.larksuite.com/open-apis/authen/v1/user_info",
    openApiOrigin: "https://open.larksuite.com",
    brand: "Lark",
  },
} as const satisfies Record<Platform, PlatformEndpoints>

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

/** Exact static mapping only; unknown or missing values fail closed. */
export function resolvePlatform(value: unknown): PlatformEndpoints & { provider: Platform } {
  if (value === "feishu" || value === "lark") return { provider: value, ...endpoints[value] }
  throw new InvalidPlatformError()
}

function text(value: string | undefined): string {
  return typeof value === "string" ? value : ""
}

function selectedCredentials(env: ProviderCredentialEnvironment, provider: Platform) {
  if (provider === "lark")
    return {
      appId: text(env.LARK_APP_ID),
      appSecret: text(env.LARK_APP_SECRET),
      encryptKey: text(env.LARK_ENCRYPT_KEY),
      verificationToken: text(env.LARK_VERIFICATION_TOKEN),
      allowedTenantKeys: text(env.LARK_ALLOWED_TENANT_KEYS),
      oauthRedirectUri: text(env.LARK_OAUTH_REDIRECT_URI),
      allowedOrigins: text(env.LARK_ALLOWED_ORIGINS),
    }
  return {
    appId: text(env.FEISHU_APP_ID),
    appSecret: text(env.FEISHU_APP_SECRET),
    encryptKey: text(env.FEISHU_ENCRYPT_KEY),
    verificationToken: text(env.FEISHU_VERIFICATION_TOKEN),
    allowedTenantKeys: text(env.FEISHU_ALLOWED_TENANT_KEYS),
    oauthRedirectUri: text(env.FEISHU_OAUTH_REDIRECT_URI),
    allowedOrigins: text(env.FEISHU_ALLOWED_ORIGINS),
  }
}

/** Selected-provider credentials only. No Feishu/Lark cross-fallback. */
export function resolveProviderConfig(env: ProviderCredentialEnvironment): ProviderConfig {
  const resolved = resolvePlatform(env.PLATFORM)
  const credentials = selectedCredentials(env, resolved.provider)
  if (!Object.values(credentials).every(Boolean)) throw new MissingProviderConfigError()
  try {
    new URL(credentials.oauthRedirectUri)
  } catch {
    throw new MissingProviderConfigError()
  }
  return { ...resolved, ...credentials }
}
