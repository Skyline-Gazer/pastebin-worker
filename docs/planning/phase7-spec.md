# Phase 7 — Countdown + restore SPEC

Status: CONTINUOUS-MODE SPEC READY AFTER INTERNAL CONSISTENCY REVIEW.

Implementation has NOT started.

Parent: [Phase 7 PLAN](phase7-plan.md). This is a behavioral contract for the
already-authorized D-030 continuous-execution roadmap Phase 7. It does not
authorize implementation until the required Phase/TODO artifact is durably
recorded and internally reviewed.

## 3.1 Problem statement

Phase 6 can place one managed entry in a permanent or timed Archive state, but
does not show useful remaining time, permit safe restoration, or remove an
archived row after its upstream Paste has definitely expired or disappeared.
Users therefore cannot tell when a timed archive is due to disappear, cannot
return an archive to Active, and could be shown an Archive row that no longer
has content behind it.

Phase 7 must make the timed deadline legible without giving the browser
retention authority; restore each archive kind safely; and uphold D-011 by
reconciling only confirmed upstream absence. Paste content remains upstream's
source of truth, and binding/lifecycle metadata remains Add-on state.

## 3.2 Goals

1. Display a compact, accessible, coarse/live remaining-time status for an
   archived timed entry from its exact authoritative `expiresAt` ISO value.
2. Restore an archived permanent entry to `active/permanent/null` and return
   its one managed task to unchecked only after the required server-side work
   succeeds.
3. Restore an archived timed entry only after the same upstream Paste has been
   changed to non-expiring (`e=never` or the generic equivalent); then persist
   and return `active/permanent/null`.
4. Reconcile an archived entry out of Archive only on confirmed upstream
   missing/expired evidence; uncertainty stays fail-closed and retryable or
   reconciliation-required.
5. Reuse Phase 6's opaque session, exact Origin, session-bound CSRF, and
   server-derived principal-to-stored-scope authorization unchanged.

## 3.3 Non-goals

- Phase 8/9 Batch Mode: selectors, toolbar, interaction suppression, batch
  endpoint, partial-success UX, and batch restore.
- A Phase 6 auth/session/CSRF/OAuth redesign, browser-provided authority, or a
  new trust boundary.
- A generic upstream patch, root/upstream dependency or workflow change,
  patch-series change, `upstream-sync`, `goshujin`, or PR #5 work.
- A second authoritative Paste-body store, password/management URL exposure,
  destructive migration, deployment/release assembly, tombstone/trash view,
  precise per-second timer, or client-created expiry deadline.

## 3.4 Current behavior

At the Phase 7 PLAN baseline, Phase 6 exposes public entry state with
`visibility`, `retentionMode`, exact upstream-captured `expiresAt`, and
`version`. A timed archive is `archived/timed/<valid ISO>` and a permanent
archive is `archived/permanent/null`; active entries are permanent with null
expiry. The Phase 6 frontend has Archive presentation but no restore control
or live countdown.

The Worker completion route uses `authorizeBrowserMutation` before lifecycle
or Paste work. Its opaque browser session, exact configured Origin,
session-bound CSRF token, and principal-to-binding stored-scope join are the
approved mutation boundary. Phase 3's scope-qualified durable claims prevent
unsafe duplicate/ambiguous mutation replay. The lifecycle service already has
read/reconciliation primitives, preserves ambiguous outcomes, and never puts
the binding credential or Paste body in the public projection.

`docs/API_CONTRACT.md` defines `POST /api/entries/:id/restore` conceptually;
the exact adapter currently remains an implementation extension. The contract
below fixes its observable semantics without requiring a new broad list/read
API or a browser-to-Paste request.

## 3.5 Desired behavior and state transitions

### Countdown

For each timed archived public entry with a valid authoritative ISO timestamp,
the frontend may calculate `Date.parse(expiresAt) - Date.now()` solely to
format display state. It must render a compact coarse label such as `剩余 3d
4h`; refresh no more often than the displayed precision needs (minute-level
or another coarse cadence). A permanent archive has a permanent label and no
timer.

The client never derives or changes `expiresAt` from `MAX_EXPIRATION`, a
duration, browser storage, or receipt time. A timer tick never calls upstream
and never deletes/moves a binding. Invalid timestamp data is a sanitized stale
presentation/reconciliation state, not a fabricated deadline. At zero or
below, render an accessible expired/stale status (never a negative countdown)
and offer/trigger the narrow authenticated reconciliation flow; only its
server result may remove the row.

### Restore transitions

```text
ARCHIVED_PERMANENT -> ACTIVE_PERMANENT
ARCHIVED_EXPIRING  -> ACTIVE_PERMANENT

archived/permanent/null -> active/permanent/null
archived/timed/<authoritative ISO> -> active/permanent/null
```

Restore is permitted only for a currently archived binding. It changes exactly
the existing unambiguous lifecycle-managed top-level task from checked to
unchecked; nested tasks, unrelated tasks, fenced code, and other Markdown are
not guessed or changed.

For permanent restore, server-side source update/upstream confirmation precedes
persisting/returning final active state. For timed restore, the server first
performs and confirms the password-backed upstream transition to non-expiring,
then performs the deterministic managed-task source update, then atomically
persists the final lifecycle state and successful operation result. Until that
last success response, the client retains the archived timed row and its
authoritative countdown. It must not optimistically clear or move it.

### Archived absence reconciliation

Only an archived binding can be reconciled away under this Phase. The backend
uses its stored Paste name and server-only credential to verify the Paste. A
classified, definitive upstream `ENTRY_NOT_FOUND`/expired result is sufficient
evidence to remove the archived binding (and any applicable completed
operation metadata under the established store policy); the returned/listed
state then omits it from Archive. This is D-011 reconciliation, not a client
deletion and not a tombstone.

Timeout, transport outage, authentication/credential failure, malformed
metadata, raw/ambiguous 404-like response, concurrent/pending operation, or
local persistence failure is not absence evidence. Preserve the binding and
durable operation evidence, return a stable sanitized retryable or
`RECONCILIATION_REQUIRED` outcome, and do not report restore/reconciliation
success.

## 3.6 User and API flows

### Timed Archive display and stale reconciliation

1. The backend/list projection returns only allowlisted state, including the
   exact stored `expiresAt` for a timed archive.
2. The frontend validates the ISO value, formats remaining time locally at a
   coarse cadence, and exposes text/status independently of color.
3. On elapsed/invalid state, it leaves the row archived and requests a narrow
   reconciliation operation using the normal authenticated mutation boundary.
4. The Worker authorizes the binding first, verifies server-side upstream
   state, and returns either current allowlisted entry state, a confirmed
   reconciled-absent result, or sanitized non-success.
5. Only confirmed reconciled absence removes the row. All other outcomes leave
   it visible with retry/reconciliation messaging and no secret-bearing detail.

### Restore request

```http
POST /api/entries/:id/restore
Content-Type: application/json
Idempotency-Key: <bounded opaque request identity>
X-CSRF-Token: <session-bound token>

{}
```

The body is empty (or absent); it does not accept an action, scope, expiry,
version as authority, principal/Feishu identity, Paste body, password, or
management URL. Before a Phase 3 claim, store lookup, credential open, or
Paste operation, the adapter requires a valid opaque session, exact allowed
Origin, valid session CSRF header, and a server-side principal → allowed scope
→ binding join. Missing/invalid/revoked session is `401`; bad Origin/CSRF,
missing scope, and cross-scope entry fail before mutation with the existing
sanitized authorization/error mapping.

On success it returns the allowlisted public entry shape with
`visibility: "active"`, `retentionMode: "permanent"`, and `expiresAt: null`.
The successful response is the only UI authority to move the row to Active.
The adapter may use an equivalent documented route shape only if it preserves
this method, auth, idempotency, request-minimization, response, and error
contract; otherwise it is SPEC change control and requires STOP.

### Reconciliation request

The implementation may expose a narrow conceptual
`POST /api/entries/:id/reconcile` with the same session/Origin/CSRF and empty
request-body rules, or return equivalent reconciliation from the existing
authorized entry read/restore pathway. It must not add browser authority or
continuous polling. Its success outcomes are either the current public entry
or an explicit secret-free confirmed-absent result (for example `204`);
uncertain outcomes are stable sanitized errors. A route/API shape that changes
the documented public contract requires owner decision under §10.5.

### Idempotency and concurrency

Restore is one per-entry Phase 3 durable operation kind with a fingerprint
covering operation kind, trusted scope, and entry ID. Same idempotency key plus
same request replays its recorded final result; reuse with different input or
operation conflicts. Pending, version-conflicting, and uncertain claims block
blind retry. A reconciliation operation must not clear/steal an in-flight
restore claim. No global transaction exists or is needed for this single-entry
Phase.

## 3.7 Data and state model

The public entry remains:

```ts
interface PublicEntry {
  id: string
  pasteName: string
  publicUrl: string
  visibility: "active" | "archived"
  retentionMode: "permanent" | "timed"
  expiresAt: string | null
  version: number
}
```

The private binding retains `scopeId`, encrypted management credential, Paste
name, lifecycle fields, and version. It never retains a second authoritative
full Paste body. Phase 7 may add only additive lifecycle/operation metadata
needed to distinguish restore/reconciliation durable state. Existing bindings
remain compatible: active/permanent/null and archived/permanent/null are
valid; archived/timed requires a valid upstream-returned ISO `expiresAt`.
No destructive migration, browser-input backfill, or reset is allowed.

`expiresAt` is set only from a validated upstream timed-archive response and
cleared only after a confirmed permanent upstream transition and final
persistence. Browser-local remaining-time state is ephemeral display state,
not stored lifecycle authority.

## 3.8 Security and trust boundaries

Phase 6 authorization is reused verbatim: official OAuth establishes a
server-side opaque Add-on session; the Worker derives the principal and joins
it to server-stored allowed scopes. Browser entry ID does not grant scope.
Every restore/reconciliation mutation applies `authorizeBrowserMutation` (or
the approved equivalent) before Phase 3/store/Paste work.

The browser receives only allowlisted entry state and stable sanitized status
codes/correlation IDs. It never receives, stores, submits, logs, or uses as
authority a management password, management URL, credential ciphertext, raw
upstream error, OAuth token, session/CSRF secret, raw Feishu identity/scope,
Paste body, or expiry input. Upstream PUT/read and expiry cancellation run
only in the Worker with the server-held password. Logs/telemetry use safe
correlation and keyed/hashed identifiers where applicable.

## 3.9 Compatibility

This is Add-on-only and preserves the generic upstream `e=never`/`e=max`
capability without Feishu conditions. Existing Phase 3 claim and Phase 6
completion semantics remain intact. Existing Active/permanent bindings need no
behavioral migration. Existing permanent archives gain Restore but no timer;
valid timed archives gain display-only countdown and safe restore. Malformed
legacy timed metadata is not silently normalized: it remains reconcilable and
is not treated as proof of expiry.

## 3.10 Failure behavior

Validation/auth/session/Origin/CSRF/scope failures make no lifecycle or
upstream call. A definite upstream rejection before mutation leaves state
unchanged. A confirmed missing/expired result removes only an archived row.

For timed restore, failure to cancel expiration leaves the entry
archived/timed with the existing deadline and checked source; no source
restore/final lifecycle success is reported. If cancellation or source update
may have dispatched but response/persistence is uncertain, record durable
reconciliation evidence and return `RECONCILIATION_REQUIRED`; do not retry
blindly, infer success, clear the deadline, or remove the row. Persistence
failure after upstream success is likewise reconciliation-required.

Duplicate click handling disables the Restore action while pending, but the
server remains authoritative for retries/replays/conflicts. Network failures
are sanitized/retryable when safely retryable. The frontend retains its last
authoritative row until an authoritative success/confirmed-absence response.

## 3.11 Acceptance criteria

1. A valid timed archived entry displays compact coarse remaining time derived
   only from its authoritative returned `expiresAt`; permanent archive has no
   countdown.
2. Countdown refresh is no finer than displayed precision, cleans up on
   unmount, has accessible non-color status, never polls upstream, never shows
   negative duration, and never manufactures/changes a deadline.
3. Elapsed/invalid timed data does not delete or move a row locally; only
   authenticated server reconciliation after confirmed absence removes it.
4. Permanent restore changes exactly the managed checked task to unchecked and
   returns/persists `active/permanent/null` only after required upstream work.
5. Timed restore confirms upstream cancellation to non-expiring before source
   restoration/final active result; its UI remains archived/timed until final
   server success.
6. Restore/reconciliation reuse valid session, exact Origin, CSRF, and
   principal-to-scope authorization before lifecycle/upstream work; no browser
   input grants scope or supplies secret/deadline authority.
7. Restore uses scoped durable idempotency: identical replay is stable,
   conflicting reuse is rejected, and uncertain/concurrent operations do not
   cause blind mutation.
8. Confirmed missing/expired archived Pasts are removed from Archive; outage,
   ambiguity, invalid metadata, credential/auth, and persistence failures are
   retained as sanitized reconciliation-required/retryable states.
9. Browser responses, UI errors, logs, and telemetry expose no forbidden
   secret, raw upstream, authority, or Paste-body data.
10. No Batch Mode, Phase 6 redesign, destructive migration, deployment, or
    upstream/root/patch-series change is introduced.

## 3.12 Test specification

Record RED → GREEN → REFACTOR → REGRESSION evidence in the eventual Phase 7
TODO. Use deterministic/frozen time for frontend timer tests.

| Behavior          | Required tests                                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Countdown         | Timed valid ISO format; permanent no timer; no duration-derived deadline; coarse cadence/cleanup; elapsed no-negative accessible stale state; no tick-driven fetch/upstream call.                          |
| Restore UI        | Restore visible only for archived entry; pending disables duplicate; no optimistic tab move/countdown clear; success moves returned entry to Active; failure/uncertain leaves row unchanged.               |
| Permanent restore | Service/client/store proves checked-to-unchecked source precision, upstream ordering, final `active/permanent/null`, version/result persistence, replay/conflict.                                          |
| Timed restore     | Proves `e=never` confirmed before source/final state, exact prior deadline retained on failure, null only after success, ambiguous post-dispatch is reconciliation-required.                               |
| Reconciliation    | Confirmed classified missing/expired removes archived binding/list row; transient/outage/ambiguous read, malformed expiry, pending claim, and persistence failure retain it with safe outcome.             |
| Browser boundary  | No/invalid/revoked session `401`; invalid Origin/CSRF, no scope, cross-scope/guessed ID, and browser scope/expiry/credential fields fail before service/Paste call; public responses/logs are secret-free. |
| Regression        | Existing Phase 3 claims, Phase 4 mappings, Phase 6 completion/public projection, Active-permanent behavior, TypeScript/lint/format/frontend build, Worker and frontend suites remain green.                |

## 3.13 Open questions

No unresolved product decision is identified. D-011 through D-013 and the
applicable design/lifecycle/security/API documents lock the required behavior.
The narrow reconciliation adapter route is an implementation choice only while
it preserves §3.6 exactly. If current Phase 6 contracts cannot support that
choice without changing observable API, trust boundary, acceptance criteria,
or a destructive migration, continuous execution must STOP for owner decision.

## Internal consistency review

Reviewed against `AGENTS.md`, D-001–D-030 (especially D-007, D-008,
D-011–D-017, and D-030), the Phase 7 PLAN, Phase 3 durable-operation/service
contracts, Phase 6 public projection/browser boundary and
`downstream/addons/feishu/docs/phase6-browser-trust.md`,
`docs/IMPLEMENTATION_ORDER.md` Phase 7, `docs/DESIGN.md`,
`docs/FRONTEND.md` §§9–12, `docs/RETENTION_LIFECYCLE.md` §§6–9,
`docs/SECURITY.md`, `docs/API_CONTRACT.md` §§1–2 and 5–6,
`docs/TESTING.md`, and `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.3.

The SPEC is consistent with the PLAN: it keeps `expiresAt` server-authoritative
and countdown display-only; requires timed expiry cancellation before restore
success; makes missing/expired cleanup evidence-based; reuses rather than
extends Phase 6 authorization; preserves upstream Paste-body authority and
server-only secrets; and excludes Batch Mode, auth redesign, destructive
migrations, deployment, and upstream work. No STOP condition is present.
Implementation has NOT started.
