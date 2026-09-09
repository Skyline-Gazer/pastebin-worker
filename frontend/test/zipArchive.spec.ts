import { describe, expect, it } from "vitest"
import {
  archiveNameForSelection,
  buildZipArchive,
  sanitizeArchivePath,
  shouldZipFiles,
  uniqueArchivePath,
} from "../utils/zipArchive.js"

function fileWithPath(name: string, content: string, relativePath = ""): File {
  const file = new File([content], name)
  if (relativePath) {
    Object.defineProperty(file, "webkitRelativePath", { value: relativePath })
  }
  return file
}

function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true)
}

function readU16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true)
}

/** Minimal STORE ZIP reader for tests. */
function unzipStore(bytes: Uint8Array): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>()
  let offset = 0
  while (offset + 4 <= bytes.length) {
    const sig = readU32(bytes, offset)
    if (sig === 0x02014b50 || sig === 0x06054b50) break
    if (sig !== 0x04034b50) throw new Error(`unexpected local signature ${sig.toString(16)} at ${offset}`)
    const method = readU16(bytes, offset + 8)
    if (method !== 0) throw new Error(`expected STORE, got method ${method}`)
    const crc = readU32(bytes, offset + 14)
    const size = readU32(bytes, offset + 18)
    const nameLen = readU16(bytes, offset + 26)
    const extraLen = readU16(bytes, offset + 28)
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLen))
    const dataStart = offset + 30 + nameLen + extraLen
    const data = bytes.subarray(dataStart, dataStart + size)
    expect(crc32(data)).toBe(crc)
    out.set(name, data.slice())
    offset = dataStart + size
  }
  return out
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const b of data) {
    crc ^= b
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

describe("sanitizeArchivePath", () => {
  it("keeps nested relative paths", () => {
    expect(sanitizeArchivePath("photos/2024/a.png")).toBe("photos/2024/a.png")
  })

  it("normalizes backslashes", () => {
    expect(sanitizeArchivePath("photos\\a.png")).toBe("photos/a.png")
  })

  it("rejects parent traversal", () => {
    expect(sanitizeArchivePath("../secret")).toBeNull()
    expect(sanitizeArchivePath("a/../../b")).toBeNull()
  })

  it("rejects absolute and drive-letter paths", () => {
    expect(sanitizeArchivePath("/etc/passwd")).toBeNull()
    expect(sanitizeArchivePath("C:\\Windows\\a.txt")).toBeNull()
  })

  it("rejects NUL", () => {
    expect(sanitizeArchivePath("a\0.txt")).toBeNull()
  })
})

describe("uniqueArchivePath", () => {
  it("suffixes colliding basenames deterministically", () => {
    const used = new Set<string>(["note.txt"])
    expect(uniqueArchivePath("note.txt", used)).toBe("note-2.txt")
    used.add("note-2.txt")
    expect(uniqueArchivePath("note.txt", used)).toBe("note-3.txt")
  })
})

describe("shouldZipFiles / archiveNameForSelection", () => {
  it("does not zip a single ordinary file", () => {
    expect(shouldZipFiles(1, false)).toBe(false)
  })

  it("zips two or more files", () => {
    expect(shouldZipFiles(2, false)).toBe(true)
  })

  it("zips a directory selection even with one file", () => {
    expect(shouldZipFiles(1, true)).toBe(true)
  })

  it("names the archive from the directory when present", () => {
    expect(archiveNameForSelection([{ name: "a.txt", relativePath: "docs/a.txt" }], true)).toBe("docs.zip")
  })

  it("uses archive.zip for a flat multi-file set", () => {
    expect(
      archiveNameForSelection(
        [
          { name: "a.txt", relativePath: "" },
          { name: "b.txt", relativePath: "" },
        ],
        false,
      ),
    ).toBe("archive.zip")
  })
})

describe("buildZipArchive", () => {
  it("packs multiple files into one ZIP with original bytes", async () => {
    const zip = await buildZipArchive([fileWithPath("a.txt", "alpha"), fileWithPath("b.txt", "beta")], {
      fromDirectory: false,
    })
    expect(zip.name).toBe("archive.zip")
    const entries = unzipStore(new Uint8Array(await zip.arrayBuffer()))
    expect(new TextDecoder().decode(entries.get("a.txt"))).toBe("alpha")
    expect(new TextDecoder().decode(entries.get("b.txt"))).toBe("beta")
  })

  it("preserves nested directory relative paths", async () => {
    const zip = await buildZipArchive(
      [fileWithPath("a.txt", "A", "docs/nested/a.txt"), fileWithPath("b.txt", "B", "docs/b.txt")],
      { fromDirectory: true },
    )
    expect(zip.name).toBe("docs.zip")
    const entries = unzipStore(new Uint8Array(await zip.arrayBuffer()))
    expect([...entries.keys()].sort()).toEqual(["docs/b.txt", "docs/nested/a.txt"])
    expect(new TextDecoder().decode(entries.get("docs/nested/a.txt"))).toBe("A")
  })

  it("skips traversal paths and still archives the rest", async () => {
    const zip = await buildZipArchive([fileWithPath("ok.txt", "ok"), fileWithPath("evil.txt", "no", "../evil.txt")], {
      fromDirectory: false,
    })
    const entries = unzipStore(new Uint8Array(await zip.arrayBuffer()))
    expect([...entries.keys()]).toEqual(["ok.txt"])
  })

  it("fails when every path is unsafe", async () => {
    await expect(
      buildZipArchive([fileWithPath("evil.txt", "no", "../evil.txt")], { fromDirectory: false }),
    ).rejects.toThrow(/No safe files to archive/)
  })
})
