import { describe, expect, it } from "vitest"
import { feishuAdapter } from "../worker/providers/feishu"
import { larkAdapter } from "../worker/providers/lark"
import { providerRegistry } from "../worker/providers/registry"

describe("provider registry core", () => {
  it("registers independent Feishu and Lark adapters without dual-mode", () => {
    expect(providerRegistry.adapter("feishu")).toBe(feishuAdapter)
    expect(providerRegistry.adapter("lark")).toBe(larkAdapter)
    expect(feishuAdapter.webhookPath).toBe("/api/feishu/events")
    expect(larkAdapter.webhookPath).toBe("/api/lark/events")
    expect(providerRegistry.byWebhookPath("/api/lark/events")?.id).toBe("lark")
    expect(providerRegistry.byWebhookPath("/api/feishu/events")?.id).toBe("feishu")
  })
})
