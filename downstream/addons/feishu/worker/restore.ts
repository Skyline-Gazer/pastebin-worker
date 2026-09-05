import {
  BrowserAuthError,
  requireBrowserRequestProtection,
  requireBrowserSession,
  type BrowserAuthEnvironment,
} from "./browser-auth"
import type { BrowserTrustStore } from "./browser-store"
import type { EntryService } from "./service"
import type { BindingStore } from "./store"

const validRequestId = (value: string | null) => !!value && value.length <= 256 && /^[\x20-\x7e]+$/.test(value)
const response = (code: string, status: number) => Response.json({ code }, { status })
const restoreStatus = (code: string) =>
  code === "ENTRY_NOT_FOUND"
    ? 404
    : code === "STORAGE_OR_CREDENTIAL_UNAVAILABLE" || code === "UPSTREAM_UNCERTAIN"
      ? 503
      : code === "UPSTREAM_REJECTED" || code === "UPSTREAM_INVALID"
        ? 502
        : 409

/** Browser input is deliberately limited to the path id and opaque request key. */
export function createRestoreHandler(
  env: BrowserAuthEnvironment,
  trust: BrowserTrustStore,
  bindings: BindingStore,
  service: EntryService,
) {
  return {
    async fetch(request: Request): Promise<Response | null> {
      const match = /^\/api\/entries\/([^/]+)\/restore$/.exec(new URL(request.url).pathname)
      if (!match) return null
      if (request.method !== "POST") return response("METHOD_NOT_ALLOWED", 405)
      if (!validRequestId(request.headers.get("idempotency-key"))) return response("INVALID_INPUT", 400)
      const length = Number(request.headers.get("content-length") || "0")
      if (!Number.isSafeInteger(length) || length > 1024) return response("INVALID_INPUT", 413)
      // Restore has no browser-controlled request fields; an empty body is the
      // entire contract, so authority-like fields are rejected rather than ignored.
      if ((await request.text()).length !== 0) return response("INVALID_INPUT", 400)
      let id: string
      try {
        id = decodeURIComponent(match[1])
      } catch {
        return response("INVALID_INPUT", 400)
      }
      if (!id || id.length > 256 || Array.from(id).some((char) => char.charCodeAt(0) < 32))
        return response("INVALID_INPUT", 400)
      try {
        const session = await requireBrowserSession(request, env, trust)
        requireBrowserRequestProtection(request, env, session)
        const binding = await bindings.getById(id)
        if (!binding || !(await trust.scopes(session.principalKey)).includes(binding.scope_id))
          return response("FORBIDDEN", 403)
        const result = await service.restoreEntry(
          { scopeId: binding.scope_id },
          { entryId: binding.id, requestId: request.headers.get("idempotency-key")! },
        )
        return result.ok ? Response.json({ entry: result.entry }) : response(result.code, restoreStatus(result.code))
      } catch (error) {
        if (error instanceof BrowserAuthError) return response(error.code, error.status)
        return response("STORAGE_OR_CREDENTIAL_UNAVAILABLE", 503)
      }
    },
  }
}
