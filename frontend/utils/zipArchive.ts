/** Client-side STORE ZIP for multi-file / directory uploads. No extra dependency. */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const b of data) {
    crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function sanitizeArchivePath(raw: string): string | null {
  if (raw.includes("\0")) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^[a-zA-Z]:/.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("\\")) return null
  const normalized = trimmed.replaceAll("\\", "/")
  if (normalized.startsWith("/")) return null
  const parts: string[] = []
  for (const part of normalized.split("/")) {
    if (part === "" || part === ".") continue
    if (part === "..") return null
    parts.push(part)
  }
  if (parts.length === 0) return null
  return parts.join("/")
}

export function uniqueArchivePath(desired: string, used: Set<string>): string {
  if (!used.has(desired)) return desired
  const lastSlash = desired.lastIndexOf("/")
  const lastDot = desired.lastIndexOf(".")
  const split = lastDot > lastSlash ? lastDot : desired.length
  const stem = desired.slice(0, split)
  const ext = desired.slice(split)
  let n = 2
  let candidate = `${stem}-${n}${ext}`
  while (used.has(candidate)) {
    n++
    candidate = `${stem}-${n}${ext}`
  }
  return candidate
}

export function shouldZipFiles(fileCount: number, fromDirectory: boolean): boolean {
  return fromDirectory || fileCount >= 2
}

export interface ArchiveNameSource {
  name: string
  relativePath?: string
}

export function archiveNameForSelection(files: ArchiveNameSource[], fromDirectory: boolean): string {
  if (fromDirectory) {
    for (const file of files) {
      const sanitized = sanitizeArchivePath(file.relativePath || file.name)
      if (sanitized?.includes("/")) {
        return `${sanitized.split("/")[0]}.zip`
      }
    }
  }
  return "archive.zip"
}

function fileRelativePath(file: File): string {
  const withRel = file as File & { webkitRelativePath?: string }
  const rel = withRel.webkitRelativePath || ""
  return rel || file.name
}

interface ZipEntry {
  name: Uint8Array
  data: Uint8Array
  crc: number
}

function encodeStoreZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const entries: ZipEntry[] = files.map((file) => ({
    name: new TextEncoder().encode(file.name),
    data: file.data,
    crc: crc32(file.data),
  }))
  let localSize = 0
  let centralSize = 0
  for (const entry of entries) {
    localSize += 30 + entry.name.length + entry.data.length
    centralSize += 46 + entry.name.length
  }
  const out = new Uint8Array(localSize + centralSize + 22)
  const view = new DataView(out.buffer)
  let offset = 0
  const localOffsets: number[] = []
  for (const entry of entries) {
    localOffsets.push(offset)
    view.setUint32(offset, 0x04034b50, true)
    view.setUint16(offset + 4, 20, true)
    view.setUint16(offset + 6, 0x0800, true)
    view.setUint16(offset + 8, 0, true)
    view.setUint16(offset + 10, 0, true)
    view.setUint16(offset + 12, 0, true)
    view.setUint32(offset + 14, entry.crc, true)
    view.setUint32(offset + 18, entry.data.length, true)
    view.setUint32(offset + 22, entry.data.length, true)
    view.setUint16(offset + 26, entry.name.length, true)
    view.setUint16(offset + 28, 0, true)
    out.set(entry.name, offset + 30)
    out.set(entry.data, offset + 30 + entry.name.length)
    offset += 30 + entry.name.length + entry.data.length
  }
  const centralStart = offset
  for (const [i, entry] of entries.entries()) {
    view.setUint32(offset, 0x02014b50, true)
    view.setUint16(offset + 4, 20, true)
    view.setUint16(offset + 6, 20, true)
    view.setUint16(offset + 8, 0x0800, true)
    view.setUint16(offset + 10, 0, true)
    view.setUint16(offset + 12, 0, true)
    view.setUint16(offset + 14, 0, true)
    view.setUint32(offset + 16, entry.crc, true)
    view.setUint32(offset + 20, entry.data.length, true)
    view.setUint32(offset + 24, entry.data.length, true)
    view.setUint16(offset + 28, entry.name.length, true)
    view.setUint16(offset + 30, 0, true)
    view.setUint16(offset + 32, 0, true)
    view.setUint16(offset + 34, 0, true)
    view.setUint16(offset + 36, 0, true)
    view.setUint32(offset + 38, 0, true)
    view.setUint32(offset + 42, localOffsets[i], true)
    out.set(entry.name, offset + 46)
    offset += 46 + entry.name.length
  }
  view.setUint32(offset, 0x06054b50, true)
  view.setUint16(offset + 4, 0, true)
  view.setUint16(offset + 6, 0, true)
  view.setUint16(offset + 8, entries.length, true)
  view.setUint16(offset + 10, entries.length, true)
  view.setUint32(offset + 12, offset - centralStart, true)
  view.setUint32(offset + 16, centralStart, true)
  view.setUint16(offset + 20, 0, true)
  return out
}

export async function buildZipArchive(files: File[], options: { fromDirectory: boolean }): Promise<File> {
  const used = new Set<string>()
  const packed: { name: string; data: Uint8Array }[] = []
  const nameSources: ArchiveNameSource[] = []
  for (const file of files) {
    const relativePath = fileRelativePath(file)
    nameSources.push({ name: file.name, relativePath })
    const sanitized = sanitizeArchivePath(relativePath)
    if (!sanitized) continue
    const name = uniqueArchivePath(sanitized, used)
    used.add(name)
    packed.push({ name, data: new Uint8Array(await file.arrayBuffer()) })
  }
  if (packed.length === 0) {
    throw new Error("No safe files to archive")
  }
  const bytes = encodeStoreZip(packed)
  const archiveName = archiveNameForSelection(nameSources, options.fromDirectory)
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return new File([copy], archiveName, { type: "application/zip" })
}
