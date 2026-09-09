import { expect, test } from "vitest"
import { DEFAULT_EDIT_FILENAME, normalizePasteFilename } from "../constants.js"
import { sniffMimeType } from "../mimeSniff.js"

test("normalizePasteFilename defaults empty names to Untitled", () => {
  expect(DEFAULT_EDIT_FILENAME).toStrictEqual("Untitled")
  expect(normalizePasteFilename(undefined)).toStrictEqual("Untitled")
  expect(normalizePasteFilename("")).toStrictEqual("Untitled")
  expect(normalizePasteFilename("   ")).toStrictEqual("Untitled")
  expect(normalizePasteFilename("notes.txt")).toStrictEqual("notes.txt")
  expect(normalizePasteFilename(" notes.txt ")).toStrictEqual(" notes.txt ")
})

test("sniffMimeType recognizes common binaries and ignores HTML/text", () => {
  expect(sniffMimeType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toStrictEqual("image/png")
  expect(sniffMimeType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toStrictEqual("image/jpeg")
  expect(sniffMimeType(new TextEncoder().encode("GIF89a"))).toStrictEqual("image/gif")
  expect(sniffMimeType(new TextEncoder().encode("RIFF....WEBP"))).toStrictEqual("image/webp")
  expect(sniffMimeType(new TextEncoder().encode("%PDF-1.4"))).toStrictEqual("application/pdf")
  expect(sniffMimeType(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toStrictEqual("application/zip")
  expect(sniffMimeType(new TextEncoder().encode("<!DOCTYPE html>"))).toBeUndefined()
  expect(sniffMimeType(new TextEncoder().encode("hello"))).toBeUndefined()
})
