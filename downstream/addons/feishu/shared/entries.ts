export interface PublicEntry {
  id: string
  pasteName: string
  publicUrl: string
  visibility: "active"
  retentionMode: "permanent"
  expiresAt: null
  version: number
}

export type EntryResult =
  | { ok: true; entry: PublicEntry; content?: string }
  | { ok: false; code: string; retryable: boolean; correlationId: string }

/** Only a trusted, authenticated adapter may construct this context. */
export interface EntryContext {
  scopeId: string
}
