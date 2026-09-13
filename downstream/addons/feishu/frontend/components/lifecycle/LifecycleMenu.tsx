import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type LifecycleAction = "archive_permanent" | "archive_expiring" | "delete"

export function LifecycleMenu({
  disabled,
  onAction,
}: {
  disabled?: boolean
  onAction: (action: LifecycleAction) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled} aria-label="Lifecycle actions">
          <MoreHorizontal />
          更多
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onAction("archive_permanent")}>永久归档</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("archive_expiring")}>限期归档</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("delete")}>删除</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
