export type PasteShareClass = "text" | "unencrypted-file" | "encrypted-file"

const TEXTISH_MIME = /^(text\/|application\/(json|xml|javascript|xhtml\+xml|x-javascript))/i

export function isBinaryMimeType(mimeType?: string): boolean {
  const type = mimeType?.split(";")[0]?.trim()
  if (!type) return false
  return !TEXTISH_MIME.test(type)
}

export function classifyPasteShare(input: { encryptionKey?: string; mimeType?: string }): PasteShareClass {
  if (input.encryptionKey) return isBinaryMimeType(input.mimeType) ? "encrypted-file" : "text"
  return isBinaryMimeType(input.mimeType) ? "unencrypted-file" : "text"
}

export function withPathPrefix(url: string, prefix: string): string {
  const parsed = new URL(url)
  parsed.pathname = prefix + parsed.pathname
  return parsed.toString()
}

export function makeDecryptionUrl(url: string, key?: string): string {
  const base = withPathPrefix(url, "/d")
  return key ? `${base}#${key}` : base
}

export function attachmentUrl(url: string): string {
  return url.includes("?") ? `${url}&a` : `${url}?a`
}

export function primaryShareUrl(pasteUrl: string, cls: PasteShareClass, encryptionKey?: string): string {
  if (cls === "unencrypted-file") return attachmentUrl(pasteUrl)
  return makeDecryptionUrl(pasteUrl, encryptionKey)
}
