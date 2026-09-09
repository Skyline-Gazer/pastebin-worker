import type { PasteMetadata } from "./storage/storage.js"

export function pasteAllowsByteRange(metadata: PasteMetadata & { maxReads?: number }): boolean {
  if (metadata.encryptionScheme) return false
  if (metadata.maxReads != null) return false
  return true
}

export function parseBytesRange(
  header: string | null,
  size: number,
): { start: number; end: number } | "unsatisfiable" | null {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null
  const startToken = match[1]
  const endToken = match[2]
  if (startToken === "" && endToken === "") return null
  if (size <= 0) return "unsatisfiable"
  if (startToken === "") {
    const suffix = Number(endToken)
    if (!Number.isFinite(suffix) || suffix <= 0) return "unsatisfiable"
    return { start: Math.max(0, size - suffix), end: size - 1 }
  }
  const start = Number(startToken)
  const end = endToken === "" ? size - 1 : Number(endToken)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
    return "unsatisfiable"
  }
  return { start, end: Math.min(end, size - 1) }
}
