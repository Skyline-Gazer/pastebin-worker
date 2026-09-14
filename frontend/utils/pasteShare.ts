export type PasteShareClass = "text" | "unencrypted-file" | "encrypted-file"

export type PasteSourceKind = "text" | "file"

export function classifyPasteShare(input: { sourceKind: PasteSourceKind; encryptionKey?: string }): PasteShareClass {
  if (input.sourceKind === "file") {
    return input.encryptionKey ? "encrypted-file" : "unencrypted-file"
  }
  return "text"
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
