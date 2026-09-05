import { describe, expect, it, vi } from "vitest"
import {
  createFeishuWebhookHandler,
  consumeFeishuMessages,
  deriveMessageIdentity,
  normalizeAuthorizedEvent,
  type FeishuWebhookEnvironment,
  verifyFeishuChallenge,
} from "../worker/webhook"

const secrets = {
  FEISHU_ENCRYPT_KEY: "0123456789abcdef0123456789abcdef",
  FEISHU_VERIFICATION_TOKEN: "verification-token",
  FEISHU_APP_ID: "cli_phase4",
  FEISHU_ALLOWED_TENANT_KEYS: "tenant-a,tenant-b",
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    schema: "2.0",
    header: {
      event_type: "im.message.receive_v1",
      app_id: "cli_phase4",
      tenant_key: "tenant-a",
      event_id: "evt-1",
      token: "verification-token",
    },
    event: {
      sender: { sender_type: "user" },
      message: {
        chat_type: "p2p",
        message_type: "text",
        message_id: "om_1",
        chat_id: "oc_1",
        content: '{"text":" hello\\nworld "}',
      },
    },
    ...overrides,
  }
}

async function encrypted(value: unknown, keyText = secrets.FEISHU_ENCRYPT_KEY) {
  const iv = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(keyText)),
    "AES-CBC",
    false,
    ["encrypt"],
  )
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  )
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(cipher)))
}

async function signedRequest(value: unknown, env: FeishuWebhookEnvironment, mutate?: (raw: string) => string) {
  const raw = mutate?.(JSON.stringify(value)) ?? JSON.stringify(value)
  const timestamp = "1700000000"
  const nonce = "nonce-vector"
  const signed = new Uint8Array(new TextEncoder().encode(timestamp + nonce + env.FEISHU_ENCRYPT_KEY + raw))
  const hash = await crypto.subtle.digest("SHA-256", signed)
  const signature = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")
  return new Request("https://worker/api/feishu/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-lark-request-timestamp": timestamp,
      "x-lark-request-nonce": nonce,
      "x-lark-signature": signature,
    },
    body: raw,
  })
}

describe("Feishu webhook protocol and authorization", () => {
  it("returns an exact clear URL verification challenge without business work", async () => {
    await expect(
      verifyFeishuChallenge(
        { type: "url_verification", token: "verification-token", challenge: "challenge-1" },
        secrets,
      ),
    ).resolves.toBe("challenge-1")
  })

  it("accepts encrypted verification and rejects invalid tokens, encoding, padding, UTF-8, and missing secrets", async () => {
    await expect(
      verifyFeishuChallenge(
        { encrypt: await encrypted({ type: "url_verification", token: "verification-token", challenge: "encrypted" }) },
        secrets,
      ),
    ).resolves.toBe("encrypted")
    await expect(
      verifyFeishuChallenge({ type: "url_verification", token: "wrong", challenge: "x" }, secrets),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    await expect(verifyFeishuChallenge({ encrypt: "not-base64!" }, secrets)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    })
    await expect(verifyFeishuChallenge({ encrypt: btoa("short") }, secrets)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    })
    await expect(
      verifyFeishuChallenge(
        { type: "url_verification", token: "verification-token", challenge: "x" },
        { ...secrets, FEISHU_ENCRYPT_KEY: "" },
      ),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" })
  })

  it("derives stable identities without event id and preserves decoded text exactly", async () => {
    const first = await normalizeAuthorizedEvent(event(), secrets)
    const second = await normalizeAuthorizedEvent(
      event({
        header: {
          event_type: "im.message.receive_v1",
          app_id: "cli_phase4",
          tenant_key: "tenant-a",
          event_id: "evt-retry",
          token: "verification-token",
        },
      }),
      secrets,
    )
    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    if (!first || !second) throw new Error("expected supported event")
    expect(first).toMatchObject({ content: " hello\nworld ", sourceMessageId: "om_1" })
    expect(second).toMatchObject({ scopeId: first.scopeId, recordKey: first.recordKey, requestId: first.requestId })
    expect(await deriveMessageIdentity("cli_phase4", "tenant-a", "oc_1", "om_1")).toEqual({
      scopeId: first.scopeId,
      recordKey: first.recordKey,
      requestId: first.requestId,
    })
  })

  it("rejects unauthorized input and treats authenticated unsupported variants as no-op", async () => {
    await expect(
      normalizeAuthorizedEvent(
        event({
          header: {
            event_type: "im.message.receive_v1",
            app_id: "other",
            tenant_key: "tenant-a",
            event_id: "evt-1",
            token: "verification-token",
          },
        }),
        secrets,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(
      normalizeAuthorizedEvent(
        event({
          event: {
            sender: { sender_type: "bot" },
            message: {
              chat_type: "p2p",
              message_type: "text",
              message_id: "om_1",
              chat_id: "oc_1",
              content: '{"text":"x"}',
            },
          },
        }),
        secrets,
      ),
    ).resolves.toBeNull()
  })

  it("enforces schema and every event allowlist, content limits, and fixed identity vectors", async () => {
    await expect(normalizeAuthorizedEvent(event({ schema: "1.0" }), secrets)).rejects.toMatchObject({
      code: "MALFORMED",
    })
    for (const variant of [
      event({ header: { ...event().header, event_type: "other" } }),
      event({ event: { sender: { sender_type: "app" }, message: { ...event().event.message } } }),
      event({ event: { sender: { sender_type: "user" }, message: { ...event().event.message, chat_type: "group" } } }),
      event({
        event: { sender: { sender_type: "user" }, message: { ...event().event.message, message_type: "image" } },
      }),
    ])
      await expect(normalizeAuthorizedEvent(variant, secrets)).resolves.toBeNull()
    await expect(
      normalizeAuthorizedEvent(
        event({ event: { sender: { sender_type: "user" }, message: { ...event().event.message, content: "{" } } }),
        secrets,
      ),
    ).rejects.toMatchObject({ code: "MALFORMED" })
    await expect(
      normalizeAuthorizedEvent(
        event({
          event: { sender: { sender_type: "user" }, message: { ...event().event.message, content: '{"text":""}' } },
        }),
        secrets,
      ),
    ).rejects.toMatchObject({ code: "UNSUPPORTED" })
    await expect(
      normalizeAuthorizedEvent(
        event({
          event: {
            sender: { sender_type: "user" },
            message: { ...event().event.message, content: JSON.stringify({ text: "x".repeat(100_001) }) },
          },
        }),
        secrets,
      ),
    ).rejects.toMatchObject({ code: "UNSUPPORTED" })
    await expect(deriveMessageIdentity("cli_phase4", "tenant-a", "oc_1", "om_1")).resolves.toEqual({
      scopeId: "feishu:v1:scope:oahJvvZzh_xvRysoaDYOpGL1K8NVFlfYcu8xkUEbAAk",
      recordKey: "feishu:v1:message:JFBNfXEbkZ1yKrtxVVC5IjiO8_rAoSyhK6SAGlHRGrg",
      requestId: "feishu:v1:create:Yi9j1Hjze3d57zHvw8a5hd2j9HSHbseUXoSzF3qlcqs",
    })
  })
})

describe("Feishu webhook ingress", () => {
  it("awaits Queue acceptance before responding 200 and does not enqueue challenges", async () => {
    let released = false
    const send = vi.fn(() => {
      expect(released).toBe(true)
      return Promise.resolve()
    })
    const env: FeishuWebhookEnvironment = {
      ...secrets,
      FEISHU_INGRESS_QUEUE: { send },
      FEISHU_INGRESS_DLQ_CONFIGURED: "true",
    }
    const handler = createFeishuWebhookHandler(env)
    const challenge = await handler.fetch(
      new Request("https://worker/api/feishu/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "url_verification", token: "verification-token", challenge: "abc" }),
      }),
    )
    expect(challenge.status).toBe(200)
    expect(send).not.toHaveBeenCalled()
    released = true
    // Authentication-specific fixture coverage is added with the crypto implementation.
  })

  it("authenticates exact raw signed encrypted events, never enqueues failed gates, and fails closed on Queue errors", async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const env: FeishuWebhookEnvironment = {
      ...secrets,
      FEISHU_INGRESS_QUEUE: { send },
      FEISHU_INGRESS_DLQ_CONFIGURED: "true",
    }
    const envelope = { encrypt: await encrypted(event()) }
    const handler = createFeishuWebhookHandler(env)
    expect((await handler.fetch(await signedRequest(envelope, env))).status).toBe(200)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toMatchObject({ schema: "feishu.message-create.v1", content: " hello\nworld " })
    const signed = await signedRequest(envelope, env)
    const tampered = new Request(signed.url, {
      method: "POST",
      headers: signed.headers,
      body: (await signed.text()).replace("encrypt", "Encrypt"),
    })
    expect((await handler.fetch(tampered)).status).toBe(401)
    expect(send).toHaveBeenCalledTimes(1)
    send.mockRejectedValueOnce(new Error("queue down"))
    expect((await handler.fetch(await signedRequest(envelope, env))).status).toBe(503)
    expect((await handler.fetch(new Request("https://worker/api/feishu/events", { method: "GET" }))).status).toBe(405)
    expect(
      (
        await handler.fetch(
          new Request("https://worker/api/feishu/events", {
            method: "POST",
            headers: { "content-type": "text/plain" },
          }),
        )
      ).status,
    ).toBe(415)
  })

  it("handles encrypted challenges without signature or Queue publication", async () => {
    const send = vi.fn()
    const env: FeishuWebhookEnvironment = {
      ...secrets,
      FEISHU_INGRESS_QUEUE: { send },
      FEISHU_INGRESS_DLQ_CONFIGURED: "true",
    }
    const result = await createFeishuWebhookHandler(env).fetch(
      new Request("https://worker/api/feishu/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          encrypt: await encrypted({ type: "url_verification", token: "verification-token", challenge: "yes" }),
        }),
      }),
    )
    expect(await result.json()).toEqual({ challenge: "yes" })
    expect(send).not.toHaveBeenCalled()
  })
})

describe("Feishu Queue consumer", () => {
  it("acks success, retries transient failures, and preserves permanent or ambiguous work for DLQ without a durable sink", async () => {
    const actions: string[] = []
    const item = {
      schema: "feishu.message-create.v1" as const,
      scopeId: "feishu:v1:scope:a",
      recordKey: "feishu:v1:message:b",
      requestId: "feishu:v1:create:c",
      sourceMessageId: "om_1",
      content: "body",
      correlationId: "correlation",
    }
    const messages = [
      { body: item, ack: () => actions.push("success-ack"), retry: () => actions.push("success-retry") },
      {
        body: { ...item, requestId: "retry" },
        ack: () => actions.push("retry-ack"),
        retry: () => actions.push("retry-retry"),
      },
      {
        body: { ...item, requestId: "ambiguous" },
        ack: () => actions.push("ambiguous-ack"),
        retry: () => actions.push("ambiguous-retry"),
      },
    ]
    const createEntry = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, entry: {} })
      .mockResolvedValueOnce({
        ok: false,
        code: "STORAGE_OR_CREDENTIAL_UNAVAILABLE",
        retryable: true,
        correlationId: "op-2",
      })
      .mockResolvedValueOnce({ ok: false, code: "RECONCILIATION_REQUIRED", retryable: false, correlationId: "op-3" })
    await consumeFeishuMessages({ messages }, { createEntry }, undefined, true)
    expect(actions).toEqual(["success-ack", "retry-retry", "ambiguous-retry"])
    expect(createEntry).toHaveBeenCalledTimes(3)
    expect(createEntry).toHaveBeenLastCalledWith(
      { scopeId: item.scopeId },
      expect.objectContaining({ requestId: "ambiguous", content: "body" }),
    )
  })

  it("isolates invalid and permanent messages, and only a durable reporter permits acknowledgement", async () => {
    const actions: string[] = []
    const valid = {
      schema: "feishu.message-create.v1" as const,
      scopeId: "scope",
      recordKey: "record",
      requestId: "request",
      sourceMessageId: "source",
      content: "body",
      correlationId: "corr",
    }
    const service = {
      createEntry: vi
        .fn()
        .mockResolvedValue({ ok: false, code: "INVALID_INPUT", retryable: false, correlationId: "op" }),
    }
    await consumeFeishuMessages(
      {
        messages: [
          { body: { nope: true }, ack: () => actions.push("bad-ack"), retry: () => actions.push("bad-retry") },
          { body: valid, ack: () => actions.push("permanent-ack"), retry: () => actions.push("permanent-retry") },
        ],
      },
      service,
      () => Promise.resolve(true),
      true,
    )
    expect(actions).toEqual(["bad-ack", "permanent-ack"])
    expect(service.createEntry).toHaveBeenCalledTimes(1)
    await consumeFeishuMessages(
      { messages: [{ body: valid, ack: () => actions.push("dlq-ack"), retry: () => actions.push("dlq-retry") }] },
      service,
      undefined,
      false,
    )
    expect(actions).toContain("dlq-retry")
  })
})
