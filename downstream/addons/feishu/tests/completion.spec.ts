import { describe, expect, it, vi } from "vitest"
import { createCompletionHandler } from "../worker/completion"

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
function request(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://addon.example/api/entries/entry-a/complete", {
    method: "POST",
    headers: {
      cookie: "feishu_addon_session=session",
      origin: "https://addon.example",
      "x-csrf-token": "csrf",
      "idempotency-key": "request-a",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe("completion browser adapter", () => {
  it("authorizes only the binding's server-side scope and emits no secrets", async () => {
    const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(["scope-a"]) }
    const bindings = { getById: vi.fn().mockResolvedValue({ id: "entry-a", scope_id: "scope-a" }) }
    const service = {
      completeEntry: vi.fn().mockResolvedValue({
        ok: true,
        entry: {
          id: "entry-a",
          pasteName: "safe",
          publicUrl: "https://paste.example/safe",
          visibility: "archived",
          retentionMode: "permanent",
          expiresAt: null,
          version: 2,
        },
      }),
    }
    const handler = createCompletionHandler(env, trust as never, bindings as never, service as never)
    const result = await handler.fetch(request({ action: "archive_permanent", scopeId: "scope-b", password: "secret" }))
    expect(result?.status).toBe(400)
    expect(service.completeEntry).not.toHaveBeenCalled()
    const good = await handler.fetch(request({ action: "archive_permanent" }))
    expect(good?.status).toBe(200)
    expect(service.completeEntry).toHaveBeenCalledWith(
      { scopeId: "scope-a" },
      expect.objectContaining({ entryId: "entry-a" }),
    )
    expect(await good?.text()).not.toContain("secret")
  })

  it("rejects unauthenticated, cross-scope, invalid-origin, and missing-CSRF requests before service", async () => {
    const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(["scope-b"]) }
    const bindings = { getById: vi.fn().mockResolvedValue({ id: "entry-a", scope_id: "scope-a" }) }
    const service = { completeEntry: vi.fn() }
    const handler = createCompletionHandler(env, trust as never, bindings as never, service as never)
    expect((await handler.fetch(request({ action: "delete" })))?.status).toBe(403)
    trust.getSession.mockResolvedValueOnce(null)
    expect((await handler.fetch(request({ action: "delete" })))?.status).toBe(401)
    expect((await handler.fetch(request({ action: "delete" }, { origin: "https://evil.example" })))?.status).toBe(403)
    expect((await handler.fetch(request({ action: "delete" }, { "x-csrf-token": "" })))?.status).toBe(403)
    expect(service.completeEntry).not.toHaveBeenCalled()
  })
})
