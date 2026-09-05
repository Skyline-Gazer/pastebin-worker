# Phase 9 — Batch backend SPEC

Status: CONTINUOUS-MODE SPEC READY AFTER INTERNAL CONSISTENCY REVIEW.

Implementation has NOT started.

Parent: [Phase 9 PLAN](phase9-plan.md). This behavioral contract is within the
D-030 delegated roadmap Phase 9. It permits Phase/TODO planning, not product
implementation. It follows the merged Phase 6/7 browser and lifecycle work and
the merged Phase 8 frontend, including its local `BatchActionIntent` seam.

## 3.1 Problem statement

Batch Mode can select several visible Active entries and collect one of the
three existing lifecycle intents, but Phase 8 deliberately cannot execute the
intent. Making the browser call the single-entry route in a loop would expose
an incorrect transaction model, make retry unsafe, and prevent a trustworthy
mixed-result experience. Users need one protected Add-on request that carries
only entry IDs and an action, executes each authorized entry independently,
and says exactly which entries did or did not change.

## 3.2 Goals

1. Provide the Add-on-local batch mutation endpoint `POST /api/batch`.
2. Reuse unchanged Phase 6 browser trust: opaque session, exact configured
   Origin, session-bound CSRF, and server-derived principal joined to stored
   allowed scopes.
3. Resolve every binding, scope, and management credential server-side, then
   perform only the existing `archive_permanent`, `archive_expiring`, or
   `delete` lifecycle operation for each accepted ID.
4. Return a sanitized, authoritative, non-transactional result with aggregate
   counts and one outcome for every requested ID.
5. Make equivalent retries replay safely and prevent a repeated batch request
   from issuing another destructive delete after a lost response.
6. Connect the Phase 8 `BatchActionIntent` handoff to the route, preserving its
   separate selectors, confirmation rules, interaction lock, and minimal UI.

## 3.3 Non-goals

- Batch Restore, a fourth lifecycle action, archive/timer redesign, polling,
  browser-created expiry deadlines, Trash, or deleted-entry tombstones.
- Any new browser authority, browser-held credential, client-supplied scope,
  identity, Paste name/body/URL, or retention deadline.
- A globally atomic multi-Paste transaction, browser serial calls to the
  single-entry endpoint, or optimistic lifecycle updates.
- A second authoritative Paste-body store. Paste content remains upstream;
  lifecycle/binding and operation evidence remain Add-on metadata only.
- Phase 10 release hardening, E2E/release assembly, production deployment,
  destructive migrations, upstream/root dependency or workflow work, patch
  work, PR #5, `upstream-sync`, or `goshujin` work.

## 3.4 Current behavior

At the PLAN baseline, `frontend/App.tsx` has a frontend-local
`BatchActionIntent` of an allowed action plus Add-on entry IDs. Confirming a
Phase 8 batch action only invokes an inert/deferred callback; it makes no
network request and changes no row. Batch selectors are transient and limited
to the current visible eligible Active list.

Phase 6's completion handler already protects browser mutations with session,
Origin, and CSRF checks. It loads the binding and server-held credential and
delegates the three lifecycle actions to `EntryService.completeEntry`. That
service records durable per-entry operations, detects conflicting idempotency
reuse, and treats uncertain dispatch as reconciliation-required rather than
repeating an unsafe mutation. Phase 7 owns authoritative `expiresAt`, Archive,
Restore, and reconciliation. No batch route, batch operation record, result
type, or partial-failure UI exists yet.

## 3.5 Desired behavior

### Lifecycle and per-item execution

A completed batch accepts exactly one action and a nonempty unique list of
currently selected Add-on IDs. It is an orchestration container, never a new
lifecycle state. Each ID is independently authorized and executed. A successful
item retains the existing transition and ordering:

```text
archive_permanent: ACTIVE_PERMANENT -> ARCHIVED_PERMANENT
archive_expiring:  ACTIVE_PERMANENT -> ARCHIVED_EXPIRING
delete:            ACTIVE_PERMANENT -> DELETED
```

For archive, the existing service reads and deterministically changes the
managed source, performs the password-backed upstream mutation, then persists
the final binding state. Expiring success returns the upstream/server
authoritative ISO `expiresAt`; permanent success returns `expiresAt: null`;
delete removes the binding and returns no invented final entry. A failure for
one item neither rolls back nor hides an earlier successful item.

There is no batch Restore and no transition from Archive in this phase. Batch
execution does not alter Phase 7 countdown or missing/expired reconciliation.

### Request limits and ordering

The request accepts at most 50 IDs, each a nonempty printable identifier of at
most 256 characters. The UTF-8 body limit is 16 KiB. IDs must be unique;
duplicates are rejected before dispatch rather than silently normalized. The
response preserves input ID order. These bounded limits contain work and make
the visible/current-loaded Phase 8 selection contract explicit; they do not
create pagination or server-side select-all.

### Result application in the frontend

After its existing confirmation, Phase 8 replaces the deferred callback with a
single request. While it is in flight it disables batch action controls and
does not move rows, clear selection, or claim success. Once a valid processed
result arrives, it applies a returned public state only to the matching,
successful ID: archived successes leave Active; deleted successes leave Active
and are not retained in Archive. Failed IDs remain visible and selected for
retry. The page records `batchResult` and announces a concise accessible
summary such as `已处理 18 项，2 项失败`. A retry submits only the retained failed
IDs with a new batch idempotency key; it must not reuse the completed batch's
key for a smaller request.

## 3.6 User and API flows

### User flow

1. In Phase 8 Batch Mode, the user selects visible eligible Active entries and
   chooses one existing action. Its existing expiring/delete confirmation rules
   remain unchanged.
2. On confirm, the frontend snapshots the pruned selected IDs and action,
   generates one opaque idempotency key, obtains the existing CSRF material,
   and makes exactly one `POST /api/batch` request.
3. It remains in-flight until a processed response or transport failure. A
   repeated click makes no second request.
4. A processed response updates only returned successful IDs, retains failed
   IDs selected, and presents aggregate/per-item-safe status. Retry uses that
   retained failure set and a fresh key.
5. A transport, authentication, validation, or unreadable response displays a
   sanitized unavailable/retryable state and retains the original selection;
   it invents no item-level outcome.

### Route and request

```http
POST /api/batch
Content-Type: application/json
Idempotency-Key: <1..256 printable opaque characters>
X-CSRF-Token: <existing session-bound token>
Cookie: <existing opaque session cookie>
Origin: <exact configured origin>
```

```json
{
  "ids": ["entry_a", "entry_b"],
  "action": "archive_expiring"
}
```

The object has exactly `ids` and `action`. `action` is one of
`archive_permanent`, `archive_expiring`, or `delete`. The browser does not send
Paste names/bodies, public or management URLs, passwords, credentials, scope,
principal, Feishu token, expiry, version, or per-item operation request IDs.

### Validation, authorization, and status

Method is checked first; JSON media type, key, content length/body limit, and
strict shape are checked before dispatch. Session then exact Origin and CSRF
validation use the existing Phase 6 helpers. These failures occur before a
binding, credential, lifecycle, or upstream operation is touched.

| Condition                                                            | Response                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Wrong method                                                         | `405` / `METHOD_NOT_ALLOWED`                                                               |
| Non-JSON media type                                                  | `415` / `INVALID_INPUT`                                                                    |
| Malformed/extra-field/empty/duplicate/over-limit body or invalid key | `400` / `INVALID_INPUT`; declared or observed body over 16 KiB is `413` / `INVALID_INPUT`  |
| Missing, expired, or revoked session                                 | `401` / existing sanitized session code                                                    |
| Invalid Origin or CSRF                                               | `403` / existing sanitized protection code                                                 |
| Same key with different canonical request                            | `409` / `REQUEST_CONFLICT`                                                                 |
| Same request is reserved/dispatched/reconciliation-required          | `409` / `BATCH_IN_PROGRESS`, `retryable: true`                                             |
| Batch record storage unavailable before dispatch                     | `503` / `STORAGE_OR_CREDENTIAL_UNAVAILABLE`                                                |
| Valid request whose items were processed                             | `200` and the result body below, including all-success, mixed, or all-item-failed outcomes |

An ID alone grants no access. For every item, the Worker derives allowed scopes
from the server-side principal, loads the binding server-side, and only invokes
the lifecycle service if its binding is in an allowed scope. A missing binding
or no-scope ID produces `ENTRY_UNAVAILABLE`, deliberately indistinguishable to
the browser, and processing continues with other IDs.

### Processed response

```json
{
  "requested": 3,
  "succeeded": 2,
  "failed": 1,
  "results": [
    {
      "id": "entry_a",
      "status": "ok",
      "state": { "visibility": "archived", "retentionMode": "timed", "expiresAt": "2026-11-30T06:00:00.000Z" }
    },
    { "id": "entry_b", "status": "ok", "deleted": true },
    { "id": "entry_c", "status": "failed", "code": "UPSTREAM_UPDATE_FAILED", "retryable": true }
  ]
}
```

`requested` equals input ID count; `succeeded + failed === requested`; and
`results` has exactly one, input-order result per requested ID. An `ok` result
has either a safe public entry state or `deleted: true`, never both. A failed
result has only `id`, `status: "failed"`, stable `code`, and boolean
`retryable`. The API response itself—not HTTP 200 alone—is authoritative.

Public failure codes are limited to `ENTRY_UNAVAILABLE`,
`MANAGED_TASK_AMBIGUOUS`, `VERSION_CONFLICT`, `MUTATION_CONFLICT`,
`UPSTREAM_UPDATE_FAILED`, `UPSTREAM_DELETE_FAILED`,
`UPSTREAM_REJECTED`, `RECONCILIATION_REQUIRED`, and
`STORAGE_OR_CREDENTIAL_UNAVAILABLE`. Implementation maps existing internal
errors conservatively: uncertainty and reconciliation are retryable only after
the durable operation/reconciliation check says redispatch is safe. Raw
upstream response text/status, password-bearing URLs, credential data, scope
facts, and operation internals are never returned.

### Idempotency and retry

The idempotency identity is scoped to the authenticated server-derived
principal and the `Idempotency-Key`. Before any item dispatch, the backend
creates an additive durable batch-operation record containing a keyed canonical
fingerprint of action plus ordered IDs, status, and the sanitized final result;
it contains no Paste body or plaintext credential. Its item evidence links to
the existing per-entry operation/reconciliation records through server-only
derived request identities, never browser-supplied ones.

The canonical fingerprint includes action and ordered IDs. A same-principal,
same-key, same-fingerprint retry returns the recorded completed result byte-for-
byte in semantics (including item ordering/counts); it performs no upstream
call. Same key with a different fingerprint is `409 REQUEST_CONFLICT`. A
concurrent or uncertain original returns `409 BATCH_IN_PROGRESS` until durable
reconciliation has produced a completed safe result; it must not start another
dispatch. Batch records use the same or longer retention window as existing
durable operation evidence and may only be cleaned up after that window.

For each item, the derived request identity is deterministic from the batch
record and item ID, and calls the existing service rather than reimplementing
password/lifecycle logic. Thus a replay finds the earlier per-entry operation:
a confirmed delete remains success without another DELETE; an ambiguous
operation remains reconciliation-required instead of being reissued. An item
that failed before dispatch may be retried only through a new batch request and
new key, subject to normal current authorization and state checks.

## 3.7 Data and state model

Existing `Binding`, public entry projection, Paste storage, and Phase 6/7
operation records remain authoritative in their existing domains. Phase 9 may
add only additive Add-on metadata needed for batch replay, for example:

```ts
type BatchAction = "archive_permanent" | "archive_expiring" | "delete"
type BatchStatus = "reserved" | "dispatched" | "succeeded" | "reconciliation_required"

interface BatchOperation {
  id: string
  principalKey: string // server-only keyed/hashed identity
  requestId: string
  fingerprint: string // keyed canonical action + ordered IDs fingerprint
  status: BatchStatus
  result: string | null // sanitized completed response only
  createdAt: string
  updatedAt: string
}
```

Any child/item evidence contains only batch ID, entry ID, derived operation
identity, and safe progress/reconciliation reference. It is not a Paste-body
cache, a lifecycle state, a browser-visible record, or a permission source.
No destructive migration is authorized; any required schema addition must be
additive, backward-compatible, and separately represented in the Phase/TODO.

Frontend state adds only public presentation values such as `batchPending`,
`batchResult`, and retained failed `selectedIds`. It discards the original key
after a completed response and never persists keys/results/selections to URL,
analytics, or browser storage. `expiresAt` is copied only from a successful
server response and is never calculated from `MAX_EXPIRATION` in the browser.

## 3.8 Security and trust boundaries

Phase 9 reuses—not changes—Phase 6's session/CSRF/Origin/principal-to-scope
boundary. Authorization happens before each lifecycle dispatch and all
credentials are decrypted/opened only by backend code. The handler must not
trust client IDs as scope authority, and must not accept an arbitrary password,
Paste URL/name/body, scope, principal, Feishu identity/token, expiry, or
per-item mutation key even if supplied as an extra field.

Responses, logs, error UI, telemetry, operation records, and tests use only
safe IDs, stable codes, and safe correlation IDs. They must not expose
passwords, management URLs, raw OAuth/session/CSRF values, raw tenant/open/chat
or scope IDs, credential ciphertext, Paste bodies, or raw upstream errors.
Delete retains the existing selection-level destructive confirmation; the
backend does not treat its presence as browser authorization.

## 3.9 Compatibility

This is an Add-on-only addition. It does not modify upstream Pastebin behavior,
the generic expiration patch, root dependencies, workflows, or the Phase 6
single-entry routes. Existing clients retain their current behavior. Phase 8's
safe intent has the same action/ID shape, but its deferred presentation is
removed only when the request adapter and processed-result handling land
together. Archive/Restore/countdown/reconciliation remain compatible.

The endpoint returns `200` for any fully processed batch so HTTP libraries that
do not handle `207` specially remain compatible; callers must inspect JSON.
Pre-dispatch rejection has no item result. If frontend parsing cannot validate
the result cardinality, IDs, counts, and safe entry shape, it treats it as an
unavailable result and applies no lifecycle update.

## 3.10 Failure behavior

The handler processes authorized items independently and retains known outcome
evidence even if a later item fails. An unavailable/no-scope item is sanitized
without stopping others. A confirmed upstream rejection may be reported as a
non-retryable item failure when current state makes retry useless; transient
storage/upstream availability failures are retryable. Uncertain dispatch,
persistence-after-upstream failure, and ambiguous delete remain
`RECONCILIATION_REQUIRED` and must not be retried by issuing a duplicate call.

If list contents change during frontend flight, returned success applies only
to a still-matching ID; an unmatched/stale result triggers a safe refresh or
unavailable presentation, never a guessed row mutation. Failed IDs stay
selected only while they remain visible/eligible; the existing Phase 8 pruning
rule removes stale/ineligible IDs and the retry control then reflects that
smaller safe set. Cancel before confirmation makes no request. A lost response
is retried with the same key and fingerprint; a user-initiated retry of known
failures uses a fresh key.

## 3.11 Acceptance criteria

- [ ] `POST /api/batch` accepts only strict bounded JSON IDs/action plus the
      existing session, Origin, CSRF, and idempotency material; invalid input
      rejects before binding/credential/upstream work.
- [ ] The browser never sends or receives Paste credentials, URLs/bodies,
      trusted scope/principal/Feishu values, or expiry authority.
- [ ] Every requested ID is independently server-authorized and credential-
      resolved; each dispatch delegates only to existing permanent/expiring/
      delete lifecycle behavior.
- [ ] A processed response is `200`, has exact aggregates and one safe ordered
      outcome per requested ID, and makes no global-transaction claim.
- [ ] Successful timed entries expose an authoritative valid `expiresAt`;
      permanent/delete do not manufacture a deadline; delete has no tombstone.
- [ ] A failed item cannot roll back or conceal unrelated success, and results
      never disclose secrets, raw upstream details, or scope/binding existence.
- [ ] Same-key equivalent retry replays safely; conflicting reuse rejects; an
      in-progress/uncertain operation is not redispatched; delete is not run
      twice after an ambiguous/lost response.
- [ ] Phase 8 sends one protected request after its existing confirmation,
      disables duplicate action submission, makes no optimistic changes,
      retains visible failed selections, and shows aggregate/retry UX.
- [ ] No batch Restore/fourth transition/second body store/Phase 10,
      deployment, destructive migration, PR #5, `upstream-sync`, or
      `goshujin` work is introduced.

## 3.12 Test specification

| Area                 | Required observable tests                                                                                                                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route validation     | POST-only, JSON-only, strict keys, required printable key, empty/duplicate/over-50 IDs, per-ID/body bounds, and exact status/code before service calls.                                                                                                  |
| Trust and secrets    | No/expired/revoked session is `401`; Origin/CSRF fail before store/upstream work; cross-scope/guessed IDs yield no authority; supplied credential/body/scope/deadline is rejected; response/log fixtures have no secret material.                        |
| Lifecycle delegation | RED-first tests for each action prove server credential lookup and existing service semantics, authoritative timed timestamp, permanent null timestamp, delete binding removal, and no Restore path.                                                     |
| Partial result       | Mixed success/failure preserves input order, exact cardinality/counts, sanitized codes, no rollback, and `200` JSON is authoritative for all processed combinations.                                                                                     |
| Idempotency          | Same key/fingerprint replays recorded result with no second upstream call; changed shape conflicts; concurrent/in-progress retry does not dispatch; lost/ambiguous delete remains reconciled rather than duplicated.                                     |
| Frontend             | One request after existing confirmation with only IDs/action/session CSRF/key; buttons lock in flight; no optimistic movement; only matching successes update; failures remain selected; summary/retry work; malformed/transport result applies nothing. |
| Regression           | Phase 6 single completion/trust, Phase 7 Archive/countdown/Restore/reconciliation, Phase 8 selector/lock/confirmation/visible pruning, Worker/frontend type/lint/format/build suites remain green.                                                       |

Implementation records actual RED/GREEN/REFACTOR/REGRESSION evidence in the
Phase 9 TODO and implementation PR under `docs/TESTING.md` §1.1. This
docs-only SPEC records:

```text
TDD: N/A
Reason: This change defines the pre-implementation behavioral contract.
Alternative verification: Repository inspection and governing-contract internal consistency review.
```

## 3.13 Open questions

No unresolved owner product decision blocks Phase/TODO planning. D-010,
D-014, D-015, the Phase 9 PLAN, and the governing API/security/lifecycle docs
resolve the three actions, separate selection, non-transactional partial
success, and server trust model. The documented limits, `200` processed-status
policy, `ENTRY_UNAVAILABLE` non-enumeration policy, and durable replay model
are implementation-contract choices within that approved direction.

Continuous execution MUST STOP for owner direction and §10.5 change control if
implementation requires a different route/request/result contract; browser
authority or trust boundary; action/transition including Restore; selection
beyond visible/current-loaded IDs; a second Paste-body store; a destructive
migration or deployment; Phase 10 work; PR #5, `upstream-sync`, or a
`goshujin` rewrite; or any change to these acceptance criteria. It must also
stop for bot-unavailable override or blocking-finding disposition requiring
owner authority.

## Internal consistency review

Reviewed against the approved [Phase 9 PLAN](phase9-plan.md),
`docs/IMPLEMENTATION_ORDER.md` Phase 9, D-007–D-015 and D-030,
`AGENTS.md` §§12–18, `docs/CHANGE_CONTEXT_AND_REVIEW.md` §§10.1.1–10.7,
`docs/API_CONTRACT.md` §§1 and 7–9, `docs/SECURITY.md` §§1–2 and 5–8,
`docs/RETENTION_LIFECYCLE.md` §§1–10, `docs/DESIGN.md` §§6–7 and 11,
`docs/FRONTEND.md` §§6–11, `docs/TESTING.md` §§1 and 6–9, and Phase 6–8
planning/implemented contracts. Repository inspection confirms the existing
Phase 6 protected completion handler/durable per-entry operation service and
the Phase 8 local inert `BatchActionIntent` seam.

The SPEC is consistent with the PLAN: it retains Phase 6 browser trust and
server credentials; delegates only the three existing operations per item;
makes the response authoritative, counted, sanitized, and non-transactional;
defines safe replay; and wires Phase 8 to mixed-result UX without redesign.
It adds no upstream, lifecycle, body-storage, browser-expiry, release,
deployment, destructive-migration, PR #5, `upstream-sync`, or `goshujin`
scope. No D-030 STOP condition is currently present.

Status: CONTINUOUS-MODE SPEC READY AFTER INTERNAL CONSISTENCY REVIEW.

Implementation has NOT started.
