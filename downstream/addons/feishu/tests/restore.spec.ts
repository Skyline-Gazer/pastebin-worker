import { describe, expect, it, vi } from "vitest"
import { createRestoreHandler } from "../worker/restore"

const env = {
  FEISHU_APP_ID: "a",
  FEISHU_APP_SECRET: "s",
  FEISHU_OAUTH_REDIRECT_URI: "https://addon.example/cb",
  FEISHU_ALLOWED_ORIGINS: "https://addon.example",
  FEISHU_PRINCIPAL_KEY: "p",
}
const session = {
  id: "session",
  principalKey: "principal-a",
  csrfToken: "csrf",
  createdAt: "2020-01-01T00:00:00.000Z",
  expiresAt: "2030-01-01T00:00:00.000Z",
}
function request(headers: HeadersInit = {}, body?: BodyInit | null) {
  return new Request("https://addon.example/api/entries/entry-a/restore", {
    method: "POST",
    headers: {
      cookie: "feishu_addon_session=session",
      origin: "https://addon.example",
      "x-csrf-token": "csrf",
      "idempotency-key": "restore-a",
      ...headers,
    },
    body,
  })
}

describe("permanent restore browser adapter", () => {
  it("uses only stored scope and forwards no browser authority to the lifecycle service", async () => {
    const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(["scope-a"]) }
    const bindings = { getById: vi.fn().mockResolvedValue({ id: "entry-a", scope_id: "scope-a" }) }
    const service = {
      restorePermanentEntry: vi.fn().mockResolvedValue({
        ok: true,
        entry: {
          id: "entry-a",
          pasteName: "safe",
          publicUrl: "https://paste.example/safe",
          visibility: "active",
          retentionMode: "permanent",
          expiresAt: null,
          version: 3,
        },
      }),
    }
    const handler = createRestoreHandler(env, trust as never, bindings as never, service as never)
    const result = await handler.fetch(
      request({ "x-browser-scope": "scope-b", "x-browser-expiry": "tomorrow", "x-browser-password": "secret" }),
    )
    expect(result?.status).toBe(200)
    expect(service.restorePermanentEntry).toHaveBeenCalledWith(
      { scopeId: "scope-a" },
      { entryId: "entry-a", requestId: "restore-a" },
    )
    expect(await result?.text()).not.toContain("secret")
  })

  it("rejects absent session, invalid origin/CSRF, guessed IDs, and cross-scope entries before service", async () => {
    const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(["scope-b"]) }
    const bindings = { getById: vi.fn().mockResolvedValue({ id: "entry-a", scope_id: "scope-a" }) }
    const service = { restorePermanentEntry: vi.fn() }
    const handler = createRestoreHandler(env, trust as never, bindings as never, service as never)
    expect((await handler.fetch(request()))?.status).toBe(403)
    expect((await handler.fetch(request({}, JSON.stringify({ scopeId: "scope-b", password: "secret" }))))?.status).toBe(
      400,
    )
    trust.getSession.mockResolvedValueOnce(null)
    expect((await handler.fetch(request()))?.status).toBe(401)
    expect((await handler.fetch(request({ origin: "https://evil.example" })))?.status).toBe(403)
    expect((await handler.fetch(request({ "x-csrf-token": "wrong" })))?.status).toBe(403)
    bindings.getById.mockResolvedValueOnce(null)
    expect((await handler.fetch(request()))?.status).toBe(403)
    expect(service.restorePermanentEntry).not.toHaveBeenCalled()
  })
})
