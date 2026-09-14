import { Credentials } from "./credentials"
import { PasteClient } from "./paste-client"
import { EntryService } from "./service"
import { BindingStore } from "./store"
import { BrowserTrustStore } from "./browser-store"
import { createBrowserAuthHandler, type BrowserAuthEnvironment } from "./browser-auth"
import { createCompletionHandler } from "./completion"
import { createRestoreHandler } from "./restore"
import { createReconciliationHandler } from "./reconcile"
import { createEntriesListHandler } from "./entries"
import { BatchLifecycleCoordinator, createBatchDispatch, createBatchHandler } from "./batch"
import { derivePrincipalKey } from "./principal"
import { consumeInboundMessages, createInboundWebhookDispatcher, type MessagingWebhookEnvironment } from "./webhook"
import type { ProviderAdapter } from "./providers/types"

export interface MessagingRuntimeEnvironment extends MessagingWebhookEnvironment, BrowserAuthEnvironment {
  FEISHU_BINDINGS_DB: D1Database
  FEISHU_CREDENTIAL_KEY_ID: string
  FEISHU_CREDENTIAL_ENCRYPTION_KEY: string
  FEISHU_FINGERPRINT_KEY: string
  PASTEBIN_ORIGIN: string
  PASTEBIN_SERVICE: Fetcher
  PASTEBIN_AUTHORIZATION?: string
}

export interface MessagingProductionEnvironment extends MessagingRuntimeEnvironment {
  ASSETS?: Fetcher
}

/** Bind PasteClient to PASTEBIN_SERVICE without teaching it Cloudflare service-binding concepts. */
export function createPasteClient(env: MessagingRuntimeEnvironment): PasteClient {
  const service = env.PASTEBIN_SERVICE
  if (!service || typeof service.fetch !== "function") throw new Error("MISSING_PASTEBIN_SERVICE")
  const pastebinTransport: typeof fetch = async (input, init) => {
    // workerd Request accepts only follow|manual; "error" throws TypeError before fetch.
    const request = new Request(input, { ...init, redirect: "manual" })
    console.log("PASTEBIN_SERVICE_STAGE=request_ready")
    console.log("PASTEBIN_SERVICE_STAGE=fetch_enter")
    const response = await service.fetch(request)
    console.log("PASTEBIN_SERVICE_STAGE=fetch_response")
    return response
  }
  return new PasteClient(env.PASTEBIN_ORIGIN, pastebinTransport, env.PASTEBIN_AUTHORIZATION)
}

function principalFor(env: MessagingRuntimeEnvironment, adapter: ProviderAdapter) {
  return (appId: string, tenantKey: string, openId: string) =>
    derivePrincipalKey(env.FEISHU_PRINCIPAL_KEY, appId, tenantKey, openId, adapter.id)
}

/** Constructs the only public adapter; it never accepts caller-selected Phase 3 identities. */
export async function createMessagingRuntime(env: MessagingRuntimeEnvironment) {
  const credentials = await Credentials.create(
    env.FEISHU_CREDENTIAL_KEY_ID,
    env.FEISHU_CREDENTIAL_ENCRYPTION_KEY,
    env.FEISHU_FINGERPRINT_KEY,
  )
  const bindings = new BindingStore(env.FEISHU_BINDINGS_DB)
  const client = createPasteClient(env)
  const service = new EntryService(bindings, credentials, client)
  const trustStore = new BrowserTrustStore(env.FEISHU_BINDINGS_DB)
  const webhooks = createInboundWebhookDispatcher(env, trustStore, (adapter) => principalFor(env, adapter))
  const browser = createBrowserAuthHandler(env, trustStore)
  const completion = createCompletionHandler(env, trustStore, bindings, service)
  const restore = createRestoreHandler(env, trustStore, bindings, service)
  const reconciliation = createReconciliationHandler(env, trustStore, bindings, service)
  const batchLifecycle = new BatchLifecycleCoordinator(bindings, bindings, service)
  const batch = createBatchHandler(env, trustStore, createBatchDispatch(batchLifecycle))
  const entries = createEntriesListHandler(env, trustStore, bindings, client)
  return {
    fetch: async (request: Request) =>
      (await browser.fetch(request)) ??
      (await completion.fetch(request)) ??
      (await restore.fetch(request)) ??
      (await reconciliation.fetch(request)) ??
      (await batch.fetch(request)) ??
      (await entries.fetch(request)) ??
      (await webhooks.fetch(request)) ??
      Response.json({ code: "NOT_FOUND" }, { status: 404 }),
    queue: (batch: Parameters<typeof consumeInboundMessages>[0]) =>
      consumeInboundMessages(batch, service, undefined, env.FEISHU_INGRESS_DLQ_CONFIGURED === "true"),
  }
}

/** Cloudflare module-worker entrypoint; construction remains fail-closed on every invocation. */
export default {
  fetch: async (request: Request, env: MessagingProductionEnvironment) => {
    const path = new URL(request.url).pathname
    if (path.startsWith("/api/")) return (await createMessagingRuntime(env)).fetch(request)
    if ((request.method === "GET" || request.method === "HEAD") && env.ASSETS) return env.ASSETS.fetch(request)
    return Response.json({ code: "NOT_FOUND" }, { status: 404 })
  },
  queue: async (batch: Parameters<typeof consumeInboundMessages>[0], env: MessagingRuntimeEnvironment) =>
    (await createMessagingRuntime(env)).queue(batch),
}

export { EntryService } from "./service"
export { BindingStore } from "./store"
export { Credentials } from "./credentials"
export { PasteClient } from "./paste-client"
export { BrowserTrustStore } from "./browser-store"
export { authorizeBrowserMutation, createBrowserAuthHandler, requireBrowserSession } from "./browser-auth"
export { createCompletionHandler } from "./completion"
export { createEntriesListHandler } from "./entries"
export { createRestoreHandler } from "./restore"
export { createReconciliationHandler } from "./reconcile"
export { createBatchHandler } from "./batch"
export { BatchLifecycleCoordinator } from "./batch"
export { derivePrincipalKey } from "./principal"
export type { EntryContext, EntryResult, PublicEntry, PublicListEntry } from "../shared/entries"
export type { BatchAction, BatchItemResult, BatchPublicEntryState, BatchRequest, BatchResult } from "../shared/batch"
export {
  consumeInboundMessages,
  consumeFeishuMessages,
  createFeishuWebhookHandler,
  createInboundWebhookDispatcher,
  createProviderWebhookHandler,
  deriveMessageIdentity,
  normalizeAuthorizedEvent,
  verifyFeishuChallenge,
} from "./webhook"
export type {
  FeishuMessageCreateV1,
  FeishuWebhookEnvironment,
  InboundMessageV1,
  MessagingWebhookEnvironment,
} from "./webhook"
export { providerRegistry, feishuAdapter, larkAdapter } from "./platform"
