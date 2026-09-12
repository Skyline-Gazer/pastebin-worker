import { describe, expect, it } from "vitest"
import { MissingProviderConfigError, resolvePlatform, resolveProviderConfig } from "../worker/platform"

const feishu = {
  FEISHU_APP_ID: "cli_feishu",
  FEISHU_APP_SECRET: "feishu-secret",
  FEISHU_ENCRYPT_KEY: "feishu-encrypt",
  FEISHU_VERIFICATION_TOKEN: "feishu-token",
  FEISHU_ALLOWED_TENANT_KEYS: "tenant-feishu",
  FEISHU_OAUTH_REDIRECT_URI: "https://addon.example/feishu/cb",
  FEISHU_ALLOWED_ORIGINS: "https://addon.example",
}
const lark = {
  LARK_APP_ID: "cli_lark",
  LARK_APP_SECRET: "lark-secret",
  LARK_ENCRYPT_KEY: "lark-encrypt",
  LARK_VERIFICATION_TOKEN: "lark-token",
  LARK_ALLOWED_TENANT_KEYS: "tenant-lark",
  LARK_OAUTH_REDIRECT_URI: "https://addon.example/lark/cb",
  LARK_ALLOWED_ORIGINS: "https://lark.example",
}

describe("PLATFORM endpoint map", () => {
  it("maps feishu to Feishu accounts and open.feishu.cn user OAuth", () => {
    expect(resolvePlatform("feishu")).toEqual({
      provider: "feishu",
      authorizeUrl: "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
      tokenUrl: "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
      userInfoUrl: "https://open.feishu.cn/open-apis/authen/v1/user_info",
      openApiOrigin: "https://open.feishu.cn",
      brand: "Feishu",
    })
  })

  it("maps lark to Lark accounts and open.larksuite.com user OAuth", () => {
    expect(resolvePlatform("lark")).toEqual({
      provider: "lark",
      authorizeUrl: "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
      tokenUrl: "https://open.larksuite.com/open-apis/authen/v2/oauth/token",
      userInfoUrl: "https://open.larksuite.com/open-apis/authen/v1/user_info",
      openApiOrigin: "https://open.larksuite.com",
      brand: "Lark",
    })
  })

  it.each([undefined, "", "Feishu", "LARK", "both", "https://open.feishu.cn"])(
    "fails closed for invalid PLATFORM %j",
    (value) => {
      expect(() => resolvePlatform(value)).toThrow("INVALID_PLATFORM")
    },
  )
})

describe("resolveProviderConfig", () => {
  it("selects Feishu variables and Feishu hosts when PLATFORM=feishu", () => {
    const config = resolveProviderConfig({ PLATFORM: "feishu", ...feishu, ...lark })
    expect(config).toMatchObject({
      provider: "feishu",
      brand: "Feishu",
      appId: "cli_feishu",
      appSecret: "feishu-secret",
      encryptKey: "feishu-encrypt",
      verificationToken: "feishu-token",
      allowedTenantKeys: "tenant-feishu",
      oauthRedirectUri: "https://addon.example/feishu/cb",
      allowedOrigins: "https://addon.example",
      authorizeUrl: "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
      tokenUrl: "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
      userInfoUrl: "https://open.feishu.cn/open-apis/authen/v1/user_info",
    })
    expect(config.appId).not.toBe("cli_lark")
  })

  it("selects Lark variables and Lark hosts when PLATFORM=lark", () => {
    const config = resolveProviderConfig({ PLATFORM: "lark", ...feishu, ...lark })
    expect(config).toMatchObject({
      provider: "lark",
      brand: "Lark",
      appId: "cli_lark",
      appSecret: "lark-secret",
      encryptKey: "lark-encrypt",
      verificationToken: "lark-token",
      allowedTenantKeys: "tenant-lark",
      oauthRedirectUri: "https://addon.example/lark/cb",
      allowedOrigins: "https://lark.example",
      authorizeUrl: "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
      tokenUrl: "https://open.larksuite.com/open-apis/authen/v2/oauth/token",
      userInfoUrl: "https://open.larksuite.com/open-apis/authen/v1/user_info",
    })
    expect(config.appId).not.toBe("cli_feishu")
  })

  it("does not fall back to the other provider's credentials", () => {
    expect(() => resolveProviderConfig({ PLATFORM: "lark", ...feishu })).toThrow(MissingProviderConfigError)
    expect(() => resolveProviderConfig({ PLATFORM: "feishu", ...lark })).toThrow(MissingProviderConfigError)
  })

  it("fails closed when the selected provider is missing a credential", () => {
    expect(() => resolveProviderConfig({ PLATFORM: "feishu", ...feishu, FEISHU_APP_SECRET: "" })).toThrow(
      MissingProviderConfigError,
    )
    expect(() => resolveProviderConfig({ PLATFORM: "lark", ...lark, LARK_APP_ID: "" })).toThrow(
      MissingProviderConfigError,
    )
  })
})
