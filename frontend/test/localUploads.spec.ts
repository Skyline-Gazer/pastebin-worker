import { afterEach, describe, expect, it } from "vitest"
import { loadLocalUploads, pasteLabel, recordLocalUpload, removeLocalUpload } from "../utils/localUploads.js"

describe("local upload history", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("records newest first, caps at 50, and labels by public name", () => {
    const first = recordLocalUpload({
      url: "https://example.com/aaaa",
      manageUrl: "https://example.com/aaaa:secret-a",
    })
    expect(pasteLabel(first[0].url)).toBe("aaaa")
    expect(first[0].manageUrl).toBe("https://example.com/aaaa:secret-a")

    recordLocalUpload({
      url: "https://example.com/bbbb",
      manageUrl: "https://example.com/bbbb:secret-b",
    })
    const loaded = loadLocalUploads()
    expect(loaded.map((e) => pasteLabel(e.url))).toEqual(["bbbb", "aaaa"])

    for (let i = 0; i < 60; i++) {
      recordLocalUpload({
        url: `https://example.com/n${i}`,
        manageUrl: `https://example.com/n${i}:secret`,
      })
    }
    expect(loadLocalUploads()).toHaveLength(50)
    expect(pasteLabel(loadLocalUploads()[0].url)).toBe("n59")
  })

  it("removes a manage URL from history", () => {
    recordLocalUpload({
      url: "https://example.com/aaaa",
      manageUrl: "https://example.com/aaaa:secret-a",
    })
    removeLocalUpload("https://example.com/aaaa:secret-a")
    expect(loadLocalUploads()).toEqual([])
  })
})
