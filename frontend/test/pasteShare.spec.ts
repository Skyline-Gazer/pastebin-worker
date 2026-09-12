import { describe, expect, it } from "vitest"
import { classifyPasteShare, primaryShareUrl } from "../utils/pasteShare.js"

describe("paste share classification", () => {
  it("classifies UTF-8/text pastes as text with Display primary URL", () => {
    expect(classifyPasteShare({})).toBe("text")
    expect(classifyPasteShare({ mimeType: "text/plain" })).toBe("text")
    expect(primaryShareUrl("https://example.com/abcd", "text")).toBe("https://example.com/d/abcd")
  })

  it("classifies binary mime as unencrypted file with ?a primary URL", () => {
    expect(classifyPasteShare({ mimeType: "image/png" })).toBe("unencrypted-file")
    expect(classifyPasteShare({ mimeType: "application/octet-stream" })).toBe("unencrypted-file")
    expect(primaryShareUrl("https://example.com/abcd", "unencrypted-file")).toBe("https://example.com/abcd?a")
  })

  it("classifies encryption key as encrypted share on Display fragment, never query key", () => {
    expect(classifyPasteShare({ encryptionKey: "secret-key", mimeType: "image/png" })).toBe("encrypted-file")
    const url = primaryShareUrl("https://example.com/abcd", "encrypted-file", "secret-key")
    expect(url).toBe("https://example.com/d/abcd#secret-key")
    expect(url).not.toMatch(/[?&]key=/)
  })
})
