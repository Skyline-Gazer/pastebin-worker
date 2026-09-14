export type BatchAction = "archive_permanent" | "archive_expiring" | "delete"

const labels: Record<BatchAction, string> = {
  archive_permanent: "永久归档",
  archive_expiring: "限期归档",
  delete: "删除",
}

export function BatchActionBar({
  count,
  disabled = false,
  onAction,
}: {
  count: number
  disabled?: boolean
  onAction: (action: BatchAction) => void
}) {
  if (count === 0) return null
  return (
    <div aria-label="Batch actions" className="batch-action-bar" role="toolbar">
      <span>已选择 {count} 项</span>
      {(Object.keys(labels) as BatchAction[]).map((action) => (
        <button disabled={disabled} key={action} onClick={() => onAction(action)} type="button">
          {labels[action]}
        </button>
      ))}
    </div>
  )
}
