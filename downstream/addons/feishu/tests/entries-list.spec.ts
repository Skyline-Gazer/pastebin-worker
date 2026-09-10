import { env as testEnv } from "cloudflare:test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import migration from "../migrations/0001_bindings.sql?raw"
import migration3 from "../migrations/0003_lifecycle_completion.sql?raw"
import migration4 from "../migrations/0004_permanent_restore.sql?raw"
import migration5 from "../migrations/0005_timed_restore.sql?raw"
import migration6 from "../migrations/0006_batch_operations.sql?raw"
import migration7 from "../migrations/0007_batch_completed_results.sql?raw"
import { createEntriesListHandler } from "../worker/entries"
import { BindingStore } from "../worker/store"

const db = (testEnv as unknown as { DB: D1Database }).DB

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

beforeEach(async () => {
  await db.exec(
    "DROP TABLE IF EXISTS feishu_batch_results; DROP TABLE IF EXISTS feishu_batch_items; DROP TABLE IF EXISTS feishu_batch_operations; DROP TABLE IF EXISTS feishu_operations; DROP TABLE IF EXISTS feishu_bindings;",
  )
  for (const statement of `${migration}\n${migration3}\n${migration4}\n${migration5}\n${migration6}\n${migration7}`
    .split(";")
    .filter((part) => part.trim()))
    await db.prepare(statement).run()
})

function request(headers: HeadersInit = {}, path = "/api/entries") {
  return new Request(`https://addon.example${path}`, {
    method: "GET",
    headers: { cookie: "feishu_addon_session=session", ...headers },
  })
}

describe("GET /api/entries", () => {
  it("rejects unauthenticated listing", async () => {
    const trust = { getSession: vi.fn().mockResolvedValue(null), scopes: vi.fn() }
    const bindings = { listReadyForScopes: vi.fn() }
    const client = { read: vi.fn(), publicUrl: vi.fn() }
    const handler = createEntriesListHandler(env, trust as never, bindings as never, client)
    const result = await handler.fetch(request({ cookie: "" }))
    expect(result?.status).toBe(401)
    expect(await result?.json()).toEqual({ code: "UNAUTHENTICATED" })
    expect(bindings.listReadyForScopes).not.toHaveBeenCalled()
    expect(client.read).not.toHaveBeenCalled()
  })

  it("lists only mapped-scope bindings and omits authority fields", async () => {
    const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(["scope-a"]) }
    const bindings = {
      listReadyForScopes: vi.fn().mockResolvedValue([
        {
          id: "entry-a",
          scope_id: "scope-a",
          record_key: "record-a",
          credential: "sealed.credential.secret",
          paste_name: "abcd",
          visibility: "active",
          retention_mode: "permanent",
          expires_at: null,
          version: 1,
        },
      ]),
    }
    const client = {
      publicUrl: vi.fn((name: string) => `https://pb.223.im/${name}`),
      read: vi.fn().mockResolvedValue("- [ ] live task"),
    }
    const handler = createEntriesListHandler(env, trust as never, bindings as never, client)
    const result = await handler.fetch(request())
    expect(result?.status).toBe(200)
    const body = await result!.json()
    expect(body).toEqual({
      entries: [
        {
          id: "entry-a",
          pasteName: "abcd",
          publicUrl: "https://pb.223.im/abcd",
          visibility: "active",
          retentionMode: "permanent",
          expiresAt: null,
          version: 1,
          content: "- [ ] live task",
          managedTask: { state: "unchecked" },
        },
      ],
    })
    expect(JSON.stringify(body)).not.toMatch(/sealed|credential|scope-a|principal-a|record-a|csrf|tenant|open_id/)
    expect(bindings.listReadyForScopes).toHaveBeenCalledWith(["scope-a"], 50)
    expect(client.read).toHaveBeenCalledWith("abcd")
  })

  it("ignores caller-supplied scope query parameters", async () => {
    const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(["scope-a"]) }
    const bindings = { listReadyForScopes: vi.fn().mockResolvedValue([]) }
    const client = { read: vi.fn(), publicUrl: vi.fn() }
    const handler = createEntriesListHandler(env, trust as never, bindings as never, client)
    const result = await handler.fetch(request({}, "/api/entries?scopeId=scope-b&tenant_key=t"))
    expect(result?.status).toBe(200)
    expect(bindings.listReadyForScopes).toHaveBeenCalledWith(["scope-a"], 50)
    expect(client.read).not.toHaveBeenCalled()
  })
})

describe("BindingStore.listReadyForScopes", () => {
  it("returns only versioned, named bindings without outstanding mutations for mapped scopes", async () => {
    const now = "2020-01-01T00:00:00.000Z"
    await db
      .prepare(
        `INSERT INTO feishu_bindings
        (id, scope_id, record_key, credential, paste_name, visibility, retention_mode, expires_at, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', 'permanent', NULL, ?, ?, ?)`,
      )
      .bind("ready-a", "scope-a", "record-a", "sealed.a", "paste-a", 1, now, now)
      .run()
    await db
      .prepare(
        `INSERT INTO feishu_bindings
        (id, scope_id, record_key, credential, paste_name, visibility, retention_mode, expires_at, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', 'permanent', NULL, ?, ?, ?)`,
      )
      .bind("pending-name", "scope-a", "record-pending", "sealed.p", null, 0, now, now)
      .run()
    await db
      .prepare(
        `INSERT INTO feishu_bindings
        (id, scope_id, record_key, credential, paste_name, visibility, retention_mode, expires_at, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', 'permanent', NULL, ?, ?, ?)`,
      )
      .bind("other-scope", "scope-b", "record-b", "sealed.b", "paste-b", 1, now, now)
      .run()
    await db
      .prepare(
        `INSERT INTO feishu_bindings
        (id, scope_id, record_key, credential, paste_name, visibility, retention_mode, expires_at, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', 'permanent', NULL, ?, ?, ?)`,
      )
      .bind("mutating", "scope-a", "record-m", "sealed.m", "paste-m", 1, now, now)
      .run()
    await db
      .prepare(
        `INSERT INTO feishu_operations
        (id, scope_id, request_id, entry_id, kind, fingerprint, content_fingerprint, expected_version, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'update', 'fp', 'cfp', 1, 'dispatched', ?, ?)`,
      )
      .bind("op-m", "scope-a", "req-m", "mutating", now, now)
      .run()

    const store = new BindingStore(db)
    const rows = await store.listReadyForScopes(["scope-a"], 50)
    expect(rows.map((row) => row.id)).toEqual(["ready-a"])
  })
})
