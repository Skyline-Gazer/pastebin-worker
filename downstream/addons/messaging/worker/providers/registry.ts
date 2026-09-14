import { feishuAdapter } from "./feishu"
import { larkAdapter } from "./lark"
import type { ProviderAdapter, ProviderId, ProviderReadiness } from "./types"
import type { ProviderCredentialEnvironment } from "./types"

export class ProviderRegistry {
  private readonly byId = new Map<ProviderId, ProviderAdapter>()
  private readonly byPath = new Map<string, ProviderAdapter>()

  constructor(adapters: readonly ProviderAdapter[]) {
    for (const adapter of adapters) {
      this.byId.set(adapter.id, adapter)
      this.byPath.set(adapter.webhookPath, adapter)
    }
  }

  get adapters(): readonly ProviderAdapter[] {
    return [...this.byId.values()]
  }

  adapter(id: ProviderId): ProviderAdapter | undefined {
    return this.byId.get(id)
  }

  require(id: string): ProviderAdapter | undefined {
    if (id !== "feishu" && id !== "lark") return undefined
    return this.byId.get(id)
  }

  byWebhookPath(path: string): ProviderAdapter | undefined {
    return this.byPath.get(path)
  }

  readiness(env: ProviderCredentialEnvironment): ProviderReadiness[] {
    return this.adapters.map((adapter) => ({
      id: adapter.id,
      webhook: adapter.webhookReadiness(env).ready,
      oauth: adapter.oauthReadiness(env).ready,
    }))
  }
}

export const providerRegistry = new ProviderRegistry([feishuAdapter, larkAdapter])
