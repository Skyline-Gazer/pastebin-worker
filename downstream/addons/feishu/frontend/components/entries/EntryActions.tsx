import { Copy, ExternalLink } from "lucide-react"
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
    <div className="flex flex-wrap gap-2">
      {openHref ? (
        <Button asChild variant="outline" size="sm">
          <a href={openHref} rel="noreferrer" target="_blank">
            <ExternalLink />
            Open
          </a>
        </Button>
      ) : null}
      {publicUrl && onCopy ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onCopy(publicUrl)}>
          <Copy />
          Copy URL
        </Button>
      ) : null}
      {downloadHref ? (
        <Button asChild size="sm">
          <a href={downloadHref} rel="noreferrer" target="_blank">
            Download
          </a>
        </Button>
      ) : null}
    </div>
  )
}
