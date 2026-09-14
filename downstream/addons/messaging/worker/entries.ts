import { BrowserAuthError, requireBrowserSession, type BrowserAuthEnvironment } from "./browser-auth"
import type { BrowserTrustStore } from "./browser-store"
import { PasteError, type PasteClient } from "./paste-client"
import type { BindingStore } from "./store"
import type { PublicListEntry } from "../shared/entries"
import { classifyListKind } from "../shared/entryKind"

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
  extra: {
    kind: "text" | "file"
    content?: string
    filename?: string
    mimeType?: string
    sizeBytes?: number
    encrypted?: boolean
  },
): PublicListEntry {
  const entry: PublicListEntry = {
    id: binding.id,
    pasteName: binding.paste_name!,
    publicUrl,
    visibility: binding.visibility,
    retentionMode: binding.retention_mode,
    expiresAt: binding.expires_at,
    version: binding.version,
    kind: extra.kind,
    managedTask: { state: binding.visibility === "archived" ? "checked" : "unchecked" },
  }
  if (extra.kind === "text") entry.content = extra.content
  if (extra.filename) entry.filename = extra.filename
  if (extra.mimeType) entry.mimeType = extra.mimeType
  if (extra.sizeBytes !== undefined) entry.sizeBytes = extra.sizeBytes
  if (extra.encrypted) entry.encrypted = true
  return entry
}

type ListClient = Pick<PasteClient, "read" | "publicUrl"> & Partial<Pick<PasteClient, "inspect">>

/** Session-authenticated listing; caller query parameters are never authority. */
export function createEntriesListHandler(
  env: BrowserAuthEnvironment,
  trust: BrowserTrustStore,
  bindings: BindingStore,
  client: ListClient,
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
        const entries = (
          await mapPool(rows, READ_CONCURRENCY, async (binding) => {
            if (!binding.paste_name) throw new Error("READY_BINDING_UNNAMED")
            const publicUrl = client.publicUrl(binding.paste_name)
            let inspect:
              | {
                  filename?: string
                  mimeType?: string
                  sizeBytes?: number
                  encryptionScheme?: string
                }
              | undefined
            if (client.inspect) {
              try {
                inspect = await client.inspect(binding.paste_name)
              } catch (error) {
                if (error instanceof PasteError && error.code === "ENTRY_NOT_FOUND") return null
              }
            }
            const encrypted = Boolean(inspect?.encryptionScheme)
            const kind = classifyListKind({
              mimeType: inspect?.mimeType,
              filename: inspect?.filename,
              utf8Text: encrypted ? false : undefined,
            })
            let content: string | undefined
            if (kind === "text") {
              try {
                content = await client.read(binding.paste_name)
              } catch (error) {
                if (error instanceof PasteError && error.code === "ENTRY_NOT_FOUND") return null
                throw error
              }
            }
            const current = await bindings.getById(binding.id)
            if (!current?.paste_name || current.version !== binding.version) return null
            if (await bindings.pending(current.id)) return null
            return toPublicListEntry(current, publicUrl, {
              kind,
              content,
              filename: inspect?.filename,
              mimeType: inspect?.mimeType,
              sizeBytes: inspect?.sizeBytes,
              encrypted,
            })
          })
        ).filter((entry): entry is PublicListEntry => entry !== null)
        return Response.json({ entries })
      } catch (error) {
        if (error instanceof BrowserAuthError) return json(error.code, error.status)
        return json("STORAGE_OR_CREDENTIAL_UNAVAILABLE", 503)
      }
    },
  }
}
