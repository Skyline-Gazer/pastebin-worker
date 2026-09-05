import {
  BrowserAuthError,
  requireBrowserRequestProtection,
  requireBrowserSession,
  type BrowserAuthEnvironment,
} from "./browser-auth"
import type { BrowserSession, BrowserTrustStore } from "./browser-store"
import { batchActions, type BatchAction, type BatchRequest } from "../shared/batch"
import type { BatchItemResult, BatchResult } from "../shared/batch"
import type { EntryService } from "./service"
import type { BindingStore } from "./store"

const maxBodyBytes = 16 * 1024
const maxIds = 50
const maxIdLength = 256
const printable = (value: string) => /^[\x20-\x7e]+$/.test(value)
const json = (code: string, status: number) => Response.json({ code }, { status })

export type BatchDispatchGate = (
  request: BatchRequest,
  session: BrowserSession,
  allowedScopes: string[],
  idempotencyKey: string,
) => Promise<Response>

/** Server-only durable evidence used by Phase 9.2.  Phase 9.3 owns public
 * result serialization, idempotent replay, and aggregate response semantics. */
export interface BatchEvidenceStore {
  reserveBatch(input: { principalKey: string; requestId: string; action: BatchAction; ids: string[] }): Promise<
    | { kind: "created"; id: string }
    | { kind: "completed"; id: string; fingerprint?: string; result: string }
    | {
        kind: "existing"
        id: string
        fingerprint: string
        status: "dispatched" | "reconciliation_required"
        result: null
      }
  >
  recordBatchItem(input: {
    batchId: string
    entryId: string
    requestId: string
    scopeId: string | null
    outcome: "succeeded" | "failed"
    code: string | null
  }): Promise<void>
  reconcileBatch(id: string): Promise<void>
  completeBatch(id: string, result: string): Promise<void>
}

export interface BatchLifecycleItem {
  id: string
  outcome: "succeeded" | "failed"
  deleted?: true
  expiresAt?: string | null
  code?: string
  retryable?: boolean
}

export interface BatchLifecycleExecution {
  batchId: string
  items: BatchLifecycleItem[]
  result: BatchResult
}

const publicFailureCodes = new Set([
  "MANAGED_TASK_AMBIGUOUS",
  "VERSION_CONFLICT",
  "MUTATION_CONFLICT",
  "UPSTREAM_REJECTED",
  "UPSTREAM_UPDATE_FAILED",
  "UPSTREAM_DELETE_FAILED",
  "RECONCILIATION_REQUIRED",
  "STORAGE_OR_CREDENTIAL_UNAVAILABLE",
])

export class BatchReplayError extends Error {
  constructor(readonly code: "REQUEST_CONFLICT" | "BATCH_IN_PROGRESS") {
    super(code)
  }
}

/** Converts only the already-sanitized coordinator result to the public HTTP
 * contract.  Reservation/replay errors intentionally disclose stable codes. */
export function createBatchDispatch(coordinator: Pick<BatchLifecycleCoordinator, "execute">): BatchDispatchGate {
  return async (request, session, scopes, requestId) => {
    try {
      return Response.json((await coordinator.execute(request, session, scopes, requestId)).result)
    } catch (error) {
      if (error instanceof BatchReplayError) return Response.json({ code: error.code }, { status: 409 })
      return Response.json({ code: "STORAGE_OR_CREDENTIAL_UNAVAILABLE" }, { status: 503 })
    }
  }
}

const fingerprint = (request: BatchRequest) => JSON.stringify([request.action, request.ids])
function validResult(value: unknown, request: BatchRequest): value is BatchResult {
  if (!value || typeof value !== "object") return false
  const result = value as BatchResult
  return (
    result.requested === request.ids.length &&
    result.succeeded + result.failed === result.requested &&
    Array.isArray(result.results) &&
    result.results.length === request.ids.length &&
    result.results.every((item, index) => item?.id === request.ids[index])
  )
}
function serialize(items: BatchLifecycleItem[]): BatchResult {
  const results: BatchItemResult[] = items.map((item) => {
    if (item.outcome === "succeeded") {
      if (item.deleted) return { id: item.id, status: "ok", deleted: true }
      return {
        id: item.id,
        status: "ok",
        state: {
          visibility: "archived",
          retentionMode: item.expiresAt ? "timed" : "permanent",
          expiresAt: item.expiresAt ?? null,
        },
      }
    }
    return {
      id: item.id,
      status: "failed",
      code: item.code ?? "STORAGE_OR_CREDENTIAL_UNAVAILABLE",
      retryable: !!item.retryable,
    }
  })
  const succeeded = results.filter((item) => item.status === "ok").length
  return { requested: results.length, succeeded, failed: results.length - succeeded, results }
}

/**
 * This coordinator deliberately resolves only binding/scope facts. Password
 * opening, Paste calls, lifecycle ordering, and per-entry durable claims stay
 * in EntryService.completeEntry, so batch cannot drift from single completion.
 */
export class BatchLifecycleCoordinator {
  constructor(
    private readonly bindings: Pick<BindingStore, "getById">,
    private readonly batches: BatchEvidenceStore,
    private readonly service: Pick<EntryService, "completeEntry">,
  ) {}

  async execute(
    request: BatchRequest,
    session: Pick<BrowserSession, "principalKey">,
    allowedScopes: string[],
    requestId: string,
  ): Promise<BatchLifecycleExecution> {
    const requestFingerprint = fingerprint(request)
    const batch = await this.batches.reserveBatch({
      principalKey: session.principalKey,
      requestId,
      action: request.action,
      ids: request.ids,
    })
    if (batch.kind === "completed") {
      if (batch.fingerprint && batch.fingerprint !== requestFingerprint) throw new BatchReplayError("REQUEST_CONFLICT")
      const result: unknown = JSON.parse(batch.result)
      if (!validResult(result, request)) throw new BatchReplayError("BATCH_IN_PROGRESS")
      return { batchId: batch.id, items: [], result }
    }
    if (batch.kind === "existing") {
      if (batch.fingerprint !== requestFingerprint) throw new BatchReplayError("REQUEST_CONFLICT")
      throw new BatchReplayError("BATCH_IN_PROGRESS")
    }
    const items: BatchLifecycleItem[] = []
    let requiresReconciliation = false
    for (const [index, id] of request.ids.entries()) {
      const itemRequestId = `${batch.id}:${index}:${id}`
      let item: BatchLifecycleItem
      let scopeId: string | null = null
      try {
        const binding = await this.bindings.getById(id)
        if (!binding || !allowedScopes.includes(binding.scope_id)) {
          item = { id, outcome: "failed", code: "ENTRY_UNAVAILABLE", retryable: false }
        } else {
          scopeId = binding.scope_id
          const result = await this.service.completeEntry(
            { scopeId },
            { entryId: binding.id, requestId: itemRequestId, action: request.action },
          )
          if (result.ok && "deleted" in result) item = { id, outcome: "succeeded", deleted: true }
          else if (result.ok) item = { id, outcome: "succeeded", expiresAt: result.entry.expiresAt }
          else {
            const code = publicFailureCodes.has(result.code) ? result.code : "STORAGE_OR_CREDENTIAL_UNAVAILABLE"
            // An uncertain lifecycle dispatch is deliberately not browser-retryable:
            // replay is held until reconciliation has durable safe evidence.
            item = {
              id,
              outcome: "failed",
              code,
              retryable: code === "RECONCILIATION_REQUIRED" ? false : result.retryable,
            }
            requiresReconciliation ||= code === "RECONCILIATION_REQUIRED"
          }
        }
      } catch {
        item = { id, outcome: "failed", code: "STORAGE_OR_CREDENTIAL_UNAVAILABLE", retryable: true }
        requiresReconciliation = true
      }
      try {
        await this.batches.recordBatchItem({
          batchId: batch.id,
          entryId: id,
          requestId: itemRequestId,
          scopeId,
          outcome: item.outcome,
          code: item.code ?? null,
        })
      } catch {
        // A lifecycle effect may already exist. Mark the batch uncertain instead
        // of reporting an unrecorded result or attempting a compensating action.
        try {
          await this.batches.reconcileBatch(batch.id)
        } catch {
          /* original durable record remains the fail-closed evidence */
        }
        throw new Error("BATCH_EVIDENCE_UNAVAILABLE")
      }
      items.push(item)
    }
    if (requiresReconciliation) {
      await this.batches.reconcileBatch(batch.id)
      // Do not turn ambiguous delete/update evidence into a completed replay
      // record. A later retry must wait for reconciliation rather than dispatch.
      throw new BatchReplayError("BATCH_IN_PROGRESS")
    }
    const result = serialize(items)
    try {
      await this.batches.completeBatch(batch.id, JSON.stringify(result))
    } catch {
      await this.batches.reconcileBatch(batch.id)
      throw new Error("BATCH_EVIDENCE_UNAVAILABLE")
    }
    return { batchId: batch.id, items, result }
  }
}

function idempotencyKey(value: string | null) {
  return !!value && value.length <= 256 && printable(value)
}
async function parseBatchRequest(request: Request): Promise<{ request: BatchRequest } | { tooLarge: true } | null> {
  const declaredLength = request.headers.get("content-length")
  if (declaredLength !== null) {
    const length = Number(declaredLength)
    if (!Number.isSafeInteger(length) || length < 0) return null
    if (length > maxBodyBytes) return { tooLarge: true }
  }
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).length > maxBodyBytes) return { tooLarge: true }
    const body: unknown = JSON.parse(raw)
    if (!body || typeof body !== "object" || Array.isArray(body)) return null
    const record = body as Record<string, unknown>
    if (Object.keys(record).length !== 2 || !("ids" in record) || !("action" in record)) return null
    if (!Array.isArray(record.ids) || record.ids.length === 0 || record.ids.length > maxIds) return null
    if (!batchActions.includes(record.action as (typeof batchActions)[number])) return null
    if (!record.ids.every((id) => typeof id === "string" && id.length <= maxIdLength && printable(id))) return null
    const ids = record.ids as string[]
    if (new Set(ids).size !== ids.length) return null
    return { request: { ids, action: record.action as BatchRequest["action"] } }
  } catch {
    return null
  }
}

/**
 * Phase 9.1 validates and authenticates only. Its dispatch seam has no binding,
 * credential, lifecycle, or Paste dependency; Phase 9.2 owns those capabilities.
 */
export function createBatchHandler(
  env: BrowserAuthEnvironment,
  trust: BrowserTrustStore,
  dispatch: BatchDispatchGate = () => Promise.resolve(json("BATCH_DISPATCH_UNAVAILABLE", 503)),
) {
  return {
    async fetch(request: Request): Promise<Response | null> {
      if (new URL(request.url).pathname !== "/api/batch") return null
      if (request.method !== "POST") return json("METHOD_NOT_ALLOWED", 405)
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
        return json("INVALID_INPUT", 415)
      if (!idempotencyKey(request.headers.get("idempotency-key"))) return json("INVALID_INPUT", 400)
      const parsed = await parseBatchRequest(request)
      if (parsed && "tooLarge" in parsed) return json("INVALID_INPUT", 413)
      if (!parsed) return json("INVALID_INPUT", 400)
      try {
        const session = await requireBrowserSession(request, env, trust)
        requireBrowserRequestProtection(request, env, session)
        const allowedScopes = await trust.scopes(session.principalKey)
        if (allowedScopes.length === 0) return json("FORBIDDEN", 403)
        return await dispatch(parsed.request, session, allowedScopes, request.headers.get("idempotency-key")!)
      } catch (error) {
        if (error instanceof BrowserAuthError) return json(error.code, error.status)
        return json("STORAGE_OR_CREDENTIAL_UNAVAILABLE", 503)
      }
    },
  }
}
