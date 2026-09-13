import { Button } from "@/components/ui/button"

export function ProviderLogin({ providers }: { providers: readonly ("feishu" | "lark")[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Feishu / Lark Add-on</p>
      <div className="flex flex-wrap gap-2">
        {providers.includes("feishu") && (
          <Button asChild>
            <a href="/api/auth/login/feishu">Continue with Feishu</a>
          </Button>
        )}
        {providers.includes("lark") && (
          <Button asChild variant="outline">
            <a href="/api/auth/login/lark">Continue with Lark</a>
          </Button>
        )}
      </div>
    </div>
  )
}
