import { describe, expect, it } from "vitest"
import type { PasteEditState } from "../components/PasteInputPanel.js"
import { decrypt, decodeKey } from "../utils/encryption.js"
import { prepareUploadContent } from "../utils/uploader.js"

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

function unzipStore(bytes: Uint8Array): Map<string, string> {
  const out = new Map<string, string>()
  let offset = 0
  while (offset + 4 <= bytes.length) {
    const sig = readU32(bytes, offset)
    if (sig === 0x02014b50 || sig === 0x06054b50) break
    if (sig !== 0x04034b50) throw new Error(`bad zip ${sig.toString(16)}`)
    const size = readU32(bytes, offset + 18)
    const nameLen = readU16(bytes, offset + 26)
    const extraLen = readU16(bytes, offset + 28)
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLen))
    const dataStart = offset + 30 + nameLen + extraLen
    out.set(name, new TextDecoder().decode(bytes.subarray(dataStart, dataStart + size)))
    offset = dataStart + size
  }
  return out
}

function fileState(partial: Partial<PasteEditState> & Pick<PasteEditState, "file">): PasteEditState {
  return {
    editKind: "file",
    editContent: "",
    files: [],
    fromDirectory: false,
    ...partial,
  }
}

describe("prepareUploadContent", () => {
  it("leaves a single ordinary file unchanged", async () => {
    const file = fileWithPath("solo.txt", "hello")
    const prepared = await prepareUploadContent(fileState({ file, files: [file] }), false, () => undefined)
    expect(prepared.name).toBe("solo.txt")
    expect(await prepared.text()).toBe("hello")
  })

  it("packs multiple files into one ZIP for the existing upload pipeline", async () => {
    const files = [fileWithPath("a.txt", "alpha"), fileWithPath("b.txt", "beta")]
    const prepared = await prepareUploadContent(
      fileState({ file: files[0], files, fromDirectory: false }),
      false,
      () => undefined,
    )
    expect(prepared.name).toBe("archive.zip")
    const entries = unzipStore(new Uint8Array(await prepared.arrayBuffer()))
    expect(entries.get("a.txt")).toBe("alpha")
    expect(entries.get("b.txt")).toBe("beta")
  })

  it("encrypts the ZIP with existing AES-GCM", async () => {
    const files = [fileWithPath("a.txt", "alpha"), fileWithPath("b.txt", "beta")]
    let key: string | undefined
    const prepared = await prepareUploadContent(
      fileState({ file: files[0], files, fromDirectory: false }),
      true,
      (k) => {
        key = k
      },
    )
    expect(key).toBeTruthy()
    expect(prepared.name).toBe("archive.zip")
    const plaintext = await decrypt(
      "AES-GCM",
      await decodeKey("AES-GCM", key!),
      new Uint8Array(await prepared.arrayBuffer()),
    )
    expect(plaintext).not.toBeNull()
    const entries = unzipStore(plaintext!)
    expect(entries.get("a.txt")).toBe("alpha")
  })

  it("uses a directory name for a directory ZIP", async () => {
    const file = fileWithPath("a.txt", "A", "docs/a.txt")
    const prepared = await prepareUploadContent(
      fileState({ file, files: [file], fromDirectory: true }),
      false,
      () => undefined,
    )
    expect(prepared.name).toBe("docs.zip")
    const entries = unzipStore(new Uint8Array(await prepared.arrayBuffer()))
    expect(entries.get("docs/a.txt")).toBe("A")
  })
})
