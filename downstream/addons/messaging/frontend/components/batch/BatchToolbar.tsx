import { Button } from "@/components/ui/button"
import type { BatchAction } from "../../BatchActionBar"

export function BatchToolbar({
  batchMode,
  tab,
  eligible,
  selectedCount,
  eligibleCount,
  disabled,
  onToggleMode,
  onSelectAll,
  onClear,
  onAction,
}: {
  batchMode: boolean
  tab: "active" | "archived"
  eligible: boolean
  selectedCount: number
  eligibleCount: number
  disabled?: boolean
  onToggleMode: () => void
  onSelectAll: () => void
  onClear: () => void
  onAction: (action: BatchAction) => void
}) {
  if (tab !== "active") return null
  if (!batchMode) {
    return (
      <Button type="button" variant="outline" size="sm" className="self-end" onClick={onToggleMode}>
        批量管理
      </Button>
    )
  }
  const actionsDisabled = disabled || selectedCount === 0
  return (
    <div
      aria-label="批量管理"
      className="flex w-full flex-wrap items-center gap-2 rounded-lg border bg-card px-2 py-1.5"
      role="toolbar"
    >
      <span className="text-sm text-muted-foreground">
        已选择 {selectedCount} / {eligibleCount}
      </span>
      {eligible ? (
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onSelectAll}>
            全选
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            清除
          </Button>
        </>
      ) : null}
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={actionsDisabled}
          onClick={() => onAction("archive_permanent")}
        >
          永久归档
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={actionsDisabled}
          onClick={() => onAction("archive_expiring")}
        >
          限期归档
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={actionsDisabled}
          onClick={() => onAction("delete")}
        >
          删除
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onToggleMode}>
          完成
        </Button>
      </div>
    </div>
  )
}

export type { BatchAction }
