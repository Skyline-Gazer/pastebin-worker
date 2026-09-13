import { displayUrl, downloadUrl } from "@/lib/entryUrls"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { BatchSelector } from "@/components/batch/BatchSelector"
import { EntryActions } from "@/components/entries/EntryActions"
import { ArchiveStatus } from "@/components/lifecycle/ArchiveStatus"
import { LifecycleMenu } from "@/components/lifecycle/LifecycleMenu"
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
              <div className="mt-2 flex flex-wrap gap-2">
                {entry.mimeType ? <Badge variant="outline">{entry.mimeType}</Badge> : null}
                {typeof entry.sizeBytes === "number" ? (
                  <Badge variant="secondary">{entry.sizeBytes} bytes</Badge>
                ) : null}
                {entry.encrypted ? <Badge variant="destructive">Encrypted</Badge> : null}
                {!entry.filename && !entry.mimeType ? (
                  <p className="text-sm text-muted-foreground">Unable to display file metadata</p>
                ) : null}
              </div>
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
            downloadHref={downloadHref}
            onCopy={entry.publicUrl ? onCopy : undefined}
          />
        </CardHeader>
        <CardContent className="p-4 pt-0" />
      </article>
    </Card>
  )
}
