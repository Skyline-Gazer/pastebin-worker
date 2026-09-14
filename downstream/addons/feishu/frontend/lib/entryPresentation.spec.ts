import { describe, expect, it } from "vitest"
import { deriveEntryPresentation } from "./entryPresentation"

describe("deriveEntryPresentation", () => {
  it("does not keep a body preview for a single non-empty line", () => {
    expect(deriveEntryPresentation("SEND_FT_CREATE_20260912_01")).toEqual({
      title: "SEND_FT_CREATE_20260912_01",
      body: null,
      keepInteractiveMarkdown: false,
    })
  })

  it("starts a multi-line plain preview after the consumed title line", () => {
    expect(deriveEntryPresentation("Weekly notes\nsecond line\nthird line")).toEqual({
      title: "Weekly notes",
      body: "second line\nthird line",
      keepInteractiveMarkdown: false,
    })
  })

  it("keeps first-line GFM tasks as full interactive Markdown", () => {
    const content = "- [ ] first Markdown task\n- [x] done"
    expect(deriveEntryPresentation(content)).toEqual({
      title: "- [ ] first Markdown task",
      body: content,
      keepInteractiveMarkdown: true,
    })
  })
})
