import { describe, expect, it, vi } from "vitest"
import { createBatchHandler } from "../worker/batch"

const env = {
  FEISHU_APP_ID: "a",
  FEISHU_APP_SECRET: "s",
  FEISHU_OAUTH_REDIRECT_URI: "https://addon.example/cb",
  FEISHU_ALLOWED_ORIGINS: "https://addon.example",
  FEISHU_PRINCIPAL_KEY: "p",
}
const session = {
  id: "session",
  principalKey: "principal-a",
  csrfToken: "csrf",
  createdAt: "2020-01-01T00:00:00.000Z",
  expiresAt: "2030-01-01T00:00:00.000Z",
}
function request(
  body: unknown = { ids: ["entry-a", "entry-b"], action: "archive_permanent" },
  headers: HeadersInit = {},
) {
  return new Request("https://addon.example/api/batch", {
    method: "POST",
    headers: {
      cookie: "feishu_addon_session=session",
      origin: "https://addon.example",
      "x-csrf-token": "csrf",
      "idempotency-key": "batch-a",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}
function createHandler(scopes: string[] = ["scope-a"]) {
  const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(scopes) }
  const dispatch = vi.fn().mockResolvedValue(new Response(null, { status: 501 }))
  return { trust, dispatch, handler: createBatchHandler(env, trust as never, dispatch) }
}

describe("batch route protection gate", () => {
  it("is POST-only and accepts only a bounded strict JSON request with a valid opaque key", async () => {
    const { handler, dispatch } = createHandler()
    expect((await handler.fetch(new Request("https://addon.example/api/batch")))?.status).toBe(405)
    expect((await handler.fetch(request(undefined, { "content-type": "text/plain" })))?.status).toBe(415)
    expect((await handler.fetch(request(undefined, { "idempotency-key": "" })))?.status).toBe(400)
    expect((await handler.fetch(request(undefined, { "idempotency-key": "x".repeat(257) })))?.status).toBe(400)
    expect((await handler.fetch(request({ ids: ["entry-a"], action: "delete", extra: true })))?.status).toBe(400)
    expect((await handler.fetch(request({ ids: ["entry-a"], action: "restore" })))?.status).toBe(400)
    expect((await handler.fetch(request({ ids: ["entry-a", "entry-a"], action: "delete" })))?.status).toBe(400)
    expect((await handler.fetch(request({ ids: ["x".repeat(257)], action: "delete" })))?.status).toBe(400)
    expect(
      (await handler.fetch(request({ ids: Array.from({ length: 51 }, (_, i) => `entry-${i}`), action: "delete" })))
        ?.status,
    ).toBe(400)
    expect(
      (await handler.fetch(request({ ids: ["entry-a"], action: "delete" }, { "idempotency-key": "\n" })))?.status,
    ).toBe(400)
    expect((await handler.fetch(request({ ids: ["x".repeat(16 * 1024)], action: "delete" })))?.status).toBe(413)
    expect((await handler.fetch(request()))?.status).toBe(501)
    expect(dispatch).toHaveBeenLastCalledWith(
      { ids: ["entry-a", "entry-b"], action: "archive_permanent" },
      expect.objectContaining({ principalKey: "principal-a" }),
      ["scope-a"],
      "batch-a",
    )
  })

  it("rejects session and request-protection failures before the dispatch seam", async () => {
    const { trust, dispatch, handler } = createHandler()
    trust.getSession.mockResolvedValueOnce(null)
    expect((await handler.fetch(request()))?.status).toBe(401)
    expect((await handler.fetch(request(undefined, { origin: "https://evil.example" })))?.status).toBe(403)
    expect((await handler.fetch(request(undefined, { "x-csrf-token": "wrong" })))?.status).toBe(403)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it("requires a server-derived allowed scope and rejects browser authority fields before dispatch", async () => {
    const empty = createHandler([])
    expect((await empty.handler.fetch(request()))?.status).toBe(403)
    expect(empty.dispatch).not.toHaveBeenCalled()

    const protectedRoute = createHandler()
    for (const body of [
      { ids: ["guessed-id"], action: "delete", scopeId: "scope-a" },
      { ids: ["entry-a"], action: "delete", password: "secret" },
      { ids: ["entry-a"], action: "delete", pasteBody: "body" },
      { ids: ["entry-a"], action: "delete", expiresAt: "2030-01-01T00:00:00.000Z" },
    ])
      expect((await protectedRoute.handler.fetch(request(body)))?.status).toBe(400)
    expect(protectedRoute.dispatch).not.toHaveBeenCalled()
  })
})
