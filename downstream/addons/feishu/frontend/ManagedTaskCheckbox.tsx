export function ManagedTaskCheckbox({ checked }: { checked: boolean }) {
  return (
    <label className="managed-task">
      <input
        aria-label="Managed entry task (Phase 5 no-op)"
        checked={checked}
        onChange={() => undefined}
        type="checkbox"
      />
      <span>Managed task — no-op until Phase 6</span>
    </label>
  )
}
