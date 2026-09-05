export function BatchSelector({
  checked,
  entryName,
  onToggle,
}: {
  checked: boolean
  entryName: string
  onToggle: () => void
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={`Select ${entryName} for batch action`}
      className="batch-selector"
      onClick={onToggle}
      role="checkbox"
      type="button"
    >
      <span aria-hidden="true">{checked ? "☑" : "☐"}</span>
      <span>Batch select</span>
    </button>
  )
}
