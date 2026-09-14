import { env } from "cloudflare:test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import migration1 from "../migrations/0001_bindings.sql?raw"
import migration2 from "../migrations/0002_browser_trust.sql?raw"
import migration8 from "../migrations/0008_dual_provider_auth.sql?raw"
import { createMessagingRuntime } from "../worker/index"
import { createInboundWebhookDispatcher, createProviderWebhookHandler } from "../worker/webhook"

const hexA = "11".repeat(32)
const hexB = "22".repeat(32)
const db = (env as unknown as { DB: D1Database }).DB

const feishu = {
  PLATFORM: "feishu",
  FEISHU_APP_ID: "cli_test",
  FEISHU_APP_SECRET: "secret",
  FEISHU_ENCRYPT_KEY: "0123456789abcdef0123456789abcdef",
  FEISHU_VERIFICATION_TOKEN: "verify-token",
  FEISHU_ALLOWED_TENANT_KEYS: "tenant-a",
  FEISHU_OAUTH_REDIRECT_URI: "https://addon.example/api/auth/callback",
  FEISHU_ALLOWED_ORIGINS: "https://addon.example",
}

const lark = {
  LARK_APP_ID: "cli_lark",
  LARK_APP_SECRET: "lark-secret",
  LARK_ENCRYPT_KEY: "fedcba9876543210fedcba9876543210",
  LARK_VERIFICATION_TOKEN: "lark-token",
  LARK_ALLOWED_TENANT_KEYS: "tenant-a",
  LARK_OAUTH_REDIRECT_URI: "https://addon.example/api/auth/callback",
  LARK_ALLOWED_ORIGINS: "https://addon.example",
}

function runtimeEnv(overrides: Record<string, unknown> = {}) {
  return {
    ...feishu,
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

describe("provider isolation", () => {
  it("keeps the Feishu webhook route when only Feishu is webhook-ready", async () => {
    const worker = await createMessagingRuntime(runtimeEnv() as never)
    const feishuEvents = await worker.fetch(
      new Request("https://addon.example/api/feishu/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "url_verification", token: "verify-token", challenge: "c1" }),
      }),
    )
    expect(feishuEvents.status).toBe(200)
    expect(await feishuEvents.json()).toEqual({ challenge: "c1" })
  })

  it("keeps the Lark webhook route mounted and returns 503 when Lark webhook config is absent", async () => {
    const worker = await createMessagingRuntime(runtimeEnv() as never)
    const larkEvents = await worker.fetch(
      new Request("https://addon.example/api/lark/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "url_verification", token: "lark-token", challenge: "c2" }),
      }),
    )
    expect(larkEvents.status).toBe(503)
    expect(await larkEvents.json()).toMatchObject({ code: "UNAVAILABLE" })
  })

  it("does not fall through from /api/lark/events into the Feishu handler", async () => {
    const dispatcher = createInboundWebhookDispatcher({
      ...feishu,
      FEISHU_INGRESS_QUEUE: { send: vi.fn() },
      FEISHU_INGRESS_DLQ_CONFIGURED: "true",
    })
    const larkPath = await dispatcher.fetch(
      new Request("https://addon.example/api/lark/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "url_verification", token: "verify-token", challenge: "stolen" }),
      }),
    )
    expect(larkPath?.status).toBe(503)
    const feishuOnly = createProviderWebhookHandler(
      {
        ...feishu,
        FEISHU_INGRESS_QUEUE: { send: vi.fn() },
        FEISHU_INGRESS_DLQ_CONFIGURED: "true",
      },
      "feishu",
    )
    expect(
      (
        await feishuOnly.fetch(
          new Request("https://addon.example/api/lark/events", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(404)
  })

  it("does not fall back to Feishu credentials for Lark verification", async () => {
    const handler = createProviderWebhookHandler(
      {
        ...feishu,
        ...lark,
        FEISHU_INGRESS_QUEUE: { send: vi.fn() },
        FEISHU_INGRESS_DLQ_CONFIGURED: "true",
      },
      "lark",
    )
    const stolen = await handler.fetch(
      new Request("https://addon.example/api/lark/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "url_verification", token: "verify-token", challenge: "nope" }),
      }),
    )
    expect(stolen.status).toBe(401)
  })

  it("keeps Lark webhook working when Feishu provider config is invalid", async () => {
    const worker = await createMessagingRuntime(
      runtimeEnv({
        ...lark,
        FEISHU_ENCRYPT_KEY: "",
        FEISHU_APP_SECRET: "",
        FEISHU_VERIFICATION_TOKEN: "",
        FEISHU_ALLOWED_TENANT_KEYS: "",
        FEISHU_OAUTH_REDIRECT_URI: "",
        FEISHU_ALLOWED_ORIGINS: "",
      }) as never,
    )
    const larkChallenge = await worker.fetch(
      new Request("https://addon.example/api/lark/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "url_verification", token: "lark-token", challenge: "ok-lark" }),
      }),
    )
    expect(larkChallenge.status).toBe(200)
    expect(await larkChallenge.json()).toEqual({ challenge: "ok-lark" })
    const feishuLogin = await worker.fetch(new Request("https://addon.example/api/auth/login/feishu"))
    expect(feishuLogin.status).toBe(503)
    const larkLogin = await worker.fetch(new Request("https://addon.example/api/auth/login/lark"))
    expect(larkLogin.status).toBe(302)
    expect(larkLogin.headers.get("location") || "").toContain("accounts.larksuite.com")
  })
})
