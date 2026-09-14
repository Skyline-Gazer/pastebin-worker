import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function EntryList({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-card">{children}</div>
}

export function EntryRow({ children, last }: { children: ReactNode; last?: boolean }) {
  return <div className={cn("hover:bg-muted/30", !last && "border-b")}>{children}</div>
}
