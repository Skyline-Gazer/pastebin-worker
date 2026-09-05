import {
  BrowserAuthError,
  requireBrowserRequestProtection,
  requireBrowserSession,
  type BrowserAuthEnvironment,
} from "./browser-auth"
import type { BrowserSession, BrowserTrustStore } from "./browser-store"
import { batchActions, type BatchAction, type BatchRequest } from "../shared/batch"
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
  reserveBatch(input: {
    principalKey: string
    requestId: string
    action: BatchAction
    ids: string[]
  }): Promise<{ id: string }>
  recordBatchItem(input: {
    batchId: string
    entryId: string
    requestId: string
    scopeId: string | null
    outcome: "succeeded" | "failed"
    code: string | null
  }): Promise<void>
  reconcileBatch(id: string): Promise<void>
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
}

const publicFailureCodes = new Set([
  "MANAGED_TASK_AMBIGUOUS",
  "VERSION_CONFLICT",
  "MUTATION_CONFLICT",
  "UPSTREAM_REJECTED",
  "RECONCILIATION_REQUIRED",
  "STORAGE_OR_CREDENTIAL_UNAVAILABLE",
])

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
    const batch = await this.batches.reserveBatch({
      principalKey: session.principalKey,
      requestId,
      action: request.action,
      ids: request.ids,
    })
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
            item = { id, outcome: "failed", code, retryable: result.retryable }
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
    if (requiresReconciliation) await this.batches.reconcileBatch(batch.id)
    return { batchId: batch.id, items }
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
