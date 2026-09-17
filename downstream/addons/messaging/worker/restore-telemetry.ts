/**
 * Same-invocation restore ordering markers for Workers Logs / Observability.
 * Mirrors PASTE_CREATE_STAGE style: console.log only, no secrets, no bodies.
 *
 * Correlation: `request_id` (idempotency key when log-safe) + `op_id` (after
 * operation construction). Monotonic `seq` proves order within one restoreEntry
 * call. Dispatch is synchronous in the same Worker invocation — no queue hop.
 *
 * FT-07 historical ordering remains INCONCLUSIVE; these markers apply only to
 * executions after an authorized deploy that includes this code.
 */

export type RestoreStage =
  | "request_accepted"
  | "duplicate_lookup_completed"
  | "duplicate_replayed"
  | "binding_lookup_completed"
  | "lifecycle_gate_passed"
  | "lifecycle_gate_failed"
  | "fingerprint_kind_completed"
  | "credential_open_completed"
  | "credential_open_failed"
  | "paste_read_completed"
  | "paste_read_failed"
  | "managed_task_completed"
  | "managed_task_failed"
  | "operation_constructed"
  | "reservation_completed"
  | "reservation_failed"
  | "dispatch_completed"
  | "dispatch_failed"
  | "expiry_cancel_started"
  | "expiry_cancel_completed"
  | "expiry_cancel_failed"
  | "upstream_update_started"
  | "upstream_update_completed"
  | "upstream_update_failed"
  | "finish_completed"
  | "finish_failed"

export type RestoreKind = "restore_permanent" | "restore_timed"

const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const SAFE_OP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SAFE_CODE =
  /^(INVALID_INPUT|ENTRY_NOT_FOUND|INVALID_LIFECYCLE_STATE|MANAGED_TASK_AMBIGUOUS|VERSION_CONFLICT|MUTATION_CONFLICT|REQUEST_CONFLICT|RECONCILIATION_REQUIRED|UPSTREAM_REJECTED|UPSTREAM_UNCERTAIN|UPSTREAM_INVALID|STORAGE_OR_CREDENTIAL_UNAVAILABLE|ENTRY_NOT_READY)$/
const SAFE_KIND = /^(restore_permanent|restore_timed)$/
const SAFE_STAGE =
  /^(request_accepted|duplicate_lookup_completed|duplicate_replayed|binding_lookup_completed|lifecycle_gate_passed|lifecycle_gate_failed|fingerprint_kind_completed|credential_open_completed|credential_open_failed|paste_read_completed|paste_read_failed|managed_task_completed|managed_task_failed|operation_constructed|reservation_completed|reservation_failed|dispatch_completed|dispatch_failed|expiry_cancel_started|expiry_cancel_completed|expiry_cancel_failed|upstream_update_started|upstream_update_completed|upstream_update_failed|finish_completed|finish_failed)$/

export interface RestoreStageFields {
  stage: RestoreStage
  seq: number
  requestId: string
  opId?: string
  kind?: RestoreKind
  code?: string
}

/** Emit one RESTORE_STAGE line. `*_completed` means the named step succeeded;
 * `*_failed` / `*_started` must not be read as success of a later step. */
export function reportRestoreStage(fields: RestoreStageFields): void {
  if (!SAFE_STAGE.test(fields.stage) || !Number.isInteger(fields.seq) || fields.seq < 1) return
  const parts = [`RESTORE_STAGE=${fields.stage}`, `seq=${fields.seq}`]
  if (SAFE_REQUEST_ID.test(fields.requestId)) parts.push(`request_id=${fields.requestId}`)
  if (fields.opId && SAFE_OP_ID.test(fields.opId)) parts.push(`op_id=${fields.opId}`)
  if (fields.kind && SAFE_KIND.test(fields.kind)) parts.push(`kind=${fields.kind}`)
  if (fields.code && SAFE_CODE.test(fields.code)) parts.push(`code=${fields.code}`)
  console.log(parts.join(" "))
}

/** Per-restoreEntry monotonic emitter. Does not change control flow. */
export function createRestoreStageEmitter(requestId: string) {
  let seq = 0
  let opId: string | undefined
  let kind: RestoreKind | undefined
  return {
    setOpId(id: string) {
      opId = id
    },
    setKind(value: RestoreKind) {
      kind = value
    },
    emit(stage: RestoreStage, code?: string) {
      seq += 1
      reportRestoreStage({ stage, seq, requestId, opId, kind, code })
    },
  }
}
