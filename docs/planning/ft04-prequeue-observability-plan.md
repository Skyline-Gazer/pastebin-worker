# PLAN — FT-04 pre-queue webhook disposition observability

Status: **PLAN ONLY**. No SPEC. No application code. No production mutation.

Tracking: [#151](https://github.com/Skyline-Gazer/pastebin-worker/issues/151) (defect). Parent Function Test: [#149](https://github.com/Skyline-Gazer/pastebin-worker/issues/149).

This PLAN does **not** authorize another P2P, FT-04 retry, FT-05, selector broadening, deploy, D1/queue/console mutation, or synthetic webhooks.

## Incident facts

```text
FT-04: FAIL
timestamp: 2026-09-15T04:04:59.515Z
worker: pastebin-feishu-prod
version: 036de73a-6c6a-4c73-a702-8b6f0ee44e12
POST https://pb.test.223.im/api/feishu/events HTTP 200
cf-ray: a3b4c01fef4a4c4d
x-request-id: a06b59a4-ed8c-4c46-b54a-480adb285657
NEW_PASTE_COUNT=0
SECOND_P2P_SENT=NO
```

Accepted forensics (#151):

```text
BOUNDARY_REFINED=PRE_QUEUE_EVENT_CLASSIFICATION
PRINCIPAL_SCOPE_TOUCHED_AFTER_EVENT=NO
QUEUE_SEND_REACHED=NO
```

D1 `feishu_principal_scope_map` Feishu row `updated_at` newest `2026-09-12T13:36:22.713Z`. Zero map writes at or after the event. Live queue bindings on `036de73a` were intact (`FEISHU_INGRESS_QUEUE` → `pastebin-feishu-ingress-prod`, consumer `pastebin-feishu-prod`, DLQ configured `true`). Ingress/DLQ `backlog_count=0`.

## Proven vs unproven

Proven:

- HTTP 200 on `/api/feishu/events` for the known request.
- Supported path (`normalize` non-null → `upsertPrincipalScope` → `FEISHU_INGRESS_QUEUE.send`) was **not** entered.
- Queue send exception did **not** occur (that path is HTTP 503).
- Consumer routing is **not** implicated by this incident.

Unproven:

- Decrypted `schema` / `event_type` / `sender_type` / `chat_type` / `message_type`.
- Exact rejected selector enum.
- Whether the POST was `url_verification` challenge vs authenticated unsupported no-op (both are HTTP 200; challenge returns JSON `{challenge}`; no-op and queued success both return **empty** 200).
- Current Feishu console `im.message.receive_v1` subscription.

## Console evidence result

```text
FEISHU_CONSOLE_EVIDENCE=OWNER_REQUIRED
IM_MESSAGE_RECEIVE_V1_SUBSCRIBED=UNPROVEN
ORIGINAL_EVENT_CLASS=UNPROVEN
EXACT_REJECTED_SELECTOR=UNPROVEN
```

This agent opened `https://open.feishu.cn/app` read-only. It redirected to Feishu login (`accounts.feishu.cn`, `redirect_uri=https://open.feishu.cn/app`). No Open Platform session. No login was completed. No console fields were changed.

Existing browser tab is Add-on OAuth login to `pb.test.223.im`, **not** Open Platform. It was not used.

## Code boundary (deployed-equivalent `webhook.ts`)

HTTP **200** branches today:

| Branch                    | Condition                                                                 | Response               | Queue | Principal scope         |
| ------------------------- | ------------------------------------------------------------------------- | ---------------------- | ----- | ----------------------- |
| Clear challenge           | envelope `type === url_verification` (before signature)                   | JSON `{challenge}` 200 | no    | no                      |
| Encrypted challenge       | decrypt succeeds and clear `type === url_verification` (before signature) | JSON `{challenge}` 200 | no    | no                      |
| Authenticated unsupported | signature OK, decrypt OK, `normalizeAuthorizedEvent` returns `null`       | empty 200              | no    | no                      |
| Successfully queued       | `normalize` non-null, optional upsert, `send` resolves                    | empty 200              | yes   | yes if recorder present |

`normalizeAuthorizedEvent` returns `null` **only** when schema/header/event/message are present and authorized, but any of:

```text
header.event_type !== "im.message.receive_v1"
sender.sender_type !== "user"
message.chat_type !== "p2p"
message.message_type !== "text"
```

Other failures throw (`MALFORMED` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `UNSUPPORTED` 400, `UNAVAILABLE` 503). Queue `send` throw → `UNAVAILABLE` 503.

Supported path:

```text
normalizeAuthorizedEvent non-null
→ upsertPrincipalScope
→ FEISHU_INGRESS_QUEUE.send
→ HTTP 200
```

Null path:

```text
normalizeAuthorizedEvent null
→ HTTP 200
→ no upsert
→ no Queue send
```

`normalizeAuthorizedEvent` currently **discards** which selector failed. Public export must stay `AuthorizedInboundEvent | null` unless SPEC later proves a compatible widening. PLAN: add an **internal** classifier returning a fixed enum, used by the handler for logs only.

## Root-cause confidence

```text
ROOT_CAUSE=FT04_ROOT_CAUSE_PRE_QUEUE_CLASSIFICATION
confidence=HIGH (pre-queue; not consumer routing)
selector_identity=UNPROVEN
```

Do **not** treat this as queue publication or consumer failure. Do **not** broaden selectors to make a retry pass.

## Observability defect

`MISSING_WEBHOOK_DISPOSITION_OBSERVABILITY`

HTTP 200 cannot distinguish challenge vs unsupported no-op vs queued success. Worker `logs[]` for the incident were empty. Encrypted body must remain unlogged.

## Security / privacy

Logs MUST NOT contain: content/body, token, encrypt payload, app secret, encrypt key, verification token, open_id, tenant_key, chat_id, message_id, full principal key, cookies, OAuth/session values, or raw selector strings outside a fixed allowlist enum.

Allowed log fields:

- `WEBHOOK_DISPOSITION=<fixed enum>`
- `provider=feishu|lark`
- `correlationId`
- unsupported reason enum only when disposition is `unsupported_event`

## Scope

```text
WEBHOOK_DISPOSITION_OBSERVABILITY=IN_SCOPE
CONSUMER_OBSERVABILITY=DEFERRED
BUSINESS_BEHAVIOR_CHANGES=NO
```

**Consumer deferred:** the proven hole is webhook pre-queue ambiguity. Queue-consumer dispositions (`batch_begin`, `create_*`, `ack`/`retry`/`dlq`) would widen the patch without explaining this 200. Revisit after webhook instrumentation is live.

Do not change accepted event classes, HTTP statuses, challenge/signature/decrypt, queue payload schema, provider routing, D1 writes, retry, or consumer behavior. Identical inputs → identical business outcomes.

Do not automatically accept group, bot-sender, file/image, or unrelated event types.

## Minimal implementation design (later, after SPEC)

Generic symbols (not Feishu-named unless Feishu-specific):

```text
WEBHOOK_DISPOSITION=challenge
WEBHOOK_DISPOSITION=unsupported_event
WEBHOOK_DISPOSITION=queue_publish_begin
WEBHOOK_DISPOSITION=queue_publish_success
WEBHOOK_DISPOSITION=queue_publish_failed
```

Unsupported reason enum only:

```text
UNSUPPORTED_EVENT_TYPE
UNSUPPORTED_SENDER_TYPE
UNSUPPORTED_CHAT_TYPE
UNSUPPORTED_MESSAGE_TYPE
```

Internal helper (names illustrative): `classifyAuthorizedEvent` → supported event **or** one reason enum **or** throw existing `WebhookError`. Handler logs then keeps current HTTP/queue/D1 behavior.

First matching selector wins (event_type, then sender_type, then chat_type, then message_type).

`console.log` secret-free lines, e.g. `WEBHOOK_DISPOSITION=unsupported_event provider=feishu reason=UNSUPPORTED_CHAT_TYPE correlationId=<uuid>`.

Keep `normalizeAuthorizedEvent` export compatible (thin wrapper over classifier). Same framework for `/api/lark/events`.

Deployment: `pastebin-feishu-prod` versioned candidate only. Not `pastebin-prod`. No overlay/secret/queue-binding change.

Rollback: previous Worker version. Additive logs only.

## RED test contract (required before implementation)

Tests first. At minimum:

1. Supported Feishu P2P text → queue send once; dispositions `queue_publish_begin` then `queue_publish_success`.
2. Unsupported `event_type` → HTTP 200, send zero, `unsupported_event` / `UNSUPPORTED_EVENT_TYPE`.
3. `sender_type` mismatch → HTTP 200, no queue, `UNSUPPORTED_SENDER_TYPE`.
4. Group chat → HTTP 200, no queue, `UNSUPPORTED_CHAT_TYPE`.
5. Non-text message → HTTP 200, no queue, `UNSUPPORTED_MESSAGE_TYPE`.
6. Clear challenge → challenge JSON, `WEBHOOK_DISPOSITION=challenge`, no queue.
7. Encrypted challenge → same.
8. Queue send rejection → HTTP 503 `UNAVAILABLE`, `queue_publish_failed`, no secret/error-detail leakage.
9. Log safety: captured logs MUST NOT contain fixture token, encrypt key, verification token, tenant, open_id, chat_id, message_id, or body text.

Existing HTTP/auth/queue tests remain PASS with unchanged business assertions.

## Future deploy / FT-04 retry contract

```text
PLAN approval
→ SPEC
→ RED tests
→ minimal instrumentation implementation
→ CI/review
→ merge
→ versioned production candidate
→ validate no behavior/config drift
→ promote observability patch
→ ARM a NEW FT-04 retry
→ fresh explicit owner authorization
→ exactly one new owner P2P
```

Do **not** reuse `FT_CREATE_20260912_01` unless the owner explicitly decides. That send remains historical evidence. **No P2P is authorized by this PLAN.**

## PASS criteria (this PLAN turn)

- Console attempt recorded; login wall → `OWNER_REQUIRED`.
- Code 200-path table matches source.
- Observability-only scope; consumer deferred; no selector widening.
- RED tests listed.
- Retry sequence preserved.
- #151 / #149 remain OPEN.

## This turn

```text
PRODUCTION_MUTATION=NO
SECOND_P2P_SENT=NO
FT04_RETRY_AUTHORIZED=NO
```
