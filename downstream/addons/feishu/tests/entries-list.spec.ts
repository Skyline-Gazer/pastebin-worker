import { env as testEnv } from "cloudflare:test"
import { beforeEach, describe, expect, it, vi } from "vitest"
import migration from "../migrations/0001_bindings.sql?raw"
import migration3 from "../migrations/0003_lifecycle_completion.sql?raw"
import migration4 from "../migrations/0004_permanent_restore.sql?raw"
import migration5 from "../migrations/0005_timed_restore.sql?raw"
import migration6 from "../migrations/0006_batch_operations.sql?raw"
import migration7 from "../migrations/0007_batch_completed_results.sql?raw"
import { createEntriesListHandler } from "../worker/entries"
import { PasteError } from "../worker/paste-client"
import { BindingStore } from "../worker/store"

const db = (testEnv as unknown as { DB: D1Database }).DB

const env = {
  PLATFORM: "feishu",
  FEISHU_APP_ID: "a",
  FEISHU_APP_SECRET: "s",
  FEISHU_ENCRYPT_KEY: "e",
  FEISHU_VERIFICATION_TOKEN: "t",
  FEISHU_ALLOWED_TENANT_KEYS: "tenant-a",
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
      getById: vi.fn().mockResolvedValue({
        id: "entry-a",
        paste_name: "abcd",
        visibility: "active",
        retention_mode: "permanent",
        expires_at: null,
        version: 1,
      }),
      pending: vi.fn().mockResolvedValue(null),
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

  it("omits a binding that gains a pending mutation after the final binding read starts", async () => {
    const ready = {
      id: "entry-a",
      scope_id: "scope-a",
      record_key: "record-a",
      credential: "sealed.credential.secret",
      paste_name: "abcd",
      visibility: "active",
      retention_mode: "permanent",
      expires_at: null,
      version: 1,
    }
    const stable = {
      id: "entry-b",
      scope_id: "scope-a",
      record_key: "record-b",
      credential: "sealed.other",
      paste_name: "efgh",
      visibility: "active",
      retention_mode: "permanent",
      expires_at: null,
      version: 1,
    }
    const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(["scope-a"]) }
    let sawFinalRead = false
    const bindings = {
      listReadyForScopes: vi.fn().mockResolvedValue([ready, stable]),
      getById: vi.fn().mockImplementation((id: string) => {
        if (id === "entry-a") sawFinalRead = true
        return Promise.resolve(id === "entry-a" ? ready : stable)
      }),
      pending: vi
        .fn()
        .mockImplementation((id: string) => Promise.resolve(id === "entry-a" && sawFinalRead ? { id: "op-a" } : null)),
    }
    const client = {
      publicUrl: vi.fn((name: string) => `https://pb.223.im/${name}`),
      read: vi.fn().mockResolvedValue("- [ ] live task"),
    }
    const handler = createEntriesListHandler(env, trust as never, bindings as never, client)
    const result = await handler.fetch(request())
    expect(result?.status).toBe(200)
    expect(await result?.json()).toEqual({
      entries: [
        {
          id: "entry-b",
          pasteName: "efgh",
          publicUrl: "https://pb.223.im/efgh",
          visibility: "active",
          retentionMode: "permanent",
          expiresAt: null,
          version: 1,
          content: "- [ ] live task",
          managedTask: { state: "unchecked" },
        },
      ],
    })
  })

  it("omits a binding whose version or pending status changed during the Paste read", async () => {
    const ready = {
      id: "entry-a",
      scope_id: "scope-a",
      record_key: "record-a",
      credential: "sealed.credential.secret",
      paste_name: "abcd",
      visibility: "active",
      retention_mode: "permanent",
      expires_at: null,
      version: 1,
    }
    const stable = {
      id: "entry-b",
      scope_id: "scope-a",
      record_key: "record-b",
      credential: "sealed.other",
      paste_name: "efgh",
      visibility: "active",
      retention_mode: "permanent",
      expires_at: null,
      version: 1,
    }
    const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(["scope-a"]) }
    const bindings = {
      listReadyForScopes: vi.fn().mockResolvedValue([ready, stable]),
      getById: vi
        .fn()
        .mockImplementation((id: string) => Promise.resolve(id === "entry-a" ? { ...ready, version: 2 } : stable)),
      pending: vi.fn().mockResolvedValue(null),
    }
    const client = {
      publicUrl: vi.fn((name: string) => `https://pb.223.im/${name}`),
      read: vi.fn().mockResolvedValue("- [ ] live task"),
    }
    const handler = createEntriesListHandler(env, trust as never, bindings as never, client)
    const result = await handler.fetch(request())
    expect(result?.status).toBe(200)
    expect(await result?.json()).toEqual({
      entries: [
        {
          id: "entry-b",
          pasteName: "efgh",
          publicUrl: "https://pb.223.im/efgh",
          visibility: "active",
          retentionMode: "permanent",
          expiresAt: null,
          version: 1,
          content: "- [ ] live task",
          managedTask: { state: "unchecked" },
        },
      ],
    })
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

  it("fails closed when a Paste body cannot be read", async () => {
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
      read: vi.fn().mockRejectedValue(new Error("UPSTREAM_UNCERTAIN")),
    }
    const handler = createEntriesListHandler(env, trust as never, bindings as never, client)
    const result = await handler.fetch(request())
    expect(result?.status).toBe(503)
    expect(await result?.json()).toEqual({ code: "STORAGE_OR_CREDENTIAL_UNAVAILABLE" })
  })

  it("omits a confirmed missing Paste without failing the remaining list", async () => {
    const missing = {
      id: "entry-a",
      scope_id: "scope-a",
      record_key: "record-a",
      credential: "sealed.a",
      paste_name: "abcd",
      visibility: "archived" as const,
      retention_mode: "timed" as const,
      expires_at: "2020-01-01T00:00:00.000Z",
      version: 1,
    }
    const live = {
      id: "entry-b",
      scope_id: "scope-a",
      record_key: "record-b",
      credential: "sealed.b",
      paste_name: "efgh",
      visibility: "active" as const,
      retention_mode: "permanent" as const,
      expires_at: null,
      version: 1,
    }
    const trust = { getSession: vi.fn().mockResolvedValue(session), scopes: vi.fn().mockResolvedValue(["scope-a"]) }
    const bindings = {
      listReadyForScopes: vi.fn().mockResolvedValue([missing, live]),
      getById: vi.fn().mockResolvedValue(live),
      pending: vi.fn().mockResolvedValue(null),
    }
    const client = {
      publicUrl: vi.fn((name: string) => `https://pb.223.im/${name}`),
      read: vi.fn((name: string) =>
        name === "abcd" ? Promise.reject(new PasteError("ENTRY_NOT_FOUND")) : Promise.resolve("- [ ] live task"),
      ),
    }
    const handler = createEntriesListHandler(env, trust as never, bindings as never, client)
    const result = await handler.fetch(request())
    expect(result?.status).toBe(200)
    expect(await result?.json()).toEqual({
      entries: [
        {
          id: "entry-b",
          pasteName: "efgh",
          publicUrl: "https://pb.223.im/efgh",
          visibility: "active",
          retentionMode: "permanent",
          expiresAt: null,
          version: 1,
          content: "- [ ] live task",
          managedTask: { state: "unchecked" },
        },
      ],
    })
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

  it("includes ready bindings from mapped scopes beyond the first 32", async () => {
    const now = "2020-01-01T00:00:00.000Z"
    const scopes = Array.from({ length: 33 }, (_, index) => `scope-${index + 1}`)
    for (const [index, scopeId] of scopes.entries()) {
      await db
        .prepare(
          `INSERT INTO feishu_bindings
          (id, scope_id, record_key, credential, paste_name, visibility, retention_mode, expires_at, version, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'active', 'permanent', NULL, ?, ?, ?)`,
        )
        .bind(`ready-${index + 1}`, scopeId, `record-${index + 1}`, "sealed", `paste-${index + 1}`, 1, now, now)
        .run()
    }
    const store = new BindingStore(db)
    const rows = await store.listReadyForScopes(scopes, 50)
    expect(rows).toHaveLength(33)
    expect(rows.map((row) => row.id)).toContain("ready-33")
  })
})
