import { describe, expect, it } from "vitest"
import { entryTitle } from "./entryTitle"

describe("entryTitle", () => {
  it("uses the first non-empty line", () => {
    expect(entryTitle("\n\n  Hello world  \nSecond")).toBe("Hello world")
  })

  it("falls back to Untitled when content is empty", () => {
    expect(entryTitle("")).toBe("Untitled")
    expect(entryTitle("   \n\t")).toBe("Untitled")
    expect(entryTitle(null)).toBe("Untitled")
  })

  it("caps titles at 80 characters with an ellipsis", () => {
    const line = "a".repeat(81)
    expect(entryTitle(line)).toBe(`${"a".repeat(80)}…`)
    expect(entryTitle("a".repeat(80))).toBe("a".repeat(80))
  })
})
