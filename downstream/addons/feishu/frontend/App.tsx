import { useEffect, useRef, useState } from "react"
import type { PublicEntry } from "../shared/entries"
import { fixtureEntries, type FixtureEntry } from "./fixtures"
import { ArchiveStatus } from "./ArchiveStatus"
import { ManagedTaskCheckbox } from "./ManagedTaskCheckbox"
import { RenderedMarkdown } from "./RenderedMarkdown"

type Theme = "light" | "dark"
type Tab = "active" | "archived"
type CompletionAction = "archive_permanent" | "archive_expiring" | "delete"

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
          managedTask: { state: result.visibility === "archived" ? "checked" : entry.managedTask.state },
        }
      : entry,
  )
}

export function App() {
  const [theme, setTheme] = useState<Theme>("light")
  const [tab, setTab] = useState<Tab>("active")
  const [entries, setEntries] = useState<FixtureEntry[]>(() => [...fixtureEntries])
  const [action, setAction] = useState<CompletionAction | null>(null)
  const [completionEntryId, setCompletionEntryId] = useState<string | null>(null)
  const [completionRequestId, setCompletionRequestId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const completionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const completionDialogRef = useRef<HTMLDivElement | null>(null)
  const nextTheme = theme === "light" ? "dark" : "light"
  const visibleEntries = entries.filter((entry) => entry.visibility === tab)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (action && !pending) completionDialogRef.current?.focus()
  }, [action, pending])

  function closeCompletion() {
    setAction(null)
    setCompletionEntryId(null)
    setCompletionRequestId(null)
    setError(false)
    completionTriggerRef.current?.focus()
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
          {error && <p role="alert">Unable to complete entry. Please try again.</p>}
          <section id="fixture-panel" aria-label={tab === "active" ? "进行中" : "归档"} role="tabpanel">
            {visibleEntries.map((entry) => (
              <article className="fixture-entry" key={entry.id}>
                <h2>{entry.pasteName}</h2>
                {tab === "active" ? (
                  <ManagedTaskCheckbox
                    checked={entry.managedTask.state === "checked"}
                    disabled={pending}
                    onComplete={(control) => {
                      completionTriggerRef.current = control
                      setCompletionEntryId(entry.id)
                      setError(false)
                      selectCompletionAction("archive_permanent")
                    }}
                  />
                ) : (
                  <ArchiveStatus expiresAt={entry.expiresAt} retentionMode={entry.retentionMode} />
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
    </main>
  )
}
