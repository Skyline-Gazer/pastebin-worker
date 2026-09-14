import { displayUrl, downloadUrl } from "@/lib/entryUrls"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BatchSelector } from "@/components/batch/BatchSelector"
import { EntryActions } from "@/components/entries/EntryActions"
import { ArchiveStatus } from "@/components/lifecycle/ArchiveStatus"
import { LifecycleMenu } from "@/components/lifecycle/LifecycleMenu"
import { cn } from "@/lib/utils"
import type { FixtureEntry } from "../../fixtures"

function safeUrl(factory: (value: string) => string, value: string) {
  try {
    return factory(value)
  } catch {
    return undefined
  }
}

export function FileEntryCard({
  entry,
  tab,
  batchMode,
  selected,
  eligible,
  pending,
  restorePending,
  reconciliationPending,
  onBatchToggle,
  onLifecycle,
  onRestore,
  onReconcile,
  onCopy,
}: {
  entry: FixtureEntry
  tab: "active" | "archived"
  batchMode: boolean
  selected: boolean
  eligible: boolean
  pending: boolean
  restorePending: boolean
  reconciliationPending: boolean
  onBatchToggle: () => void
  onLifecycle: (action: "archive_permanent" | "archive_expiring" | "delete") => void
  onRestore: () => void
  onReconcile: () => void
  onCopy: (url: string) => void
}) {
  const title = entry.filename || "Untitled"
  const downloadHref = entry.encrypted || !entry.publicUrl ? undefined : safeUrl(downloadUrl, entry.publicUrl)
  const openHref = entry.publicUrl ? safeUrl(displayUrl, entry.publicUrl) : undefined
  const showExpiredReconcile =
    tab === "archived" &&
    entry.retentionMode === "timed" &&
    (!entry.expiresAt || !Number.isFinite(Date.parse(entry.expiresAt)) || Date.parse(entry.expiresAt) <= Date.now())
  return (
    <article
      aria-labelledby={`${entry.id}-title`}
      className={cn(
        "grid min-w-0 items-start gap-2 px-3 py-3",
        batchMode && eligible
          ? "grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_auto]"
          : "grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_auto]",
      )}
    >
      {batchMode && eligible ? <BatchSelector checked={selected} title={title} onToggle={onBatchToggle} /> : null}
      <div className="min-w-0">
        <h2 id={`${entry.id}-title`} className="text-sm font-medium leading-snug">
          {title}
        </h2>
        <p className="truncate font-mono text-xs text-muted-foreground" title={entry.pasteName}>
          {entry.pasteName}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {entry.mimeType ? <Badge variant="outline">{entry.mimeType}</Badge> : null}
          {typeof entry.sizeBytes === "number" ? <Badge variant="secondary">{entry.sizeBytes} bytes</Badge> : null}
          {entry.encrypted ? <Badge variant="destructive">Encrypted</Badge> : null}
          {!entry.filename && !entry.mimeType ? (
            <p className="text-xs text-muted-foreground">Unable to display file metadata</p>
          ) : null}
        </div>
        {tab === "archived" ? <ArchiveStatus expiresAt={entry.expiresAt} retentionMode={entry.retentionMode} /> : null}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-start gap-1 max-md:justify-start md:justify-end",
          batchMode && eligible && "max-md:col-start-2",
        )}
      >
        {tab === "active" ? (
          <>
            <EntryActions
              publicUrl={entry.publicUrl || undefined}
              openHref={openHref}
              downloadHref={downloadHref}
              onCopy={entry.publicUrl ? onCopy : undefined}
            />
            <LifecycleMenu disabled={pending || batchMode} onAction={onLifecycle} />
          </>
        ) : (
          <>
            {showExpiredReconcile ? (
              <Button type="button" variant="outline" size="sm" disabled={reconciliationPending} onClick={onReconcile}>
                {reconciliationPending ? "核对中…" : "核对"}
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" disabled={restorePending} onClick={onRestore}>
              {restorePending ? "恢复中…" : "恢复"}
            </Button>
          </>
        )}
      </div>
    </article>
  )
}
