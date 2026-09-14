import { Badge } from "@/components/ui/badge"

export function ProviderBadge({ brand }: { brand: "Feishu" | "Lark" }) {
  return <Badge variant="secondary">{brand}</Badge>
}
