import { Moon, Sun } from "lucide-react"
import { ProviderBadge } from "@/components/auth/ProviderBadge"
import { Button } from "@/components/ui/button"

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
  const nextTheme = theme === "light" ? "dark" : "light"
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div>
        <p className="text-sm text-muted-foreground">Feishu / Lark Add-on</p>
        <h1 id="page-title" className="text-lg font-semibold">
          Pastebin
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {authenticated && brand ? <ProviderBadge brand={brand} /> : null}
        <Button type="button" variant="outline" size="sm" onClick={onToggleTheme}>
          {theme === "light" ? <Moon /> : <Sun />}
          Switch to {nextTheme} theme
        </Button>
        {authenticated ? (
          <Button type="button" variant="ghost" size="sm" onClick={onLogout}>
            Log out
          </Button>
        ) : null}
      </div>
    </header>
  )
}
