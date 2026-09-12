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

  it("constructs the Service Binding Request with manual redirect because workerd rejects error", () => {
    expect(() => new Request("https://pb.223.im/", { redirect: "error" })).toThrowError(/Invalid redirect value/)
    expect(new Request("https://pb.223.im/", { redirect: "manual" }).redirect).toBe("manual")
  })

  it("creates Pastes through PASTEBIN_SERVICE and validates public URLs on pb.223.im", async () => {
    const ambientFetch = vi.fn<typeof fetch>()
    vi.stubGlobal("fetch", ambientFetch)
    const env = productionEnv()
    const client = createPasteClient(env as never)
    expect(await client.create("body", "a".repeat(64))).toBe("abcd")
    expect(client.publicUrl("abcd")).toBe("https://pb.223.im/abcd")
    expect(env.PASTEBIN_SERVICE.fetch).toHaveBeenCalledTimes(1)
    const call = (env.PASTEBIN_SERVICE.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call).toHaveLength(1)
    const request = call[0] as Request
    expect(request).toBeInstanceOf(Request)
    expect(request.url).toBe("https://pb.223.im/")
    expect(request.method).toBe("POST")
    expect(request.redirect).toBe("manual")
    expect(request.signal).toBeInstanceOf(AbortSignal)
    expect(request.signal.aborted).toBe(false)
    expect(request.headers.get("Authorization")).toBeNull()
    const form = await request.clone().formData()
    expect(form.get("c")).toBe("body")
    expect(form.get("e")).toBe("never")
    expect(form.get("s")).toBe("a".repeat(64))
    expect(form.get("p")).toBe("1")
    expect(ambientFetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it("forwards configured Authorization on the Service Binding Request", async () => {
    const env = productionEnv({ PASTEBIN_AUTHORIZATION: "Bearer unit-token" })
    const client = createPasteClient(env as never)
    expect(await client.create("body", "a".repeat(64))).toBe("abcd")
    const call = (env.PASTEBIN_SERVICE.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call).toHaveLength(1)
    const request = call[0] as Request
    expect(request).toBeInstanceOf(Request)
    expect(request.headers.get("Authorization")).toBe("Bearer unit-token")
  })

  it("emits secret-free PASTEBIN_SERVICE_STAGE markers around the Request fetch", async () => {
    const logs: string[] = []
    const log = vi.spyOn(console, "log").mockImplementation((message: unknown) => {
      logs.push(String(message))
    })
    const password = "a".repeat(64)
    const env = productionEnv({ PASTEBIN_AUTHORIZATION: "Bearer unit-token" })
    const client = createPasteClient(env as never)
    expect(await client.create("body", password)).toBe("abcd")
    expect(logs.filter((line) => line.startsWith("PASTEBIN_SERVICE_STAGE="))).toEqual([
      "PASTEBIN_SERVICE_STAGE=request_ready",
      "PASTEBIN_SERVICE_STAGE=fetch_enter",
      "PASTEBIN_SERVICE_STAGE=fetch_response",
    ])
    const joined = logs.join("\n")
    expect(joined).not.toContain(password)
    expect(joined).not.toContain("Bearer unit-token")
    expect(joined).not.toContain("https://")
    expect(joined).not.toContain("pb.223.im")
    expect(joined).not.toContain("Authorization")
    log.mockRestore()
  })

  it("sends update and delete through a single Request argument", async () => {
    const env = productionEnv()
    const client = createPasteClient(env as never)
    expect(await client.update("abcd", "a".repeat(64), "updated")).toBeNull()
    await client.remove("abcd", "a".repeat(64))
    const calls = (env.PASTEBIN_SERVICE.fetch as ReturnType<typeof vi.fn>).mock.calls
    expect(calls).toHaveLength(2)
    for (const call of calls) {
      expect(call).toHaveLength(1)
      expect(call[0]).toBeInstanceOf(Request)
    }
    expect((calls[0][0] as Request).method).toBe("PUT")
    expect((calls[0][0] as Request).url).toBe(`https://pb.223.im/abcd:${"a".repeat(64)}`)
    expect((calls[1][0] as Request).method).toBe("DELETE")
    expect((calls[1][0] as Request).url).toBe(`https://pb.223.im/abcd:${"a".repeat(64)}`)
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
