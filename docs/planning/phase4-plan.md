# Phase 4 — Feishu webhook foundation PLAN

Status: OWNER APPROVED on 2026-09-05; persisted before SPEC.

## Authorization and baseline

The owner approved the Phase 4 PLAN with explicit amendments in the “PHASE 4 PLAN APPROVED WITH OWNER DECISIONS — PROCEED TO SPEC” instruction. This artifact incorporates those decisions. It authorizes production of a SPEC, but not implementation, TODOs, deployment, migration or merge.

- Canonical downstream baseline: `09148c96cad01af4a5938e5d74f3b3a33823e348`.
- Phase 3 PR #9 is merged and its internal binding service is reachable from that baseline.
- Patch source PR #5 remains review-only, OPEN / UNMERGED.
- Phase 4 belongs entirely to `downstream/addons/feishu` and must consume the Phase 3 service rather than create a parallel binding or mutation system.

## Objective and locked scope

Add a narrow webhook adapter for Feishu event schema 2.0 event `im.message.receive_v1`. It accepts only human-authored text messages in a private/P2P conversation with the configured Bot, snapshots the normalized text at receipt, durably publishes one create operation to Cloudflare Queues, and has a Queue consumer invoke Phase 3 `EntryService.createEntry` exactly once at the business-identity level.

No group messages, bot/system messages, rich posts, cards, files, arbitrary routing or message-edit synchronization are in Phase 4. No frontend lifecycle, archive, restore, delete, batch, countdown, release hardening or production operation is included.

## Verified protocol facts

- Developer-server subscriptions arrive as public HTTPS POST callbacks. URL verification carries a `challenge` and requires the challenge response within one second; when encryption is configured, the callback must first be decrypted.
- Ordinary callbacks must complete within three seconds. Failed delivery is retried, and duplicate delivery can occur even after a successful response.
- With Encrypt Key configured, ordinary-event authenticity uses `SHA256(timestamp + nonce + encrypt_key + raw_body)` and the `X-Lark-Request-Timestamp`, `X-Lark-Request-Nonce` and `X-Lark-Signature` headers. The encrypted request body is AES-256-CBC using the SHA-256 digest of Encrypt Key as key and the first 16 decoded bytes as IV.
- `im.message.receive_v1` supplies schema 2.0 header identity plus `sender` and `message` data. Its official contract specifically says message deduplication must use `message_id`, not `event_id`.
- Cloudflare Queues is at-least-once transport. A successful `send()` resolves after the message is written durably; a message body is limited to 128 KB. Consumer messages can be individually acknowledged or retried, and a configured dead-letter queue receives exhausted messages.

Official evidence:

- [Feishu event overview](https://open.feishu.cn/document/server-docs/event-subscription-guide/overview)
- [Feishu server callback configuration](https://open.feishu.cn/document/event-subscription-guide/event-subscriptions/event-subscription-configure-/choose-a-subscription-mode/send-notifications-to-developers-server)
- [Feishu callback validation and decryption](https://open.feishu.cn/document/server-docs/event-subscription-guide/event-subscription-configure-/encrypt-key-encryption-configuration-case)
- [Feishu receive-message event](https://open.feishu.cn/document/server-docs/im-v1/message/events/receive)
- [Cloudflare Queue JavaScript API](https://developers.cloudflare.com/queues/configuration/javascript-apis/)
- [Cloudflare Queue limits](https://developers.cloudflare.com/queues/platform/limits/)
- [Cloudflare Queue retry and acknowledgement](https://developers.cloudflare.com/queues/configuration/batching-retries/)

## Approved architecture and identity model

```text
Feishu HTTPS POST
  -> transport/config/size checks
  -> signature or challenge verification and optional decryption
  -> schema/event/app/tenant/actor/chat/message authorization
  -> normalize identities and text snapshot
  -> Cloudflare Queue send
  -> successful Feishu acknowledgement only after Queue acceptance

Queue consumer
  -> validate internal payload schema
  -> derive the same trusted EntryContext and create request
  -> Phase 3 EntryService.createEntry
  -> per-message ack, retry or fail-closed disposition
```

The identities remain mechanically separate:

- `eventId` is non-secret transport/audit correlation only.
- `message_id` is the stable logical record identity for this create-only flow.
- `recordKey` is a deterministic, namespaced representation of that logical identity.
- `requestId` is a deterministic, namespaced create-operation identity; it never uses Queue ID, time or randomness.
- `scopeId` is derived server-side from the verified configured application, allowed tenant and P2P chat.
- `(scopeId, recordKey)` and `(scopeId, requestId)` retain their Phase 3 meanings.

Canonical encodings, input limits and exact payload schema are frozen by the SPEC. A valid signature authenticates transport but does not itself authorize an application, tenant, sender, chat or event.

## Idempotency, retry and recovery

Cloudflare Queue owns pending delivery. Phase 3 continues to own binding uniqueness, mutation idempotency, active claims, successful-result replay and ambiguous outcome evidence. No second D1 receipt state machine is approved.

- Duplicate callback or Queue delivery regenerates identical Phase 3 identities and input.
- Confirmed success and known-success duplicate acknowledge the Queue message.
- A transient failure known to precede any ambiguous upstream dispatch may retry through Queue.
- `RECONCILIATION_REQUIRED` and any post-dispatch ambiguity must never be retried as a new Paste mutation. The normal work item is acknowledged only after Phase 3 evidence exists and an operator-visible safe disposition is emitted; otherwise it proceeds to the configured DLQ without fabricating success.
- Permanent malformed, authorization or business rejections never invoke or retry a mutation.
- Queue retry exhaustion routes to a configured DLQ; absence of a DLQ is not acceptable because Cloudflare otherwise discards exhausted messages.

The Queue contains a transient normalized text snapshot and minimum trusted identity inputs. It does not contain raw webhook bodies, verification/encryption secrets, management credentials/URLs, raw upstream errors or unrelated profile data. D1 continues to contain fingerprints and binding metadata, not the full body. Upstream Paste storage remains the sole authoritative long-term body store.

## Security and trust boundaries

Validate the raw body before business side effects; decrypt only after the protocol-required authenticity check. Handle challenge separately and never enqueue it. Fail closed on missing keys, malformed bodies, unsupported schema/event/content, application mismatch or tenant rejection. Scope is never accepted from callback input.

Apply bounded raw-body, decrypted-body, text and Queue-payload sizes; never truncate. Allow only P2P `text` from a `user`. Logs contain only safe correlation/status fields, never content, raw payloads, tokens, encryption keys, passwords, management URLs or raw upstream errors. Timestamp handling must remain compatible with legitimate Feishu retry intervals; business idempotency is mandatory regardless of any replay-age policy.

## Storage and Phase 3 impact

No D1 migration or Phase 3 interface extension is planned. The adapter calls only `createEntry({scopeId}, {recordKey, requestId, content})`. Create-only behavior does not need lookup by record key or `updateContent`. If implementation analysis proves a new durable state or Phase 3 contract is necessary, work stops for SPEC revision and owner approval.

Expected candidate components are a Worker fetch/Queue adapter, protocol verification and normalization modules, shared internal Queue types, Worker bindings/configuration, tests, and Add-on documentation. Exact file placement remains an implementation concern after TODO approval.

## Validation strategy

Behavior-first tests must cover challenge, signed/encrypted callbacks, negative security cases, strict allowlists, stable derivation, duplicate and concurrent delivery, Queue acceptance/failure ordering, consumer result classification, Phase 3 integration, no duplicate Paste, DLQ/reconciliation behavior and log/secret/content redaction. GitHub Actions is authoritative. Every Phase 4 implementation HEAD needs current CI and an independent current-HEAD AI Review Gate; the Phase 3 override does not carry forward.

## Risks and STOP conditions

The largest risks are an ACK before durable publication, a Queue retry becoming a second business mutation, overbroad tenant/chat authorization, content leakage, and falsely claiming exactly-once behavior. Stop before implementation if the official event fields do not support the approved identity/authorization rules, normalized content cannot fit the agreed limits, Queue plus Phase 3 cannot represent a required durable state, or a new Phase 3 interface/D1 receipt table appears necessary.

Implementation has NOT started.
