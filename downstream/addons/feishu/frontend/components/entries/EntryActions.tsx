import { Copy, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EntryActions({
  publicUrl,
  openHref,
  downloadHref,
  onCopy,
}: {
  publicUrl?: string
  openHref?: string
  downloadHref?: string
  onCopy?: (url: string) => void
}) {
  if (!publicUrl && !openHref && !downloadHref) return null
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {openHref ? (
        <Button asChild variant="outline" size="sm">
          <a href={openHref} rel="noreferrer" target="_blank">
            <ExternalLink />
            打开
          </a>
        </Button>
      ) : null}
      {publicUrl && onCopy ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onCopy(publicUrl)}>
          <Copy />
          复制链接
        </Button>
      ) : null}
      {downloadHref ? (
        <Button asChild size="sm">
          <a href={downloadHref} rel="noreferrer" target="_blank">
            <Download />
            下载
          </a>
        </Button>
      ) : null}
    </div>
  )
}
