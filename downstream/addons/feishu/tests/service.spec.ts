import { env } from "cloudflare:test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import migration from "../migrations/0001_bindings.sql?raw"
import migration3 from "../migrations/0003_lifecycle_completion.sql?raw"
import migration4 from "../migrations/0004_permanent_restore.sql?raw"
import migration5 from "../migrations/0005_timed_restore.sql?raw"
import migration6 from "../migrations/0006_batch_operations.sql?raw"
import { Credentials } from "../worker/credentials"
import { PasteClient } from "../worker/paste-client"
import { BindingStore, type Operation } from "../worker/store"
import { EntryService } from "../worker/service"

const db = (env as unknown as { DB: D1Database }).DB
const context = { scopeId: "scope-a" }
const input = { recordKey: "record-1", requestId: "create-1", content: "original" }

async function setup() {
  const credentials = await Credentials.create("key1", "11".repeat(32), "22".repeat(32))
  let content = "original"
  let expiresAt: string | null = null
  const transport = vi.fn<typeof fetch>((url, init) => {
    if (init?.method === "POST" || init?.method === "PUT") {
      content = (init.body as FormData).get("c") as string
      const expiring = (init.body as FormData).get("e") === "max"
      expiresAt = expiring ? "2030-01-02T03:04:05.000Z" : null
      return Promise.resolve(
        Response.json({
          url: "https://paste.example/abcd",
          expireAt: expiresAt,
          expirationSeconds: expiring ? 3600 : null,
        }),
      )
    }
    if (typeof url === "string" && url.includes("/m/")) return Promise.resolve(Response.json({ expireAt: expiresAt }))
    return Promise.resolve(new Response(content))
  })
  const store = new BindingStore(db)
  const client = new PasteClient("https://paste.example", transport)
  return { credentials, transport, store, service: new EntryService(store, credentials, client) }
}

beforeEach(async () => {
  await db.exec(
    "DROP TABLE IF EXISTS feishu_batch_items; DROP TABLE IF EXISTS feishu_batch_operations; DROP TABLE IF EXISTS feishu_operations; DROP TABLE IF EXISTS feishu_bindings;",
  )
  for (const statement of `${migration}\n${migration3}\n${migration4}\n${migration5}\n${migration6}`
    .split(";")
    .filter((part) => part.trim()))
    await db.prepare(statement).run()
})

describe("persistent internal entry services", () => {
  it("persists additive batch evidence without coupling it to a binding lifetime", async () => {
    const { store } = await setup()
    const batch = await store.reserveBatch({
      principalKey: "principal-a",
      requestId: "browser-key",
      action: "delete",
      ids: ["deleted-entry", "unavailable-entry"],
    })
    await store.recordBatchItem({
      batchId: batch.id,
      entryId: "deleted-entry",
      requestId: `${batch.id}:0:deleted-entry`,
      scopeId: "scope-a",
      outcome: "succeeded",
      code: null,
    })
    await store.recordBatchItem({
      batchId: batch.id,
      entryId: "unavailable-entry",
      requestId: `${batch.id}:1:unavailable-entry`,
      scopeId: null,
      outcome: "failed",
      code: "ENTRY_UNAVAILABLE",
    })
    await store.reconcileBatch(batch.id)
    expect(await db.prepare("SELECT status FROM feishu_batch_operations WHERE id = ?").bind(batch.id).first()).toEqual({
      status: "reconciliation_required",
    })
    expect(
      (await db
        .prepare("SELECT count(*) AS n FROM feishu_batch_items WHERE batch_id = ?")
        .bind(batch.id)
        .first<{ n: number }>())!.n,
    ).toBe(2)
  })

  it("creates permanent bindings, encrypts secrets and retries known success without POST", async () => {
    const { service, transport, credentials } = await setup()
    const first = await service.createEntry(context, input)
    expect(first.ok).toBe(true)
    expect(await service.createEntry(context, input)).toEqual(first)
    expect(transport.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1)
    const body = transport.mock.calls[0][1]!.body as FormData
    expect(body.get("e")).toBe("never")
    const binding = await db.prepare("SELECT * FROM feishu_bindings").first<{ id: string; credential: string }>()
    expect(await credentials.open(binding!.id, binding!.credential)).toBe(body.get("s"))
    expect(JSON.stringify(first)).not.toContain(body.get("s") as string)
    expect(JSON.stringify(first)).not.toContain("credential")
    expect(JSON.stringify(first)).not.toContain("manageUrl")
  })

  it("updates the same Paste and preserves known-success request identity across later updates", async () => {
    const { service, transport } = await setup()
    const created = await service.createEntry(context, input)
    if (!created.ok) throw new Error("create failed")
    const update = { entryId: created.entry.id, requestId: "update-1", expectedVersion: 1, content: "new" }
    const updated = await service.updateContent(context, update)
    expect(updated.ok).toBe(true)
    expect(await service.updateContent(context, update)).toEqual(updated)
    const calls = transport.mock.calls.filter(([, init]) => init?.method === "PUT")
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toMatch(/^https:\/\/paste.example\/abcd:[a-f0-9]{64}$/)
    expect(await service.readEntry(context, { entryId: created.entry.id })).toMatchObject({ ok: true, content: "new" })
    expect(await service.updateContent(context, { ...update, content: "different" })).toMatchObject({ ok: false })
  })

  it("reserves concurrent duplicate creates only once", async () => {
    const { service, transport } = await setup()
    await Promise.all([service.createEntry(context, input), service.createEntry(context, input)])
    expect(transport.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1)
    expect((await db.prepare("SELECT count(*) AS n FROM feishu_bindings").first<{ n: number }>())!.n).toBe(1)
  })

  it("never retries an uncertain create even after service restart", async () => {
    const { service, transport } = await setup()
    transport.mockRejectedValue(new Error("password=DO_NOT_EXPOSE"))
    expect(await service.createEntry(context, input)).toMatchObject({ ok: false, code: "RECONCILIATION_REQUIRED" })
    const restarted = await setup()
    expect(await restarted.service.createEntry(context, input)).toMatchObject({ ok: false })
    expect(restarted.transport).not.toHaveBeenCalled()
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it("denies cross-scope reads and mutations without upstream requests", async () => {
    const { service, transport } = await setup()
    const created = await service.createEntry(context, input)
    if (!created.ok) throw new Error("create failed")
    transport.mockClear()
    expect(await service.readEntry({ scopeId: "other" }, { entryId: created.entry.id })).toMatchObject({ ok: false })
    expect(
      await service.updateContent(
        { scopeId: "other" },
        {
          entryId: created.entry.id,
          requestId: "update",
          expectedVersion: 1,
          content: "bad",
        },
      ),
    ).toMatchObject({ ok: false })
    expect(transport).not.toHaveBeenCalled()
  })

  it("does not dispatch after reservation failure", async () => {
    const { service, store, transport } = await setup()
    vi.spyOn(store, "reserveCreate").mockRejectedValueOnce(new Error("database unavailable"))
    expect(await service.createEntry(context, input)).toMatchObject({ ok: false })
    expect(transport).not.toHaveBeenCalled()
  })

  it("serializes concurrent updates through a durable claim and rejects stale versions", async () => {
    const { service, transport } = await setup()
    const created = await service.createEntry(context, input)
    if (!created.ok) throw new Error("create failed")
    const update = { entryId: created.entry.id, requestId: "u1", expectedVersion: 1, content: "next" }
    const results = await Promise.all([
      service.updateContent(context, update),
      service.updateContent(context, { ...update, requestId: "u2" }),
    ])
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(transport.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1)
    expect(await service.updateContent(context, { ...update, requestId: "u3" })).toMatchObject({ ok: false })
  })

  it("rolls back binding insertion when a scope request key conflicts", async () => {
    const { service } = await setup()
    expect((await service.createEntry(context, input)).ok).toBe(true)
    expect(await service.createEntry(context, { ...input, recordKey: "other" })).toMatchObject({ ok: false })
    expect((await db.prepare("SELECT count(*) AS n FROM feishu_bindings").first<{ n: number }>())!.n).toBe(1)
  })

  it("preserves uncertain state after a successful POST and failed identity persistence", async () => {
    const { service, store, transport } = await setup()
    vi.spyOn(store, "rememberName").mockRejectedValueOnce(new Error("storage unavailable"))
    expect(await service.createEntry(context, input)).toMatchObject({ ok: false, code: "RECONCILIATION_REQUIRED" })
    const binding = await db.prepare("SELECT id FROM feishu_bindings").first<{ id: string }>()
    expect(await service.reconcileEntry(context, { entryId: binding!.id })).toMatchObject({
      ok: false,
      code: "OPERATOR_RECONCILIATION_REQUIRED",
    })
    await service.createEntry(context, input)
    expect(transport.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1)
  })

  it("does not unlock an interrupted dispatch or matching uncertain PUT", async () => {
    const { service, store, transport } = await setup()
    const created = await service.createEntry(context, input)
    if (!created.ok) throw new Error("create failed")
    vi.spyOn(store, "finish").mockRejectedValueOnce(new Error("lost database response"))
    expect(
      await service.updateContent(context, {
        entryId: created.entry.id,
        requestId: "uncertain",
        expectedVersion: 1,
        content: "next",
      }),
    ).toMatchObject({ ok: false })
    expect(await service.reconcileEntry(context, { entryId: created.entry.id })).toMatchObject({
      ok: false,
      code: "OUTCOME_OBSERVED_OPERATOR_CONFIRMATION_REQUIRED",
    })
    await db.prepare("UPDATE feishu_operations SET status = 'dispatched' WHERE request_id = 'uncertain'").run()
    const restarted = await setup()
    expect(
      await restarted.service.updateContent(context, {
        entryId: created.entry.id,
        requestId: "new-request",
        expectedVersion: 1,
        content: "newer",
      }),
    ).toMatchObject({ ok: false })
    expect(restarted.transport).not.toHaveBeenCalled()
    expect(transport.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1)
  })

  it("returns missing state without recreating a deleted Paste", async () => {
    const { service, transport } = await setup()
    const created = await service.createEntry(context, input)
    if (!created.ok) throw new Error("create failed")
    transport.mockClear().mockResolvedValue(new Response(null, { status: 404 }))
    expect(await service.readEntry(context, { entryId: created.entry.id })).toMatchObject({
      ok: false,
      code: "ENTRY_NOT_FOUND",
    })
    expect(transport.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true)
  })

  it("archives only the single managed top-level task and persists authoritative expiry", async () => {
    const { service, transport } = await setup()
    const created = await service.createEntry(context, { ...input, content: "- [ ] managed\n  - [ ] nested content" })
    if (!created.ok) throw new Error("create failed")
    const permanent = await service.completeEntry(context, {
      entryId: created.entry.id,
      requestId: "complete-1",
      action: "archive_permanent",
    })
    expect(permanent).toMatchObject({
      ok: true,
      entry: { visibility: "archived", retentionMode: "permanent", expiresAt: null, version: 2 },
    })
    expect(
      await service.completeEntry(context, {
        entryId: created.entry.id,
        requestId: "complete-1",
        action: "archive_permanent",
      }),
    ).toEqual(permanent)
    const timedCreated = await service.createEntry(context, {
      recordKey: "record-timed",
      requestId: "create-timed",
      content: "- [ ] timed",
    })
    if (!timedCreated.ok) throw new Error("create failed")
    expect(
      await service.completeEntry(context, {
        entryId: timedCreated.entry.id,
        requestId: "complete-timed",
        action: "archive_expiring",
      }),
    ).toMatchObject({ ok: true, entry: { retentionMode: "timed", expiresAt: "2030-01-02T03:04:05.000Z" } })
    const writes = transport.mock.calls
      .filter(([, init]) => init?.method === "PUT")
      .map(([, init]) => init!.body as FormData)
    expect(writes.map((body) => body.get("e"))).toEqual(["never", "max"])
  })

  it("restores only a permanent archive's managed checked task after upstream confirmation", async () => {
    const { service, transport } = await setup()
    const created = await service.createEntry(context, { ...input, content: "- [ ] managed\n  - [x] nested" })
    if (!created.ok) throw new Error("create failed")
    const archived = await service.completeEntry(context, {
      entryId: created.entry.id,
      requestId: "archive-for-restore",
      action: "archive_permanent",
    })
    if (!archived.ok || !("entry" in archived)) throw new Error("archive failed")
    transport.mockClear()
    const restored = await service.restorePermanentEntry(context, { entryId: created.entry.id, requestId: "restore-1" })
    expect(restored).toMatchObject({
      ok: true,
      entry: { visibility: "active", retentionMode: "permanent", expiresAt: null, version: 3 },
    })
    expect(await service.restorePermanentEntry(context, { entryId: created.entry.id, requestId: "restore-1" })).toEqual(
      restored,
    )
    const writes = transport.mock.calls.filter(([, init]) => init?.method === "PUT")
    expect(writes).toHaveLength(1)
    expect((writes[0][1]!.body as FormData).get("c")).toBe("- [ ] managed\n  - [x] nested")
    expect((writes[0][1]!.body as FormData).get("e")).toBe("never")
  })

  it("fails closed for timed, active, ambiguous, and uncertain permanent restore", async () => {
    const { service, transport, store } = await setup()
    const created = await service.createEntry(context, { ...input, content: "- [ ] managed" })
    if (!created.ok) throw new Error("create failed")
    expect(
      await service.restorePermanentEntry(context, { entryId: created.entry.id, requestId: "active" }),
    ).toMatchObject({
      ok: false,
      code: "INVALID_LIFECYCLE_STATE",
    })
    await service.completeEntry(context, { entryId: created.entry.id, requestId: "timed", action: "archive_expiring" })
    expect(
      await service.restorePermanentEntry(context, { entryId: created.entry.id, requestId: "timed-restore" }),
    ).toMatchObject({
      ok: false,
      code: "INVALID_LIFECYCLE_STATE",
    })
    const permanent = await service.createEntry(context, {
      recordKey: "restore-permanent",
      requestId: "create-permanent",
      content: "- [ ] one",
    })
    if (!permanent.ok) throw new Error("create failed")
    await service.completeEntry(context, {
      entryId: permanent.entry.id,
      requestId: "archive-permanent",
      action: "archive_permanent",
    })
    transport.mockImplementation((_, init) =>
      init?.method === "PUT"
        ? Promise.reject(new Error("secret=never-visible"))
        : Promise.resolve(new Response("- [x] one")),
    )
    expect(
      await service.restorePermanentEntry(context, { entryId: permanent.entry.id, requestId: "uncertain-restore" }),
    ).toMatchObject({
      ok: false,
      code: "RECONCILIATION_REQUIRED",
    })
    expect(
      await service.restorePermanentEntry(context, { entryId: permanent.entry.id, requestId: "new-restore" }),
    ).toMatchObject({
      ok: false,
      code: "MUTATION_CONFLICT",
    })
    expect(JSON.stringify(await store.pending(permanent.entry.id))).not.toContain("never-visible")
  })

  it("cancels a timed expiry before restoring its managed source or final lifecycle state", async () => {
    const { service, transport, store } = await setup()
    const created = await service.createEntry(context, { ...input, content: "- [ ] timed" })
    if (!created.ok) throw new Error("create failed")
    const archived = await service.completeEntry(context, {
      entryId: created.entry.id,
      requestId: "archive-timed-for-restore",
      action: "archive_expiring",
    })
    if (!archived.ok || !("entry" in archived)) throw new Error("archive failed")
    transport.mockClear()

    const restored = await service.restoreEntry(context, { entryId: created.entry.id, requestId: "restore-timed" })

    expect(restored).toMatchObject({
      ok: true,
      entry: { visibility: "active", retentionMode: "permanent", expiresAt: null },
    })
    const writes = transport.mock.calls.filter(([, init]) => init?.method === "PUT")
    expect(writes).toHaveLength(2)
    expect((writes[0][1]!.body as FormData).get("c")).toBe("- [x] timed")
    expect((writes[0][1]!.body as FormData).get("e")).toBe("never")
    expect((writes[1][1]!.body as FormData).get("c")).toBe("- [ ] timed")
    expect((await store.get(context.scopeId, created.entry.id))?.expires_at).toBeNull()
  })

  it("keeps a timed archive and its deadline when expiry cancellation is rejected or becomes uncertain", async () => {
    const { service, transport, store } = await setup()
    const created = await service.createEntry(context, { ...input, content: "- [ ] timed" })
    if (!created.ok) throw new Error("create failed")
    const archived = await service.completeEntry(context, {
      entryId: created.entry.id,
      requestId: "archive-timed-failure",
      action: "archive_expiring",
    })
    if (!archived.ok || !("entry" in archived)) throw new Error("archive failed")
    transport.mockImplementation((_, init) =>
      init?.method === "PUT"
        ? Promise.resolve(new Response(null, { status: 403 }))
        : Promise.resolve(new Response("- [x] timed")),
    )
    expect(
      await service.restoreEntry(context, { entryId: created.entry.id, requestId: "timed-rejected" }),
    ).toMatchObject({
      ok: false,
      code: "UPSTREAM_REJECTED",
    })
    expect(await store.get(context.scopeId, created.entry.id)).toMatchObject({
      visibility: "archived",
      retention_mode: "timed",
      expires_at: archived.entry.expiresAt,
    })
    transport.mockImplementation((_, init) =>
      init?.method === "PUT"
        ? Promise.reject(new Error("credential=never-visible"))
        : Promise.resolve(new Response("- [x] timed")),
    )
    expect(
      await service.restoreEntry(context, { entryId: created.entry.id, requestId: "timed-uncertain" }),
    ).toMatchObject({
      ok: false,
      code: "RECONCILIATION_REQUIRED",
    })
    expect(await store.pending(created.entry.id)).toMatchObject({ status: "reconciliation_required" })
  })

  it("records reconciliation evidence when timed restore persistence fails after confirmed cancellation", async () => {
    const { service, store } = await setup()
    const created = await service.createEntry(context, { ...input, content: "- [ ] timed" })
    if (!created.ok) throw new Error("create failed")
    const archived = await service.completeEntry(context, {
      entryId: created.entry.id,
      requestId: "archive-timed-persistence",
      action: "archive_expiring",
    })
    if (!archived.ok || !("entry" in archived)) throw new Error("archive failed")
    vi.spyOn(store, "finishPermanentRestore").mockRejectedValueOnce(new Error("storage unavailable"))

    expect(
      await service.restoreEntry(context, { entryId: created.entry.id, requestId: "timed-persistence" }),
    ).toMatchObject({
      ok: false,
      code: "RECONCILIATION_REQUIRED",
    })
    expect(await store.get(context.scopeId, created.entry.id)).toMatchObject({
      visibility: "archived",
      retention_mode: "timed",
      expires_at: archived.entry.expiresAt,
    })
    expect(await store.pending(created.entry.id)).toMatchObject({ status: "reconciliation_required" })
  })

  it("reads timed archived bindings when upstream metadata matches their authoritative expiry", async () => {
    const { service, store, credentials } = await setup()
    const created = await service.createEntry(context, { ...input, content: "- [ ] timed" })
    if (!created.ok) throw new Error("create failed")
    const archived = await service.completeEntry(context, {
      entryId: created.entry.id,
      requestId: "timed-read",
      action: "archive_expiring",
    })
    if (!archived.ok || !("entry" in archived)) throw new Error("archive failed")
    expect(await service.readEntry(context, { entryId: created.entry.id })).toMatchObject({
      ok: true,
      entry: { retentionMode: "timed", expiresAt: archived.entry.expiresAt },
      content: "- [x] timed",
    })
    const pending: Operation = {
      id: "timed-pending",
      scope_id: context.scopeId,
      request_id: "timed-pending",
      entry_id: created.entry.id,
      kind: "update",
      fingerprint: "fingerprint",
      content_fingerprint: await credentials.fingerprint("- [x] timed"),
      expected_version: archived.entry.version,
      status: "reserved",
      result: null,
    }
    expect(await store.reserveUpdate(pending)).toBe(true)
    expect(await service.reconcileEntry(context, { entryId: created.entry.id })).toMatchObject({
      ok: false,
      code: "OUTCOME_OBSERVED_OPERATOR_CONFIRMATION_REQUIRED",
    })
  })

  it("reconciles only a confirmed missing archived Paste and retains every uncertain case", async () => {
    const { service, store, transport } = await setup()
    const created = await service.createEntry(context, { ...input, content: "- [ ] archived" })
    if (!created.ok) throw new Error("create failed")
    await service.completeEntry(context, {
      entryId: created.entry.id,
      requestId: "archive-for-reconciliation",
      action: "archive_permanent",
    })
    transport.mockClear().mockResolvedValue(new Response(null, { status: 404 }))
    expect(await service.reconcileArchivedAbsence(context, { entryId: created.entry.id })).toEqual({
      ok: true,
      absent: true,
    })
    expect(await store.get(context.scopeId, created.entry.id)).toBeNull()

    const { service: persistenceService, store: persistenceStore, transport: persistenceTransport } = await setup()
    const persistence = await persistenceService.createEntry(context, {
      ...input,
      recordKey: "persistence",
      requestId: "persistence",
      content: "- [ ] persistence",
    })
    if (!persistence.ok) throw new Error("create failed")
    await persistenceService.completeEntry(context, {
      entryId: persistence.entry.id,
      requestId: "archive-persistence",
      action: "archive_permanent",
    })
    persistenceTransport.mockClear().mockResolvedValue(new Response(null, { status: 404 }))
    vi.spyOn(persistenceStore, "removeConfirmedAbsentArchived").mockRejectedValueOnce(new Error("storage unavailable"))
    expect(await persistenceService.reconcileArchivedAbsence(context, { entryId: persistence.entry.id })).toMatchObject(
      {
        ok: false,
        code: "RECONCILIATION_REQUIRED",
      },
    )
    expect(await persistenceStore.get(context.scopeId, persistence.entry.id)).not.toBeNull()

    const { service: retainedService, store: retainedStore, transport: retainedTransport } = await setup()
    const retained = await retainedService.createEntry(context, {
      ...input,
      recordKey: "retained",
      requestId: "retained",
      content: "- [ ] retained",
    })
    if (!retained.ok) throw new Error("create failed")
    await retainedService.completeEntry(context, {
      entryId: retained.entry.id,
      requestId: "archive-retained",
      action: "archive_permanent",
    })
    retainedTransport.mockRejectedValueOnce(new Error("credential=never-visible"))
    expect(await retainedService.reconcileArchivedAbsence(context, { entryId: retained.entry.id })).toMatchObject({
      ok: false,
      code: "UPSTREAM_UNCERTAIN",
      retryable: true,
    })
    expect(await retainedStore.get(context.scopeId, retained.entry.id)).not.toBeNull()
    expect(
      JSON.stringify(await retainedService.reconcileArchivedAbsence(context, { entryId: retained.entry.id })),
    ).not.toContain("never-visible")
  })

  it("does not reconcile active, invalid, pending restore, or locally unpersisted bindings away", async () => {
    const { service, store, transport, credentials } = await setup()
    const active = await service.createEntry(context, { ...input, content: "- [ ] invalid" })
    if (!active.ok) throw new Error("create failed")
    expect(await service.reconcileArchivedAbsence(context, { entryId: active.entry.id })).toMatchObject({
      ok: false,
      code: "INVALID_LIFECYCLE_STATE",
    })
    expect(
      await service.completeEntry(context, {
        entryId: active.entry.id,
        requestId: "archive-invalid",
        action: "archive_expiring",
      }),
    ).toMatchObject({ ok: true, entry: { retentionMode: "timed" } })
    await db.prepare("UPDATE feishu_bindings SET expires_at = 'not-a-date' WHERE id = ?").bind(active.entry.id).run()
    expect(await service.reconcileArchivedAbsence(context, { entryId: active.entry.id })).toMatchObject({
      ok: false,
      code: "RECONCILIATION_REQUIRED",
    })
    await db
      .prepare("UPDATE feishu_bindings SET retention_mode = 'permanent', expires_at = NULL WHERE id = ?")
      .bind(active.entry.id)
      .run()
    const pending: Operation = {
      id: "restore-pending",
      scope_id: context.scopeId,
      request_id: "restore-pending",
      entry_id: active.entry.id,
      kind: "restore_permanent",
      fingerprint: "f",
      content_fingerprint: await credentials.fingerprint(""),
      expected_version: 2,
      status: "reserved",
      result: null,
    }
    expect(await store.reservePermanentRestore(pending)).toBe(true)
    transport.mockClear()
    expect(await service.reconcileArchivedAbsence(context, { entryId: active.entry.id })).toMatchObject({
      ok: false,
      code: "RECONCILIATION_REQUIRED",
    })
    expect(transport).not.toHaveBeenCalled()
  })

  it("preserves a missing Paste error while reading completion source before reservation", async () => {
    const { service, transport } = await setup()
    const created = await service.createEntry(context, { ...input, content: "- [ ] missing" })
    if (!created.ok) throw new Error("create failed")
    transport.mockResolvedValueOnce(new Response(null, { status: 404 }))
    expect(
      await service.completeEntry(context, {
        entryId: created.entry.id,
        requestId: "missing-source",
        action: "archive_permanent",
      }),
    ).toMatchObject({ ok: false, code: "ENTRY_NOT_FOUND", retryable: false })
  })

  it("replays a delete that wins the reservation race as a delete result", async () => {
    const { service, store, credentials } = await setup()
    const created = await service.createEntry(context, { ...input, content: "- [ ] delete" })
    if (!created.ok) throw new Error("create failed")
    const raced: Operation = {
      id: "winner",
      scope_id: context.scopeId,
      request_id: "delete-race",
      entry_id: created.entry.id,
      kind: "delete",
      fingerprint: await credentials.fingerprint(
        JSON.stringify(["complete", context.scopeId, created.entry.id, "delete"]),
      ),
      content_fingerprint: "fingerprint",
      expected_version: created.entry.version,
      status: "succeeded",
      result: "{}",
    }
    vi.spyOn(store, "operation").mockResolvedValueOnce(null).mockResolvedValueOnce(raced)
    vi.spyOn(store, "reserveCompletion").mockRejectedValueOnce(new Error("unique race"))
    expect(
      await service.completeEntry(context, {
        entryId: created.entry.id,
        requestId: "delete-race",
        action: "delete",
      }),
    ).toEqual({ ok: true, deleted: true })
  })

  it("fails closed on ambiguous task source and deletes only after upstream DELETE", async () => {
    const { service, transport } = await setup()
    const created = await service.createEntry(context, { ...input, content: "- [ ] one\n- [ ] two" })
    if (!created.ok) throw new Error("create failed")
    expect(
      await service.completeEntry(context, {
        entryId: created.entry.id,
        requestId: "ambiguous",
        action: "archive_permanent",
      }),
    ).toMatchObject({ ok: false, code: "MANAGED_TASK_AMBIGUOUS" })
    const deletable = await service.createEntry(context, {
      recordKey: "delete",
      requestId: "create-delete",
      content: "- [ ] delete",
    })
    if (!deletable.ok) throw new Error("create failed")
    expect(
      await service.completeEntry(context, { entryId: deletable.entry.id, requestId: "delete-1", action: "delete" }),
    ).toEqual({ ok: true, deleted: true })
    expect(
      await service.completeEntry(context, { entryId: deletable.entry.id, requestId: "delete-1", action: "delete" }),
    ).toEqual({ ok: true, deleted: true })
    expect(transport.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true)
    expect(await service.readEntry(context, { entryId: deletable.entry.id })).toMatchObject({
      ok: false,
      code: "ENTRY_NOT_FOUND",
    })
  })

  it("does not treat task syntax in fenced code as a managed task", async () => {
    const { service } = await setup()
    const created = await service.createEntry(context, { ...input, content: "```md\n- [ ] literal\n```" })
    if (!created.ok) throw new Error("create failed")
    expect(
      await service.completeEntry(context, {
        entryId: created.entry.id,
        requestId: "fenced",
        action: "archive_permanent",
      }),
    ).toMatchObject({ ok: false, code: "MANAGED_TASK_AMBIGUOUS" })
  })
})
