import { describe, expect, it } from "vitest"
import { classifyPasteShare, primaryShareUrl } from "../utils/pasteShare.js"

describe("paste share classification", () => {
  it("classifies text-editor uploads as text with Display primary URL", () => {
    expect(classifyPasteShare({ sourceKind: "text" })).toBe("text")
    expect(classifyPasteShare({ sourceKind: "text", encryptionKey: "secret-key" })).toBe("text")
    expect(primaryShareUrl("https://example.com/abcd", "text")).toBe("https://example.com/d/abcd")
    expect(primaryShareUrl("https://example.com/abcd", "text", "secret-key")).toBe(
      "https://example.com/d/abcd#secret-key",
    )
  })

  it("classifies File-tab uploads as unencrypted files with ?a regardless of MIME metadata", () => {
    expect(classifyPasteShare({ sourceKind: "file" })).toBe("unencrypted-file")
    expect(primaryShareUrl("https://example.com/abcd", "unencrypted-file")).toBe("https://example.com/abcd?a")
  })

  it("classifies encrypted File-tab uploads as encrypted-file on Display fragment, never query key", () => {
    expect(classifyPasteShare({ sourceKind: "file", encryptionKey: "secret-key" })).toBe("encrypted-file")
    const url = primaryShareUrl("https://example.com/abcd", "encrypted-file", "secret-key")
    expect(url).toBe("https://example.com/d/abcd#secret-key")
    expect(url).not.toMatch(/[?&]key=/)
  })
})
