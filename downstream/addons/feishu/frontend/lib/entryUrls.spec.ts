import { describe, expect, it } from "vitest"
import { displayUrl, downloadUrl } from "./entryUrls"

describe("entry URLs", () => {
  it("opens text on the Display route", () => {
    expect(displayUrl("https://pb.223.im/abcd")).toBe("https://pb.223.im/d/abcd")
  })

  it("downloads files with ?a and never labels Display as download", () => {
    const file = downloadUrl("https://pb.223.im/abcd")
    expect(file).toBe("https://pb.223.im/abcd?a")
    expect(file).not.toContain("/d/")
    expect(displayUrl("https://pb.223.im/abcd")).not.toMatch(/[?&]a(=|$)/)
  })
})
