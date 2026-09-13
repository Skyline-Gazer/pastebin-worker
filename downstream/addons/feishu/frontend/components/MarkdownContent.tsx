import { RenderedMarkdown } from "../RenderedMarkdown"

export function MarkdownContent({
  content,
  interactive,
  onTaskActivate,
}: {
  content: string
  interactive?: boolean
  onTaskActivate?: (control: HTMLInputElement) => void
}) {
  return (
    <div className="markdown-content min-w-0 max-w-full">
      <RenderedMarkdown content={content} interactive={interactive} onTaskActivate={onTaskActivate} />
    </div>
  )
}
