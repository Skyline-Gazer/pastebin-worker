import { Checkbox } from "@/components/ui/checkbox"

export function batchSelectorLabel(title: string) {
  return `选择 ${title}`
}

export function BatchSelector({ checked, title, onToggle }: { checked: boolean; title: string; onToggle: () => void }) {
  return (
    <label className="inline-flex items-start pt-0.5">
      <Checkbox
        checked={checked}
        className="batch-selector"
        onCheckedChange={() => onToggle()}
        aria-label={batchSelectorLabel(title)}
      />
    </label>
  )
}
