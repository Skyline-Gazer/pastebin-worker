const TEXTISH_MIME = /^(text\/|application\/(json|xml|javascript|xhtml\+xml|x-javascript))/i

export function isBinaryMimeType(mimeType?: string): boolean {
  const type = mimeType?.split(";")[0]?.trim()
  if (!type) return false
  return !TEXTISH_MIME.test(type)
}

export function classifyListKind(input: { mimeType?: string; filename?: string; utf8Text?: boolean }): "text" | "file" {
  if (isBinaryMimeType(input.mimeType)) return "file"
  if (input.filename && input.utf8Text === false) return "file"
  return "text"
}

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  zip: "application/zip",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  bin: "application/octet-stream",
}

export function mimeTypeFromFilename(filename?: string): string | undefined {
  if (!filename?.includes(".")) return undefined
  const ext = filename.split(".").pop()?.toLowerCase()
  return ext ? EXT_MIME[ext] : undefined
}

export function hasMarkdownTask(content: string | null | undefined): boolean {
  if (!content) return false
  const withoutFences = content.replace(/```[\s\S]*?```/g, "")
  return /(^|\n)\s*[-*+]\s+\[[ xX]\]\s+/.test(withoutFences)
}
