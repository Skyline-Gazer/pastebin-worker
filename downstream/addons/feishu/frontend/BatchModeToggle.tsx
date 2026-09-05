export function BatchModeToggle({ batchMode, onToggle }: { batchMode: boolean; onToggle: () => void }) {
  return (
    <button className="batch-mode-toggle" onClick={onToggle} type="button">
      {batchMode ? "Exit Batch Mode" : "Enter Batch Mode"}
    </button>
  )
}
