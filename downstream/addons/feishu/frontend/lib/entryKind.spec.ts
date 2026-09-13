import { describe, expect, it } from "vitest"
import { classifyListKind, hasMarkdownTask } from "./entryKind"

describe("classifyListKind", () => {
  it("keeps UTF-8 text as text even with a paste-like name", () => {
    expect(classifyListKind({ utf8Text: true })).toBe("text")
    expect(classifyListKind({ mimeType: "text/plain", filename: "notes.md" })).toBe("text")
  })

  it("classifies non-text MIME as a file", () => {
    expect(classifyListKind({ mimeType: "image/png", filename: "cat.png" })).toBe("file")
    expect(classifyListKind({ mimeType: "application/octet-stream" })).toBe("file")
  })

  it("classifies a named non-UTF-8 body as a file", () => {
    expect(classifyListKind({ filename: "blob.bin", utf8Text: false })).toBe("file")
  })
})

describe("hasMarkdownTask", () => {
  it("detects GFM tasks outside fences", () => {
    expect(hasMarkdownTask("- [ ] do it")).toBe(true)
    expect(hasMarkdownTask("```\n- [ ] fenced\n```")).toBe(false)
    expect(hasMarkdownTask("plain text")).toBe(false)
  })
})
