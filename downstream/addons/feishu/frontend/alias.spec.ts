import { describe, expect, it } from "vitest"
import { cn } from "@/lib/utils"

describe("@/ alias", () => {
  it("resolves Add-on frontend imports", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })
})
