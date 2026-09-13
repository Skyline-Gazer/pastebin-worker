import { entryTitle } from "@/lib/entryTitle"
import { displayUrl } from "@/lib/entryUrls"
import { hasMarkdownTask } from "@/lib/entryKind"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EntryActions } from "@/components/entries/EntryActions"
import { MarkdownContent } from "@/components/MarkdownContent"
import { LifecycleMenu } from "@/components/lifecycle/LifecycleMenu"
import { ArchiveStatus } from "@/components/lifecycle/ArchiveStatus"
import { BatchSelector } from "@/components/batch/BatchSelector"
import { Button } from "@/components/ui/button"
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
  const title = entryTitle(entry.content)
  const openHref = entry.publicUrl ? safeDisplayUrl(entry.publicUrl) : undefined
  const showMarkdown = typeof entry.content === "string"
  const interactiveTask = tab === "active" && !batchMode && hasMarkdownTask(entry.content)
  return (
    <Card>
      <article aria-labelledby={`${entry.id}-title`} className="min-w-0 overflow-hidden">
        <CardHeader className="space-y-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={`${entry.id}-title`} className="text-base font-semibold leading-snug">
                {title}
              </h2>
              <p className="text-sm text-muted-foreground break-all">{entry.pasteName}</p>
            </div>
            {tab === "active" ? (
              <div className="flex flex-wrap items-center gap-2">
                {batchMode && eligible ? (
                  <BatchSelector checked={selected} entryName={entry.pasteName} onToggle={onBatchToggle} />
                ) : null}
                <LifecycleMenu disabled={pending || batchMode} onAction={onLifecycle} />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <ArchiveStatus expiresAt={entry.expiresAt} retentionMode={entry.retentionMode} />
                {entry.retentionMode === "timed" &&
                (!entry.expiresAt ||
                  !Number.isFinite(Date.parse(entry.expiresAt)) ||
                  Date.parse(entry.expiresAt) <= Date.now()) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={reconciliationPending}
                    onClick={onReconcile}
                  >
                    {reconciliationPending ? "Reconciling…" : "Reconcile archive"}
                  </Button>
                ) : null}
                <Button type="button" variant="outline" size="sm" disabled={restorePending} onClick={onRestore}>
                  {restorePending ? "Restoring…" : "恢复为进行中"}
                </Button>
              </div>
            )}
          </div>
          <EntryActions
            publicUrl={entry.publicUrl || undefined}
            openHref={openHref}
            onCopy={entry.publicUrl ? onCopy : undefined}
          />
        </CardHeader>
        {showMarkdown ? (
          <CardContent className="min-w-0 p-4 pt-0">
            <MarkdownContent
              content={entry.content || ""}
              interactive={interactiveTask}
              onTaskActivate={onTaskActivate}
            />
          </CardContent>
        ) : null}
      </article>
    </Card>
  )
}
