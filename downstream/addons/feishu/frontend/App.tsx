import { useEffect, useMemo, useRef, useState } from "react"
import type { BatchItemResult, BatchResult } from "../shared/batch"
import type { PublicEntry } from "../shared/entries"
import { fixtureEntries, type FixtureEntry } from "./fixtures"
import { ArchiveStatus } from "./ArchiveStatus"
import { BatchActionBar, type BatchAction } from "./BatchActionBar"
import { BatchActionDialog } from "./BatchActionDialog"
import { BatchModeToggle } from "./BatchModeToggle"
import { BatchSelector } from "./BatchSelector"
import { ManagedTaskCheckbox } from "./ManagedTaskCheckbox"
import { RenderedMarkdown } from "./RenderedMarkdown"

type Theme = "light" | "dark"
type Tab = "active" | "archived"
type CompletionAction = "archive_permanent" | "archive_expiring" | "delete"
export interface BatchActionIntent {
  action: BatchAction
  entryIds: readonly string[]
}

function isBatchResult(value: unknown, ids: readonly string[]): value is BatchResult {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<BatchResult>
  if (
    candidate.requested !== ids.length ||
    typeof candidate.succeeded !== "number" ||
    typeof candidate.failed !== "number" ||
    !Number.isInteger(candidate.succeeded) ||
    !Number.isInteger(candidate.failed) ||
    candidate.succeeded + candidate.failed !== ids.length ||
    !Array.isArray(candidate.results) ||
    candidate.results.length !== ids.length
  )
    return false
  let succeeded = 0
  let failed = 0
  const validItems = candidate.results.every((item, index) => {
    if (!item || typeof item !== "object" || (item as BatchItemResult).id !== ids[index]) return false
    const result = item as BatchItemResult
    if (result.status === "failed") {
      failed += 1
      return typeof result.code === "string" && typeof result.retryable === "boolean"
    }
    if (result.status !== "ok") return false
    succeeded += 1
    if ("deleted" in result) return result.deleted === true
    return (
      result.state.visibility === "archived" &&
      (result.state.retentionMode === "permanent" || result.state.retentionMode === "timed") &&
      (result.state.retentionMode === "permanent"
        ? result.state.expiresAt === null
        : typeof result.state.expiresAt === "string")
    )
  })
  return validItems && succeeded === candidate.succeeded && failed === candidate.failed
}

async function executeBatch(intent: BatchActionIntent, idempotencyKey: string): Promise<BatchResult> {
  const sessionResponse = await fetch("/api/auth/session", { credentials: "include" })
  if (!sessionResponse.ok) throw new Error("batch unavailable")
  const session: unknown = await sessionResponse.json()
  if (!session || typeof session !== "object" || typeof (session as { csrfToken?: unknown }).csrfToken !== "string")
    throw new Error("batch unavailable")
  const response = await fetch("/api/batch", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "X-CSRF-Token": (session as { csrfToken: string }).csrfToken,
    },
    body: JSON.stringify({ action: intent.action, ids: intent.entryIds }),
  })
  if (!response.ok) throw new Error("batch unavailable")
  const payload: unknown = await response.json()
  if (!isBatchResult(payload, intent.entryIds)) throw new Error("batch unavailable")
  return payload
}

export function deriveVisibleEligibleActiveIds(entries: readonly FixtureEntry[], tab: Tab): ReadonlySet<string> | null {
  if (tab !== "active") return new Set()

  const ids = new Set<string>()
  for (const entry of entries) {
    if (entry.visibility !== "active") continue
    if (
      typeof entry.id !== "string" ||
      entry.id.length === 0 ||
      ids.has(entry.id) ||
      entry.retentionMode !== "permanent" ||
      entry.expiresAt !== null
    ) {
      return null
    }
    ids.add(entry.id)
  }
  return ids
}

export function pruneSelectedIds(selectedIds: ReadonlySet<string>, eligibleIds: ReadonlySet<string> | null) {
  if (!eligibleIds) return new Set<string>()
  return new Set([...selectedIds].filter((id) => eligibleIds.has(id)))
}

const actionLabels: Record<CompletionAction, string> = {
  archive_permanent: "永久归档",
  archive_expiring: "限期归档",
  delete: "删除",
}

function requestIdentity() {
  return globalThis.crypto?.randomUUID?.() || `completion-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function completeEntry(
  id: string,
  action: CompletionAction,
  idempotencyKey: string,
): Promise<PublicEntry | null> {
  const sessionResponse = await fetch("/api/auth/session", { credentials: "include" })
  if (!sessionResponse.ok) throw new Error("session unavailable")
  const session: unknown = await sessionResponse.json()
  if (!session || typeof session !== "object" || typeof (session as { csrfToken?: unknown }).csrfToken !== "string")
    throw new Error("session unavailable")
  const response = await fetch(`/api/entries/${encodeURIComponent(id)}/complete`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "X-CSRF-Token": (session as { csrfToken: string }).csrfToken,
    },
    body: JSON.stringify({ action }),
  })
  if (response.status === 204 && action === "delete") return null
  if (!response.ok) throw new Error("completion unavailable")
  const payload: unknown = await response.json()
  const entry = payload && typeof payload === "object" ? (payload as { entry?: unknown }).entry : undefined
  if (!entry || typeof entry !== "object") throw new Error("completion unavailable")
  return entry as PublicEntry
}

async function restoreEntry(id: string, idempotencyKey: string): Promise<PublicEntry> {
  const sessionResponse = await fetch("/api/auth/session", { credentials: "include" })
  if (!sessionResponse.ok) throw new Error("session unavailable")
  const session: unknown = await sessionResponse.json()
  if (!session || typeof session !== "object" || typeof (session as { csrfToken?: unknown }).csrfToken !== "string")
    throw new Error("session unavailable")
  const response = await fetch(`/api/entries/${encodeURIComponent(id)}/restore`, {
    method: "POST",
    credentials: "include",
    headers: { "Idempotency-Key": idempotencyKey, "X-CSRF-Token": (session as { csrfToken: string }).csrfToken },
  })
  if (!response.ok) throw new Error("restore unavailable")
  const payload: unknown = await response.json()
  const entry = payload && typeof payload === "object" ? (payload as { entry?: unknown }).entry : undefined
  if (!entry || typeof entry !== "object") throw new Error("restore unavailable")
  return entry as PublicEntry
}

async function reconcileEntry(id: string): Promise<PublicEntry | null> {
  const sessionResponse = await fetch("/api/auth/session", { credentials: "include" })
  if (!sessionResponse.ok) throw new Error("session unavailable")
  const session: unknown = await sessionResponse.json()
  if (!session || typeof session !== "object" || typeof (session as { csrfToken?: unknown }).csrfToken !== "string")
    throw new Error("session unavailable")
  const response = await fetch(`/api/entries/${encodeURIComponent(id)}/reconcile`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": (session as { csrfToken: string }).csrfToken },
  })
  if (response.status === 204) return null
  if (!response.ok) throw new Error("reconciliation unavailable")
  const payload: unknown = await response.json()
  const entry = payload && typeof payload === "object" ? (payload as { entry?: unknown }).entry : undefined
  if (!entry || typeof entry !== "object") throw new Error("reconciliation unavailable")
  return entry as PublicEntry
}

function needsReconciliation(entry: FixtureEntry) {
  return (
    entry.retentionMode === "timed" &&
    (!entry.expiresAt || !Number.isFinite(Date.parse(entry.expiresAt)) || Date.parse(entry.expiresAt) <= Date.now())
  )
}

function applyPublicResult(
  entries: readonly FixtureEntry[],
  result: PublicEntry | null,
  completedId: string,
): FixtureEntry[] {
  if (result === null) return entries.filter((entry) => entry.id !== completedId)
  return entries.map((entry) =>
    entry.id === result.id
      ? {
          ...entry,
          pasteName: result.pasteName,
          publicUrl: result.publicUrl,
          visibility: result.visibility,
          retentionMode: result.retentionMode,
          expiresAt: result.expiresAt,
          managedTask: { state: result.visibility === "archived" ? "checked" : "unchecked" },
        }
      : entry,
  )
}

export function App({ initialEntries = fixtureEntries }: { initialEntries?: readonly FixtureEntry[] }) {
  const [theme, setTheme] = useState<Theme>("light")
  const [tab, setTab] = useState<Tab>("active")
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [batchAction, setBatchAction] = useState<BatchAction | null>(null)
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)
  const [retryIntent, setRetryIntent] = useState<BatchActionIntent | null>(null)
  const [batchPending, setBatchPending] = useState(false)
  const [entries, setEntries] = useState<FixtureEntry[]>(() => [...initialEntries])
  const [action, setAction] = useState<CompletionAction | null>(null)
  const [completionEntryId, setCompletionEntryId] = useState<string | null>(null)
  const [completionRequestId, setCompletionRequestId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [restorePendingId, setRestorePendingId] = useState<string | null>(null)
  const [reconciliationPendingId, setReconciliationPendingId] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const completionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const batchActionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const completionDialogRef = useRef<HTMLDivElement | null>(null)
  const nextTheme = theme === "light" ? "dark" : "light"
  const visibleEntries = entries.filter((entry) => entry.visibility === tab)
  const visibleEligibleIds = useMemo(() => deriveVisibleEligibleActiveIds(entries, tab), [entries, tab])
  const prunedSelectedIds = pruneSelectedIds(selectedIds, visibleEligibleIds)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (action && !pending) completionDialogRef.current?.focus()
  }, [action, pending])

  useEffect(() => {
    setSelectedIds((current) => {
      const next = pruneSelectedIds(current, visibleEligibleIds)
      if (next.size === current.size && [...next].every((id) => current.has(id))) return current
      return next
    })
  }, [visibleEligibleIds])

  useEffect(() => {
    if (batchAction && prunedSelectedIds.size === 0) setBatchAction(null)
  }, [batchAction, prunedSelectedIds.size])

  function closeCompletion() {
    setAction(null)
    setCompletionEntryId(null)
    setCompletionRequestId(null)
    setError(false)
    completionTriggerRef.current?.focus()
  }

  function toggleBatchMode() {
    if (batchMode) {
      setBatchMode(false)
      setSelectedIds(new Set())
      setBatchAction(null)
      return
    }
    setSelectedIds(new Set())
    setBatchMode(true)
  }

  function toggleBatchSelection(id: string) {
    if (!visibleEligibleIds?.has(id)) return
    setSelectedIds((current) => {
      const next = pruneSelectedIds(current, visibleEligibleIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisibleEligible() {
    setSelectedIds(visibleEligibleIds ? new Set(visibleEligibleIds) : new Set())
  }

  async function submitBatchIntent(intent: BatchActionIntent) {
    if (batchPending || intent.entryIds.length === 0) return
    setBatchPending(true)
    setBatchResult(null)
    setRetryIntent(null)
    setError(false)
    try {
      const result = await executeBatch(intent, requestIdentity())
      const successful = new Map(result.results.filter((item) => item.status === "ok").map((item) => [item.id, item]))
      const failedIds = result.results.filter((item) => item.status === "failed").map((item) => item.id)
      setEntries((current) =>
        current.flatMap((entry) => {
          const item = successful.get(entry.id)
          if (!item) return [entry]
          if ("deleted" in item) return []
          return [
            {
              ...entry,
              visibility: item.state.visibility,
              retentionMode: item.state.retentionMode,
              expiresAt: item.state.expiresAt,
              managedTask: { state: "checked" },
            },
          ]
        }),
      )
      setSelectedIds(new Set(failedIds))
      setBatchResult(result)
      setRetryIntent(failedIds.length > 0 ? { action: intent.action, entryIds: failedIds } : null)
    } catch {
      setError(true)
    } finally {
      setBatchPending(false)
    }
  }

  function handoffBatchIntent(nextAction: BatchAction) {
    const intent: BatchActionIntent = { action: nextAction, entryIds: [...prunedSelectedIds] }
    if (intent.entryIds.length === 0) return
    setBatchAction(null)
    batchActionTriggerRef.current?.focus()
    void submitBatchIntent(intent)
  }

  function beginBatchAction(nextAction: BatchAction, trigger: HTMLButtonElement) {
    if (prunedSelectedIds.size === 0) return
    batchActionTriggerRef.current = trigger
    if (nextAction === "archive_permanent") {
      handoffBatchIntent(nextAction)
      return
    }
    setBatchAction(nextAction)
  }

  function closeBatchAction() {
    setBatchAction(null)
    batchActionTriggerRef.current?.focus()
  }

  function selectCompletionAction(nextAction: CompletionAction) {
    if (action !== nextAction || !completionRequestId) setCompletionRequestId(requestIdentity())
    setAction(nextAction)
  }

  async function submitCompletion() {
    if (!action || !completionRequestId || pending) return
    const active = entries.find((entry) => entry.id === completionEntryId && entry.visibility === "active")
    if (!active) return
    setPending(true)
    setError(false)
    try {
      const result = await completeEntry(active.id, action, completionRequestId)
      setEntries((current) => applyPublicResult(current, result, active.id))
      setAction(null)
      setCompletionEntryId(null)
      setCompletionRequestId(null)
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }

  async function submitRestore(entry: FixtureEntry) {
    if (restorePendingId) return
    const requestId = requestIdentity()
    setRestorePendingId(entry.id)
    setError(false)
    try {
      const result = await restoreEntry(entry.id, requestId)
      setEntries((current) => applyPublicResult(current, result, entry.id))
    } catch {
      setError(true)
    } finally {
      setRestorePendingId(null)
    }
  }

  async function submitReconciliation(entry: FixtureEntry) {
    if (reconciliationPendingId) return
    setReconciliationPendingId(entry.id)
    setError(false)
    try {
      const result = await reconcileEntry(entry.id)
      setEntries((current) => applyPublicResult(current, result, entry.id))
    } catch {
      setError(true)
    } finally {
      setReconciliationPendingId(null)
    }
  }

  return (
    <main aria-label="Feishu Pastebin" className="page-shell">
      <section className="content-panel" aria-labelledby="page-title">
        <header className="shell-header">
          <div>
            <p className="eyebrow">Feishu Add-on</p>
            <h1 id="page-title">Feishu Pastebin</h1>
          </div>
          <button type="button" className="theme-control" onClick={() => setTheme(nextTheme)}>
            Switch to {nextTheme} theme
          </button>
        </header>
        <div className="shell-body">
          <div aria-label="Fixture views" role="tablist" className="view-tabs">
            <button
              aria-controls="fixture-panel"
              aria-selected={tab === "active"}
              onClick={() => setTab("active")}
              role="tab"
              type="button"
            >
              进行中
            </button>
            <button
              aria-controls="fixture-panel"
              aria-selected={tab === "archived"}
              onClick={() => setTab("archived")}
              role="tab"
              type="button"
            >
              归档
            </button>
          </div>
          {tab === "active" && <BatchModeToggle batchMode={batchMode} onToggle={toggleBatchMode} />}
          {batchMode && (
            <p className="visually-hidden" id="batch-mode-lock-explanation">
              Batch Mode is active. Use Batch Selectors or exit Batch Mode to complete an entry.
            </p>
          )}
          {batchMode && tab === "active" && visibleEligibleIds && (
            <div aria-label="Batch selection controls" className="batch-selection-controls">
              <button type="button" onClick={selectAllVisibleEligible}>
                全选
              </button>
              <button type="button" onClick={() => setSelectedIds(new Set())}>
                清空
              </button>
            </div>
          )}
          {batchMode && tab === "active" && (
            <BatchActionBar
              count={prunedSelectedIds.size}
              disabled={batchPending}
              onAction={(nextAction) => beginBatchAction(nextAction, document.activeElement as HTMLButtonElement)}
            />
          )}
          {batchResult && (
            <p role="status">
              已处理 {batchResult.succeeded} 项，{batchResult.failed} 项失败
            </p>
          )}
          {retryIntent && !batchPending && (
            <button type="button" onClick={() => void submitBatchIntent(retryIntent)}>
              Retry failed items
            </button>
          )}
          {error && <p role="alert">Unable to update entry. Please try again.</p>}
          <section id="fixture-panel" aria-label={tab === "active" ? "进行中" : "归档"} role="tabpanel">
            {visibleEntries.map((entry) => (
              <article className="fixture-entry" key={entry.id}>
                <h2>{entry.pasteName}</h2>
                {tab === "active" ? (
                  <div className="active-entry-controls">
                    {batchMode && visibleEligibleIds?.has(entry.id) && (
                      <BatchSelector
                        checked={prunedSelectedIds.has(entry.id)}
                        entryName={entry.pasteName}
                        onToggle={() => toggleBatchSelection(entry.id)}
                      />
                    )}
                    <ManagedTaskCheckbox
                      checked={entry.managedTask.state === "checked"}
                      disabled={pending || batchMode}
                      disabledDescriptionId={batchMode ? "batch-mode-lock-explanation" : undefined}
                      onComplete={(control) => {
                        completionTriggerRef.current = control
                        setCompletionEntryId(entry.id)
                        setError(false)
                        selectCompletionAction("archive_permanent")
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <ArchiveStatus expiresAt={entry.expiresAt} retentionMode={entry.retentionMode} />
                    {needsReconciliation(entry) && (
                      <button
                        type="button"
                        disabled={reconciliationPendingId !== null}
                        onClick={() => void submitReconciliation(entry)}
                      >
                        {reconciliationPendingId === entry.id ? "Reconciling…" : "Reconcile archive"}
                      </button>
                    )}
                    {(entry.retentionMode === "permanent" || entry.retentionMode === "timed") && (
                      <button
                        type="button"
                        disabled={restorePendingId !== null}
                        onClick={() => void submitRestore(entry)}
                      >
                        {restorePendingId === entry.id ? "Restoring…" : "Restore"}
                      </button>
                    )}
                  </>
                )}
                <RenderedMarkdown content={entry.content} />
              </article>
            ))}
          </section>
        </div>
      </section>
      {action && (
        <div
          aria-labelledby="completion-title"
          aria-modal="true"
          className="completion-dialog"
          onKeyDown={(event) => {
            if (event.key === "Escape" && !pending) closeCompletion()
          }}
          ref={completionDialogRef}
          role="dialog"
          tabIndex={-1}
        >
          {action === "delete" ? (
            <>
              <h2 id="completion-title">Confirm delete</h2>
              <p>This permanently deletes the entry.</p>
            </>
          ) : (
            <>
              <h2 id="completion-title">Choose completion action</h2>
              <p>{actionLabels[action]}</p>
            </>
          )}
          {action !== "delete" && (
            <div className="completion-actions">
              <button type="button" disabled={pending} onClick={() => selectCompletionAction("archive_permanent")}>
                永久归档
              </button>
              <button type="button" disabled={pending} onClick={() => selectCompletionAction("archive_expiring")}>
                限期归档
              </button>
              <button type="button" disabled={pending} onClick={() => selectCompletionAction("delete")}>
                删除
              </button>
            </div>
          )}
          <div className="completion-actions">
            <button type="button" disabled={pending} onClick={closeCompletion}>
              Cancel
            </button>
            <button type="button" disabled={pending} onClick={() => void submitCompletion()}>
              {action === "delete" ? "Delete entry" : "Confirm archive"}
            </button>
          </div>
        </div>
      )}
      {batchAction && (
        <BatchActionDialog
          action={batchAction}
          count={prunedSelectedIds.size}
          onCancel={closeBatchAction}
          onConfirm={() => handoffBatchIntent(batchAction)}
        />
      )}
    </main>
  )
}
