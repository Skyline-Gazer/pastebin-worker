# Phase 4 — Feishu webhook foundation SPEC

Status: SPEC APPROVED on 2026-09-05; persisted before PHASE/TODO.

Parent: [owner-approved Phase 4 PLAN](phase4-plan.md). The owner explicitly approved this SPEC in the current owner conversation (“Phase 4 SPEC” approval / Phase 4 SPEC APPROVED instruction). This artifact authorizes production of the PHASE decomposition and active TODO only. It does **not** authorize implementation, deployment, migration, merge, or reuse of the Phase 3 review override. Proposal wording below is retained as the approved contract, not an outstanding approval request.

## 3.1 Problem statement

The merged Add-on can securely create a permanent Paste and bind it to a trusted stable record, but has no Internet-facing Feishu adapter. A synchronous adapter cannot safely complete Phase 3's upstream workflow within Feishu's callback deadline, and Feishu plus Cloudflare Queue delivery is at least once. The system therefore needs a verified, authorized and durable asynchronous boundary that does not create duplicate Pastes or expose Phase 3 as a public management API.

## 3.2 Goals

1. Accept and validate Feishu developer-server callbacks using the configured encrypted schema 2.0 protocol.
2. Handle URL verification without business side effects.
3. Accept exactly `im.message.receive_v1` human text messages in authorized P2P Bot conversations.
4. Snapshot normalized message text, publish a stable create command to Cloudflare Queue, then acknowledge Feishu.
5. Consume Queue delivery through Phase 3 `EntryService.createEntry`, preserving Phase 3 idempotency and fail-closed reconciliation.
6. Provide testable security, observability and retry contracts without storing a second authoritative body copy.

## 3.3 Non-goals

No group messages, bot/system messages, non-text messages, posts/cards/files, generic event router, edit/update synchronization, public management API, frontend, archive/restore/delete, Batch Mode, countdown, release hardening, production deployment or production migration. No changes to upstream-owned source, Patch 010, patch series, `upstream-sync` or PR #5. No new D1 receipt table or speculative Phase 3 lookup/update API.

## 3.4 Current behavior

At baseline `09148c96cad01af4a5938e5d74f3b3a33823e348`, `downstream/addons/feishu` exports internal `EntryService`, `BindingStore`, `Credentials` and `PasteClient` classes but no fetch or Queue handler. `createEntry` reserves a unique `(scopeId, recordKey)` binding and `(scopeId, requestId)` operation before dispatch, records a keyed input fingerprint, creates a permanent Paste, and replays known success. A dispatched or otherwise ambiguous operation returns `RECONCILIATION_REQUIRED` and blocks blind mutation retry. D1 stores no full Paste body.

## 3.5 Desired behavior

### Supported callback

Production business callbacks MUST be encrypted and signed using the configured Feishu Encrypt Key. The clear schema after decryption MUST satisfy:

- `schema === "2.0"`;
- `header.event_type === "im.message.receive_v1"`;
- `header.app_id` exactly equals configured `FEISHU_APP_ID`;
- `header.tenant_key` is an exact member of configured allowed tenants;
- `header.event_id` is a non-empty bounded string used only for correlation;
- `event.sender.sender_type === "user"`;
- `event.message.chat_type === "p2p"`;
- `event.message.message_type === "text"`;
- `event.message.message_id` and `event.message.chat_id` are non-empty bounded strings;
- `event.message.content` is a JSON string whose parsed value is exactly an object containing a string `text` member. Unknown members are ignored; alternate rich structures are not converted.

The exact Feishu field names above come from the official `im.message.receive_v1` schema. Unsupported event/message/chat/sender variants receive a successful no-op acknowledgement only after authentication and authorization checks; they do not enqueue and do not call Phase 3. Application or tenant mismatch is an authorization failure rather than a supported no-op.

Normalize text by JSON-decoding `message.content` and preserving the `text` string exactly as decoded, including whitespace and line breaks. No trimming, Markdown conversion, mention expansion, Unicode normalization or silent truncation occurs. Empty text is rejected as unsupported business input even though Phase 3 can technically accept an empty body.

### Limits

- Raw HTTP body: at most 256,000 bytes.
- Decoded/decrypted clear callback JSON: at most 256,000 UTF-8 bytes.
- Normalized text: at most 100,000 UTF-8 bytes.
- Serialized Queue work item: MUST be measured before `send()` and be at most 120,000 UTF-8 bytes, leaving headroom below Cloudflare's 128 KB platform limit.
- All Feishu identity fields consumed by the adapter: 1–256 Unicode scalar values, with no control characters.

Any limit violation receives a deterministic rejection and no Queue/D1/Paste mutation. These application limits are contractual and may only change through SPEC change control.

## 3.6 User/API flows

### Route and method

`POST /api/feishu/events` is the only new public route. Other methods return `405` with `Allow: POST`. Unknown routes remain `404`. The route accepts `application/json`; unsupported media types return `415`.

Responses expose no internal binding, Paste credential, upstream error or message content. Error bodies are `{ "code": <sanitized code>, "correlationId": <safe id> }`. Normal business-event success returns HTTP 200 with an empty body. Authenticated unsupported variants also return HTTP 200 empty to prevent useless retries. Queue publication or internal availability failures return HTTP 503 so Feishu may retry. Malformed/oversized input returns 400/413; failed authenticity or authorization returns 401/403.

### URL verification

For `type: "url_verification"`, accept the official clear form `{type, token, challenge}` or encrypted envelope `{encrypt}`. Validate content type and limits; if encrypted, decrypt with the configured Encrypt Key. Compare the clear token with configured Verification Token using a timing-safe comparison and validate a bounded non-empty challenge. Return within the protocol deadline as HTTP 200 JSON `{ "challenge": <exact value> }`.

Challenge handling does not require or mechanically apply ordinary-event signature headers, because Feishu's URL-verification protocol is token/decryption based. It never authorizes a business event, enqueues work, writes D1 or calls Phase 3.

### Ordinary event authentication and authorization

1. Read bounded raw bytes once without parsing or reserialization.
2. Require non-empty timestamp, nonce and signature headers plus configured Encrypt Key and Verification Token.
3. Compute lowercase hex SHA-256 over the UTF-8 bytes of `timestamp + nonce + encryptKey` followed by the exact raw body bytes; compare the decoded equal-length signature in constant time.
4. Parse only the authenticated envelope, require exactly a bounded string `encrypt`, base64-decode it, derive the AES key as SHA-256(Encrypt Key), take the first 16 decoded bytes as IV, and decrypt the remainder with AES-256-CBC/PKCS#7. Reject invalid base64, block length, padding or UTF-8.
5. Parse bounded clear JSON and timing-safely compare its header token to Verification Token.
6. Apply schema, app, tenant, event, actor, chat and message allowlists before normalization or Queue publication.

No independent short timestamp rejection window is specified. Feishu retries can occur hours later, and the verified official material does not establish header timestamp behavior adequate for a safe window. Signature validation plus stable business idempotency is required. A future replay-age policy needs separate evidence and SPEC approval.

### Identity derivation

Define `tuple(values)` as UTF-8 JSON serialization of an array of strings with no optional values. Define `digest(values)` as unpadded base64url SHA-256 of `tuple(values)`. Input strings are used exactly as decoded after validation; they are not case folded or Unicode normalized.

- `scopeId = "feishu:v1:scope:" + digest([configuredAppId, tenantKey, chatId])`
- `recordKey = "feishu:v1:message:" + digest([messageId])`
- `requestId = "feishu:v1:create:" + digest([scopeId, recordKey])`

The event ID is excluded. Future resource types receive distinct namespaces. The resulting values are deterministic, below Phase 3's 256-character identifier limit and do not expose raw tenant/chat/message IDs in D1.

### Queue work item

Queue payload schema version 1 is:

```ts
interface FeishuMessageCreateV1 {
  schema: "feishu.message-create.v1"
  scopeId: string
  recordKey: string
  requestId: string
  sourceMessageId: string
  content: string
  correlationId: string
}
```

`sourceMessageId` is included for safe operator correlation and must equal the identity input from which `recordKey` was derived. It is not a secret. The work item contains no event body, token, key, sender profile, password, management URL or upstream error.

Await `FEISHU_INGRESS_QUEUE.send(item)`. Only resolution is durable acceptance and permits HTTP 200. Rejection/throw returns 503. `ctx.waitUntil()` is not the publication boundary. If publication succeeds and the HTTP response is lost, later callbacks generate an identical business request.

### Queue consumer

Use a push-based Cloudflare Queue consumer with a mandatory configured DLQ. Validate the internal payload and size again before calling Phase 3. Process and explicitly classify each message independently so one message does not force already-classified peers to repeat.

- `{ok:true}` including known-success replay: `ack()`.
- `STORAGE_OR_CREDENTIAL_UNAVAILABLE` with `retryable:true`: `retry()` because Phase 3 either did not reserve or has preserved an operation that makes repeat evaluation fail closed.
- `RECONCILIATION_REQUIRED`, `OPERATOR_RECONCILIATION_REQUIRED`, or `OUTCOME_OBSERVED_OPERATOR_CONFIRMATION_REQUIRED`: emit a sanitized operator-required event containing correlation and Phase 3 operation correlation, then `ack()` only if that durable external operational sink is configured and confirms acceptance. Otherwise `retry()` until the Queue moves it to DLQ. Never call `createEntry` a second time within the same delivery attempt.
- `INVALID_INPUT`, `REQUEST_CONFLICT`, `RESERVATION_CONFLICT`, `MUTATION_CONFLICT`, or any non-retryable result: emit sanitized permanent-failure evidence, then `ack()` only after that evidence is accepted; otherwise retry to DLQ. These outcomes never synthesize another request ID or replacement Paste.
- Invalid Queue schema: no Phase 3 call; report permanent transport poison and route through retry exhaustion to DLQ unless a durable operational sink has accepted the disposition.

An “operator-visible durable sink” is an existing deployment observability destination selected during deployment design; Phase 4 must not claim durable disposition from console logging alone. Configuration without a DLQ fails validation. The DLQ is not automatically consumed in Phase 4 and is handled by an operator runbook; its retention limit must be documented before deployment.

## 3.7 Data/state model

No D1 schema changes are permitted by this SPEC. Existing Phase 3 binding and operation records remain authoritative for business idempotency and uncertainty.

Transport states are conceptual Cloudflare Queue states only:

```text
not_published -> accepted -> delivered -> acked
                              |       |
                              |       `-> retryable -> delivered
                              `-> exhausted -> DLQ
```

They are not duplicated in D1. Queue content is a transient receipt-time snapshot. Once successfully written upstream and Phase 3 reaches `succeeded`, upstream Paste content is the authoritative long-term body. Queue/DLQ retention and deletion must not be represented as deletion of the Paste or binding.

Server bindings/configuration:

- secret `FEISHU_ENCRYPT_KEY`;
- secret `FEISHU_VERIFICATION_TOKEN`;
- non-secret exact `FEISHU_APP_ID`;
- non-secret explicit allowed-tenant set `FEISHU_ALLOWED_TENANT_KEYS` using a deployment-validated unambiguous encoding;
- producer binding `FEISHU_INGRESS_QUEUE`;
- consumer and mandatory DLQ configuration;
- existing Phase 3 D1, upstream origin, encryption and fingerprint bindings.

Missing, empty, duplicate or malformed configuration fails closed during request/consumer handling. No sender allowlist is added in v1: authorized human P2P senders within an allowed tenant are accepted. Adding one later is a policy change requiring review.

## 3.8 Security and trust boundaries

The callback is untrusted until raw-body signature validation or URL-verification token/decryption succeeds. Authentication is followed by independent app/tenant/event/actor/chat/message authorization. Caller JSON cannot select `scopeId`, record key, request ID, destination URL or password.

Secrets remain Worker secrets. Queue messages and D1 never contain Feishu verification/encryption secrets or Paste credentials. Management passwords remain inside Phase 3. Public results are constructed from fixed response schemas. Logs/metrics must not include raw/decrypted bodies, normalized content, token, key, message ID, chat ID, tenant key, password, management URL or raw external errors; use generated correlation ID, safe outcome code and hashed identities only.

Cryptographic comparison must reject invalid encoding/length before constant-time equal-length comparison. Decryption failure is indistinguishable externally from other authentication failure. No side effects occur before all verification and authorization gates pass. Configuration and Queue bindings fail closed.

## 3.9 Compatibility

All new runtime, tests and configuration remain under `downstream/addons/feishu` or downstream-only CI/docs paths. Existing Phase 3 public/internal result shapes, D1 tables, encryption, mutation claims and reconciliation semantics do not change. Existing upstream and patch-series behavior is untouched.

Cloudflare Workers runtime must support Web Crypto AES-CBC/SHA-256 and Queue producer/consumer bindings. Queue message size is kept below the documented 128 KB limit. Deployment resources and production secrets/queues are not created by implementation or CI unless separately authorized.

## 3.10 Failure behavior

- Invalid challenge: safe 4xx, no Queue/D1/Paste effect.
- Invalid signature, token, app or tenant: safe 401/403, no business effect.
- Authenticated unsupported event, sender, chat or content type: HTTP 200 no-op, no enqueue.
- Malformed or oversized input: deterministic 4xx, no enqueue; never truncate.
- Worker failure before successful Queue send: no HTTP success; Feishu retries.
- Queue send succeeds but Worker/response fails: duplicate callback is safe because identities and content are stable.
- Consumer crashes before Phase 3 reservation: Queue redelivers safely.
- Phase 3 reservation/storage transient failure: stable request may be retried.
- Consumer crashes after Phase 3 success but before ack: known-success replay returns the recorded result and is acknowledged.
- Concurrent Queue deliveries: existing unique constraints allow at most one create dispatch; both use the same fingerprint.
- Same stable request with different content: Phase 3 returns `REQUEST_CONFLICT`; never overwrite, generate another ID or create a replacement.
- Ambiguous post-dispatch result: preserve the Phase 3 claim/evidence; no business retry. Route for operator attention or DLQ as specified.
- Retry exhaustion: mandatory DLQ retains the work for operator handling; no automatic replay tool or DLQ consumer is part of Phase 4.

## 3.11 Acceptance criteria

1. A valid encrypted, signed, authorized human P2P text event is normalized and accepted into Queue before HTTP success.
2. The same `message_id`, regardless of event ID, callback attempt, Queue ID, concurrency or restart, produces identical `scopeId`, `recordKey`, `requestId` and content fingerprint, and at most one Paste.
3. URL verification returns the exact challenge within its protocol flow and causes zero business side effects.
4. Invalid authenticity/authorization, malformed or oversized input, and unsupported variants never invoke Phase 3; unsupported authenticated variants are acknowledged as no-op.
5. Queue send failure never returns business success; response loss after successful send remains safe.
6. Consumer confirmed/known success, retryable pre-ambiguity failure, permanent rejection and reconciliation-required outcomes follow the classification in §3.6.
7. No Queue retry, callback retry or operator disposition invents a new business identity or blindly POSTs a replacement Paste.
8. Queue/DLQ payload, D1, responses and captured logs contain none of the prohibited secrets, raw event body or unrelated profile data; D1 contains no message content.
9. No new D1 table or Phase 3 interface change is introduced; Patch 010, series, upstream-sync and PR #5 remain untouched.
10. Current implementation HEAD passes authoritative GitHub CI and a fresh independent AI Review Gate; the Phase 3 override is not reused.

## 3.12 Test specification

- Protocol unit tests: clear/encrypted challenge, exact raw-body signature vectors, tampering, invalid token, base64/AES/padding/UTF-8 failures, missing secrets and timing-safe comparison guards.
- Normalization/authorization unit tests: exact schema fields, app/tenant mismatch, bot/system sender, group chat, all non-text types, malformed content JSON, empty/oversized text and deterministic identity vectors.
- Fetch-handler tests: method/media/body limits, zero mutation before all gates, authenticated no-op cases, Queue send awaited before 200, Queue rejection/throw returns 503, and sanitized responses/logs.
- Queue-consumer tests: confirmed success, known-success replay, stable duplicate/concurrent messages, safe transient retry, reconciliation and permanent disposition, invalid internal payload, per-message ack/retry isolation and DLQ configuration validation.
- Integration tests with real Phase 3 store mocks/contracts: duplicate callback plus duplicate Queue delivery creates one binding/Paste; content is absent from D1; crash points before publication, before reservation and after Phase 3 success remain recoverable without a second POST.
- Regression checks: existing Phase 3 credentials, Paste client and service suites; no tracked diff in Patch 010, series or upstream paths.

Behavior implementation must record genuine RED, GREEN, REFACTOR and REGRESSION evidence under `docs/TESTING.md`. Run applicable formatting, lint, TypeScript, Vitest and build checks under Node 22 / pnpm 10. GitHub Actions is authoritative, and the reviewed HEAD must match the green CI HEAD.

## 3.13 Open questions

No unresolved product decision remains for SPEC review. Implementation-phase decomposition must select the exact durable operational disposition integration and concrete Queue/DLQ deployment names without changing the behavior above. If no governance-approved durable sink exists, ambiguous/permanent messages must rely on the mandatory DLQ path and documentation must not call a transient log a durable record.

If official schema verification, Worker runtime tests or Queue integration demonstrate that any field, security rule, size limit, durability claim or failure classification is invalid, STOP and revise this SPEC for owner approval. Do not silently alter Phase 3 or add D1 receipt state.

Status: SPEC APPROVED

Implementation has NOT started. PHASE/TODO must be owner-approved before coding.
