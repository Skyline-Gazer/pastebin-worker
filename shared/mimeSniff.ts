const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_SIG = [0xff, 0xd8, 0xff]
const GIF87_SIG = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]
const GIF89_SIG = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
const ZIP_LOCAL = [0x50, 0x4b, 0x03, 0x04]
const ZIP_EMPTY = [0x50, 0x4b, 0x05, 0x06]
const ZIP_SPANNED = [0x50, 0x4b, 0x07, 0x08]

function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false
  return prefix.every((b, i) => bytes[i] === b)
}

function hasAsciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false
  }
  return true
}

export function sniffMimeType(bytes: ArrayBuffer | Uint8Array): string | undefined {
  const header = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (hasPrefix(header, PNG_SIG)) return "image/png"
  if (hasPrefix(header, JPEG_SIG)) return "image/jpeg"
  if (hasPrefix(header, GIF87_SIG) || hasPrefix(header, GIF89_SIG)) return "image/gif"
  if (hasAsciiAt(header, 0, "RIFF") && hasAsciiAt(header, 8, "WEBP")) return "image/webp"
  if (hasAsciiAt(header, 0, "%PDF")) return "application/pdf"
  if (hasPrefix(header, ZIP_LOCAL) || hasPrefix(header, ZIP_EMPTY) || hasPrefix(header, ZIP_SPANNED)) {
    return "application/zip"
  }
  return undefined
}
