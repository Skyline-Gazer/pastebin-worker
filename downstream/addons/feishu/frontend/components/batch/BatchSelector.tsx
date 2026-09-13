import { Checkbox } from "@/components/ui/checkbox"

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
    <label className="inline-flex items-center gap-2 text-sm font-medium">
      <Checkbox
        checked={checked}
        className="batch-selector"
        onCheckedChange={() => onToggle()}
        aria-label={`Select ${entryName} for batch action`}
      />
      <span>Batch select</span>
    </label>
  )
}
