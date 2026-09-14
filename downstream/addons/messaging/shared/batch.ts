/** Browser-safe Phase 9 batch wire types. Server credentials and scope facts are intentionally absent. */
export const batchActions = ["archive_permanent", "archive_expiring", "delete"] as const
export type BatchAction = (typeof batchActions)[number]

export interface BatchRequest {
  ids: string[]
  action: BatchAction
}

export interface BatchPublicEntryState {
  visibility: "archived"
  retentionMode: "permanent" | "timed"
  expiresAt: string | null
}

export type BatchItemResult =
  | { id: string; status: "ok"; state: BatchPublicEntryState }
  | { id: string; status: "ok"; deleted: true }
  | { id: string; status: "failed"; code: string; retryable: boolean }

/** This final result shape is reserved for Phase 9.3; Phase 9.1 never returns a processed result. */
export interface BatchResult {
  requested: number
  succeeded: number
  failed: number
  results: BatchItemResult[]
}
