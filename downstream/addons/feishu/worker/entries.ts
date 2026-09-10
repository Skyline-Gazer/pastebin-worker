import { BrowserAuthError, requireBrowserSession, type BrowserAuthEnvironment } from "./browser-auth"
import type { BrowserTrustStore } from "./browser-store"
import type { PasteClient } from "./paste-client"
import type { BindingStore } from "./store"
import type { PublicListEntry } from "../shared/entries"

const LIST_LIMIT = 50
const READ_CONCURRENCY = 4
const json = (code: string, status: number) => Response.json({ code }, { status })

async function mapPool<T, R>(items: readonly T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let index = 0; index < items.length; index += concurrency)
    out.push(...(await Promise.all(items.slice(index, index + concurrency).map(mapper))))
  return out
}

function toPublicListEntry(
  binding: {
    id: string
    paste_name: string | null
    visibility: "active" | "archived"
    retention_mode: "permanent" | "timed"
    expires_at: string | null
    version: number
  },
  publicUrl: string,
  content: string,
): PublicListEntry {
  return {
    id: binding.id,
    pasteName: binding.paste_name!,
    publicUrl,
    visibility: binding.visibility,
    retentionMode: binding.retention_mode,
    expiresAt: binding.expires_at,
    version: binding.version,
    content,
    managedTask: { state: binding.visibility === "archived" ? "checked" : "unchecked" },
  }
}

/** Session-authenticated listing; caller query parameters are never authority. */
export function createEntriesListHandler(
  env: BrowserAuthEnvironment,
  trust: BrowserTrustStore,
  bindings: BindingStore,
  client: Pick<PasteClient, "read" | "publicUrl">,
) {
  return {
    async fetch(request: Request): Promise<Response | null> {
      const path = new URL(request.url).pathname
      if (path !== "/api/entries" && path !== "/api/entries/") return null
      if (request.method !== "GET") return json("METHOD_NOT_ALLOWED", 405)
      try {
        const session = await requireBrowserSession(request, env, trust)
        const scopes = await trust.scopes(session.principalKey)
        const rows = await bindings.listReadyForScopes(scopes, LIST_LIMIT)
        const entries = await mapPool(rows, READ_CONCURRENCY, async (binding) => {
          if (!binding.paste_name) throw new Error("READY_BINDING_UNNAMED")
          const publicUrl = client.publicUrl(binding.paste_name)
          const content = await client.read(binding.paste_name)
          return toPublicListEntry(binding, publicUrl, content)
        })
        return Response.json({ entries })
      } catch (error) {
        if (error instanceof BrowserAuthError) return json(error.code, error.status)
        return json("STORAGE_OR_CREDENTIAL_UNAVAILABLE", 503)
      }
    },
  }
}
