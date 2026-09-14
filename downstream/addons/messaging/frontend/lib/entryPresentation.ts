import { hasMarkdownTask } from "./entryKind"
import { entryTitle } from "./entryTitle"

export function deriveEntryPresentation(content: string | null | undefined) {
  const title = entryTitle(content)
  const lines = (content ?? "").split(/\r?\n/)
  if (!lines.some((line) => line.trim().length > 0)) {
    return { title, body: null, keepInteractiveMarkdown: false }
  }
  if (hasMarkdownTask(content)) {
    return { title, body: content ?? null, keepInteractiveMarkdown: true }
  }
  const firstIdx = lines.findIndex((line) => line.trim().length > 0)
  const rest = lines.slice(firstIdx + 1)
  return {
    title,
    body: rest.some((line) => line.trim().length > 0) ? rest.join("\n") : null,
    keepInteractiveMarkdown: false,
  }
}
