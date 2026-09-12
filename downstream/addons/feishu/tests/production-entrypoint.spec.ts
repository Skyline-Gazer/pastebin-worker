import { describe, expect, it, vi } from "vitest"
import worker, { createPasteClient, createPhase4Worker } from "../worker/index"

const hexA = "11".repeat(32)
const hexB = "22".repeat(32)

function productionEnv(overrides: Record<string, unknown> = {}) {
  return {
    PLATFORM: "feishu",
    FEISHU_APP_ID: "cli_test",
    FEISHU_APP_SECRET: "secret",
    FEISHU_ENCRYPT_KEY: "encrypt-key",
    FEISHU_VERIFICATION_TOKEN: "verify-token",
    FEISHU_ALLOWED_TENANT_KEYS: "tenant-a",
    FEISHU_OAUTH_REDIRECT_URI: "https://addon.example/api/auth/callback",
    FEISHU_ALLOWED_ORIGINS: "https://addon.example",
    FEISHU_CREDENTIAL_KEY_ID: "v1",
    FEISHU_CREDENTIAL_ENCRYPTION_KEY: hexA,
    FEISHU_FINGERPRINT_KEY: hexB,
    FEISHU_PRINCIPAL_KEY: "principal-secret",
    FEISHU_INGRESS_DLQ_CONFIGURED: "true",
    PASTEBIN_ORIGIN: "https://pb.223.im",
    PASTEBIN_SERVICE: {
      fetch: vi.fn(() =>
        Promise.resolve(
          Response.json({
            url: "https://pb.223.im/abcd",
            expireAt: null,
            expirationSeconds: null,
          }),
        ),
      ),
    },
    FEISHU_BINDINGS_DB: { prepare: vi.fn() },
    FEISHU_INGRESS_QUEUE: { send: vi.fn() },
    ASSETS: {
      fetch: vi.fn(() =>
        Promise.resolve(new Response("<html>frontend</html>", { headers: { "content-type": "text/html" } })),
      ),
    },
    ...overrides,
  }
}

describe("Feishu production entrypoint", () => {
  it("exposes fetch and queue handlers", () => {
    expect(typeof worker.fetch).toBe("function")
    expect(typeof worker.queue).toBe("function")
  })

  it("serves static frontend outside /api and keeps API routes on the Worker", async () => {
    const env = productionEnv()
    const assets = await worker.fetch(new Request("https://addon.example/"), env as never)
    expect(assets.status).toBe(200)
    expect(await assets.text()).toContain("frontend")
    expect(env.ASSETS.fetch).toHaveBeenCalled()

    const events = await worker.fetch(new Request("https://addon.example/api/feishu/events"), env as never)
    expect(events.status).not.toBe(200)
    expect(await events.clone().text()).not.toContain("frontend")
  })

  it("fails closed when required binding configuration is invalid", async () => {
    await expect(
      createPhase4Worker(productionEnv({ FEISHU_CREDENTIAL_ENCRYPTION_KEY: "short" }) as never),
    ).rejects.toThrow("INVALID_SECRET_CONFIG")
  })

  it("creates Pastes through PASTEBIN_SERVICE and validates public URLs on pb.223.im", async () => {
    const ambientFetch = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", ambientFetch)
    const env = productionEnv()
    const client = createPasteClient(env as never)
    expect(await client.create("body", "a".repeat(64))).toBe("abcd")
    expect(client.publicUrl("abcd")).toBe("https://pb.223.im/abcd")
    expect(env.PASTEBIN_SERVICE.fetch).toHaveBeenCalledTimes(1)
    const [input] = (env.PASTEBIN_SERVICE.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(String(input)).toBe("https://pb.223.im/")
    expect(ambientFetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it("fails closed when PASTEBIN_SERVICE is missing instead of using ambient fetch", async () => {
    const ambientFetch = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", ambientFetch)
    expect(() => createPasteClient(productionEnv({ PASTEBIN_SERVICE: undefined }) as never)).toThrow(
      "MISSING_PASTEBIN_SERVICE",
    )
    await expect(createPhase4Worker(productionEnv({ PASTEBIN_SERVICE: undefined }) as never)).rejects.toThrow(
      "MISSING_PASTEBIN_SERVICE",
    )
    expect(ambientFetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
