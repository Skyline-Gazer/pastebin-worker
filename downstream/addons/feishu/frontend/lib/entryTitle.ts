const TITLE_MAX = 80

export function entryTitle(content: string | null | undefined): string {
  const first = (content ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .find((line) => line.length > 0)
  if (!first) return "Untitled"
  return first.length > TITLE_MAX ? `${first.slice(0, TITLE_MAX)}…` : first
}
