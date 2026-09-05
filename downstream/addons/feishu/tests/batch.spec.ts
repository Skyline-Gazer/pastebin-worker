import { describe, expect, it, vi } from "vitest"
import { BatchLifecycleCoordinator, createBatchHandler } from "../worker/batch"

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
function request(
  body: unknown = { ids: ["entry-a", "entry-b"], action: "archive_permanent" },
  headers: HeadersInit = {},
) {
  return new Request("https://addon.example/api/batch", {
    method: "POST",
    headers: {
      cookie: "feishu_addon_session=session",
      origin: "https://addon.example",
      "x-csrf-token": "csrf",
      "idempotency-key": "batch-a",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}
function createHandler(scopes: string[] = ["scope-a"]) {
  const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(scopes) }
  const dispatch = vi.fn().mockResolvedValue(new Response(null, { status: 501 }))
  return { trust, dispatch, handler: createBatchHandler(env, trust as never, dispatch) }
}

describe("batch route protection gate", () => {
  it("is POST-only and accepts only a bounded strict JSON request with a valid opaque key", async () => {
    const { handler, dispatch } = createHandler()
    expect((await handler.fetch(new Request("https://addon.example/api/batch")))?.status).toBe(405)
    expect((await handler.fetch(request(undefined, { "content-type": "text/plain" })))?.status).toBe(415)
    expect((await handler.fetch(request(undefined, { "idempotency-key": "" })))?.status).toBe(400)
    expect((await handler.fetch(request(undefined, { "idempotency-key": "x".repeat(257) })))?.status).toBe(400)
    expect((await handler.fetch(request({ ids: ["entry-a"], action: "delete", extra: true })))?.status).toBe(400)
    expect((await handler.fetch(request({ ids: ["entry-a"], action: "restore" })))?.status).toBe(400)
    expect((await handler.fetch(request({ ids: ["entry-a", "entry-a"], action: "delete" })))?.status).toBe(400)
    expect((await handler.fetch(request({ ids: ["x".repeat(257)], action: "delete" })))?.status).toBe(400)
    expect(
      (await handler.fetch(request({ ids: Array.from({ length: 51 }, (_, i) => `entry-${i}`), action: "delete" })))
        ?.status,
    ).toBe(400)
    expect(
      (await handler.fetch(request({ ids: ["entry-a"], action: "delete" }, { "idempotency-key": "\n" })))?.status,
    ).toBe(400)
    expect((await handler.fetch(request({ ids: ["x".repeat(16 * 1024)], action: "delete" })))?.status).toBe(413)
    expect((await handler.fetch(request()))?.status).toBe(501)
    expect(dispatch).toHaveBeenLastCalledWith(
      { ids: ["entry-a", "entry-b"], action: "archive_permanent" },
      expect.objectContaining({ principalKey: "principal-a" }),
      ["scope-a"],
      "batch-a",
    )
  })

  it("rejects session and request-protection failures before the dispatch seam", async () => {
    const { trust, dispatch, handler } = createHandler()
    trust.getSession.mockResolvedValueOnce(null)
    expect((await handler.fetch(request()))?.status).toBe(401)
    expect((await handler.fetch(request(undefined, { origin: "https://evil.example" })))?.status).toBe(403)
    expect((await handler.fetch(request(undefined, { "x-csrf-token": "wrong" })))?.status).toBe(403)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it("requires a server-derived allowed scope and rejects browser authority fields before dispatch", async () => {
    const empty = createHandler([])
    expect((await empty.handler.fetch(request()))?.status).toBe(403)
    expect(empty.dispatch).not.toHaveBeenCalled()

    const protectedRoute = createHandler()
    for (const body of [
      { ids: ["guessed-id"], action: "delete", scopeId: "scope-a" },
      { ids: ["entry-a"], action: "delete", password: "secret" },
      { ids: ["entry-a"], action: "delete", pasteBody: "body" },
      { ids: ["entry-a"], action: "delete", expiresAt: "2030-01-01T00:00:00.000Z" },
    ])
      expect((await protectedRoute.handler.fetch(request(body)))?.status).toBe(400)
    expect(protectedRoute.dispatch).not.toHaveBeenCalled()
  })
})

describe("batch lifecycle delegation", () => {
  const binding = (id: string, scope_id = "scope-a") => ({ id, scope_id, credential: "sealed-secret" })
  const entry = (id: string, retentionMode: "permanent" | "timed", expiresAt: string | null) => ({
    id,
    pasteName: "safe-name",
    publicUrl: "https://paste.example/safe-name",
    visibility: "archived" as const,
    retentionMode,
    expiresAt,
    version: 2,
  })

  function createCoordinator() {
    const bindings = { getById: vi.fn() }
    const batches = {
      reserveBatch: vi.fn().mockResolvedValue({ id: "batch-1" }),
      recordBatchItem: vi.fn().mockResolvedValue(undefined),
      reconcileBatch: vi.fn().mockResolvedValue(undefined),
    }
    const service = { completeEntry: vi.fn() }
    return {
      bindings,
      batches,
      service,
      coordinator: new BatchLifecycleCoordinator(bindings, batches, service),
    }
  }

  it("resolves every binding and scope server-side, then delegates all three actions in input order", async () => {
    const { bindings, batches, service, coordinator } = createCoordinator()
    bindings.getById.mockImplementation((id: string) => binding(id))
    service.completeEntry.mockImplementation((_context: unknown, input: { entryId: string; action: string }) =>
      input.action === "delete"
        ? { ok: true, deleted: true }
        : {
            ok: true,
            entry: entry(
              input.entryId,
              input.action === "archive_expiring" ? "timed" : "permanent",
              input.action === "archive_expiring" ? "2030-01-02T03:04:05.000Z" : null,
            ),
          },
    )

    const execution = await coordinator.execute(
      { ids: ["entry-a", "entry-b", "entry-c"], action: "archive_permanent" },
      { principalKey: "principal-a" },
      ["scope-a"],
      "opaque-browser-key",
    )

    expect(batches.reserveBatch).toHaveBeenCalledWith(
      expect.objectContaining({ principalKey: "principal-a", requestId: "opaque-browser-key" }),
    )
    expect(bindings.getById).toHaveBeenNthCalledWith(1, "entry-a")
    expect(bindings.getById).toHaveBeenNthCalledWith(2, "entry-b")
    expect(bindings.getById).toHaveBeenNthCalledWith(3, "entry-c")
    expect(service.completeEntry).toHaveBeenNthCalledWith(
      1,
      { scopeId: "scope-a" },
      expect.objectContaining({ entryId: "entry-a", action: "archive_permanent" }),
    )
    expect(service.completeEntry).toHaveBeenNthCalledWith(
      2,
      { scopeId: "scope-a" },
      expect.objectContaining({ entryId: "entry-b", action: "archive_permanent" }),
    )
    expect(execution.items).toEqual([
      expect.objectContaining({ id: "entry-a", outcome: "succeeded", expiresAt: null }),
      expect.objectContaining({ id: "entry-b", outcome: "succeeded", expiresAt: null }),
      expect.objectContaining({ id: "entry-c", outcome: "succeeded", expiresAt: null }),
    ])
    expect(JSON.stringify(execution)).not.toContain("sealed-secret")
    const expiringExecution = await coordinator.execute(
      { ids: ["entry-a"], action: "archive_expiring" },
      { principalKey: "principal-a" },
      ["scope-a"],
      "opaque-browser-key-expiring",
    )
    expect(expiringExecution.items).toEqual([
      expect.objectContaining({ id: "entry-a", outcome: "succeeded", expiresAt: "2030-01-02T03:04:05.000Z" }),
    ])
    const deleteExecution = await coordinator.execute(
      { ids: ["entry-a"], action: "delete" },
      { principalKey: "principal-a" },
      ["scope-a"],
      "opaque-browser-key-delete",
    )
    expect(deleteExecution.items).toEqual([
      expect.objectContaining({ id: "entry-a", outcome: "succeeded", deleted: true }),
    ])
    expect(service.completeEntry).toHaveBeenNthCalledWith(
      4,
      { scopeId: "scope-a" },
      expect.objectContaining({ action: "archive_expiring" }),
    )
    expect(service.completeEntry).toHaveBeenNthCalledWith(
      5,
      { scopeId: "scope-a" },
      expect.objectContaining({ action: "delete" }),
    )
  })

  it("makes missing or inaccessible IDs indistinguishable and preserves earlier success when a later item fails", async () => {
    const { bindings, batches, service, coordinator } = createCoordinator()
    bindings.getById.mockImplementation((id: string) =>
      id === "entry-a" ? binding(id) : id === "entry-b" ? binding(id, "other") : null,
    )
    service.completeEntry.mockResolvedValueOnce({ ok: true, entry: entry("entry-a", "permanent", null) })

    const execution = await coordinator.execute(
      { ids: ["entry-a", "entry-b", "entry-c"], action: "archive_permanent" },
      { principalKey: "principal-a" },
      ["scope-a"],
      "opaque-browser-key",
    )

    expect(execution.items.map((item) => item.outcome === "failed" && item.code)).toEqual([
      false,
      "ENTRY_UNAVAILABLE",
      "ENTRY_UNAVAILABLE",
    ])
    expect(service.completeEntry).toHaveBeenCalledTimes(1)
    expect(batches.recordBatchItem).toHaveBeenCalledTimes(3)
  })

  it("retains reconciliation evidence when an item is uncertain or item evidence persistence fails", async () => {
    const uncertain = createCoordinator()
    uncertain.bindings.getById.mockResolvedValue(binding("entry-a"))
    uncertain.service.completeEntry.mockResolvedValue({
      ok: false,
      code: "RECONCILIATION_REQUIRED",
      retryable: true,
      correlationId: "internal",
    })
    const first = await uncertain.coordinator.execute(
      { ids: ["entry-a"], action: "delete" },
      { principalKey: "principal-a" },
      ["scope-a"],
      "opaque-browser-key",
    )
    expect(first.items[0]).toMatchObject({ outcome: "failed", code: "RECONCILIATION_REQUIRED" })
    expect(uncertain.batches.reconcileBatch).toHaveBeenCalled()

    const persistence = createCoordinator()
    persistence.bindings.getById.mockResolvedValue(binding("entry-a"))
    persistence.service.completeEntry.mockResolvedValue({ ok: true, deleted: true })
    persistence.batches.recordBatchItem.mockRejectedValueOnce(new Error("D1 secret=never-leak"))
    await expect(
      persistence.coordinator.execute(
        { ids: ["entry-a"], action: "delete" },
        { principalKey: "principal-a" },
        ["scope-a"],
        "opaque-browser-key",
      ),
    ).rejects.toThrow("BATCH_EVIDENCE_UNAVAILABLE")
    expect(persistence.batches.reconcileBatch).toHaveBeenCalled()
  })
})
