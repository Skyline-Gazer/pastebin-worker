import {
  BrowserAuthError,
  requireBrowserRequestProtection,
  requireBrowserSession,
  type BrowserAuthEnvironment,
} from "./browser-auth"
import type { BrowserSession, BrowserTrustStore } from "./browser-store"
import { batchActions, type BatchRequest } from "../shared/batch"

const maxBodyBytes = 16 * 1024
const maxIds = 50
const maxIdLength = 256
const printable = (value: string) => /^[\x20-\x7e]+$/.test(value)
const json = (code: string, status: number) => Response.json({ code }, { status })

export type BatchDispatchGate = (
  request: BatchRequest,
  session: BrowserSession,
  allowedScopes: string[],
  idempotencyKey: string,
) => Promise<Response>

function idempotencyKey(value: string | null) {
  return !!value && value.length <= 256 && printable(value)
}
async function parseBatchRequest(request: Request): Promise<{ request: BatchRequest } | { tooLarge: true } | null> {
  const declaredLength = request.headers.get("content-length")
  if (declaredLength !== null) {
    const length = Number(declaredLength)
    if (!Number.isSafeInteger(length) || length < 0) return null
    if (length > maxBodyBytes) return { tooLarge: true }
  }
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).length > maxBodyBytes) return { tooLarge: true }
    const body: unknown = JSON.parse(raw)
    if (!body || typeof body !== "object" || Array.isArray(body)) return null
    const record = body as Record<string, unknown>
    if (Object.keys(record).length !== 2 || !("ids" in record) || !("action" in record)) return null
    if (!Array.isArray(record.ids) || record.ids.length === 0 || record.ids.length > maxIds) return null
    if (!batchActions.includes(record.action as (typeof batchActions)[number])) return null
    if (!record.ids.every((id) => typeof id === "string" && id.length <= maxIdLength && printable(id))) return null
    const ids = record.ids as string[]
    if (new Set(ids).size !== ids.length) return null
    return { request: { ids, action: record.action as BatchRequest["action"] } }
  } catch {
    return null
  }
}

/**
 * Phase 9.1 validates and authenticates only. Its dispatch seam has no binding,
 * credential, lifecycle, or Paste dependency; Phase 9.2 owns those capabilities.
 */
export function createBatchHandler(
  env: BrowserAuthEnvironment,
  trust: BrowserTrustStore,
  dispatch: BatchDispatchGate = () => Promise.resolve(json("BATCH_DISPATCH_UNAVAILABLE", 503)),
) {
  return {
    async fetch(request: Request): Promise<Response | null> {
      if (new URL(request.url).pathname !== "/api/batch") return null
      if (request.method !== "POST") return json("METHOD_NOT_ALLOWED", 405)
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
        return json("INVALID_INPUT", 415)
      if (!idempotencyKey(request.headers.get("idempotency-key"))) return json("INVALID_INPUT", 400)
      const parsed = await parseBatchRequest(request)
      if (parsed && "tooLarge" in parsed) return json("INVALID_INPUT", 413)
      if (!parsed) return json("INVALID_INPUT", 400)
      try {
        const session = await requireBrowserSession(request, env, trust)
        requireBrowserRequestProtection(request, env, session)
        const allowedScopes = await trust.scopes(session.principalKey)
        if (allowedScopes.length === 0) return json("FORBIDDEN", 403)
        return await dispatch(parsed.request, session, allowedScopes, request.headers.get("idempotency-key")!)
      } catch (error) {
        if (error instanceof BrowserAuthError) return json(error.code, error.status)
        return json("STORAGE_OR_CREDENTIAL_UNAVAILABLE", 503)
      }
    },
  }
}
