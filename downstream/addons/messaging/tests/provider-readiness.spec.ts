import { env } from "cloudflare:test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import migration1 from "../migrations/0001_bindings.sql?raw"
import migration2 from "../migrations/0002_browser_trust.sql?raw"
import migration8 from "../migrations/0008_dual_provider_auth.sql?raw"
import { createMessagingRuntime } from "../worker/index"
import { feishuAdapter } from "../worker/providers/feishu"
import { larkAdapter } from "../worker/providers/lark"
import { createProviderWebhookHandler, verifyFeishuChallenge } from "../worker/webhook"

const hexA = "11".repeat(32)
const hexB = "22".repeat(32)
const db = (env as unknown as { DB: D1Database }).DB

const feishuWebhook = {
  FEISHU_APP_ID: "cli_test",
  FEISHU_ENCRYPT_KEY: "0123456789abcdef0123456789abcdef",
  FEISHU_VERIFICATION_TOKEN: "verify-token",
  FEISHU_ALLOWED_TENANT_KEYS: "tenant-a",
}
const feishuOAuth = {
  FEISHU_APP_SECRET: "secret",
  FEISHU_OAUTH_REDIRECT_URI: "https://addon.example/api/auth/callback",
  FEISHU_ALLOWED_ORIGINS: "https://addon.example",
}
const larkWebhook = {
  LARK_APP_ID: "cli_lark",
  LARK_ENCRYPT_KEY: "fedcba9876543210fedcba9876543210",
  LARK_VERIFICATION_TOKEN: "lark-token",
  LARK_ALLOWED_TENANT_KEYS: "tenant-a",
}
const larkOAuth = {
  LARK_APP_SECRET: "lark-secret",
  LARK_OAUTH_REDIRECT_URI: "https://addon.example/api/auth/callback",
  LARK_ALLOWED_ORIGINS: "https://addon.example",
}

function runtimeEnv(overrides: Record<string, unknown> = {}) {
  return {
    PLATFORM: "feishu",
    ...feishuWebhook,
    ...feishuOAuth,
    FEISHU_CREDENTIAL_KEY_ID: "v1",
    FEISHU_CREDENTIAL_ENCRYPTION_KEY: hexA,
    FEISHU_FINGERPRINT_KEY: hexB,
    FEISHU_PRINCIPAL_KEY: "principal-secret",
    FEISHU_INGRESS_DLQ_CONFIGURED: "true",
    PASTEBIN_ORIGIN: "https://pb.223.im",
    PASTEBIN_SERVICE: { fetch: vi.fn(() => Promise.resolve(new Response("ok"))) },
    FEISHU_BINDINGS_DB: db,
    FEISHU_INGRESS_QUEUE: { send: vi.fn() },
    ...overrides,
  }
}

async function migrate(sql: string) {
  for (const statement of sql.split(";").filter((part) => part.trim())) await db.prepare(statement).run()
}

beforeEach(async () => {
  await db.exec(
    "DROP TABLE IF EXISTS feishu_oauth_states; DROP TABLE IF EXISTS feishu_browser_sessions; DROP TABLE IF EXISTS feishu_principal_scope_map; DROP TABLE IF EXISTS feishu_operations; DROP TABLE IF EXISTS feishu_bindings;",
  )
  await migrate(migration1)
  await migrate(migration2)
  await migrate(migration8)
})

describe("provider readiness", () => {
  it("treats webhook readiness and OAuth readiness as independent", () => {
    const webhookOnly = { PLATFORM: "lark", ...larkWebhook }
    expect(larkAdapter.webhookReadiness(webhookOnly).ready).toBe(true)
    expect(larkAdapter.oauthReadiness(webhookOnly).ready).toBe(false)
    const oauthOnly = { PLATFORM: "feishu", FEISHU_APP_ID: "cli_test", ...feishuOAuth }
    expect(feishuAdapter.webhookReadiness(oauthOnly).ready).toBe(false)
    expect(feishuAdapter.oauthReadiness(oauthOnly).ready).toBe(true)
  })

  it("answers a Lark URL challenge when Lark webhook config is complete and Lark OAuth is absent", async () => {
    const envConfig = { PLATFORM: "feishu", ...larkWebhook }
    await expect(
      verifyFeishuChallenge(
        { type: "url_verification", token: "lark-token", challenge: "challenge-lark" },
        envConfig,
        "lark",
      ),
    ).resolves.toBe("challenge-lark")
    const handler = createProviderWebhookHandler(
      {
        ...envConfig,
        FEISHU_INGRESS_QUEUE: { send: vi.fn() },
        FEISHU_INGRESS_DLQ_CONFIGURED: "true",
      },
      "lark",
    )
    const response = await handler.fetch(
      new Request("https://addon.example/api/lark/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "url_verification", token: "lark-token", challenge: "challenge-lark" }),
      }),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ challenge: "challenge-lark" })
  })

  it("returns 503 for Lark OAuth login until OAuth-ready while Feishu login still works", async () => {
    const worker = await createMessagingRuntime(runtimeEnv() as never)
    const lark = await worker.fetch(new Request("https://addon.example/api/auth/login/lark"))
    expect(lark.status).toBe(503)
    expect(await lark.json()).toEqual({ code: "UNAVAILABLE" })
    const feishu = await worker.fetch(new Request("https://addon.example/api/auth/login/feishu"))
    expect(feishu.status).toBe(302)
    expect(feishu.headers.get("location") || "").toContain("accounts.feishu.cn")
  })

  it("lists session providers from OAuth-ready adapters", async () => {
    const worker = await createMessagingRuntime(runtimeEnv({ ...larkWebhook, ...larkOAuth }) as never)
    const session = await worker.fetch(new Request("https://addon.example/api/auth/session"))
    expect(session.status).toBe(401)
    expect(await session.json()).toMatchObject({ providers: ["feishu", "lark"] })
  })
})
