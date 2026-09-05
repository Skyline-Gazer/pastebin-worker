import {
  BrowserAuthError,
  requireBrowserRequestProtection,
  requireBrowserSession,
  type BrowserAuthEnvironment,
} from "./browser-auth"
import type { BrowserTrustStore } from "./browser-store"
import type { EntryService } from "./service"
import type { BindingStore } from "./store"

const actions = new Set(["archive_permanent", "archive_expiring", "delete"])
const maxBodyBytes = 1024
const requestId = (value: string | null) => !!value && value.length <= 256 && /^[\x20-\x7e]+$/.test(value)
const json = (code: string, status: number) => Response.json({ code }, { status })

/** The browser completion adapter deliberately has no scope/body/URL/password inputs. */
export function createCompletionHandler(
  env: BrowserAuthEnvironment,
  trust: BrowserTrustStore,
  bindings: BindingStore,
  service: EntryService,
) {
  return {
    async fetch(request: Request): Promise<Response | null> {
      const match = /^\/api\/entries\/([^/]+)\/complete$/.exec(new URL(request.url).pathname)
      if (!match) return null
      if (request.method !== "POST") return json("METHOD_NOT_ALLOWED", 405)
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
        return json("INVALID_INPUT", 415)
      if (!requestId(request.headers.get("idempotency-key"))) return json("INVALID_INPUT", 400)
      try {
        const length = Number(request.headers.get("content-length") || "0")
        if (!Number.isSafeInteger(length) || length > maxBodyBytes) return json("INVALID_INPUT", 413)
        const raw = await request.text()
        if (new TextEncoder().encode(raw).length > maxBodyBytes) return json("INVALID_INPUT", 413)
        const body: unknown = JSON.parse(raw)
        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          Object.keys(body).length !== 1 ||
          !actions.has((body as { action?: string }).action || "")
        )
          return json("INVALID_INPUT", 400)
        const session = await requireBrowserSession(request, env, trust)
        requireBrowserRequestProtection(request, env, session)
        const binding = await bindings.getById(decodeURIComponent(match[1]))
        const scopes = await trust.scopes(session.principalKey)
        if (!binding) {
          // Delete removes the binding, but an authorized same-key replay remains safe.
          for (const scopeId of scopes) {
            const prior = await bindings.operation(scopeId, request.headers.get("idempotency-key")!)
            if (prior?.entry_id !== decodeURIComponent(match[1])) continue
            if (
              prior.kind === "delete" &&
              (body as { action: string }).action === "delete" &&
              prior.status === "succeeded"
            )
              return new Response(null, { status: 204 })
            return json("REQUEST_CONFLICT", 409)
          }
          return json("FORBIDDEN", 403)
        }
        if (!scopes.includes(binding.scope_id)) return json("FORBIDDEN", 403)
        const result = await service.completeEntry(
          { scopeId: binding.scope_id },
          {
            entryId: binding.id,
            requestId: request.headers.get("idempotency-key")!,
            action: (body as { action: "archive_permanent" | "archive_expiring" | "delete" }).action,
          },
        )
        if (result.ok && "deleted" in result) return new Response(null, { status: 204 })
        if (result.ok) return Response.json({ entry: result.entry })
        return json(
          result.code,
          result.code === "ENTRY_NOT_FOUND" ? 404 : result.code === "RECONCILIATION_REQUIRED" ? 409 : 409,
        )
      } catch (error) {
        if (error instanceof BrowserAuthError) return json(error.code, error.status)
        return json("INVALID_INPUT", 400)
      }
    },
  }
}
