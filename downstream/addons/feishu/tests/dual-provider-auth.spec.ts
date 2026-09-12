import { env } from "cloudflare:test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import migration1 from "../migrations/0001_bindings.sql?raw"
import migration2 from "../migrations/0002_browser_trust.sql?raw"
import migration8 from "../migrations/0008_dual_provider_auth.sql?raw"
import { createBrowserAuthHandler, requireBrowserSession } from "../worker/browser-auth"
import { BrowserTrustStore } from "../worker/browser-store"
import { parseBrowserAuthProviders } from "../worker/platform"
import { derivePrincipalKey } from "../worker/principal"
import {
  consumeFeishuMessages,
  createFeishuWebhookHandler,
  createProviderWebhookHandler,
  deriveMessageIdentity,
} from "../worker/webhook"

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
  FEISHU_PRINCIPAL_KEY: "principal-secret",
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
const dual = {
  ...feishu,
  ...lark,
  BROWSER_AUTH_PROVIDERS: "feishu,lark",
}
const store = new BrowserTrustStore(db)

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
afterEach(() => {
  vi.restoreAllMocks()
})

describe("BROWSER_AUTH_PROVIDERS", () => {
  it("parses exact tokens and fails closed on unknown values", () => {
    expect(parseBrowserAuthProviders(undefined)).toBeUndefined()
    expect(parseBrowserAuthProviders("")).toBeUndefined()
    expect(parseBrowserAuthProviders("feishu, lark")).toEqual(["feishu", "lark"])
    expect(() => parseBrowserAuthProviders("feishu,slack")).toThrow("INVALID_BROWSER_AUTH_PROVIDERS")
  })
})

describe("dual Feishu+Lark browser auth", () => {
  it("starts Feishu and Lark logins independently and keeps /api/auth/login as a Feishu alias", async () => {
    const handler = createBrowserAuthHandler(dual, store)
    const feishuLogin = await handler.fetch(new Request("https://addon.example/api/auth/login/feishu"))
    expect(feishuLogin?.status).toBe(302)
    expect(feishuLogin?.headers.get("location") || "").toContain("accounts.feishu.cn")
    const alias = await handler.fetch(new Request("https://addon.example/api/auth/login"))
    expect(alias?.headers.get("location") || "").toContain("accounts.feishu.cn")
    const larkLogin = await handler.fetch(new Request("https://addon.example/api/auth/login/lark"))
    expect(larkLogin?.status).toBe(302)
    expect(larkLogin?.headers.get("location") || "").toContain("accounts.larksuite.com")
    expect(larkLogin?.headers.get("location") || "").not.toContain("feishu.cn")
  })

  it("uses stored OAuth state for callback provider and ignores query provider=", async () => {
    const handler = createBrowserAuthHandler(dual, store)
    const login = await handler.fetch(new Request("https://addon.example/api/auth/login/feishu"))
    const state = new URL(login?.headers.get("location") || "").searchParams.get("state")!
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ data: { access_token: "never-visible-token" } }))
      .mockResolvedValueOnce(Response.json({ data: { open_id: "open-a", tenant_key: "tenant-a" } }))
    const callback = await handler.fetch(
      new Request(`https://addon.example/api/auth/callback?state=${state}&code=code&provider=lark`),
    )
    expect(callback?.status).toBe(302)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://open.feishu.cn/open-apis/authen/v2/oauth/token")
    const cookie = callback?.headers.get("set-cookie") || ""
    expect(cookie).toMatch(/HttpOnly; Secure; SameSite=Lax; Path=\//)
    expect(cookie).not.toMatch(/;\s*Domain=/i)
    expect(await callback?.text()).not.toContain("never-visible-token")
    const sessionId = /feishu_addon_session=([^;]+)/.exec(cookie)?.[1]
    expect(sessionId).toBeTruthy()
    const session = await store.getSession(sessionId!, new Date().toISOString())
    expect(session?.provider).toBe("feishu")
    expect(session?.principalKey.startsWith("feishu:v1:principal:")).toBe(true)
    fetchSpy.mockRestore()
  })

  it("creates a Lark principal namespace for Lark login", async () => {
    const handler = createBrowserAuthHandler(dual, store)
    const login = await handler.fetch(new Request("https://addon.example/api/auth/login/lark"))
    const state = new URL(login?.headers.get("location") || "").searchParams.get("state")!
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ data: { access_token: "lark-token-secret" } }))
      .mockResolvedValueOnce(Response.json({ data: { open_id: "open-a", tenant_key: "tenant-a" } }))
    const callback = await handler.fetch(
      new Request(`https://addon.example/api/auth/callback?state=${state}&code=code`),
    )
    expect(callback?.status).toBe(302)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://open.larksuite.com/open-apis/authen/v2/oauth/token")
    const cookie = callback?.headers.get("set-cookie") || ""
    const sessionId = /feishu_addon_session=([^;]+)/.exec(cookie)?.[1]
    const session = await store.getSession(sessionId!, new Date().toISOString())
    expect(session?.provider).toBe("lark")
    expect(session?.principalKey.startsWith("lark:v1:principal:")).toBe(true)
    expect(await callback?.text()).not.toContain("lark-token-secret")
    fetchSpy.mockRestore()
  })

  it("does not fall back to Feishu credentials when Lark is enabled but secrets are missing", async () => {
    const handler = createBrowserAuthHandler({ ...feishu, BROWSER_AUTH_PROVIDERS: "feishu,lark" }, store)
    const login = await handler.fetch(new Request("https://addon.example/api/auth/login/lark"))
    expect(login?.status).toBe(503)
    expect(await login?.json()).toEqual({ code: "UNAVAILABLE" })
  })

  it("keeps same tenant/open_id isolated across providers", async () => {
    const feishuPrincipal = await derivePrincipalKey(
      dual.FEISHU_PRINCIPAL_KEY,
      dual.FEISHU_APP_ID,
      "tenant-a",
      "open-a",
    )
    const larkPrincipal = await derivePrincipalKey(
      dual.FEISHU_PRINCIPAL_KEY,
      dual.LARK_APP_ID,
      "tenant-a",
      "open-a",
      "lark",
    )
    expect(feishuPrincipal.startsWith("feishu:v1:principal:")).toBe(true)
    expect(larkPrincipal.startsWith("lark:v1:principal:")).toBe(true)
    expect(feishuPrincipal).not.toBe(larkPrincipal)
    await store.upsertPrincipalScope(feishuPrincipal, "feishu:v1:scope:a")
    await store.upsertPrincipalScope(larkPrincipal, "lark:v1:scope:a")
    expect(await store.scopes(feishuPrincipal)).toEqual(["feishu:v1:scope:a"])
    expect(await store.scopes(larkPrincipal)).toEqual(["lark:v1:scope:a"])
  })

  it("still authenticates a pre-migration Feishu session row after additive provider default", async () => {
    await db
      .prepare(
        "INSERT INTO feishu_browser_sessions (id, principal_key, csrf_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(
        "legacy-session",
        "feishu:v1:principal:legacy",
        "csrf-legacy",
        "2026-01-01T00:00:00.000Z",
        "2099-01-01T00:00:00.000Z",
      )
      .run()
    const session = await requireBrowserSession(
      new Request("https://addon.example/api/future", {
        headers: { cookie: "feishu_addon_session=legacy-session" },
      }),
      dual,
      store,
    )
    expect(session.principalKey).toBe("feishu:v1:principal:legacy")
    expect(session.provider).toBe("feishu")
  })

  it("returns session brand from the stored provider, not global PLATFORM", async () => {
    const handler = createBrowserAuthHandler(dual, store)
    const now = new Date()
    await store.createSession({
      id: "lark-session",
      principalKey: "lark:v1:principal:x",
      csrfToken: "csrf-lark",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60_000).toISOString(),
      provider: "lark",
    })
    const session = await handler.fetch(
      new Request("https://addon.example/api/auth/session", {
        headers: { cookie: "feishu_addon_session=lark-session" },
      }),
    )
    expect(session?.status).toBe(200)
    expect(await session?.json()).toMatchObject({ brand: "Lark", csrfToken: "csrf-lark" })
  })
})

describe("dual Feishu+Lark webhooks", () => {
  it("namespaces Lark webhook identity and requires provider=lark on the queue item", async () => {
    const identity = await deriveMessageIdentity("cli_lark", "tenant-a", "oc_1", "om_1", "lark")
    expect(identity.scopeId.startsWith("lark:v1:scope:")).toBe(true)
    const feishuIdentity = await deriveMessageIdentity("cli_test", "tenant-a", "oc_1", "om_1")
    expect(feishuIdentity.scopeId.startsWith("feishu:v1:scope:")).toBe(true)
    expect(identity.scopeId).not.toBe(feishuIdentity.scopeId)
  })

  it("does not accept a Feishu-signed body on the Lark events path", async () => {
    const send = vi.fn()
    const env = {
      ...dual,
      FEISHU_INGRESS_QUEUE: { send },
      FEISHU_INGRESS_DLQ_CONFIGURED: "true",
    }
    const larkHandler = createProviderWebhookHandler(env, "lark")
    const feishuHandler = createFeishuWebhookHandler(env)
    const raw = JSON.stringify({ encrypt: "not-a-real-cipher" })
    const timestamp = "1700000000"
    const nonce = "nonce-vector"
    const signed = new Uint8Array(new TextEncoder().encode(timestamp + nonce + dual.FEISHU_ENCRYPT_KEY + raw))
    const hash = await crypto.subtle.digest("SHA-256", signed)
    const signature = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")
    const request = new Request("https://worker/api/lark/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-lark-request-timestamp": timestamp,
        "x-lark-request-nonce": nonce,
        "x-lark-signature": signature,
      },
      body: raw,
    })
    expect((await larkHandler.fetch(request)).status).toBe(401)
    expect(send).not.toHaveBeenCalled()
    expect((await feishuHandler.fetch(new Request("https://worker/api/lark/events", { method: "POST" }))).status).toBe(
      404,
    )
  })

  it("treats historical queue items without provider as Feishu and poisons Lark+Feishu-scope mismatch", async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const createEntry = vi.fn().mockResolvedValue({ ok: true })
    await consumeFeishuMessages(
      {
        messages: [
          {
            body: {
              schema: "feishu.message-create.v1" as const,
              scopeId: "feishu:v1:scope:abcd",
              recordKey: "feishu:v1:message:abcd",
              requestId: "feishu:v1:create:abcdabcdabcdabcdabcdabcdabcdabcdabcd",
              sourceMessageId: "om_1",
              content: "hello",
              correlationId: "11111111-1111-4111-8111-111111111111",
            },
            ack,
            retry,
          },
        ],
      },
      { createEntry },
      undefined,
      true,
    )
    expect(createEntry).toHaveBeenCalledTimes(1)

    const poisonAck = vi.fn()
    const poisonRetry = vi.fn()
    await consumeFeishuMessages(
      {
        messages: [
          {
            body: {
              schema: "feishu.message-create.v1" as const,
              provider: "lark",
              scopeId: "feishu:v1:scope:abcd",
              recordKey: "lark:v1:message:abcd",
              requestId: "lark:v1:create:abcdabcdabcdabcdabcdabcdabcdabcdabcd",
              sourceMessageId: "om_2",
              content: "hello",
              correlationId: "22222222-2222-4222-8222-222222222222",
            },
            ack: poisonAck,
            retry: poisonRetry,
          },
        ],
      },
      { createEntry },
      () => Promise.resolve(true),
      true,
    )
    expect(poisonAck).toHaveBeenCalled()
    expect(createEntry).toHaveBeenCalledTimes(1)
  })
})
