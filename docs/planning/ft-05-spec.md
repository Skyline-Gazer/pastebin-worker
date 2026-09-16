# FT-05 SPEC — Idempotency / duplicate delivery protection

Status: **SPEC READY FOR OWNER REVIEW**. Not executed.

Parent PLAN: [ft-05-plan.md](ft-05-plan.md)

```text
APPROVED_PLAN_HEAD=43463c4f26e5f0434131e0dedccaab806272cbcf
```

Tracking: [#157](https://github.com/Skyline-Gazer/pastebin-worker/issues/157)

This SPEC is the executable **read-only** production-test contract for FT-05. It does **not** authorize execution by itself. A later owner execution authorization is required.

This document does **not** send P2P, replay webhooks/queues, write D1, mutate Pastes, deploy Workers, or start FT-06+.

## 1. Objective

Answer, from exact source/schema and **read-only** production evidence:

> Can duplicate delivery of the **same original Feishu message identity** cause a **second Paste** creation?

Answer **without** live replay. Do **not** infer from generic “queue at-least-once” folklore.

Primary classification tokens (exactly one success class, or a FAIL/STOP class):

```text
FT-05: PASS_BY_PRODUCTION_STATE_AND_IDEMPOTENCY_CONTRACT
FT-05: NOT_LIVE_REPLAYED_BY_DESIGN
```

## 2. Canonical scope

Inherited from owner-approved PLAN (HEAD `43463c4f26e5f0434131e0dedccaab806272cbcf`):

| Contract field        | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| PURPOSE               | Idempotency / duplicate delivery protection            |
| OWNER_ACTION          | NONE                                                   |
| PRODUCTION_MUTATION   | NO                                                     |
| LIVE_REPLAY_FORBIDDEN | YES                                                    |
| P2P_SENT              | NO                                                     |
| Feishu / Lark         | Feishu create-path only (same surface as FT-04)        |
| FT-04 Paste mutation  | NO — Paste `7Zf3ZDjmyj2dQMWpSwfc7CK8` is evidence only |
| FT-06+                | NOT STARTED                                            |

Canonical instruction (2026-09-12): do not resend the user message; do not deliberately replay webhook/queue events in production merely to prove idempotency.

## 3. Operational identity model

### 3.1 Three layers (must not be conflated)

| Layer | Field(s)                                                | Role in FT-05                                                                         |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A     | Feishu envelope `header.event_id`                       | Delivery envelope id. Validated as bounded identity. **Not** hashed into create keys. |
| B     | Feishu message `event.message.message_id`               | Business message identity. Hash input for `recordKey`.                                |
| C     | Derived durable ids `scopeId`, `recordKey`, `requestId` | Stored / uniqueness domain. **This** is the operational dedupe identity.              |

```text
DURABLE_IDENTITY=DERIVED_MESSAGE_IDENTITY
RAW_FEISHU_EVENT_ID_STORED=NO
```

Interpretation of the canonical phrase “original Feishu event identity is stored”:

- Durable storage persists **derived** `scope_id` / `record_key` / `request_id` (and operation/binding rows), **not** raw `header.event_id` or raw `message_id`.
- Inability to reconstruct raw `message_id` from its hash is **expected** and is **not** missing idempotency.

### 3.2 Operational dedupe domain

```text
provider
+ application identity (configured appId)
+ tenant_key
+ chat_id
+ message_id
→ stable create identity (scopeId, recordKey, requestId)
```

Queue wire may also carry `sourceMessageId` (= raw `message_id`) and a per-HTTP `correlationId`. **Durable D1 uniqueness does not use `correlationId` or `header.event_id`.**

## 4. Identity derivation

Source: `deriveMessageIdentity` in `downstream/addons/messaging/worker/webhook.ts`.

```text
scopeId   = `${provider}:v1:scope:`   + base64url(SHA-256(JSON.stringify([appId, tenantKey, chatId])))
recordKey = `${provider}:v1:message:` + base64url(SHA-256(JSON.stringify([messageId])))
requestId = `${provider}:v1:create:`  + base64url(SHA-256(JSON.stringify([scopeId, recordKey])))
```

Caller (`normalizeAuthorizedEventResult`):

- `appId` ← configured checked app id
- `tenantKey` ← `header.tenant_key`
- `chatId` ← `message.chat_id`
- `messageId` ← `message.message_id`
- `provider` ← checked provider (`"feishu"` default; `"lark"` when Lark)

### 4.1 `header.event_id` role

- Present on the Feishu envelope; validated as a bounded identity string.
- **Excluded** from `scopeId` / `recordKey` / `requestId` digests.
- A redelivery with a **different** `header.event_id` but the **same** `message_id` (same app/tenant/chat/provider) **must** derive the same `recordKey` / `requestId`.
- Contract test evidence: `downstream/addons/messaging/tests/webhook.spec.ts` — stable identities across `event_id` changes.

### 4.2 `message_id` role

- Sole message-side hash input for `recordKey`.
- Combined with scope via `requestId = hash([scopeId, recordKey])`.
- Same raw `message_id` in a **different** scope (different app/tenant/chat **or** different provider namespace) is **not** the same logical create identity.

### 4.3 Provider isolation

- Feishu prefixes: `feishu:v1:scope:` / `feishu:v1:message:` / `feishu:v1:create:`.
- Lark prefixes: `lark:v1:…` for the same underlying raw ids → **different** durable keys.
- Queue poison check rejects Lark items whose `scopeId` does not start with `lark:v1:` (and the inverse).

```text
IDENTITY_DERIVATION_DETERMINISTIC=YES   (source + unit vectors; live confirm during execution)
```

## 5. Queue preservation

### 5.1 Webhook → `InboundMessageV1`

Enqueue construction in `webhook.ts` (after strip of `principalKey`):

| Field             | Source                                               | Deterministic?                     |
| ----------------- | ---------------------------------------------------- | ---------------------------------- |
| `schema`          | `"feishu.message-create.v1"`                         | constant                           |
| `provider`        | optional; `"lark"` when Lark; Feishu typically omits | from auth path                     |
| `scopeId`         | `deriveMessageIdentity`                              | YES                                |
| `recordKey`       | `deriveMessageIdentity`                              | YES                                |
| `requestId`       | `deriveMessageIdentity`                              | YES                                |
| `sourceMessageId` | `message.message_id`                                 | YES (wire only; not D1 unique key) |
| `content`         | extracted MarkdownSource snapshot                    | YES for a given normalize run      |
| `correlationId`   | `crypto.randomUUID()` per HTTP ingress               | NO — **not** business idempotency  |

```text
QUEUE_PRESERVES_IDENTITY=YES
RECORDKEY_REQUESTID_REGENERATED_NONDETERMINISTICALLY=NO
```

If execution ever finds a stage that regenerates `recordKey`/`requestId` nondeterministically: **STOP** — SPEC blocker (`FT05_FAIL_IDENTITY_NOT_DURABLE`).

### 5.2 Queue → `createEntry`

Wiring:

- `downstream/addons/messaging/worker/index.ts` — Worker `queue` handler → `consumeInboundMessages(...)`
- `consumeInboundMessages` in `webhook.ts` calls:

```text
service.createEntry(
  { scopeId: item.scopeId },
  { recordKey: item.recordKey, requestId: item.requestId, content: item.content },
)
```

Queue retries/redelivery re-present the **same message body** → **same** `requestId`. Consumer does **not** re-derive or mint a new create identity.

## 6. D1 uniqueness schema

### 6.1 Migration contract (source of truth for intended schema)

From `downstream/addons/messaging/migrations/0001_bindings.sql`, preserved through lifecycle rebuilds (`0003` keeps binding unique; `0003`/`0004`/`0005` keep operation unique + `feishu_one_mutation`):

| Object                | Constraint                                                                                    | Catches                                      |
| --------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `feishu_bindings`     | `UNIQUE (scope_id, record_key)`                                                               | same message identity within scope           |
| `feishu_operations`   | `UNIQUE (scope_id, request_id)`                                                               | same create request identity within scope    |
| `feishu_one_mutation` | unique index on `entry_id` where status ∈ {`reserved`,`dispatched`,`reconciliation_required`} | at most one outstanding mutation claim/entry |

`reserveCreate` (`store.ts`): D1 `batch([INSERT binding, INSERT operation])` — **transactional**; conflict rolls back **both** inserts.

### 6.2 Live schema confirmation (mandatory at execution; read-only)

Execution MUST confirm live D1 matches the contract via read-only introspection (examples; exact CLI may vary):

```sql
-- illustrative; use wrangler d1 execute --remote read-only / equivalent
SELECT sql FROM sqlite_master WHERE type IN ('table','index')
  AND name IN ('feishu_bindings','feishu_operations','feishu_one_mutation');
PRAGMA index_list('feishu_bindings');
PRAGMA index_list('feishu_operations');
PRAGMA index_info(<unique_index_name>);
```

No migration is authorized by this SPEC.

```text
LIVE_SCHEMA_MATCHES_CONTRACT= <YES|NO at execution>
DURABLE_UNIQUE_RECORD_KEY= <YES|NO at execution>
DURABLE_UNIQUE_REQUEST_ID= <YES|NO at execution>
```

If live uniqueness is missing: `FT05_FAIL_UNIQUE_CONSTRAINT_MISSING`.

## 7. EntryService duplicate semantics

Source: `EntryService.createEntry` / private `duplicate` / `mutate` in `downstream/addons/messaging/worker/service.ts`.

### 7.1 Fingerprint

```text
fingerprint = HMAC-SHA-256-hex(
  FEISHU_FINGERPRINT_KEY,
  JSON.stringify(["create", scopeId, recordKey, content])
)
```

Note: **`requestId` does not include content**; fingerprint **does**. Same `(scopeId, requestId)` with different content → conflict, not a second Paste.

### 7.2 Branches

1. Lookup `store.operation(scopeId, requestId)`.
2. If operation exists → `duplicate(op, fingerprint)`:
   - different fingerprint → `REQUEST_CONFLICT` → **no** `PasteClient.create`
   - status ≠ `succeeded` or missing `result` → `RECONCILIATION_REQUIRED` → **no** `PasteClient.create`
   - same fingerprint + `succeeded` + `result` → return stored `PublicEntry` → **no** `PasteClient.create`
3. Else build binding + op → `reserveCreate` → only then `mutate` → `PasteClient.create`.

```text
DUPLICATE_SUCCEEDED_RETURNS_PRIOR_RESULT=YES   (source; tests A)
DUPLICATE_CONFLICT_FAILS_CLOSED=YES            (source; tests B MISSING — see §10)
UNRESOLVED_DUPLICATE_FAILS_CLOSED=YES          (source; tests D)
```

Unresolved outcomes MUST NOT be softened into PASS.

## 8. Race / concurrency semantics

On `reserveCreate` failure (unique violation):

```text
raced = store.operation(scopeId, requestId)
return raced ? duplicate(raced, fingerprint) : RESERVATION_CONFLICT
```

Concurrent duplicate deliveries:

- At most one transactional binding+operation insert succeeds.
- Loser re-reads and either replays succeeded result, returns `REQUEST_CONFLICT`, or fail-closes on unresolved (`RECONCILIATION_REQUIRED` / `RESERVATION_CONFLICT`).
- **No** second blind upstream create from the race handler itself.

```text
RACE_HANDLER_ISSUES_SECOND_PASTE_CREATE=NO   (source)
```

## 9. Upstream-call ordering

Required invariant:

```text
D1 reservation / duplicate detection
  BEFORE
PasteClient.create / PASTEBIN_SERVICE POST /
```

Observed order in `createEntry` → `mutate`:

1. `operation(...)` lookup (duplicate short-circuit)
2. `reserveCreate` (D1)
3. `dispatch` (reserved → dispatched)
4. **then** `this.client.create(...)`
5. `rememberName` / `permanent` / `finish`

```text
RESERVATION_BEFORE_UPSTREAM_CREATE=YES
```

If execution discovers any path where upstream create can occur before durable reservation:

```text
FT05_CONTRACT_BLOCKED_UNSAFE_CALL_ORDER
```

Do **not** classify either success token.

## 10. Existing contract tests

| Case                                                                          | Status      | Evidence                                                                                                                                  |
| ----------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A same ids+content; second returns same entry; create POST once               | **COVERED** | `tests/service.spec.ts` — `creates permanent bindings, encrypts secrets and retries known success without POST`                           |
| B same requestId, different content → `REQUEST_CONFLICT`; POST still once     | **MISSING** | create-path untested; update-path has related conflict only                                                                               |
| C race on `reserveCreate`; no second upstream create                          | **PARTIAL** | `reserves concurrent duplicate creates only once` asserts one POST / one binding; does **not** assert both results equal succeeded replay |
| D unresolved op → no second upstream create                                   | **COVERED** | `never retries an uncertain create even after service restart`; persistence uncertain tests                                               |
| E same Feishu message identity → stable scope/record/request across normalize | **COVERED** | `tests/webhook.spec.ts` stable identities / fixed vectors / concurrent raw retries                                                        |
| F different provider namespace does not collide                               | **COVERED** | `tests/dual-provider-auth.spec.ts` Lark vs Feishu prefixes + queue poison                                                                 |

```text
CONTRACT_TEST_COVERAGE_GAP=YES
```

Gap impact:

- Does **not** by itself prove runtime unsafe (source implements B/C).
- May prevent relying on tests alone for the **strongest** interpretation of conflict/race result equality.
- Strong PASS still requires production-state + source ordering + live schema (§13). A later **test-only** hardening PR may close B and strengthen C; **not** authorized in this SPEC turn.

## 11. FT-04 production evidence mapping

Retained immutable Paste (do not mutate/delete):

```text
7Zf3ZDjmyj2dQMWpSwfc7CK8
https://pb.223.im/7Zf3ZDjmyj2dQMWpSwfc7CK8
```

Expected durable mapping (read-only):

```text
feishu_bindings.paste_name = '7Zf3ZDjmyj2dQMWpSwfc7CK8'
  → binding.id (= entry_id)
  → scope_id, record_key

feishu_operations
  → kind = 'create'
  → status = 'succeeded'
  → entry_id = binding.id
  → scope_id, request_id, result present
```

Do **not** print full `scope_id` / `record_key` / `request_id` / credential / result JSON in public comments unless redacted (prefix/hash/length only).

## 12. Read-only production queries

Execution authorization (when later granted) permits **only**:

- source inspection (already done for this SPEC)
- read-only Worker/version/config inspection
- read-only D1 `SELECT` / schema introspection
- public GET of retained Paste if needed
- read-only issue evidence

Illustrative queries (sanitize outputs):

```sql
-- binding by retained paste name
SELECT id, scope_id, record_key, paste_name, visibility, retention_mode, version
FROM feishu_bindings
WHERE paste_name = '7Zf3ZDjmyj2dQMWpSwfc7CK8';

-- create ops for that entry
SELECT id, scope_id, request_id, entry_id, kind, status,
       length(result) AS result_len, created_at, updated_at
FROM feishu_operations
WHERE entry_id = :<binding_id> AND kind = 'create';

-- uniqueness probes (counts only)
SELECT COUNT(*) AS bindings_for_record
FROM feishu_bindings
WHERE scope_id = :<scope_id> AND record_key = :<record_key>;

SELECT COUNT(*) AS create_ops_for_request
FROM feishu_operations
WHERE scope_id = :<scope_id> AND request_id = :<request_id> AND kind = 'create';

SELECT COUNT(*) AS succeeded_creates_for_request
FROM feishu_operations
WHERE scope_id = :<scope_id> AND request_id = :<request_id>
  AND kind = 'create' AND status = 'succeeded';

SELECT COUNT(*) AS reconciliation_for_request
FROM feishu_operations
WHERE scope_id = :<scope_id> AND request_id = :<request_id>
  AND status = 'reconciliation_required';
```

Forbidden during FT-05 (absolute):

- Feishu/Lark P2P send or resend
- synthetic webhook / webhook replay
- Queue replay/injection; DLQ retry/purge
- D1 write; Paste mutation/delete
- Worker deploy / traffic change

## 13. Strong PASS criteria

Classify:

```text
FT-05: PASS_BY_PRODUCTION_STATE_AND_IDEMPOTENCY_CONTRACT
```

**only if ALL** are established at execution:

```text
IDENTITY_DERIVATION_DETERMINISTIC=YES
QUEUE_PRESERVES_IDENTITY=YES
DURABLE_UNIQUE_RECORD_KEY=YES
DURABLE_UNIQUE_REQUEST_ID=YES
RESERVATION_BEFORE_UPSTREAM_CREATE=YES
DUPLICATE_SUCCEEDED_RETURNS_PRIOR_RESULT=YES
DUPLICATE_CONFLICT_FAILS_CLOSED=YES
UNRESOLVED_DUPLICATE_FAILS_CLOSED=YES
FT04_SINGLE_CREATE_STATE=YES
LIVE_SCHEMA_MATCHES_CONTRACT=YES
DUPLICATE_PASTE_EVIDENCE=NONE
```

`FT04_SINGLE_CREATE_STATE=YES` means read-only proof of:

- exactly one binding for Paste `7Zf3ZDjmyj2dQMWpSwfc7CK8`
- exactly one `succeeded` create operation attributable to that binding/request identity
- exactly one `paste_name` on that binding
- no duplicate binding for the same `(scope_id, record_key)`
- no second `succeeded` create for the same `(scope_id, request_id)`
- no `reconciliation_required` operation for that request identity

Source already supports the duplicate-semantics flags; execution still must confirm live schema + FT-04 state.

## 14. NOT_LIVE_REPLAYED_BY_DESIGN criteria

Classify:

```text
FT-05: NOT_LIVE_REPLAYED_BY_DESIGN
```

when:

- runtime/source contracts look correct **and**
- FT-04 production state shows no duplicate Paste / no duplicate succeeded create **but**
- proving suppression of a **new** duplicate delivery would still require deliberately replaying a production webhook/queue event

and live replay remains forbidden.

This is a **terminal** success-class alternative under the canonical instruction. It is **not** a soft FAIL.

Do **not** use this token to paper over an observed duplicate or missing uniqueness.

## 15. FAIL / STOP classes

| Token                                     | When                                                          |
| ----------------------------------------- | ------------------------------------------------------------- |
| `FT05_FAIL_DUPLICATE_EXISTING`            | Second binding and/or second succeeded create already present |
| `FT05_FAIL_IDENTITY_NOT_DURABLE`          | Business ids regenerated nondeterministically across stages   |
| `FT05_FAIL_UNIQUE_CONSTRAINT_MISSING`     | Live D1 lacks binding and/or operation uniqueness             |
| `FT05_FAIL_UPSTREAM_BEFORE_RESERVATION`   | Path allows Paste create before durable reservation           |
| `FT05_CONTRACT_BLOCKED_UNSAFE_CALL_ORDER` | Same as unsafe ordering; blocks both success classifications  |
| `FT05_FAIL_AMBIGUOUS_PRODUCTION_STATE`    | Cannot attribute binding/operation uniquely to FT-04 Paste    |
| `FT05_STOP_LIVE_REPLAY_ATTEMPTED`         | Any attempt to resend/replay/inject in production             |

Any FAIL/STOP → do **not** emit either success classification.

## 16. Security / redaction boundary

Never print in issue/PR/public logs:

- management passwords / sealed credentials
- full OAuth/session/CSRF secrets
- full `result` JSON if it embeds sensitive fields
- full durable ids when a prefix + length + count suffices

Prefer:

```text
scope_id_prefix=feishu:v1:scope:<8+chars>…
record_key_prefix=feishu:v1:message:<8+chars>…
request_id_prefix=feishu:v1:create:<8+chars>…
counts only
```

Public Paste GET of `7Zf3ZDjmyj2dQMWpSwfc7CK8` is allowed (body is non-secret test content).

## 17. Production mutation boundary

```text
PRODUCTION_MUTATION=NO
P2P_SENT=NO
LIVE_REPLAY=NO
FT05_STARTED=NO   until owner execution authorization
```

Explicitly forbidden (repeat): resend FT-04 message; any new Feishu/Lark P2P; webhook/queue/DLQ mutation; D1 write; Paste archive/restore/delete; Worker candidate/deploy/traffic change.

## 18. FT-06 handoff

- FT-05 does **not** archive, restore, or delete Paste `7Zf3ZDjmyj2dQMWpSwfc7CK8`.
- First lifecycle mutation of that entry is owned by **FT-06** (single permanent archive) under a separate PLAN/SPEC/authorization.
- Closing FT-05 (either success classification) does **not** auto-start FT-06.

```text
FT06_STARTED=NO
```
