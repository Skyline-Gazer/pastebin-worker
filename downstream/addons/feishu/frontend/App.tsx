import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { BatchResult } from "../shared/batch"
import type { PublicEntry } from "../shared/entries"
import { type FixtureEntry } from "./fixtures"
import { AppHeader } from "@/components/AppHeader"
import { ProviderLogin } from "@/components/auth/ProviderLogin"
import { BatchToolbar, type BatchAction } from "@/components/batch/BatchToolbar"
import { EmptyState } from "@/components/EmptyState"
import { EntryCard } from "@/components/entries/EntryCard"
import { ErrorState } from "@/components/ErrorState"
import { Toaster } from "@/components/ui/sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { BatchActionDialog } from "./BatchActionDialog"

type Theme = "light" | "dark"
type Tab = "active" | "archived"
type CompletionAction = "archive_permanent" | "archive_expiring" | "delete"
type AuthProvider = "feishu" | "lark"
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
    if (!item || typeof item !== "object" || item.id !== ids[index]) return false
    const result = item
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

type BootState = "unauthenticated" | "loading" | "ready" | "empty" | "error"

function asProviders(value: unknown, brand?: string): AuthProvider[] {
  if (Array.isArray(value)) return value.filter((item): item is AuthProvider => item === "feishu" || item === "lark")
  return brand === "Lark" ? ["lark"] : ["feishu"]
}

function asListEntries(value: unknown): FixtureEntry[] | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as { entries?: unknown }).entries)) return null
  const parsed: FixtureEntry[] = []
  for (const item of (value as { entries: unknown[] }).entries) {
    if (!item || typeof item !== "object") return null
    const entry = item as Record<string, unknown>
    const kind = entry.kind === "file" ? "file" : "text"
    const content = entry.content
    if (kind === "text" && typeof content !== "string") return null
    if (content != null && typeof content !== "string") return null
    const task = entry.managedTask
    const managedTask =
      task &&
      typeof task === "object" &&
      ((task as { state?: unknown }).state === "checked" || (task as { state?: unknown }).state === "unchecked")
        ? { state: (task as { state: "checked" | "unchecked" }).state }
        : { state: entry.visibility === "archived" ? ("checked" as const) : ("unchecked" as const) }
    if (
      typeof entry.id !== "string" ||
      typeof entry.pasteName !== "string" ||
      (entry.visibility !== "active" && entry.visibility !== "archived") ||
      (entry.retentionMode !== "permanent" && entry.retentionMode !== "timed") ||
      (entry.expiresAt !== null && typeof entry.expiresAt !== "string")
    )
      return null
    parsed.push({
      id: entry.id,
      pasteName: entry.pasteName,
      publicUrl: typeof entry.publicUrl === "string" ? entry.publicUrl : "",
      content: typeof content === "string" ? content : null,
      visibility: entry.visibility,
      retentionMode: entry.retentionMode,
      expiresAt: entry.expiresAt,
      managedTask,
      kind,
      filename: typeof entry.filename === "string" ? entry.filename : undefined,
      mimeType: typeof entry.mimeType === "string" ? entry.mimeType : undefined,
      sizeBytes: typeof entry.sizeBytes === "number" ? entry.sizeBytes : undefined,
      encrypted: entry.encrypted === true,
    })
  }
  return parsed
}

export function App({ initialEntries }: { initialEntries?: readonly FixtureEntry[] }) {
  const fixtureMode = initialEntries !== undefined
  const [theme, setTheme] = useState<Theme>("light")
  const [tab, setTab] = useState<Tab>("active")
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [batchAction, setBatchAction] = useState<BatchAction | null>(null)
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)
  const [retryIntent, setRetryIntent] = useState<BatchActionIntent | null>(null)
  const [batchPending, setBatchPending] = useState(false)
  const [boot, setBoot] = useState<BootState>(fixtureMode ? "ready" : "loading")
  const [loginProviders, setLoginProviders] = useState<AuthProvider[]>(["feishu"])
  const [sessionBrand, setSessionBrand] = useState<"Feishu" | "Lark" | undefined>(undefined)
  const [entries, setEntries] = useState<FixtureEntry[]>(() => (fixtureMode ? [...initialEntries] : []))
  const [action, setAction] = useState<CompletionAction | null>(null)
  const [completionEntryId, setCompletionEntryId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [restorePendingId, setRestorePendingId] = useState<string | null>(null)
  const [reconciliationPendingId, setReconciliationPendingId] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const completionTriggerRef = useRef<HTMLButtonElement | HTMLInputElement | null>(null)
  const batchActionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const actionRef = useRef<CompletionAction | null>(null)
  const completionRequestIdRef = useRef<string | null>(null)
  const nextTheme = theme === "light" ? "dark" : "light"
  const visibleEntries = entries.filter((entry) => entry.visibility === tab)
  const visibleEligibleIds = useMemo(() => deriveVisibleEligibleActiveIds(entries, tab), [entries, tab])
  const prunedSelectedIds = pruneSelectedIds(selectedIds, visibleEligibleIds)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.classList.toggle("light", theme === "light")
    delete document.documentElement.dataset.theme
  }, [theme])

  useEffect(() => {
    if (fixtureMode) return
    let cancelled = false
    async function loadLiveEntries() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { credentials: "include" })
        const payload: unknown = await sessionResponse.json().catch(() => null)
        const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
        const brand = record.brand === "Feishu" || record.brand === "Lark" ? record.brand : undefined
        if (sessionResponse.status === 401) {
          if (!cancelled) {
            setLoginProviders(asProviders(record.providers, brand))
            setSessionBrand(undefined)
            setBoot("unauthenticated")
          }
          return
        }
        if (!sessionResponse.ok) {
          if (!cancelled) setBoot("error")
          return
        }
        if (!cancelled && brand) setSessionBrand(brand)
        const listResponse = await fetch("/api/entries", { credentials: "include" })
        if (!listResponse.ok) {
          if (!cancelled) setBoot("error")
          return
        }
        const parsed = asListEntries(await listResponse.json())
        if (!parsed) {
          if (!cancelled) setBoot("error")
          return
        }
        if (!cancelled) {
          setEntries(parsed)
          setBoot(parsed.length === 0 ? "empty" : "ready")
        }
      } catch {
        if (!cancelled) setBoot("error")
      }
    }
    void loadLiveEntries()
    return () => {
      cancelled = true
    }
  }, [fixtureMode])

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

  async function refreshLiveEntries() {
    if (fixtureMode) return
    try {
      const listResponse = await fetch("/api/entries", { credentials: "include" })
      if (!listResponse.ok) return
      const parsed = asListEntries(await listResponse.json())
      if (parsed) setEntries(parsed)
    } catch {
      /* keep the mutation result already applied */
    }
  }

  function closeCompletion() {
    actionRef.current = null
    completionRequestIdRef.current = null
    const trigger = completionTriggerRef.current
    setAction(null)
    setCompletionEntryId(null)
    setError(false)
    queueMicrotask(() => trigger?.focus())
  }

  function selectCompletionAction(nextAction: CompletionAction) {
    if (actionRef.current !== nextAction || !completionRequestIdRef.current) {
      completionRequestIdRef.current = requestIdentity()
    }
    actionRef.current = nextAction
    setAction(nextAction)
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
      if (result.failed > 0) toast.error(`已处理 ${result.succeeded} 项，${result.failed} 项失败`)
      await refreshLiveEntries()
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

  function beginCompletion(id: string, nextAction: CompletionAction, trigger?: HTMLButtonElement | HTMLInputElement) {
    if (trigger) completionTriggerRef.current = trigger
    setCompletionEntryId(id)
    setError(false)
    selectCompletionAction(nextAction)
  }

  async function submitCompletion() {
    const currentAction = actionRef.current
    const currentKey = completionRequestIdRef.current
    if (!currentAction || !currentKey || pending) return
    const active = entries.find((entry) => entry.id === completionEntryId && entry.visibility === "active")
    if (!active) return
    setPending(true)
    setError(false)
    try {
      const result = await completeEntry(active.id, currentAction, currentKey)
      setEntries((current) => applyPublicResult(current, result, active.id))
      actionRef.current = null
      completionRequestIdRef.current = null
      setAction(null)
      setCompletionEntryId(null)
      await refreshLiveEntries()
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
      await refreshLiveEntries()
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
      await refreshLiveEntries()
    } catch {
      setError(true)
    } finally {
      setReconciliationPendingId(null)
    }
  }

  async function logout() {
    try {
      const sessionResponse = await fetch("/api/auth/session", { credentials: "include" })
      const payload: unknown = await sessionResponse.json().catch(() => null)
      const csrf = payload && typeof payload === "object" ? (payload as { csrfToken?: unknown }).csrfToken : undefined
      if (typeof csrf === "string") {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: { "X-CSRF-Token": csrf },
        })
      }
    } finally {
      setSessionBrand(undefined)
      setEntries([])
      setBoot("unauthenticated")
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Copied URL")
    } catch {
      toast.error("Unable to copy URL")
    }
  }

  const chooserOpen = action === "archive_permanent" || action === "archive_expiring"
  const deleteOpen = action === "delete"

  return (
    <TooltipProvider>
      <main aria-label="Feishu Pastebin" className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-4">
        <AppHeader
          authenticated={boot === "ready" || boot === "empty"}
          brand={sessionBrand}
          theme={theme}
          onLogout={() => void logout()}
          onToggleTheme={() => setTheme(nextTheme)}
        />
        {boot === "loading" && (
          <div className="space-y-3">
            <p>Loading…</p>
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {boot === "unauthenticated" && <ProviderLogin providers={loginProviders} />}
        {boot === "error" && <ErrorState message="Unable to load entries." />}
        {(boot === "ready" || boot === "empty") && (
          <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
            <TabsList aria-label="Entry views">
              <TabsTrigger value="active">进行中</TabsTrigger>
              <TabsTrigger value="archived">归档</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="space-y-4">
              <BatchToolbar
                batchMode={batchMode}
                tab="active"
                eligible={Boolean(visibleEligibleIds)}
                count={prunedSelectedIds.size}
                disabled={batchPending}
                onToggleMode={toggleBatchMode}
                onSelectAll={selectAllVisibleEligible}
                onClear={() => setSelectedIds(new Set())}
                onAction={(nextAction) => beginBatchAction(nextAction, document.activeElement as HTMLButtonElement)}
              />
              {batchMode && (
                <p className="visually-hidden" id="batch-mode-lock-explanation">
                  Batch Mode is active. Use Batch Selectors or exit Batch Mode to complete an entry.
                </p>
              )}
              {batchResult && (
                <p role="status">
                  已处理 {batchResult.succeeded} 项，{batchResult.failed} 项失败
                </p>
              )}
              {retryIntent && !batchPending && (
                <Button type="button" variant="outline" onClick={() => void submitBatchIntent(retryIntent)}>
                  Retry failed items
                </Button>
              )}
              {error && <ErrorState message="Unable to update entry. Please try again." />}
              <section aria-label="进行中">
                {visibleEntries.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="flex flex-col gap-4">
                    {visibleEntries.map((entry) => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        tab="active"
                        batchMode={batchMode}
                        selected={prunedSelectedIds.has(entry.id)}
                        eligible={Boolean(visibleEligibleIds?.has(entry.id))}
                        pending={pending}
                        restorePending={restorePendingId !== null}
                        reconciliationPending={reconciliationPendingId !== null}
                        onBatchToggle={() => toggleBatchSelection(entry.id)}
                        onLifecycle={(nextAction) => beginCompletion(entry.id, nextAction)}
                        onRestore={() => void submitRestore(entry)}
                        onReconcile={() => void submitReconciliation(entry)}
                        onCopy={(url) => void copyUrl(url)}
                        onTaskActivate={(control) => beginCompletion(entry.id, "archive_permanent", control)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </TabsContent>
            <TabsContent value="archived" className="space-y-4">
              {error && <ErrorState message="Unable to update entry. Please try again." />}
              <section aria-label="归档">
                {visibleEntries.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="flex flex-col gap-4">
                    {visibleEntries.map((entry) => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        tab="archived"
                        batchMode={false}
                        selected={false}
                        eligible={false}
                        pending={pending}
                        restorePending={restorePendingId !== null}
                        reconciliationPending={reconciliationPendingId !== null}
                        onBatchToggle={() => undefined}
                        onLifecycle={() => undefined}
                        onRestore={() => void submitRestore(entry)}
                        onReconcile={() => void submitReconciliation(entry)}
                        onCopy={(url) => void copyUrl(url)}
                        onTaskActivate={() => undefined}
                      />
                    ))}
                  </div>
                )}
              </section>
            </TabsContent>
          </Tabs>
        )}
        <Dialog open={chooserOpen} onOpenChange={(open) => !open && !pending && closeCompletion()}>
          <DialogContent
            onInteractOutside={(event) => event.preventDefault()}
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              ;(event.currentTarget as HTMLElement).focus()
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              completionTriggerRef.current?.focus()
            }}
          >
            <DialogHeader>
              <DialogTitle>Choose completion action</DialogTitle>
              <DialogDescription>{action ? actionLabels[action] : ""}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={pending} onClick={() => selectCompletionAction("archive_permanent")}>
                永久归档
              </Button>
              <Button type="button" disabled={pending} onClick={() => selectCompletionAction("archive_expiring")}>
                限期归档
              </Button>
              <Button type="button" disabled={pending} onClick={() => selectCompletionAction("delete")}>
                删除
              </Button>
            </div>
            {error && <ErrorState message="Unable to update entry. Please try again." />}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={closeCompletion}>
                Cancel
              </Button>
              <Button type="button" disabled={pending} onClick={() => void submitCompletion()}>
                Confirm archive
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog open={deleteOpen} onOpenChange={(open) => !open && !pending && closeCompletion()}>
          <AlertDialogContent
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              completionTriggerRef.current?.focus()
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm delete</AlertDialogTitle>
              <AlertDialogDescription>This permanently deletes the entry.</AlertDialogDescription>
            </AlertDialogHeader>
            {error && <ErrorState message="Unable to update entry. Please try again." />}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending} onClick={closeCompletion}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                onClick={(event) => {
                  event.preventDefault()
                  void submitCompletion()
                }}
              >
                Delete entry
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {batchAction && (
          <BatchActionDialog
            action={batchAction}
            count={prunedSelectedIds.size}
            onCancel={closeBatchAction}
            onConfirm={() => handoffBatchIntent(batchAction)}
          />
        )}
        <Toaster theme={theme} />
      </main>
    </TooltipProvider>
  )
}
