import { env } from "cloudflare:test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import migration1 from "../migrations/0001_bindings.sql?raw"
import migration2 from "../migrations/0002_browser_trust.sql?raw"
import { authorizeBrowserMutation, createBrowserAuthHandler, requireBrowserSession } from "../worker/browser-auth"
import { BrowserTrustStore } from "../worker/browser-store"
import { derivePrincipalKey } from "../worker/principal"

const db = (env as unknown as { DB: D1Database }).DB
const config = {
  FEISHU_APP_ID: "cli_test",
  FEISHU_APP_SECRET: "secret",
  FEISHU_OAUTH_REDIRECT_URI: "https://addon.example/api/auth/callback",
  FEISHU_ALLOWED_ORIGINS: "https://addon.example",
  FEISHU_PRINCIPAL_KEY: "principal-secret",
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
    const state = new URL(location).searchParams.get("state")!
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ access_token: "never-visible-token" }))
      .mockResolvedValueOnce(Response.json({ data: { open_id: "open-a", tenant_key: "tenant-a" } }))
    const callback = await handler.fetch(
      new Request(`https://addon.example/api/auth/callback?state=${state}&code=code`),
    )
    expect(callback?.status).toBe(302)
    expect(callback?.headers.get("set-cookie")).toMatch(/HttpOnly; Secure; SameSite=Lax; Path=\//)
    expect(await callback?.text()).not.toContain("never-visible-token")
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    fetchSpy.mockRestore()
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
