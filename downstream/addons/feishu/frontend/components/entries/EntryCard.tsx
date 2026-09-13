import { FileEntryCard } from "@/components/entries/FileEntryCard"
import { TextEntryCard } from "@/components/entries/TextEntryCard"
import type { FixtureEntry } from "../../fixtures"

export function EntryCard(props: {
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
  if (props.entry.kind === "file") return <FileEntryCard {...props} />
  return <TextEntryCard {...props} />
}
