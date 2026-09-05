export function ManagedTaskCheckbox({
  checked,
  disabled,
  onComplete,
}: {
  checked: boolean
  disabled?: boolean
  onComplete: (control: HTMLButtonElement) => void
}) {
  return (
    <button
      className="managed-task"
      type="button"
      role="checkbox"
      aria-label="Complete managed entry"
      aria-checked={checked}
      disabled={disabled}
      onClick={(event) => onComplete(event.currentTarget)}
    >
      <span aria-hidden="true" className="managed-task-indicator">
        {checked ? "☑" : "☐"}
      </span>
      <span>Managed task</span>
    </button>
  )
}
