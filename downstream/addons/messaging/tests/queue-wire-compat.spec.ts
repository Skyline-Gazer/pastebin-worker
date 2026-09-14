import { describe, expect, it, vi } from "vitest"
import { INBOUND_MESSAGE_WIRE_SCHEMA, consumeInboundMessages } from "../worker/webhook"

describe("queue wire compatibility", () => {
  it("preserves the legacy feishu.message-create.v1 literal", () => {
    expect(INBOUND_MESSAGE_WIRE_SCHEMA).toBe("feishu.message-create.v1")
  })

  it("consumes historical queue items without provider as Feishu", async () => {
    const ack = vi.fn()
    const retry = vi.fn()
    const createEntry = vi.fn().mockResolvedValue({ ok: true })
    await consumeInboundMessages(
      {
        messages: [
          {
            body: {
              schema: "feishu.message-create.v1" as const,
              scopeId: "feishu:v1:scope:abcd",
              recordKey: "feishu:v1:message:abcd",
              requestId: "feishu:v1:create:abcdabcdabcdabcdabcdabcdabcdabcdabcd",
              sourceMessageId: "om_1",
              content: "hello",
              correlationId: "11111111-1111-4111-8111-111111111111",
            },
            ack,
            retry,
          },
        ],
      },
      { createEntry },
      undefined,
      true,
    )
    expect(createEntry).toHaveBeenCalledTimes(1)
    expect(ack).toHaveBeenCalled()
  })
})
