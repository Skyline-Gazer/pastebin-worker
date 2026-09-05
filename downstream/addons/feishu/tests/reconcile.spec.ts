import { describe, expect, it, vi } from "vitest"
import { createReconciliationHandler } from "../worker/reconcile"

const env = {
  FEISHU_APP_ID: "a",
  FEISHU_APP_SECRET: "s",
  FEISHU_OAUTH_REDIRECT_URI: "https://addon.example/cb",
  FEISHU_ALLOWED_ORIGINS: "https://addon.example",
  FEISHU_PRINCIPAL_KEY: "p",
}
const session = { id: "s", principalKey: "principal-a", csrfToken: "csrf", expiresAt: "2030-01-01T00:00:00.000Z" }
const request = (headers: HeadersInit = {}, body?: BodyInit | null) =>
  new Request("https://addon.example/api/entries/entry-a/reconcile", {
    method: "POST",
    headers: { cookie: "feishu_addon_session=s", origin: "https://addon.example", "x-csrf-token": "csrf", ...headers },
    body,
  })

describe("reconciliation browser adapter", () => {
  it("uses session-derived stored scope and returns only secret-free absence", async () => {
    const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(["scope-a"]) }
    const bindings = { getById: vi.fn().mockResolvedValue({ id: "entry-a", scope_id: "scope-a" }) }
    const service = { reconcileArchivedAbsence: vi.fn().mockResolvedValue({ ok: true, absent: true }) }
    const handler = createReconciliationHandler(env as never, trust as never, bindings as never, service as never)
    const result = await handler.fetch(request({ "x-browser-scope": "other", "x-browser-password": "secret" }))
    expect(result?.status).toBe(204)
    expect(service.reconcileArchivedAbsence).toHaveBeenCalledWith({ scopeId: "scope-a" }, { entryId: "entry-a" })
    expect(await result?.text()).not.toContain("secret")
  })

  it("rejects body, cross-scope, and bad request protection before service work", async () => {
    const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(["other"]) }
    const bindings = { getById: vi.fn().mockResolvedValue({ id: "entry-a", scope_id: "scope-a" }) }
    const service = { reconcileArchivedAbsence: vi.fn() }
    const handler = createReconciliationHandler(env as never, trust as never, bindings as never, service as never)
    expect((await handler.fetch(request({}, "{}")))?.status).toBe(400)
    expect((await handler.fetch(request()))?.status).toBe(403)
    expect((await handler.fetch(request({ origin: "https://evil.example" })))?.status).toBe(403)
    expect(service.reconcileArchivedAbsence).not.toHaveBeenCalled()
  })
})
