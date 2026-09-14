import { Moon, Sun } from "lucide-react"
import { ProviderBadge } from "@/components/auth/ProviderBadge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function AppHeader({
  brand,
  theme,
  authenticated,
  onToggleTheme,
  onLogout,
}: {
  brand?: "Feishu" | "Lark"
  theme: "light" | "dark"
  authenticated: boolean
  onToggleTheme: () => void
  onLogout?: () => void
}) {
  const themeLabel = theme === "light" ? "切换到深色主题" : "切换到浅色主题"
  return (
    <header className="flex h-12 items-center justify-between gap-3 border-b border-border">
      <div className="flex min-w-0 items-center gap-2">
        <h1 id="page-title" className="text-sm font-semibold">
          Pastebin
        </h1>
        {authenticated && brand ? <ProviderBadge brand={brand} /> : null}
      </div>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label={themeLabel} onClick={onToggleTheme}>
              {theme === "light" ? <Moon /> : <Sun />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{themeLabel}</TooltipContent>
        </Tooltip>
        {authenticated ? (
          <Button type="button" variant="ghost" size="sm" onClick={onLogout}>
            退出
          </Button>
        ) : null}
      </div>
    </header>
  )
}
