# FT-13 SPEC — Batch permanent archive of one entry

Status: **PROPOSED_FOR_OWNER_REVIEW**. This document is an execution contract,
not SPEC approval or production authorization.

Parent: [FT-13 PLAN](ft-13-plan.md), tracking Issue
[#186](https://github.com/Skyline-Gazer/pastebin-worker/issues/186).
Planning baseline: `downstream/main` at
`d0d73cbe6564f1cb496349e6012368c11751419a`.

PLAN settlement: PR
[#187](https://github.com/Skyline-Gazer/pastebin-worker/pull/187) merged at
`d0d73cbe6564f1cb496349e6012368c11751419a`, reviewed HEAD
`3d1fe72a9e7612ce6d4a2de77161b48a1f98b382`. Required CI passed. Cursor
Bugbot, Greptile, and Codex Final Verify remained
`NO_RESPONSE_AFTER_BOUNDED_WAIT`; none is a PASS. The Owner authorized a
reviewer-quorum-only override, recorded in the
[PR override record](https://github.com/Skyline-Gazer/pastebin-worker/pull/187#issuecomment-5854253639).
This override did not approve this SPEC or authorize any production action.

```text
FT13_PLAN_APPROVAL=SETTLED_PR187_MERGED
FT13_SPEC_STATUS=PROPOSED_FOR_OWNER_REVIEW
FT13_SPEC_APPROVAL=REQUIRED_NOT_GRANTED
FT13_FIXTURE_CREATE_AUTHORIZED=NO
FT13_EXACT_ID_BATCH_AUTHORIZED=NO
FT13_CLEANUP_AUTHORIZED=NO
FT13_EXECUTION_AUTHORIZED=NO
FT13_EXECUTION_STARTED=NO
```

## 1. Objective and boundary

Verify one newly created, explicitly disposable entry can be permanently
archived through the production Add-on Batch Mode selector and
`POST /api/batch` with action `archive_permanent`. This tests the one-item
selection/request path that FT-12's two-item batch delete did not cover. It
does not repeat FT-06's single-entry archive test.

This SPEC authorizes planning only. It includes no fixture creation, batch
submission, D1 write, deployment, configuration change, queue/DLQ mutation,
restore, delete, or cleanup. No application-code change is in scope. Do not
start FT-14.

## 2. Frozen fixture contract

Exactly one new entry is required. Never substitute a retained, historical,
unknown-origin, or previously used fixture.

```text
FT13_FIXTURE_COUNT=1
FT13_FIXTURE_MARKER=FT13_BATCH_ARCHIVE_20260927_01
FT13_FIXTURE_SOURCE=- [ ] FT13_BATCH_ARCHIVE_20260927_01
FT13_FIXTURE_INITIAL_VISIBILITY=active
FT13_FIXTURE_INITIAL_RETENTION=permanent
FT13_FIXTURE_INITIAL_EXPIRES_AT=NULL
FT13_FIXTURE_INITIAL_MANAGED_TASK=one_unchecked_top_level_GFM_task
```

Create it only through one owner-originated Feishu native Code Block P2P
message to the already authorized Add-on ingress. The Code Block's inner
source must be exactly:

```markdown
- [ ] FT13_BATCH_ARCHIVE_20260927_01
```

No title, second block, surrounding text, manual Markdown fences, second
message, webhook replay, synthetic event, direct API create, queue injection,
or direct D1/Paste write is allowed. The stored Paste source must equal the
frozen source exactly, optionally followed by one provider terminal LF. Any
other byte difference, duplicate, missing create-success evidence, or marker
collision blocks execution; do not change the marker during the run.

Fixture creation is a separate Owner gate. It authorizes at most one P2P
message/create operation for this marker and authorizes no archive request.

## 3. Exact read-only preflight

Preflight has two checkpoints: before the fixture-create gate and again after
fixture reconciliation immediately before the batch-action gate. Record
observation times and compare all identity/state values. Any unknown,
contradictory, or drifted value means stop without the next mutation.

### 3.1 Environment and ingress

Read-only checks must establish and record:

1. The account, production environment, authorized Feishu P2P chat/scope, and
   authenticated principal are the intended ones. Do not expose scope IDs,
   cookies, tokens, or credentials in evidence.
2. The canonical Add-on origin is `https://pb.test.223.im`; the production
   messaging Worker name, complete live version ID, traffic percentage, and
   relevant Service Binding are freshly observed. Traffic must be on one
   compatible version at 100%; no deployment or traffic edit is part of FT-13.
3. The browser session is valid. The current session-bound CSRF and exact
   Origin protections are present. Authentication or scope uncertainty is a
   hard stop.
4. The normal Feishu ingress queue and configured consumer/DLQ identity and
   current read-only backlog/health metrics are captured. Use the Cloudflare
   Queues dashboard metrics or the read-only
   `GET /accounts/{account_id}/queues/{queue_id}/metrics` endpoint for both the
   ingress and DLQ; record the UTC observation time,
   `backlog_count`/`backlog_bytes`/`oldest_message_timestamp_ms`, and source.
   Cloudflare documents these metrics as best-effort and approximate, so do
   not describe them as an exact message inventory. A dashboard message
   preview or the non-acknowledging Queue `peek` operation may be used to
   identify the exact fixture marker in the DLQ; never acknowledge, purge,
   replay, or reconfigure a message. If identity, health, a comparable
   baseline, or exact evidence that the fixture is absent from the DLQ is
   unavailable or anomalous, stop.

   For this metric alone, the
   [Cloudflare Queue Metrics API](https://developers.cloudflare.com/api/resources/queues/methods/get_metrics/)
   defines `oldest_message_timestamp_ms=0` as **UNKNOWN**, not a known empty
   queue or an oldest-message time. Its UNKNOWN value does not independently
   block preflight only when both ingress and DLQ report `backlog_count=0` and
   `backlog_bytes=0` in fresh responses, the non-acknowledging DLQ preview
   finds no unacknowledged messages, the consumer/retry/DLQ configuration is
   verified, global and target reconciliation-required/in-flight counts are
   zero, and every other precondition passes. Record the raw `0`, its UNKNOWN
   meaning, both response times, and the independent evidence. A missing
   metric, failed request, nonzero or anomalous backlog, or any other UNKNOWN
   still blocks; approximate metrics never prove exact Queue inventory.

5. The marker has zero existing matching binding/Paste records. Record the
   read-only Active/Archive inventory and current D1 operation, batch,
   reconciliation-required, and in-flight baselines. Global and target
   reconciliation-required and in-flight counts must be zero before action.

### 3.2 Fixture reconciliation and exact target

After the separately authorized create, reconcile read-only and require all of:

- exactly one Owner-originated P2P event and one successful create operation;
- the one expected fixture message is normally consumed through ingress; no
  replay or unrelated event is introduced, no test event reaches the DLQ, and
  the post-create reported ingress and DLQ metric fields match their captured
  baselines before the batch gate. Because these are best-effort metrics, do
  not claim exact underlying queue parity from metric equality alone; if the
  fixture's successful ingress outcome or its absence from the DLQ cannot be
  established read-only, stop without the batch gate;
- when the post-create `oldest_message_timestamp_ms` is `0`, apply the same
  narrow rule in §3.1. Equality of two UNKNOWN timestamps is not evidence of
  message delivery or DLQ absence; establish those lifecycle facts separately
  as required above;
- exactly one new binding and one Paste with the frozen marker and explicit
  disposable provenance;
- one exact entry ID and Paste ID, carried forward verbatim; no guessed or
  cross-scope ID;
- the entry appears in Active and not Archive, with `active` visibility,
  permanent retention, `expiresAt=NULL`, and the expected entry version;
- the Paste is publicly readable, non-expiring, and its source equals the
  frozen fixture source (with at most the one permitted terminal LF);
- the managed task parser finds exactly one eligible unchecked top-level GFM
  task; no other task candidate is present;
- create D1 operation is `succeeded`; no duplicate create, unrelated change,
  target operation conflict, or reconciliation/in-flight residue exists.

If any fixture fact is unknown or mismatched, stop. Do not repair, recreate,
or clean up the fixture.

The fixture-create gate must establish the PLAN and SPEC approvals, one
separate create authorization for the exact message, and zero marker matches
before sending it. The post-create batch preflight is fail-closed. The values
below are required future execution conditions, not claims about the current
state; each must be freshly proven after the separate approvals:

```text
FT13_PRECONDITION_SPEC_APPROVED=YES
FT13_PRECONDITION_FIXTURE_CREATE_AUTHORIZATION=CONSUMED_BY_ONE_CREATE
FT13_PRECONDITION_AUTHENTICATED_PRINCIPAL_AND_P2P_SCOPE=PASS
FT13_PRECONDITION_CANONICAL_ORIGIN_AND_CSRF=PASS
FT13_PRECONDITION_PRODUCTION_WORKER_COMPATIBLE_AT_100_PERCENT=PASS
FT13_PRECONDITION_QUEUE_DLQ_IDENTITY_AND_HEALTH_KNOWN=PASS
FT13_PRECONDITION_MARKER_MATCHES_BEFORE_CREATE=0
FT13_PRECONDITION_EXACT_FIXTURE_MARKER_MATCHES_AFTER_CREATE=1
FT13_PRECONDITION_ONE_SUCCESSFUL_FIXTURE_CREATE=PASS
FT13_PRECONDITION_EXACT_TARGET_ID_AND_DISPOSABLE_PROVENANCE=PASS
FT13_PRECONDITION_ACTIVE_PERMANENT_NULL_EXPIRY=PASS
FT13_PRECONDITION_EXACT_SINGLE_UNCHECKED_TASK=PASS
FT13_PRECONDITION_PUBLIC_PASTE_MATCHES_FIXTURE_SOURCE=PASS
FT13_PRECONDITION_NO_TARGET_OR_GLOBAL_RECONCILIATION_OR_INFLIGHT=PASS
FT13_PRECONDITION_EXACT_ID_BATCH_AUTHORIZATION=YES
FT13_PREFLIGHT_RESULT=PASS
```

Every `PASS`/`YES` value must be supported by fresh evidence. `UNKNOWN`,
`FAIL`, or missing evidence makes `FT13_PREFLIGHT_RESULT` fail closed; do not
submit the batch action.

### 3.3 Immediate pre-submit drift check

Immediately before the batch action, re-confirm the same principal/session,
Origin, Worker/version/traffic, entry ID, Paste ID, marker, Active/permanent
state, `expiresAt=NULL`, eligible task, and zero target/global pending,
reconciliation-required, or in-flight work. Confirm the selected UI row resolves
to this one exact ID. No state-changing navigation or second selection may
occur after this check. Any drift cancels the action and requires a new Owner
decision; it does not permit an alternate target.

## 4. Exact batch action

After the SPEC is separately Owner-approved and all preflight gates pass, the
Owner must separately authorize one batch mutation bound to the exact
reconciled entry ID, production Worker/version, action, and one-request limit.
That authorization is not provided by PLAN or SPEC approval.

Use the authenticated canonical frontend at `https://pb.test.223.im`:

1. Enter Batch Mode and select exactly one eligible Active entry using the
   separate BatchSelector. Do not use or alter the Markdown task checkbox as
   the selector.
2. Choose `archive_permanent`. The current UI submits this action directly;
   no selection-level confirmation dialog is required. Expected confirmation
   count is zero.
3. Submit exactly one protected request:

```http
POST /api/batch
Content-Type: application/json
Idempotency-Key: <fresh opaque key, value omitted from evidence>
X-CSRF-Token: <current session-bound token>
Origin: https://pb.test.223.im
```

```json
{
  "ids": ["<the one exact reconciled entry ID>"],
  "action": "archive_permanent"
}
```

The frontend sends only the Add-on entry ID. It must not send a Paste
management password/URL, full Paste body, scope authority, Feishu credential,
or token. Use a fresh opaque idempotency key once. Do not retry, replay, or
resubmit, even with the same or a new key.

## 5. Required response and state postconditions

For an unambiguous successful response, require HTTP 200 and the authoritative
JSON result:

```text
requested=1
succeeded=1
failed=0
results.length=1
results[0].id=<exact selected ID>
results[0].status=ok
results[0].state.visibility=archived
results[0].state.retentionMode=permanent
results[0].state.expiresAt=NULL
```

The frontend performs its normal single `/api/entries` refresh after the
response. Inspect that refreshed list once, then reconcile the target
read-only. All must hold:

- the same entry/binding/Paste exists in Archive and is absent from Active;
- its Markdown task is checked; visibility is `archived`; retention is
  permanent (Archive label `永久保留`); `expiresAt=NULL`;
- the same public Paste remains readable and non-expiring;
- exactly one new target lifecycle operation exists with
  `kind=complete_permanent`, `status=succeeded`, and
  `expected_version=<captured pre-action binding version>`; the post-action
  binding version equals that captured version plus exactly one;
- one `feishu_batch_operations` row matches the request/action and has
  `status=dispatched` (the schema has no `completed` status); completion is
  represented by exactly one matching `feishu_batch_results` row whose
  sanitized JSON equals the HTTP result, plus exactly one
  `feishu_batch_items` row for the target with `outcome=succeeded` and
  `code=NULL`. Its item/lifecycle request ID is
  `<batch_id>:0:<exact entry ID>`. Treat a dispatched batch row with a
  matching result row as completed; batch in-flight count is dispatched rows
  without a result row and must be zero. No duplicate operation or replay
  exists;
- target and global reconciliation-required and in-flight counts remain zero;
- no unrelated/historical entry, binding, or Paste changed; the batch action
  caused no queue/DLQ activity, replay, or configuration change; no Worker
  deployment/configuration changed; no secret was exposed. The earlier single
  fixture ingress event is expected and is reconciled separately above.

Any unverified, partial, contradictory, or ambiguous result is not PASS.

## 6. Stop and reconciliation rules

If the request times out, transport fails, returns an unexpected result, or
the UI/D1/Paste states disagree:

1. Submit nothing further. Do not retry or replay `/api/batch`.
2. Preserve the fixture and all evidence; do not restore, delete, compensate,
   or mutate D1, Queue, DLQ, Worker configuration, or deployment.
3. Perform read-only reconciliation only: exact target binding and operation,
   batch record/result, Active/Archive once, and public Paste state. Redact
   credentials and unrelated content.
4. Classify the test `INCONCLUSIVE` if execution may have occurred but exact
   terminal state cannot be proven; otherwise classify per the observed
   failed postcondition. Escalate for Owner resolution.

No automatic rollback is defined. A successful fixture intentionally remains
in permanent Archive as evidence. Any restore/delete cleanup requires its own
separate explicit Owner authorization bound to the exact entry ID.

## 7. Acceptance and evidence

`FT13_FUNCTIONAL_RESULT=PASS` requires SPEC approval, the separately
authorized single fixture create, the separately authorized exact-ID batch
action, every preflight and postcondition above, one request only, and complete
secret-free evidence. Otherwise report `BLOCKED_PRECONDITION`, `FAIL`, or
`INCONCLUSIVE` accurately; do not infer success from a UI toast alone.

Evidence must include:

- SPEC version/approval and the distinct create, batch, and cleanup
  authorization states;
- observation time, production Worker/version/traffic, canonical origin,
  authenticated-scope validation, and read-only queue/DLQ health snapshot;
- marker, exact entry/Paste IDs, disposable provenance, create-success
  evidence, and pre/post D1 counts (no passwords, tokens, cookies, CSRF values,
  or unrelated Paste contents);
- selected count, action, confirmation count, request count, HTTP status,
  sanitized ordered response, target operation ID/kind/status/expected_version,
  captured pre/post binding versions, and version delta;
- one post-action Active/Archive refresh, public Paste readability/expiry,
  reconciliation/in-flight state, and comparison showing no unrelated change;
- final functional classification and confirmation that no retry, replay,
  cleanup, deployment, or configuration mutation occurred.

## 8. Explicit authorization ledger

```text
FT13_PLAN_APPROVAL=SETTLED_PR187_MERGED
FT13_SPEC_APPROVAL=REQUIRED_NOT_GRANTED
FT13_FIXTURE_CREATE_AUTHORIZATION=NO
FT13_EXACT_ID_BATCH_MUTATION_AUTHORIZATION=NO
FT13_CLEANUP_AUTHORIZATION=NO
FT13_DEPLOYMENT_AUTHORIZATION=NO
FT13_EXECUTION_AUTHORIZED=NO
FT13_EXECUTION_STARTED=NO
FT14_STARTED=NO
```

Each later authorization is independent. SPEC approval alone authorizes no
fixture, batch action, cleanup, deployment, or execution.

## References

- [FT-13 PLAN](ft-13-plan.md) and its [Issue #186 settlement record](https://github.com/Skyline-Gazer/pastebin-worker/issues/186#issuecomment-5854318064).
- [FT-12 SPEC](ft-12-spec.md) and [FT-12 production evidence](evidence/ft-12-batch-delete-pass.md).
- [FT-06 SPEC](ft-06-spec.md) for the normal native Feishu Code Block P2P fixture path.
- [`API_CONTRACT.md`](../API_CONTRACT.md) and [`RETENTION_LIFECYCLE.md`](../RETENTION_LIFECYCLE.md).
- [Cloudflare Queue metrics](https://developers.cloudflare.com/api/resources/queues/methods/get_metrics/)
  and [non-acknowledging dashboard message preview](https://developers.cloudflare.com/queues/examples/list-messages-from-dash/)
  for read-only Queue/DLQ evidence surfaces.
- `downstream/addons/messaging/worker/batch.ts`, `worker/service.ts`,
  `frontend/App.tsx`, and `tests/batch.spec.ts` for the reviewed request and
  outcome semantics.
