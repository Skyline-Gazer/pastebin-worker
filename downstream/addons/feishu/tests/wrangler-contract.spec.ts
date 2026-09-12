import { parse } from "toml"
import { describe, expect, it } from "vitest"
import wranglerToml from "../wrangler.toml?raw"

describe("Feishu Worker deployment contract", () => {
  it("enables global_fetch_strictly_public when PASTEBIN_ORIGIN is the public Pastebin Worker endpoint", () => {
    const config = parse(wranglerToml) as {
      compatibility_flags?: string[]
      vars?: { PASTEBIN_ORIGIN?: string }
    }
    expect(config.vars?.PASTEBIN_ORIGIN).toBe("https://pb.223.im")
    expect(config.compatibility_flags).toContain("global_fetch_strictly_public")
  })

  it("binds PASTEBIN_SERVICE to pastebin-prod without changing the public Pastebin origin", () => {
    const config = parse(wranglerToml) as {
      compatibility_flags?: string[]
      vars?: { PASTEBIN_ORIGIN?: string }
      services?: { binding?: string; service?: string }[]
    }
    expect(config.vars?.PASTEBIN_ORIGIN).toBe("https://pb.223.im")
    expect(config.compatibility_flags).toContain("global_fetch_strictly_public")
    expect(config.services).toEqual([{ binding: "PASTEBIN_SERVICE", service: "pastebin-prod" }])
  })
})
