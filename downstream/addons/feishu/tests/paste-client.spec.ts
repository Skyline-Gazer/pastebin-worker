import { describe, expect, it, vi } from "vitest"
import { PasteClient } from "../worker/paste-client"

describe("reviewed Patch 010 HTTP contract", () => {
  it("uses multipart never and server password, ignores secret-bearing response fields", async () => {
    const transport = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({
          url: "https://paste.example/abcd",
          manageUrl: "SECRET",
          expireAt: null,
          expirationSeconds: null,
        }),
      ),
    )
    const client = new PasteClient("https://paste.example", transport)
    expect(await client.create("", "a".repeat(64))).toBe("abcd")
    const init = transport.mock.calls[0][1]!
    expect(init.redirect).toBe("error")
    expect((init.body as FormData).get("c")).toBe("")
    expect((init.body as FormData).get("e")).toBe("never")
    expect((init.body as FormData).get("s")).toBe("a".repeat(64))
  })

  it("rejects timed responses, foreign URLs and changed PUT identity", async () => {
    for (const data of [
      { url: "https://paste.example/abcd", expireAt: "tomorrow", expirationSeconds: 10 },
      { url: "https://evil.example/abcd", expireAt: null, expirationSeconds: null },
      { url: "https://paste.example/abcd:secret", expireAt: null, expirationSeconds: null },
    ]) {
      const client = new PasteClient("https://paste.example", () => Promise.resolve(Response.json(data)))
      await expect(client.create("body", "a".repeat(64))).rejects.toThrow("UPSTREAM_INVALID")
    }
    const client = new PasteClient("https://paste.example", () =>
      Promise.resolve(
        Response.json({
          url: "https://paste.example/other",
          expireAt: null,
          expirationSeconds: null,
        }),
      ),
    )
    await expect(client.update("abcd", "a".repeat(64), "body")).rejects.toThrow("UPSTREAM_INVALID")
  })

  it("sanitizes network errors and rejects unsafe configured origins", async () => {
    const client = new PasteClient("https://paste.example", () => Promise.reject(new Error("SECRET_URL")))
    await expect(client.create("body", "a".repeat(64))).rejects.toThrow("UPSTREAM_UNCERTAIN")
    for (const origin of ["http://paste.example", "https://user:secret@paste.example", "https://paste.example/path"])
      expect(() => new PasteClient(origin)).toThrow("INVALID_UPSTREAM_ORIGIN")
  })
})
