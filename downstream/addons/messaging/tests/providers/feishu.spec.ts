import { describe, expect, it } from "vitest"
import { feishuAdapter } from "../../worker/providers/feishu"

describe("Feishu adapter", () => {
  it("parses only FEISHU_* webhook and OAuth fields", () => {
    const env = {
      PLATFORM: "lark",
      FEISHU_APP_ID: "cli_feishu",
      FEISHU_APP_SECRET: "secret",
      FEISHU_ENCRYPT_KEY: "feishu-encrypt-key-value",
      FEISHU_VERIFICATION_TOKEN: "feishu-token",
      FEISHU_ALLOWED_TENANT_KEYS: "tenant-a",
      FEISHU_OAUTH_REDIRECT_URI: "https://addon.example/api/auth/callback",
      FEISHU_ALLOWED_ORIGINS: "https://addon.example",
      LARK_APP_ID: "cli_lark",
    }
    const webhook = feishuAdapter.webhookReadiness(env)
    const oauth = feishuAdapter.oauthReadiness(env)
    expect(webhook.ready && webhook.config.appId).toBe("cli_feishu")
    expect(oauth.ready && oauth.config.appId).toBe("cli_feishu")
    expect(feishuAdapter.webhookPath).toBe("/api/feishu/events")
  })
})
