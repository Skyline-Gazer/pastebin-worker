import { describe, expect, it, vi } from "vitest"
import { BatchLifecycleCoordinator, createBatchDispatch, createBatchHandler } from "../worker/batch"

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
      reserveBatch: vi.fn().mockResolvedValue({ kind: "created", id: "batch-1" }),
      recordBatchItem: vi.fn().mockResolvedValue(undefined),
      reconcileBatch: vi.fn().mockResolvedValue(undefined),
      completeBatch: vi.fn().mockResolvedValue(undefined),
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
    await expect(
      uncertain.coordinator.execute(
        { ids: ["entry-a"], action: "delete" },
        { principalKey: "principal-a" },
        ["scope-a"],
        "opaque-browser-key",
      ),
    ).rejects.toMatchObject({ code: "BATCH_IN_PROGRESS" })
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

  it("serializes every processed result in input order with exact public aggregates", async () => {
    const { bindings, service, coordinator } = createCoordinator()
    bindings.getById.mockImplementation((id: string) => (id === "missing" ? null : binding(id)))
    service.completeEntry
      .mockResolvedValueOnce({ ok: true, entry: entry("entry-a", "permanent", null) })
      .mockResolvedValueOnce({ ok: false, code: "untrusted-detail", retryable: true })
    const execution = await coordinator.execute(
      { ids: ["entry-a", "missing", "entry-b"], action: "archive_permanent" },
      { principalKey: "principal-a" },
      ["scope-a"],
      "result-key",
    )
    expect(execution.result).toEqual({
      requested: 3,
      succeeded: 1,
      failed: 2,
      results: [
        { id: "entry-a", status: "ok", state: { visibility: "archived", retentionMode: "permanent", expiresAt: null } },
        { id: "missing", status: "failed", code: "ENTRY_UNAVAILABLE", retryable: false },
        { id: "entry-b", status: "failed", code: "STORAGE_OR_CREDENTIAL_UNAVAILABLE", retryable: true },
      ],
    })
  })

  it("replays a completed matching principal key without a second lifecycle call", async () => {
    const { bindings, batches, service, coordinator } = createCoordinator()
    const saved = {
      requested: 1,
      succeeded: 1,
      failed: 0,
      results: [{ id: "entry-a", status: "ok" as const, deleted: true as const }],
    }
    batches.reserveBatch.mockResolvedValueOnce({ kind: "completed", id: "batch-1", result: JSON.stringify(saved) })
    const execution = await coordinator.execute(
      { ids: ["entry-a"], action: "delete" },
      { principalKey: "principal-a" },
      ["scope-a"],
      "replay-key",
    )
    expect(execution.result).toEqual(saved)
    expect(bindings.getById).not.toHaveBeenCalled()
    expect(service.completeEntry).not.toHaveBeenCalled()
  })

  it("rejects conflicting, in-progress, and reconciliation-required replays before lifecycle dispatch", async () => {
    const { bindings, batches, service, coordinator } = createCoordinator()
    for (const stored of [
      { kind: "existing", id: "batch-1", fingerprint: "different", status: "completed", result: "{}" },
      {
        kind: "existing",
        id: "batch-1",
        fingerprint: JSON.stringify(["delete", ["entry-a"]]),
        status: "dispatched",
        result: null,
      },
      {
        kind: "existing",
        id: "batch-1",
        fingerprint: JSON.stringify(["delete", ["entry-a"]]),
        status: "reconciliation_required",
        result: null,
      },
    ]) {
      batches.reserveBatch.mockResolvedValueOnce(stored)
      await expect(
        coordinator.execute(
          { ids: ["entry-a"], action: "delete" },
          { principalKey: "principal-a" },
          ["scope-a"],
          "key",
        ),
      ).rejects.toMatchObject({ code: stored.fingerprint === "different" ? "REQUEST_CONFLICT" : "BATCH_IN_PROGRESS" })
    }
    expect(bindings.getById).not.toHaveBeenCalled()
    expect(service.completeEntry).not.toHaveBeenCalled()
  })

  it("returns processed 200 JSON for all-success, mixed, and all-failed batches", async () => {
    const cases = [
      { requested: 1, succeeded: 1, failed: 0, results: [{ id: "a", status: "ok", deleted: true }] },
      {
        requested: 2,
        succeeded: 1,
        failed: 1,
        results: [
          { id: "a", status: "ok", deleted: true },
          { id: "b", status: "failed", code: "ENTRY_UNAVAILABLE", retryable: false },
        ],
      },
      {
        requested: 1,
        succeeded: 0,
        failed: 1,
        results: [{ id: "a", status: "failed", code: "ENTRY_UNAVAILABLE", retryable: false }],
      },
    ]
    for (const result of cases) {
      const coordinator = { execute: vi.fn().mockResolvedValue({ result }) }
      const response = await createBatchDispatch(coordinator as never)(
        { ids: result.results.map((item) => item.id), action: "delete" },
        session,
        ["scope-a"],
        "key",
      )
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(result)
    }
  })
})
