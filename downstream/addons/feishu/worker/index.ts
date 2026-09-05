import { Credentials } from "./credentials"
import { PasteClient } from "./paste-client"
import { EntryService } from "./service"
import { BindingStore } from "./store"
import { BrowserTrustStore } from "./browser-store"
import { createBrowserAuthHandler, type BrowserAuthEnvironment } from "./browser-auth"
import { createCompletionHandler } from "./completion"
import { createRestoreHandler } from "./restore"
import { createReconciliationHandler } from "./reconcile"
import { BatchLifecycleCoordinator, createBatchHandler } from "./batch"
import { derivePrincipalKey } from "./principal"
import { consumeFeishuMessages, createFeishuWebhookHandler, type FeishuWebhookEnvironment } from "./webhook"

export interface Phase4Environment extends FeishuWebhookEnvironment, BrowserAuthEnvironment {
  FEISHU_BINDINGS_DB: D1Database
  FEISHU_CREDENTIAL_KEY_ID: string
  FEISHU_CREDENTIAL_ENCRYPTION_KEY: string
  FEISHU_FINGERPRINT_KEY: string
  PASTEBIN_ORIGIN: string
  PASTEBIN_AUTHORIZATION?: string
}

/** Constructs the only public adapter; it never accepts caller-selected Phase 3 identities. */
export async function createPhase4Worker(env: Phase4Environment) {
  const credentials = await Credentials.create(
    env.FEISHU_CREDENTIAL_KEY_ID,
    env.FEISHU_CREDENTIAL_ENCRYPTION_KEY,
    env.FEISHU_FINGERPRINT_KEY,
  )
  const bindings = new BindingStore(env.FEISHU_BINDINGS_DB)
  const service = new EntryService(
    bindings,
    credentials,
    new PasteClient(env.PASTEBIN_ORIGIN, fetch, env.PASTEBIN_AUTHORIZATION),
  )
  const trustStore = new BrowserTrustStore(env.FEISHU_BINDINGS_DB)
  const handler = createFeishuWebhookHandler(env, trustStore, (appId, tenantKey, openId) =>
    derivePrincipalKey(env.FEISHU_PRINCIPAL_KEY, appId, tenantKey, openId),
  )
  const browser = createBrowserAuthHandler(env, trustStore)
  const completion = createCompletionHandler(env, trustStore, bindings, service)
  const restore = createRestoreHandler(env, trustStore, bindings, service)
  const reconciliation = createReconciliationHandler(env, trustStore, bindings, service)
  const batchLifecycle = new BatchLifecycleCoordinator(bindings, bindings, service)
  const batch = createBatchHandler(env, trustStore, async (request, session, scopes, requestId) => {
    await batchLifecycle.execute(request, session, scopes, requestId)
    // Phase 9.3 owns the authoritative public result/replay serializer. Phase
    // 9.2 deliberately exposes no item evidence or lifecycle internals here.
    return Response.json({ code: "BATCH_RESULT_PENDING" }, { status: 202 })
  })
  return {
    fetch: async (request: Request) =>
      (await browser.fetch(request)) ??
      (await completion.fetch(request)) ??
      (await restore.fetch(request)) ??
      (await reconciliation.fetch(request)) ??
      (await batch.fetch(request)) ??
      handler.fetch(request),
    queue: (batch: Parameters<typeof consumeFeishuMessages>[0]) =>
      consumeFeishuMessages(batch, service, undefined, env.FEISHU_INGRESS_DLQ_CONFIGURED === "true"),
  }
}

/** Cloudflare module-worker entrypoint; construction remains fail-closed on every invocation. */
export default {
  fetch: async (request: Request, env: Phase4Environment) => (await createPhase4Worker(env)).fetch(request),
  queue: async (batch: Parameters<typeof consumeFeishuMessages>[0], env: Phase4Environment) =>
    (await createPhase4Worker(env)).queue(batch),
}

export { EntryService } from "./service"
export { BindingStore } from "./store"
export { Credentials } from "./credentials"
export { PasteClient } from "./paste-client"
export { BrowserTrustStore } from "./browser-store"
export { authorizeBrowserMutation, createBrowserAuthHandler, requireBrowserSession } from "./browser-auth"
export { createCompletionHandler } from "./completion"
export { createRestoreHandler } from "./restore"
export { createReconciliationHandler } from "./reconcile"
export { createBatchHandler } from "./batch"
export { BatchLifecycleCoordinator } from "./batch"
export { derivePrincipalKey } from "./principal"
export type { EntryContext, EntryResult, PublicEntry } from "../shared/entries"
export type { BatchAction, BatchItemResult, BatchPublicEntryState, BatchRequest, BatchResult } from "../shared/batch"
export {
  consumeFeishuMessages,
  createFeishuWebhookHandler,
  deriveMessageIdentity,
  normalizeAuthorizedEvent,
  verifyFeishuChallenge,
} from "./webhook"
export type { FeishuMessageCreateV1, FeishuWebhookEnvironment } from "./webhook"
