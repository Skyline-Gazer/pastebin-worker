import type { EntryResult } from "../shared/entries"

const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8", { fatal: true })
const RAW_LIMIT = 256_000
const TEXT_LIMIT = 100_000
const QUEUE_LIMIT = 120_000

export interface FeishuMessageCreateV1 {
  schema: "feishu.message-create.v1"
  scopeId: string
  recordKey: string
  requestId: string
  sourceMessageId: string
  content: string
  correlationId: string
}

export interface FeishuWebhookEnvironment {
  FEISHU_ENCRYPT_KEY: string
  FEISHU_VERIFICATION_TOKEN: string
  FEISHU_APP_ID: string
  FEISHU_ALLOWED_TENANT_KEYS: string
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
function config(
  env: Pick<
    FeishuWebhookEnvironment,
    "FEISHU_ENCRYPT_KEY" | "FEISHU_VERIFICATION_TOKEN" | "FEISHU_APP_ID" | "FEISHU_ALLOWED_TENANT_KEYS"
  >,
) {
  const tenants = env.FEISHU_ALLOWED_TENANT_KEYS?.split(",") ?? []
  if (
    !boundedIdentity(env.FEISHU_ENCRYPT_KEY) ||
    !boundedIdentity(env.FEISHU_VERIFICATION_TOKEN) ||
    !boundedIdentity(env.FEISHU_APP_ID) ||
    !tenants.length ||
    tenants.some((tenant) => !boundedIdentity(tenant)) ||
    new Set(tenants).size !== tenants.length
  )
    throw new WebhookError("UNAVAILABLE", 503)
  return { ...env, tenants: new Set(tenants) }
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
  env: Pick<
    FeishuWebhookEnvironment,
    "FEISHU_ENCRYPT_KEY" | "FEISHU_VERIFICATION_TOKEN" | "FEISHU_APP_ID" | "FEISHU_ALLOWED_TENANT_KEYS"
  >,
): Promise<string> {
  const checked = config(env)
  const clear =
    value && typeof value === "object" && typeof (value as { encrypt?: unknown }).encrypt === "string"
      ? await decrypt((value as { encrypt: string }).encrypt, checked.FEISHU_ENCRYPT_KEY)
      : value
  if (!clear || typeof clear !== "object") throw new WebhookError("MALFORMED", 400)
  const item = clear as { type?: unknown; token?: unknown; challenge?: unknown }
  if (
    item.type !== "url_verification" ||
    !boundedIdentity(item.challenge) ||
    typeof item.token !== "string" ||
    !equal(item.token, checked.FEISHU_VERIFICATION_TOKEN)
  )
    throw new WebhookError("UNAUTHORIZED", 401)
  return item.challenge
}

export async function deriveMessageIdentity(appId: string, tenantKey: string, chatId: string, messageId: string) {
  const scopeId = `feishu:v1:scope:${await digest(JSON.stringify([appId, tenantKey, chatId]))}`
  const recordKey = `feishu:v1:message:${await digest(JSON.stringify([messageId]))}`
  return { scopeId, recordKey, requestId: `feishu:v1:create:${await digest(JSON.stringify([scopeId, recordKey]))}` }
}

export async function normalizeAuthorizedEvent(
  value: unknown,
  env: Pick<
    FeishuWebhookEnvironment,
    "FEISHU_ENCRYPT_KEY" | "FEISHU_VERIFICATION_TOKEN" | "FEISHU_APP_ID" | "FEISHU_ALLOWED_TENANT_KEYS"
  >,
): Promise<Omit<FeishuMessageCreateV1, "schema" | "correlationId"> | null> {
  const checked = config(env)
  if (!value || typeof value !== "object") throw new WebhookError("MALFORMED", 400)
  const root = object(value)
  const header = object(root?.header)
  const event = object(root?.event)
  const sender = object(event?.sender)
  const message = object(event?.message)
  if (root?.schema !== "2.0" || !header || !event || !message) throw new WebhookError("MALFORMED", 400)
  if (typeof header.token !== "string" || !equal(header.token, checked.FEISHU_VERIFICATION_TOKEN))
    throw new WebhookError("UNAUTHORIZED", 401)
  if (
    header.app_id !== checked.FEISHU_APP_ID ||
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
  return {
    ...(await deriveMessageIdentity(checked.FEISHU_APP_ID, header.tenant_key, message.chat_id, message.message_id)),
    sourceMessageId: message.message_id,
    content: content.text,
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

export function createFeishuWebhookHandler(env: FeishuWebhookEnvironment) {
  return {
    async fetch(request: Request): Promise<Response> {
      const correlationId = crypto.randomUUID()
      if (new URL(request.url).pathname !== "/api/feishu/events") return response("NOT_FOUND", correlationId, 404)
      if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } })
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
        return response("UNSUPPORTED_MEDIA_TYPE", correlationId, 415)
      try {
        if (!env.FEISHU_INGRESS_QUEUE || env.FEISHU_INGRESS_DLQ_CONFIGURED !== "true")
          throw new WebhookError("UNAVAILABLE", 503)
        const raw = await readBounded(request)
        const envelope = json(decoder.decode(raw))
        if (envelope && typeof envelope === "object" && (envelope as { type?: unknown }).type === "url_verification")
          return Response.json({ challenge: await verifyFeishuChallenge(envelope, env) })
        const timestamp = request.headers.get("x-lark-request-timestamp")
        const nonce = request.headers.get("x-lark-request-nonce")
        const signature = request.headers.get("x-lark-signature")
        if (!timestamp || !nonce || !signature || !/^[a-f0-9]{64}$/i.test(signature))
          throw new WebhookError("UNAUTHORIZED", 401)
        const signed = new Uint8Array(bytes(timestamp + nonce + env.FEISHU_ENCRYPT_KEY).byteLength + raw.byteLength)
        signed.set(bytes(timestamp + nonce + env.FEISHU_ENCRYPT_KEY))
        signed.set(raw, bytes(timestamp + nonce + env.FEISHU_ENCRYPT_KEY).byteLength)
        if (!equal(await digestBytes(signed), signature.toLowerCase())) throw new WebhookError("UNAUTHORIZED", 401)
        if (
          !envelope ||
          typeof envelope !== "object" ||
          typeof (envelope as { encrypt?: unknown }).encrypt !== "string"
        )
          throw new WebhookError("MALFORMED", 400)
        const normalized = await normalizeAuthorizedEvent(
          await decrypt((envelope as { encrypt: string }).encrypt, env.FEISHU_ENCRYPT_KEY),
          env,
        )
        if (!normalized) return new Response(null, { status: 200 })
        const item: FeishuMessageCreateV1 = { schema: "feishu.message-create.v1", correlationId, ...normalized }
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
async function digestBytes(value: Uint8Array) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", value as Uint8Array<ArrayBuffer>)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

function queueItem(value: unknown): value is FeishuMessageCreateV1 {
  if (!value || typeof value !== "object" || (value as FeishuMessageCreateV1).schema !== "feishu.message-create.v1")
    return false
  const item = value as FeishuMessageCreateV1
  return (
    [item.scopeId, item.recordKey, item.requestId, item.sourceMessageId, item.correlationId].every(boundedIdentity) &&
    typeof item.content === "string" &&
    item.content.length > 0 &&
    bytes(item.content).byteLength <= TEXT_LIMIT &&
    bytes(JSON.stringify(value)).byteLength <= QUEUE_LIMIT
  )
}
export async function consumeFeishuMessages(
  batch: QueueBatchLike<unknown>,
  service: EntryCreator,
  report: DispositionReporter | undefined,
  dlqConfigured: boolean,
) {
  for (const message of batch.messages) {
    const item = message.body
    if (!dlqConfigured || !queueItem(item)) {
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
        code: result.code,
        correlationId: item.correlationId,
        operationCorrelationId: result.correlationId,
      }))
    if (accepted) message.ack()
    else message.retry()
  }
}
