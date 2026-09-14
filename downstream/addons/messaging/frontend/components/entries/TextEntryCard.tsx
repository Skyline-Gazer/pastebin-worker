import { deriveEntryPresentation } from "@/lib/entryPresentation"
import { displayUrl } from "@/lib/entryUrls"
import { BatchSelector } from "@/components/batch/BatchSelector"
import { EntryActions } from "@/components/entries/EntryActions"
import { MarkdownContent } from "@/components/MarkdownContent"
import { ArchiveStatus } from "@/components/lifecycle/ArchiveStatus"
import { LifecycleMenu } from "@/components/lifecycle/LifecycleMenu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { FixtureEntry } from "../../fixtures"

function safeDisplayUrl(publicUrl: string) {
  try {
    return displayUrl(publicUrl)
  } catch {
    return undefined
  }
}

export function TextEntryCard({
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
  onTaskActivate,
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
  onTaskActivate: (control: HTMLInputElement) => void
}) {
  const presentation = deriveEntryPresentation(entry.content)
  const openHref = entry.publicUrl ? safeDisplayUrl(entry.publicUrl) : undefined
  const interactiveTask = tab === "active" && !batchMode && presentation.keepInteractiveMarkdown
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
          : "grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto]",
      )}
    >
      {batchMode && eligible ? (
        <BatchSelector checked={selected} title={presentation.title} onToggle={onBatchToggle} />
      ) : null}
      <div className="min-w-0">
        <h2 id={`${entry.id}-title`} className="text-sm font-medium leading-snug">
          {presentation.title}
        </h2>
        <p className="truncate font-mono text-xs text-muted-foreground" title={entry.pasteName}>
          {entry.pasteName}
        </p>
        {tab === "archived" ? <ArchiveStatus expiresAt={entry.expiresAt} retentionMode={entry.retentionMode} /> : null}
        {presentation.body ? (
          <MarkdownContent content={presentation.body} interactive={interactiveTask} onTaskActivate={onTaskActivate} />
        ) : null}
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
