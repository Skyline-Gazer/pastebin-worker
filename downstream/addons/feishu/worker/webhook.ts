import type { EntryResult } from "../shared/entries"
import {
  InvalidPlatformError,
  MissingProviderConfigError,
  resolveProviderConfig,
  type Platform,
  type ProviderConfig,
  type ProviderCredentialEnvironment,
} from "./platform"

const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8", { fatal: true })
const RAW_LIMIT = 256_000
const TEXT_LIMIT = 100_000
const QUEUE_LIMIT = 120_000

export interface FeishuMessageCreateV1 {
  schema: "feishu.message-create.v1"
  provider?: Platform
  scopeId: string
  recordKey: string
  requestId: string
  sourceMessageId: string
  content: string
  correlationId: string
}

export interface AuthorizedFeishuEvent extends Omit<FeishuMessageCreateV1, "schema" | "correlationId"> {
  /** Internal only: keyed identity used to establish browser authorization metadata. */
  principalKey: string
}

export interface FeishuWebhookEnvironment extends ProviderCredentialEnvironment {
  FEISHU_INGRESS_QUEUE: { send(message: FeishuMessageCreateV1): Promise<void> }
  /** Deployment validation marker: a consumer must have a configured DLQ. */
  FEISHU_INGRESS_DLQ_CONFIGURED: string
}

export interface EntryCreator {
  createEntry(
    context: { scopeId: string },
    input: { recordKey: string; requestId: string; content: string },
  ): Promise<EntryResult>
}
export interface PrincipalScopeRecorder {
  upsertPrincipalScope(principalKey: string, scopeId: string): Promise<void>
}

export interface QueueMessageLike<T> {
  body: T
  ack(): void
  retry(): void
}
export interface QueueBatchLike<T> {
  messages: Iterable<QueueMessageLike<T>>
}
export type DispositionReporter = (event: {
  code: string
  correlationId: string
  operationCorrelationId?: string
}) => Promise<boolean>

// Queue disposition data can become a DLQ record, alert, or release-visible
// operational report. Keep that boundary limited to protocol-owned codes and
// generated correlation IDs; never forward a thrown/upstream detail.
const dispositionCodes = new Set([
  "ENTRY_NOT_FOUND",
  "INVALID_INPUT",
  "MANAGED_TASK_AMBIGUOUS",
  "MUTATION_CONFLICT",
  "OPERATOR_RECONCILIATION_REQUIRED",
  "OUTCOME_OBSERVED_OPERATOR_CONFIRMATION_REQUIRED",
  "RECONCILIATION_REQUIRED",
  "REQUEST_CONFLICT",
  "STORAGE_OR_CREDENTIAL_UNAVAILABLE",
  "UPSTREAM_INVALID",
  "UPSTREAM_REJECTED",
  "UPSTREAM_UNCERTAIN",
  "VERSION_CONFLICT",
])
function dispositionCode(code: unknown): string {
  return typeof code === "string" && dispositionCodes.has(code) ? code : "UNAVAILABLE"
}
function dispositionCorrelationId(value: unknown): string | undefined {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined
}

class WebhookError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code)
  }
}

function boundedIdentity(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Array.from(value).length >= 1 &&
    Array.from(value).length <= 256 &&
    Array.from(value).every((character) => {
      const point = character.codePointAt(0)!
      return point > 31 && (point < 127 || point > 159)
    })
  )
}
function providerOrUnavailable(env: ProviderCredentialEnvironment, provider?: Platform): ProviderConfig {
  try {
    return resolveProviderConfig(env, provider)
  } catch (error) {
    if (error instanceof InvalidPlatformError || error instanceof MissingProviderConfigError)
      throw new WebhookError("UNAVAILABLE", 503)
    throw error
  }
}
function config(env: ProviderCredentialEnvironment, provider?: Platform) {
  const resolved = providerOrUnavailable(env, provider)
  const tenants = resolved.allowedTenantKeys.split(",")
  if (
    !boundedIdentity(resolved.encryptKey) ||
    !boundedIdentity(resolved.verificationToken) ||
    !boundedIdentity(resolved.appId) ||
    !tenants.length ||
    tenants.some((tenant) => !boundedIdentity(tenant)) ||
    new Set(tenants).size !== tenants.length
  )
    throw new WebhookError("UNAVAILABLE", 503)
  return { ...resolved, tenants: new Set(tenants) }
}
function bytes(value: string) {
  return encoder.encode(value)
}
function base64(bytesValue: Uint8Array): string {
  return btoa(String.fromCharCode(...bytesValue))
}
function base64url(value: ArrayBuffer) {
  return base64(new Uint8Array(value)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
}
function fromBase64(value: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
    throw new WebhookError("UNAUTHORIZED", 401)
  try {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
  } catch {
    throw new WebhookError("UNAUTHORIZED", 401)
  }
}
async function digest(value: string): Promise<string> {
  return base64url(await crypto.subtle.digest("SHA-256", bytes(value)))
}
function equal(left: string, right: string): boolean {
  const a = bytes(left)
  const b = bytes(right)
  if (a.byteLength !== b.byteLength) return false
  let different = 0
  for (let index = 0; index < a.byteLength; index++) different |= a[index] ^ b[index]
  return different === 0
}
function json(value: string, status = 400): unknown {
  try {
    return JSON.parse(value)
  } catch {
    throw new WebhookError("MALFORMED", status)
  }
}
function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}
async function decrypt(encrypt: string, keyText: string): Promise<unknown> {
  const encrypted = fromBase64(encrypt)
  if (encrypted.byteLength < 32 || (encrypted.byteLength - 16) % 16 !== 0) throw new WebhookError("UNAUTHORIZED", 401)
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      await crypto.subtle.digest("SHA-256", bytes(keyText)),
      "AES-CBC",
      false,
      ["decrypt"],
    )
    return json(
      decoder.decode(
        await crypto.subtle.decrypt({ name: "AES-CBC", iv: encrypted.slice(0, 16) }, key, encrypted.slice(16)),
      ),
      401,
    )
  } catch {
    throw new WebhookError("UNAUTHORIZED", 401)
  }
}

export async function verifyFeishuChallenge(
  value: unknown,
  env: ProviderCredentialEnvironment,
  provider?: Platform,
): Promise<string> {
  const checked = config(env, provider)
  const clear =
    value && typeof value === "object" && typeof (value as { encrypt?: unknown }).encrypt === "string"
      ? await decrypt((value as { encrypt: string }).encrypt, checked.encryptKey)
      : value
  if (!clear || typeof clear !== "object") throw new WebhookError("MALFORMED", 400)
  const item = clear as { type?: unknown; token?: unknown; challenge?: unknown }
  if (
    item.type !== "url_verification" ||
    !boundedIdentity(item.challenge) ||
    typeof item.token !== "string" ||
    !equal(item.token, checked.verificationToken)
  )
    throw new WebhookError("UNAUTHORIZED", 401)
  return item.challenge
}

export async function deriveMessageIdentity(
  appId: string,
  tenantKey: string,
  chatId: string,
  messageId: string,
  provider: Platform = "feishu",
) {
  const scopeId = `${provider}:v1:scope:${await digest(JSON.stringify([appId, tenantKey, chatId]))}`
  const recordKey = `${provider}:v1:message:${await digest(JSON.stringify([messageId]))}`
  return {
    scopeId,
    recordKey,
    requestId: `${provider}:v1:create:${await digest(JSON.stringify([scopeId, recordKey]))}`,
  }
}

export async function normalizeAuthorizedEvent(
  value: unknown,
  env: ProviderCredentialEnvironment,
  principal?: (appId: string, tenantKey: string, openId: string) => Promise<string>,
  provider?: Platform,
): Promise<AuthorizedFeishuEvent | null> {
  const checked = config(env, provider)
  if (!value || typeof value !== "object") throw new WebhookError("MALFORMED", 400)
  const root = object(value)
  const header = object(root?.header)
  const event = object(root?.event)
  const sender = object(event?.sender)
  const senderId = object(sender?.sender_id)
  const message = object(event?.message)
  if (root?.schema !== "2.0" || !header || !event || !message) throw new WebhookError("MALFORMED", 400)
  if (typeof header.token !== "string" || !equal(header.token, checked.verificationToken))
    throw new WebhookError("UNAUTHORIZED", 401)
  if (
    header.app_id !== checked.appId ||
    typeof header.tenant_key !== "string" ||
    !checked.tenants.has(header.tenant_key)
  )
    throw new WebhookError("FORBIDDEN", 403)
  if (!boundedIdentity(header.event_id)) throw new WebhookError("MALFORMED", 400)
  if (
    header.event_type !== "im.message.receive_v1" ||
    sender?.sender_type !== "user" ||
    message.chat_type !== "p2p" ||
    message.message_type !== "text"
  )
    return null
  if (!boundedIdentity(message.message_id) || !boundedIdentity(message.chat_id) || typeof message.content !== "string")
    throw new WebhookError("MALFORMED", 400)
  const content = object(json(message.content))
  if (
    !content ||
    typeof content.text !== "string" ||
    content.text.length === 0 ||
    bytes(content.text).byteLength > TEXT_LIMIT
  )
    throw new WebhookError("UNSUPPORTED", 400)
  // A supported P2P event establishes browser authorization only when Feishu supplied
  // a sender open_id. Missing identity is deliberately fail-closed, never queued.
  if (!boundedIdentity(senderId?.open_id)) throw new WebhookError("MALFORMED", 400)
  const principalKey = principal ? await principal(checked.appId, header.tenant_key, senderId.open_id) : ""
  return {
    ...(await deriveMessageIdentity(
      checked.appId,
      header.tenant_key,
      message.chat_id,
      message.message_id,
      checked.provider,
    )),
    sourceMessageId: message.message_id,
    content: content.text,
    principalKey,
    ...(checked.provider === "lark" ? { provider: "lark" as const } : {}),
  }
}

async function readBounded(request: Request): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > RAW_LIMIT) throw new WebhookError("TOO_LARGE", 413)
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const next = await reader.read()
    if (next.done) break
    size += next.value.byteLength
    if (size > RAW_LIMIT) throw new WebhookError("TOO_LARGE", 413)
    chunks.push(next.value)
  }
  const output = new Uint8Array(size)
  let at = 0
  for (const chunk of chunks) {
    output.set(chunk, at)
    at += chunk.byteLength
  }
  return output
}
function response(code: string, correlationId: string, status: number) {
  return Response.json({ code, correlationId }, { status })
}

function createWebhookHandler(
  env: FeishuWebhookEnvironment,
  pathname: string,
  providerOverride: Platform | undefined,
  recorder?: PrincipalScopeRecorder,
  principal?: (appId: string, tenantKey: string, openId: string) => Promise<string>,
) {
  return {
    async fetch(request: Request): Promise<Response> {
      const correlationId = crypto.randomUUID()
      if (new URL(request.url).pathname !== pathname) return response("NOT_FOUND", correlationId, 404)
      if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } })
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
        return response("UNSUPPORTED_MEDIA_TYPE", correlationId, 415)
      try {
        if (!env.FEISHU_INGRESS_QUEUE || env.FEISHU_INGRESS_DLQ_CONFIGURED !== "true")
          throw new WebhookError("UNAVAILABLE", 503)
        const provider = config(env, providerOverride)
        const raw = await readBounded(request)
        const envelope = json(decoder.decode(raw))
        if (envelope && typeof envelope === "object" && (envelope as { type?: unknown }).type === "url_verification")
          return Response.json({ challenge: await verifyFeishuChallenge(envelope, env, providerOverride) })
        if (
          envelope &&
          typeof envelope === "object" &&
          typeof (envelope as { encrypt?: unknown }).encrypt === "string"
        ) {
          let clear: unknown
          try {
            clear = await decrypt((envelope as { encrypt: string }).encrypt, provider.encryptKey)
          } catch {
            // Ordinary events are deliberately authenticated from the exact raw body.
          }
          if (object(clear)?.type === "url_verification")
            return Response.json({ challenge: await verifyFeishuChallenge(envelope, env, providerOverride) })
        }
        const timestamp = request.headers.get("x-lark-request-timestamp")
        const nonce = request.headers.get("x-lark-request-nonce")
        const signature = request.headers.get("x-lark-signature")
        if (!timestamp || !nonce || !signature || !/^[a-f0-9]{64}$/i.test(signature))
          throw new WebhookError("UNAUTHORIZED", 401)
        const signed = new Uint8Array(bytes(timestamp + nonce + provider.encryptKey).byteLength + raw.byteLength)
        signed.set(bytes(timestamp + nonce + provider.encryptKey))
        signed.set(raw, bytes(timestamp + nonce + provider.encryptKey).byteLength)
        if (!equal(await digestBytes(signed), signature.toLowerCase())) throw new WebhookError("UNAUTHORIZED", 401)
        if (
          !envelope ||
          typeof envelope !== "object" ||
          typeof (envelope as { encrypt?: unknown }).encrypt !== "string"
        )
          throw new WebhookError("MALFORMED", 400)
        const normalized = await normalizeAuthorizedEvent(
          await decrypt((envelope as { encrypt: string }).encrypt, provider.encryptKey),
          env,
          principal,
          providerOverride,
        )
        if (!normalized) return new Response(null, { status: 200 })
        if (recorder) {
          if (!normalized.principalKey) throw new WebhookError("UNAVAILABLE", 503)
          await recorder.upsertPrincipalScope(normalized.principalKey, normalized.scopeId)
        }
        const { principalKey: _principalKey, ...queueSafe } = normalized
        const item: FeishuMessageCreateV1 = { schema: "feishu.message-create.v1", correlationId, ...queueSafe }
        if (bytes(JSON.stringify(item)).byteLength > QUEUE_LIMIT) throw new WebhookError("TOO_LARGE", 413)
        try {
          await env.FEISHU_INGRESS_QUEUE.send(item)
        } catch {
          throw new WebhookError("UNAVAILABLE", 503)
        }
        return new Response(null, { status: 200 })
      } catch (error) {
        const safe = error instanceof WebhookError ? error : new WebhookError("UNAVAILABLE", 503)
        return response(safe.code, correlationId, safe.status)
      }
    },
  }
}

export function createFeishuWebhookHandler(
  env: FeishuWebhookEnvironment,
  recorder?: PrincipalScopeRecorder,
  principal?: (appId: string, tenantKey: string, openId: string) => Promise<string>,
) {
  return createWebhookHandler(env, "/api/feishu/events", undefined, recorder, principal)
}

export function createProviderWebhookHandler(
  env: FeishuWebhookEnvironment,
  provider: Platform,
  recorder?: PrincipalScopeRecorder,
  principal?: (appId: string, tenantKey: string, openId: string) => Promise<string>,
) {
  return createWebhookHandler(
    env,
    provider === "lark" ? "/api/lark/events" : "/api/feishu/events",
    provider,
    recorder,
    principal,
  )
}
async function digestBytes(value: Uint8Array) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", value as Uint8Array<ArrayBuffer>)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

function queueItem(value: unknown): value is FeishuMessageCreateV1 {
  if (!value || typeof value !== "object" || (value as FeishuMessageCreateV1).schema !== "feishu.message-create.v1")
    return false
  const item = value as FeishuMessageCreateV1
  if (item.provider !== undefined && item.provider !== "feishu" && item.provider !== "lark") return false
  return (
    [item.scopeId, item.recordKey, item.requestId, item.sourceMessageId, item.correlationId].every(boundedIdentity) &&
    typeof item.content === "string" &&
    item.content.length > 0 &&
    bytes(item.content).byteLength <= TEXT_LIMIT &&
    bytes(JSON.stringify(value)).byteLength <= QUEUE_LIMIT
  )
}

function providerScopePoison(item: FeishuMessageCreateV1): boolean {
  if (item.provider === "lark") return !item.scopeId.startsWith("lark:v1:")
  return item.scopeId.startsWith("lark:v1:")
}

export async function consumeFeishuMessages(
  batch: QueueBatchLike<unknown>,
  service: EntryCreator,
  report: DispositionReporter | undefined,
  dlqConfigured: boolean,
) {
  for (const message of batch.messages) {
    const item = message.body
    if (!dlqConfigured || !queueItem(item) || providerScopePoison(item)) {
      if (
        report &&
        (await report({ code: "QUEUE_POISON", correlationId: queueItem(item) ? item.correlationId : "invalid" }))
      )
        message.ack()
      else message.retry()
      continue
    }
    const result = await service.createEntry(
      { scopeId: item.scopeId },
      { recordKey: item.recordKey, requestId: item.requestId, content: item.content },
    )
    if (result.ok) {
      message.ack()
      continue
    }
    if (result.retryable && result.code === "STORAGE_OR_CREDENTIAL_UNAVAILABLE") {
      message.retry()
      continue
    }
    const accepted =
      !!report &&
      (await report({
        code: dispositionCode(result.code),
        correlationId: item.correlationId,
        operationCorrelationId: dispositionCorrelationId(result.correlationId),
      }))
    if (accepted) message.ack()
    else message.retry()
  }
}
