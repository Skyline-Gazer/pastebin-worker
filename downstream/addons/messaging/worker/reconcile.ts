import {
  BrowserAuthError,
  requireBrowserRequestProtection,
  requireBrowserSession,
  type BrowserAuthEnvironment,
} from "./browser-auth"
import type { BrowserTrustStore } from "./browser-store"
import type { EntryService } from "./service"
import type { BindingStore } from "./store"

const response = (code: string, status: number) => Response.json({ code }, { status })
const reconciliationStatus = (code: string) =>
  code === "ENTRY_NOT_FOUND" ? 404 : code === "UPSTREAM_UNCERTAIN" ? 503 : 409

/** Empty, authenticated absence check; the path ID is scoped only after the
 * stored principal-to-binding join and cannot request a local deletion. */
export function createReconciliationHandler(
  env: BrowserAuthEnvironment,
  trust: BrowserTrustStore,
  bindings: BindingStore,
  service: EntryService,
) {
  return {
    async fetch(request: Request): Promise<Response | null> {
      const match = /^\/api\/entries\/([^/]+)\/reconcile$/.exec(new URL(request.url).pathname)
      if (!match) return null
      if (request.method !== "POST") return response("METHOD_NOT_ALLOWED", 405)
      const length = Number(request.headers.get("content-length") || "0")
      if (!Number.isSafeInteger(length) || length > 1024 || (await request.text()).length !== 0)
        return response("INVALID_INPUT", 400)
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
        const result = await service.reconcileArchivedAbsence({ scopeId: binding.scope_id }, { entryId: binding.id })
        if (!result.ok) return response(result.code, reconciliationStatus(result.code))
        return "absent" in result ? new Response(null, { status: 204 }) : Response.json({ entry: result.entry })
      } catch (error) {
        if (error instanceof BrowserAuthError) return response(error.code, error.status)
        return response("RECONCILIATION_REQUIRED", 409)
      }
    },
  }
}
