# FT-06 SPEC — Single permanent archive

Status: **SPEC READY FOR OWNER REVIEW**. Not executed.

Parent PLAN: [ft-06-plan.md](ft-06-plan.md)

```text
APPROVED_PLAN_HEAD=82840e4769213055a37e6b4331ecb07762d6bd7b
```

Tracking: [#160](https://github.com/Skyline-Gazer/pastebin-worker/issues/160)

This SPEC defines two separate future production stages:

```text
FT06_SETUP
FT06_EXECUTION
```

They MUST NOT be collapsed into one authorization. This document does **not** authorize P2P, lifecycle clicks, API mutation, D1 writes, Paste mutation, deploy, or FT-07.

## 1. Objective

Define the executable contract for:

1. `FT06_SETUP`: create exactly one dedicated lifecycle fixture Paste whose stored MarkdownSource contains exactly one top-level unchecked GFM task.
2. `FT06_EXECUTION`: archive that fixture once through the frontend single-item permanent-archive surface.

Both stages remain separately authorized.

## 2. Historical fixture mismatch

Historical canonical wording said:

```text
Using the entry created by FT-04
```

The retained FT-04 Paste is immutable historical evidence:

```text
7Zf3ZDjmyj2dQMWpSwfc7CK8
```

Its body is:

```text
FT_CREATE_20260915_02\n
```

That body has zero top-level unchecked GFM tasks, so it cannot satisfy `completeManagedTask()`.

```text
FT06_HISTORICAL_FIXTURE_DESIGN_MISMATCH=CONFIRMED
FT04_PASTE_PRESERVED=YES
```

This is **not** a runtime archive defect, parser defect, or `#153` shorthand defect.

## 3. Owner fixture correction

Approved correction scope:

```text
OWNER_CORRECTION_SCOPE=FIXTURE_ONLY
LIFECYCLE_FIXTURE_TOKEN=FT_LIFECYCLE_20260916_01
TARGET_MARKDOWN_SOURCE=- [ ] FT_LIFECYCLE_20260916_01
TARGET_PASTE=PENDING_FIXTURE_CREATE
```

Corrected executable interpretation:

```text
using the dedicated lifecycle fixture created by FT06_SETUP because the
retained FT-04 exact-body fixture does not satisfy the managed-task lifecycle
precondition
```

This correction does **not** change:

- `completeManagedTask()`
- `completeEntry()`
- frontend lifecycle semantics
- D1 schema
- Markdown rendering semantics
- same-Paste permanent-archive behavior

## 4. FT06_SETUP scope

Purpose: create exactly one normal Feishu-managed Paste whose canonical MarkdownSource contains exactly one top-level unchecked GFM task.

This stage is **not**:

- a replay of FT-04
- another FT-04 attempt
- FT-06 archive itself
- FT-07
- a synthetic webhook

## 5. Setup preconditions

Before setup authorization, require read-only proof of:

- messaging Worker exact live version = `4c18eccc-0d80-472f-8d33-349047442fde` @100%
- generic Worker exact live version = `1d84dbbd-fa52-4b5a-a158-d1dab939d32b` @100%
- no split traffic
- lifecycle token collision count = `0`
- no existing Paste/binding attributable to `FT_LIFECYCLE_20260916_01`
- ingress backlog healthy
- DLQ backlog healthy
- reconciliation baseline recorded
- create / create-succeeded baseline recorded
- Feishu webhook + OAuth readiness intact

Do not assume old FT-04 baselines remain current.

## 6. Setup owner action

Later authorization may permit exactly **ONE** owner-originated Feishu native Code Block P2P whose inner source is exactly:

```text
- [ ] FT_LIFECYCLE_20260916_01
```

Rules:

- no manual Markdown fences
- no title
- no second block
- no outside text
- provider terminal LF may be preserved if Feishu supplies it
- no normalization solely for the test

Forbidden:

- second P2P
- Lark P2P
- synthetic webhook
- queue injection
- replay
- direct D1 write
- direct Paste create

## 7. Setup system path

Expected path:

```text
Feishu event
→ webhook
→ queue
→ EntryService.createEntry
→ Service Binding
→ pastebin-prod create
→ D1 binding/create op
→ frontend Active listing
```

Identity model for setup create remains the approved FT-05 contract:

- `header.event_id`: validated envelope field, not durable create key
- `message.message_id`: sole message-side input to `recordKey`
- `scopeId = provider:v1:scope:hash([appId, tenantKey, chatId])`
- `recordKey = provider:v1:message:hash([messageId])`
- `requestId = provider:v1:create:hash([scopeId, recordKey])`

## 8. Setup PASS criteria

`FT06_SETUP` PASS requires all of:

- exactly one owner-originated Feishu event
- webhook accepted
- queue publication succeeds
- queue consumer reached
- Service Binding create reached
- generic Paste POST succeeds
- exactly one new create operation
- exactly one new binding
- exactly one new Paste
- reconciliation delta = `0`
- DLQ delta = `0`
- public GET `200`
- body equals provider MarkdownSource byte-for-byte
- body contains exactly one valid top-level unchecked GFM task
- frontend Active list contains target fixture
- frontend renders exactly one interactive unchecked task
- lifecycle state = `active` / `permanent`
- `expires_at = NULL`

On PASS, record:

```text
TARGET_PASTE=<new paste name>
TARGET_ENTRY_ID=<internal/sanitized reference>
```

Stop after setup PASS. Do **not** archive automatically.

## 9. Setup FAIL/STOP classes

Use exact terminal classes:

- `FT06_SETUP_FAIL_WEBHOOK`
- `FT06_SETUP_FAIL_EVENT_CLASSIFICATION`
- `FT06_SETUP_FAIL_QUEUE_PUBLICATION`
- `FT06_SETUP_FAIL_QUEUE_CONSUMER`
- `FT06_SETUP_FAIL_CREATE_PIPELINE`
- `FT06_SETUP_FAIL_SERVICE_BINDING`
- `FT06_SETUP_FAIL_D1`
- `FT06_SETUP_FAIL_BODY_EXACTNESS`
- `FT06_SETUP_FAIL_TASK_PREREQUISITE`
- `FT06_SETUP_FAIL_DUPLICATE_CREATE`
- `FT06_SETUP_FAIL_DLQ`
- `FT06_SETUP_FAIL_FRONTEND_LISTING`
- `FT06_SETUP_FAIL_UNRESOLVED`

On any fail:

```text
STOP
NO_SECOND_SEND
NO_REPAIR
NO_ARCHIVE
```

## 10. FT06_EXECUTION scope

Purpose: archive the dedicated lifecycle fixture exactly once through the frontend single-item permanent-archive surface.

This stage begins only after `FT06_SETUP` PASS and a separate owner authorization.

## 11. Execution preconditions

After `FT06_SETUP` PASS and before archive authorization, require read-only proof of:

- `TARGET_PASTE` known
- exactly one binding
- `visibility=active`
- `retention_mode=permanent`
- `expires_at=NULL`
- public GET `200`
- exact MarkdownSource contains one unchecked top-level task
- frontend renders one interactive unchecked task
- authenticated Feishu frontend session valid
- no pending operation
- no `reconciliation_required` operation
- no existing succeeded `complete_permanent` for target
- completion-op baseline recorded
- Paste-count baseline recorded
- DLQ baseline recorded

If any precondition fails, do not authorize archive.

## 12. Frontend user action

Primary allowed path:

```text
Rendered Markdown task checkbox
→ lifecycle chooser
→ 永久归档
→ confirm once
```

Equivalent single-item `LifecycleMenu` permanent-archive path may be used only because current source routes it through the same backend completion path.

Not allowed as primary FT-06 surface:

- direct HTTP invocation
- batch mode

## 13. Request/idempotency contract

Frontend caller:

- `requestIdentity()` in `frontend/App.tsx` generates a client `Idempotency-Key` with `crypto.randomUUID()` fallback
- `completeEntry(id, action, idempotencyKey)` sends:
  - `POST /api/entries/:id/complete`
  - `Content-Type: application/json`
  - `Idempotency-Key: <requestId>`
  - `X-CSRF-Token`
  - body `{ "action": "archive_permanent" }`

Completion handler:

- validates idempotency-key shape
- resolves binding server-side
- derives `scopeId` from the binding, not from client body
- calls `service.completeEntry({ scopeId }, { entryId, requestId, action })`

`EntryService.completeEntry()`:

- fingerprint domain = `["complete", scopeId, entryId, action]`
- previous op lookup by `(scopeId, requestId)`
- same request + same fingerprint + succeeded → replay prior result
- same request + different fingerprint → `REQUEST_CONFLICT`
- prior unresolved op → `RECONCILIATION_REQUIRED`
- stale version / reserve miss → `VERSION_CONFLICT`
- outstanding mutation / race after reserve or dispatch checks → `MUTATION_CONFLICT`

One-click-only is therefore **not** the sole idempotency control; durable operation identity and fingerprinting enforce it server-side.

## 14. Reservation/upstream ordering

Source order must remain:

```text
request duplicate lookup
→ binding/lifecycle validation
→ reserveCompletion
→ dispatch
→ PasteClient.update(..., "never")
→ finishCompletion
```

```text
RESERVATION_BEFORE_UPSTREAM_UPDATE=YES
```

If any path updates upstream before durable reservation, that is a SPEC blocker.

## 15. Managed task transformation

Current product contract:

- `completeManagedTask()` scans non-fenced lines only
- candidates must match top-level unchecked GFM task syntax
- exactly one candidate required
- archive transforms only `[ ]` → `[x]`

Exact content transformation for `FT06_EXECUTION`:

Before:

```text
- [ ] FT_LIFECYCLE_20260916_01
```

After:

```text
- [x] FT_LIFECYCLE_20260916_01
```

Preserve all other bytes exactly, including provider terminal LF if present.

Do not trim, normalize, rewrite arbitrary Markdown, or change case beyond `[ ]` → `[x]`.

## 16. D1 mutation

Same binding id. Same `paste_name`.

Before:

```text
visibility=active
retention_mode=permanent
expires_at=NULL
version=N
```

After:

```text
visibility=archived
retention_mode=permanent
expires_at=NULL
version=N+1
```

Exactly one new operation attributable to the archive request:

```text
kind=complete_permanent
status=succeeded
result present
```

No new create operation. No new binding.

## 17. Upstream Paste mutation

Expected upstream state:

- same Paste name
- Paste still exists
- update in place only
- retention = `never` / permanent
- no new Paste
- public body becomes checked-task version
- no expiry timestamp

## 18. Frontend state transition

Require frontend evidence:

- before: fixture visible in Active
- after success: fixture absent from Active
- after success: fixture visible in Archive
- Archive presentation indicates permanent archive

Backend-only success is not sufficient for full FT-06 PASS if the canonical user surface was not observed.

If browser session cannot be safely used:

```text
FT06_FAIL_UI_UNAVAILABLE
```

Do not substitute direct HTTP and call it PASS.

## 19. Execution PASS criteria

`FT-06: PASS` only if all hold:

```text
UI_ACTION_SINGLE_ITEM=YES
UI_CONFIRM_COUNT=1
BACKEND_COMPLETION_SUCCEEDED=YES
TASK_TRANSFORM_EXACT=YES
SAME_PASTE_NAME=YES
NEW_PASTE_COUNT_DELTA=0
VISIBILITY_ARCHIVED=YES
RETENTION_PERMANENT=YES
EXPIRES_AT_NULL=YES
VERSION_DELTA=1
COMPLETE_PERMANENT_SUCCEEDED_DELTA=1
RECONCILIATION_DELTA=0
DLQ_DELTA=0
ACTIVE_LIST_REMOVED=YES
ARCHIVE_LIST_PRESENT=YES
PUBLIC_PASTE_GET_200=YES
RESERVATION_BEFORE_UPSTREAM_UPDATE=YES
```

Do not auto-start FT-07.

## 20. Execution FAIL/STOP classes

Use exact terminal classes:

- `FT06_FAIL_TARGET_PRECONDITION`
- `FT06_FAIL_UI_UNAVAILABLE`
- `FT06_FAIL_UI_ACTION`
- `FT06_FAIL_MANAGED_TASK_AMBIGUOUS`
- `FT06_FAIL_REQUEST_CONFLICT`
- `FT06_FAIL_VERSION_CONFLICT`
- `FT06_FAIL_RESERVATION`
- `FT06_FAIL_UPSTREAM_UPDATE`
- `FT06_FAIL_RECONCILIATION_REQUIRED`
- `FT06_FAIL_D1_FINALIZATION`
- `FT06_FAIL_TASK_TRANSFORM`
- `FT06_FAIL_UNEXPECTED_NEW_PASTE`
- `FT06_FAIL_RETENTION`
- `FT06_FAIL_FRONTEND_STATE`
- `FT06_FAIL_DLQ`
- `FT06_FAIL_UNRESOLVED`

On failure:

```text
STOP
NO_SECOND_OWNER_CONFIRM
NO_DIRECT_API_RETRY
NO_REPLAY
NO_REPAIR_IN_SAME_RUN
```

## 21. Security/redaction boundary

Never publish in issue/PR evidence:

- management passwords / sealed credentials
- full OAuth/session/CSRF secrets
- raw durable ids when prefixes suffice
- full operation result JSON if boolean checks are sufficient

Prefer:

```text
entry_id_ref=<sanitized>
paste_name=<public>
scope_id_prefix=<prefix>…
request_id_prefix=<prefix>…
counts / deltas only
```

## 22. Production authorization boundaries

This SPEC defines future execution only.

Current turn remains:

```text
FT04_PASTE_PRESERVED=YES
PRODUCTION_MUTATION=NO
P2P_SENT=NO
FT06_STARTED=NO
FT07_STARTED=NO
```

Not authorized by this SPEC draft alone:

- fixture P2P send
- archive click / confirm
- direct completion API call
- D1 write
- Paste create/update/delete
- queue / DLQ mutation
- deploy / traffic change

## 23. FT-07 handoff

On `FT-06: PASS`, retain the result exactly as:

```text
visibility=archived
retention_mode=permanent
expires_at=NULL
task checked
same Paste
```

```text
FT07_USES_FT06_RESULT=YES
FT07_STARTED=NO
```

No cleanup.
