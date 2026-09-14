import { describe, expect, it } from "vitest"
import { larkAdapter } from "../../worker/providers/lark"

describe("Lark adapter", () => {
  it("parses only LARK_* fields and never Feishu-shaped aliases", () => {
    const env = {
      PLATFORM: "feishu",
      FEISHU_APP_ID: "cli_feishu",
      FEISHU_ENCRYPT_KEY: "feishu-encrypt-key-value",
      LARK_APP_ID: "cli_lark",
      LARK_ENCRYPT_KEY: "lark-encrypt-key-ok",
      LARK_VERIFICATION_TOKEN: "lark-token",
      LARK_ALLOWED_TENANT_KEYS: "tenant-a",
    }
    const webhook = larkAdapter.webhookReadiness(env)
    expect(webhook.ready && webhook.config.appId).toBe("cli_lark")
    expect(webhook.ready && webhook.config.encryptKey).toBe("lark-encrypt-key-ok")
    expect(larkAdapter.oauthReadiness(env).ready).toBe(false)
    expect(larkAdapter.webhookPath).toBe("/api/lark/events")
  })
})
