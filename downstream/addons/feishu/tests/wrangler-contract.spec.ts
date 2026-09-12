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

  it("persists Workers Logs, invocation logs, and traces at full sample without changing Paste transport", () => {
    const config = parse(wranglerToml) as {
      compatibility_flags?: string[]
      vars?: { PASTEBIN_ORIGIN?: string }
      services?: { binding?: string; service?: string }[]
      observability?: {
        enabled?: boolean
        head_sampling_rate?: number
        logs?: { enabled?: boolean; invocation_logs?: boolean; head_sampling_rate?: number }
        traces?: { enabled?: boolean; head_sampling_rate?: number }
      }
    }
    expect(config.observability?.enabled).toBe(true)
    expect(config.observability?.head_sampling_rate).toBe(1)
    expect(config.observability?.logs).toEqual({ enabled: true, invocation_logs: true, head_sampling_rate: 1 })
    expect(config.observability?.traces).toEqual({ enabled: true, head_sampling_rate: 1 })
    expect(config.vars?.PASTEBIN_ORIGIN).toBe("https://pb.223.im")
    expect(config.services).toEqual([{ binding: "PASTEBIN_SERVICE", service: "pastebin-prod" }])
    expect(config.compatibility_flags).toContain("global_fetch_strictly_public")
  })
})
