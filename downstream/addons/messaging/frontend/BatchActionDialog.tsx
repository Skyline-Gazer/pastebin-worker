import { useEffect, useRef } from "react"
import type { BatchAction } from "./BatchActionBar"

export function BatchActionDialog({
  action,
  count,
  onCancel,
  onConfirm,
}: {
  action: BatchAction
  count: number
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const isDelete = action === "delete"
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])
  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== "Tab") return
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])
    if (focusable.length === 0) return
    const index = focusable.indexOf(document.activeElement as HTMLButtonElement)
    const nextIndex = event.shiftKey ? (index <= 0 ? focusable.length - 1 : index - 1) : (index + 1) % focusable.length
    event.preventDefault()
    focusable[nextIndex]?.focus()
  }
  return (
    <div
      aria-labelledby="batch-action-title"
      aria-modal="true"
      className="batch-action-dialog"
      onKeyDown={trapFocus}
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <h2 id="batch-action-title">{isDelete ? "确认批量删除" : "确认限期归档"}</h2>
      <p>{isDelete ? `将永久删除 ${count} 项，此操作无法撤销。` : `将把 ${count} 项转为限期归档。`}</p>
      <div className="completion-actions">
        <button onClick={onCancel} type="button">
          取消
        </button>
        <button onClick={onConfirm} type="button">
          确认
        </button>
      </div>
    </div>
  )
}
