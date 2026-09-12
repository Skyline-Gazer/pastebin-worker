import { env } from "cloudflare:test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import migration1 from "../migrations/0001_bindings.sql?raw"
import migration2 from "../migrations/0002_browser_trust.sql?raw"
import { authorizeBrowserMutation, createBrowserAuthHandler, requireBrowserSession } from "../worker/browser-auth"
import { BrowserTrustStore } from "../worker/browser-store"
import { derivePrincipalKey } from "../worker/principal"

const db = (env as unknown as { DB: D1Database }).DB
const config = {
  PLATFORM: "feishu",
  FEISHU_APP_ID: "cli_test",
  FEISHU_APP_SECRET: "secret",
  FEISHU_ENCRYPT_KEY: "encrypt-key",
  FEISHU_VERIFICATION_TOKEN: "verify-token",
  FEISHU_ALLOWED_TENANT_KEYS: "tenant-a",
  FEISHU_OAUTH_REDIRECT_URI: "https://addon.example/api/auth/callback",
  FEISHU_ALLOWED_ORIGINS: "https://addon.example",
  FEISHU_PRINCIPAL_KEY: "principal-secret",
}
const larkConfig = {
  ...config,
  PLATFORM: "lark",
  LARK_APP_ID: "cli_lark",
  LARK_APP_SECRET: "lark-secret",
  LARK_ENCRYPT_KEY: "lark-encrypt",
  LARK_VERIFICATION_TOKEN: "lark-token",
  LARK_ALLOWED_TENANT_KEYS: "tenant-lark",
  LARK_OAUTH_REDIRECT_URI: "https://addon.example/api/auth/callback",
  LARK_ALLOWED_ORIGINS: "https://addon.example",
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
})
afterEach(() => {
  vi.restoreAllMocks()
})
async function session(principalKey = "principal-a") {
  const now = new Date()
  const value = {
    id: "session-a",
    principalKey,
    csrfToken: "csrf-a",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 60_000).toISOString(),
  }
  await store.createSession(value)
  return value
}
function request(headers: HeadersInit = {}) {
  return new Request("https://addon.example/api/future", {
    method: "POST",
    headers: {
      cookie: "feishu_addon_session=session-a",
      origin: "https://addon.example",
      "x-csrf-token": "csrf-a",
      ...headers,
    },
  })
}

describe("Phase 6.0 browser trust boundary", () => {
  it("rejects absent, invalid, expired and revoked sessions", async () => {
    await expect(requireBrowserSession(new Request("https://addon.example"), config, store)).rejects.toMatchObject({
      status: 401,
    })
    await expect(
      requireBrowserSession(request({ cookie: "feishu_addon_session=guessed" }), config, store),
    ).rejects.toMatchObject({ status: 401 })
    await store.createSession({
      id: "expired",
      principalKey: "p",
      csrfToken: "c",
      createdAt: "2000-01-01T00:00:00.000Z",
      expiresAt: "2000-01-01T01:00:00.000Z",
    })
    await expect(
      requireBrowserSession(request({ cookie: "feishu_addon_session=expired" }), config, store),
    ).rejects.toMatchObject({ status: 401 })
    await session()
    await store.deleteSession("session-a")
    await expect(requireBrowserSession(request(), config, store)).rejects.toMatchObject({ status: 401 })
  })
  it("requires exact Origin, session CSRF, and a server-side scope join", async () => {
    await session()
    await expect(authorizeBrowserMutation(request(), config, store, "scope-a")).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await store.upsertPrincipalScope("principal-a", "scope-a")
    await expect(
      authorizeBrowserMutation(request({ origin: "https://evil.example" }), config, store, "scope-a"),
    ).rejects.toMatchObject({ code: "INVALID_ORIGIN" })
    await expect(
      authorizeBrowserMutation(request({ "x-csrf-token": "wrong" }), config, store, "scope-a"),
    ).rejects.toMatchObject({ code: "INVALID_CSRF" })
    await expect(
      authorizeBrowserMutation(request({ "x-browser-scope": "scope-a" }), config, store, "scope-b"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(authorizeBrowserMutation(request(), config, store, "scope-a")).resolves.toMatchObject({
      principalKey: "principal-a",
    })
  })
  it("derives stable keyed principals and supports multiple trusted scopes", async () => {
    const principal = await derivePrincipalKey(config.FEISHU_PRINCIPAL_KEY, config.FEISHU_APP_ID, "tenant-a", "open-a")
    expect(principal).not.toContain("tenant-a")
    expect(principal).not.toContain("open-a")
    await store.upsertPrincipalScope(principal, "scope-a")
    await store.upsertPrincipalScope(principal, "scope-b")
    expect(await store.scopes(principal)).toEqual(["scope-a", "scope-b"])
  })
  it("redirects login with opaque state and callback creates a secret-free session response", async () => {
    const handler = createBrowserAuthHandler(config, store)
    const login = await handler.fetch(new Request("https://addon.example/api/auth/login"))
    expect(login?.status).toBe(302)
    const location = login?.headers.get("location") || ""
    expect(location).toContain("accounts.feishu.cn/open-apis/authen/v1/authorize")
    const loginUrl = new URL(location)
    expect(loginUrl.searchParams.get("redirect_uri")).toBe(config.FEISHU_OAUTH_REDIRECT_URI)
    expect(loginUrl.searchParams.get("response_type")).toBe("code")
    expect([...loginUrl.searchParams.keys()].some((key) => /secret|token|access/i.test(key))).toBe(false)
    const state = loginUrl.searchParams.get("state")!
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ data: { access_token: "never-visible-token" } }))
      .mockResolvedValueOnce(Response.json({ data: { open_id: "open-a", tenant_key: "tenant-a" } }))
    const callback = await handler.fetch(
      new Request(`https://addon.example/api/auth/callback?state=${state}&code=code`),
    )
    expect(callback?.status).toBe(302)
    expect(callback?.headers.get("location")).toBe("/")
    const cookie = callback?.headers.get("set-cookie") || ""
    expect(cookie).toMatch(/HttpOnly; Secure; SameSite=Lax; Path=\//)
    expect(cookie).not.toMatch(/;\s*Domain=/i)
    expect(new URL(callback?.headers.get("location") || "/", "https://pb.test.223.im/api/auth/callback").origin).toBe(
      "https://pb.test.223.im",
    )
    expect(await callback?.text()).not.toContain("never-visible-token")
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://open.feishu.cn/open-apis/authen/v2/oauth/token")
    expect(fetchSpy.mock.calls[1]?.[0]).toBe("https://open.feishu.cn/open-apis/authen/v1/user_info")
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    fetchSpy.mockRestore()
  })

  it("keeps canonical Add-on callback, host-only cookie, session, and Origin checks on the same origin", async () => {
    const origin = "https://pb.test.223.im"
    const canonical = {
      ...config,
      FEISHU_OAUTH_REDIRECT_URI: `${origin}/api/auth/callback`,
      FEISHU_ALLOWED_ORIGINS: origin,
    }
    const handler = createBrowserAuthHandler(canonical, store)
    const login = await handler.fetch(new Request(`${origin}/api/auth/login`))
    const loginUrl = new URL(login?.headers.get("location") || "")
    expect(loginUrl.searchParams.get("redirect_uri")).toBe(`${origin}/api/auth/callback`)
    expect([...loginUrl.searchParams.keys()]).toEqual(["client_id", "response_type", "redirect_uri", "state"])
    const state = loginUrl.searchParams.get("state")!
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ data: { access_token: "never-visible-token" } }))
      .mockResolvedValueOnce(Response.json({ data: { open_id: "open-a", tenant_key: "tenant-a" } }))
    const callback = await handler.fetch(new Request(`${origin}/api/auth/callback?state=${state}&code=code`))
    expect(callback?.headers.get("location")).toBe("/")
    expect(new URL("/", origin).href).toBe(`${origin}/`)
    const cookie = callback?.headers.get("set-cookie") || ""
    expect(cookie).toMatch(/HttpOnly; Secure; SameSite=Lax; Path=\//)
    expect(cookie.toLowerCase()).not.toContain("domain=")
    const sessionId = /feishu_addon_session=([^;]+)/.exec(cookie)?.[1]
    expect(sessionId).toBeTruthy()
    const authenticated = await handler.fetch(
      new Request(`${origin}/api/auth/session`, { headers: { cookie: `feishu_addon_session=${sessionId}` } }),
    )
    expect(authenticated).not.toBeNull()
    if (!authenticated) throw new Error("missing authenticated session")
    expect(authenticated.status).toBe(200)
    const body: unknown = await authenticated.json()
    if (!body || typeof body !== "object") throw new Error("session body")
    const record = body as Record<string, unknown>
    expect(record.brand).toBe("Feishu")
    expect(typeof record.csrfToken).toBe("string")
    expect(JSON.stringify(body)).not.toMatch(/never-visible-token|open-a|tenant-a|secret/)
    await store.upsertPrincipalScope("principal-a", "scope-a")
    await session()
    await expect(
      authorizeBrowserMutation(
        request({ origin, cookie: "feishu_addon_session=session-a", "x-csrf-token": "csrf-a" }),
        canonical,
        store,
        "scope-a",
      ),
    ).resolves.toMatchObject({ principalKey: "principal-a" })
    await expect(
      authorizeBrowserMutation(
        request({ origin: "https://evil.example", cookie: "feishu_addon_session=session-a", "x-csrf-token": "csrf-a" }),
        canonical,
        store,
        "scope-a",
      ),
    ).rejects.toMatchObject({ code: "INVALID_ORIGIN" })
  })

  it("redirects Lark login and exchanges the code at open.larksuite.com", async () => {
    const handler = createBrowserAuthHandler(larkConfig, store)
    const login = await handler.fetch(new Request("https://addon.example/api/auth/login"))
    expect(login?.status).toBe(302)
    const location = login?.headers.get("location") || ""
    expect(location).toContain("accounts.larksuite.com/open-apis/authen/v1/authorize")
    expect(location).not.toContain("feishu.cn")
    const state = new URL(location).searchParams.get("state")!
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ data: { access_token: "never-visible-token" } }))
      .mockResolvedValueOnce(Response.json({ data: { open_id: "open-a", tenant_key: "tenant-a" } }))
    const callback = await handler.fetch(
      new Request(`https://addon.example/api/auth/callback?state=${state}&code=code`),
    )
    expect(callback?.status).toBe(302)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://open.larksuite.com/open-apis/authen/v2/oauth/token")
    expect(fetchSpy.mock.calls[1]?.[0]).toBe("https://open.larksuite.com/open-apis/authen/v1/user_info")
    const tokenBody = fetchSpy.mock.calls[0]?.[1]
    const rawBody = tokenBody && typeof tokenBody === "object" && "body" in tokenBody ? tokenBody.body : undefined
    expect(typeof rawBody).toBe("string")
    if (typeof rawBody !== "string") throw new Error("expected token request body")
    expect(JSON.parse(rawBody)).toMatchObject({ client_id: "cli_lark" })
    expect(rawBody).not.toContain("cli_test")
    fetchSpy.mockRestore()
  })

  it("returns a secret-free brand on unauthenticated session and fails closed without PLATFORM", async () => {
    const handler = createBrowserAuthHandler(config, store)
    const session = await handler.fetch(new Request("https://addon.example/api/auth/session"))
    expect(session?.status).toBe(401)
    expect(await session?.json()).toEqual({ code: "UNAUTHENTICATED", brand: "Feishu" })
    const lark = await createBrowserAuthHandler(larkConfig, store).fetch(
      new Request("https://addon.example/api/auth/session"),
    )
    expect(await lark?.json()).toEqual({ code: "UNAUTHENTICATED", brand: "Lark" })
    const missing = await createBrowserAuthHandler({ ...config, PLATFORM: "" }, store).fetch(
      new Request("https://addon.example/api/auth/login"),
    )
    expect(missing?.status).toBe(503)
    expect(await missing?.json()).toEqual({ code: "UNAVAILABLE" })
    const crossed = await createBrowserAuthHandler({ ...config, PLATFORM: "lark" }, store).fetch(
      new Request("https://addon.example/api/auth/login"),
    )
    expect(crossed?.status).toBe(503)
    expect(await crossed?.json()).toEqual({ code: "UNAVAILABLE" })
  })
  it("rejects invalid OAuth state and logout revokes its opaque session", async () => {
    const handler = createBrowserAuthHandler(config, store)
    expect(
      (await handler.fetch(new Request("https://addon.example/api/auth/callback?state=nope&code=x")))?.status,
    ).toBe(401)
    await session()
    const result = await handler.fetch(
      new Request("https://addon.example/api/auth/logout", {
        method: "POST",
        headers: {
          cookie: "feishu_addon_session=session-a",
          origin: "https://addon.example",
          "x-csrf-token": "csrf-a",
        },
      }),
    )
    expect(result?.status).toBe(204)
    await expect(requireBrowserSession(request(), config, store)).rejects.toMatchObject({ status: 401 })
  })
})
