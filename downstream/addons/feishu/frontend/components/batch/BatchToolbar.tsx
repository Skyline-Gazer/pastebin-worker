import { BatchActionBar, type BatchAction } from "../../BatchActionBar"
import { BatchModeToggle } from "../../BatchModeToggle"
import { Button } from "@/components/ui/button"

export function BatchToolbar({
  batchMode,
  tab,
  eligible,
  count,
  disabled,
  onToggleMode,
  onSelectAll,
  onClear,
  onAction,
}: {
  batchMode: boolean
  tab: "active" | "archived"
  eligible: boolean
  count: number
  disabled?: boolean
  onToggleMode: () => void
  onSelectAll: () => void
  onClear: () => void
  onAction: (action: BatchAction) => void
}) {
  if (tab !== "active") return null
  return (
    <div className="flex flex-col gap-3">
      <BatchModeToggle batchMode={batchMode} onToggle={onToggleMode} />
      {batchMode && eligible ? (
        <div aria-label="Batch selection controls" className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onSelectAll}>
            全选
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            清空
          </Button>
        </div>
      ) : null}
      {batchMode ? <BatchActionBar count={count} disabled={disabled} onAction={onAction} /> : null}
    </div>
  )
}

export type { BatchAction }
