import { env } from "cloudflare:test"
import { describe, expect, it, vi } from "vitest"
import { createPasteClient } from "../worker/index"

describe("Miniflare PASTEBIN_SERVICE Request path", () => {
  it("creates through a workerd Service Binding Fetcher without calling ambient fetch", async () => {
    const service = (env as { PASTEBIN_SERVICE?: Fetcher }).PASTEBIN_SERVICE
    expect(typeof service?.fetch).toBe("function")
    const ambientFetch = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", ambientFetch)
    const client = createPasteClient({
      PASTEBIN_ORIGIN: "https://pb.223.im",
      PASTEBIN_SERVICE: service,
    } as never)
    expect(await client.create("body", "a".repeat(64))).toBe("abcd")
    expect(client.publicUrl("abcd")).toBe("https://pb.223.im/abcd")
    expect(ambientFetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
