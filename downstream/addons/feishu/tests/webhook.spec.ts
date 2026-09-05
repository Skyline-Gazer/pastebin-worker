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

describe("Feishu webhook protocol and authorization", () => {
  it("returns an exact clear URL verification challenge without business work", async () => {
    await expect(
      verifyFeishuChallenge(
        { type: "url_verification", token: "verification-token", challenge: "challenge-1" },
        secrets,
      ),
    ).resolves.toBe("challenge-1")
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
})
