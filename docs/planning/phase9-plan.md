# Phase 9 — Batch backend PLAN

Status: CONTINUOUS-MODE PLAN READY AFTER INTERNAL CONSISTENCY REVIEW.

Implementation has NOT started.

## Authorization and baseline

This is an in-scope planning artifact for roadmap Phase 9 under **Owner
Delegated Continuous Execution** (D-030) and
`docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.1.1. It follows Phase 8 completion
through PR #35, with `downstream/main` at
`20644bb5c613de0451b29db60010c534d1c438f9`. It does not authorize work beyond
Phase 9, a production deployment, a destructive migration, Phase 10 release
hardening, PR #5, `upstream-sync`, or a `goshujin` rewrite.

`AGENTS.md` §18 permits the normal owner pauses for PLAN/SPEC/PHASE/TODO only
within D-030's bounded roadmap delegation. It does not permit silent API,
security, trust, ownership, or acceptance-criteria drift. The Phase 9 SPEC
must therefore resolve the contract details recorded below before code starts.

Phases 6 and 7 established the unchanged browser mutation boundary: opaque
server-side Add-on session, exact configured Origin, session-bound CSRF header,
and a server-derived principal joined to stored allowed scopes before lifecycle
or Paste work. They also established the single-entry Archive/countdown/Restore
and reconciliation semantics. Phase 8 established the separate Batch Mode
selection, action bar, confirmation UX, and a local `BatchActionIntent` seam.
Phase 9 connects that seam to real server execution; it does not replace or
redesign any of those prior contracts.

## Objective

Define the Phase 9 Add-on implementation contract for a server-authorized
`/api/batch` equivalent that executes the existing three lifecycle actions per
entry, returns a sanitized partial-success result with aggregate counts, is
safe to retry, and lets the existing Batch Mode show authoritative mixed
outcomes without exposing Paste credentials or pretending the operation was
globally transactional.

## Context

D-014 fixes Batch Mode as temporary selection state separate from Markdown task
state. D-015 requires a backend-orchestrated, per-Paste mutation with per-item
outcomes and aggregate counts. The batch actions are exactly D-010's existing
actions: `archive_permanent`, `archive_expiring`, and `delete`. A batch action
does not introduce a fourth lifecycle transition, batch restore, browser-owned
expiry authority, or a second authoritative Paste-body store.

Phase 8.3 deliberately stops at the frontend-local `BatchActionIntent` carrying
only an allowed action and Add-on entry IDs. Its deferred notice and inert
callback neither fetch nor change state. Phase 9 replaces that local handoff
with an authenticated request and a result model; it must remove the deferred
presentation only when real execution and result handling are available. It
must not fall back to hidden serial browser calls to the single-entry endpoint.

`docs/API_CONTRACT.md` §§7–9 supplies the conceptual request, response, and
idempotency direction. `docs/DESIGN.md` §§6.3–6.4 and `docs/FRONTEND.md` §§6–8
lock the confirmation/result experience. `docs/SECURITY.md` §§2, 5–7 retains
the session/CSRF/Origin/principal-scope boundary, destructive confirmation,
per-ID authorization, server-only credential lookup, and sanitized errors.

## Assumptions and verification

| Assumption                                                                                                                   | Verification method / current basis                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The Phase 6 browser protection helpers and Phase 7 services are the only mutation trust/lifecycle primitives required.       | Inspect the merged Worker, `downstream/addons/feishu/docs/phase6-browser-trust.md`, and Phase 7 implementation/tests. Reuse session, Origin, CSRF, principal and scope checks; do not add browser authority. |
| The Phase 8.3 seam currently contains only an action and Add-on entry IDs.                                                   | Inspect `frontend/App.tsx`, `BatchActionBar`, `BatchActionDialog`, and their tests. Preserve its public-safe shape until the SPEC defines the typed request/result adapter.                                  |
| The single-entry service already executes password-backed archive/delete semantics and durable-operation handling.           | Inspect completion/restore service, store, and Paste-client tests. Batch must orchestrate the same three action semantics, not duplicate or weaken them.                                                     |
| API documentation supplies a conceptual response but leaves status and exact duplicate semantics to implementation planning. | Verify `docs/API_CONTRACT.md` §§7–9: JSON per-item outcomes are authoritative; processed mixed results may use 200/207-like status, and the exact policy must be documented and tested.                      |
| The current Active list remains a visible/current-loaded Phase 8 selection boundary.                                         | Verify `docs/FRONTEND.md` §6.1 and Phase 8 PLAN/SPEC. Phase 9 receives selected IDs only; it does not introduce pagination, server-side select-all, or a different selection scope.                          |

## Expected behavior and acceptance direction

1. The Worker exposes one authenticated batch mutation route (nominally
   `POST /api/batch`) with JSON containing only a bounded list of Add-on entry
   IDs and one allowed action. It requires the existing session, exact Origin,
   session-bound CSRF, and an `Idempotency-Key` or documented equivalent.
   Browser input must not include a Paste name/body, management password/URL,
   trusted principal/scope, Feishu token, or retention deadline.
2. The route validates method, content type, payload shape/size, action,
   nonempty/unique bounded IDs, and idempotency identity before dispatch.
   Authentication, Origin, CSRF, and principal/scope failures reject before
   any lifecycle, credential, or upstream operation. The SPEC must define
   validation/status/error-code details without exposing sensitive facts.
3. For every requested ID, the backend independently loads its binding,
   derives authorization from the server-side principal and allowed scopes,
   retrieves its management password only server-side, and invokes the existing
   single-entry-equivalent lifecycle operation. Authorization failure or a
   missing binding for one ID is a sanitized result for that ID; it must not
   grant authority over any other ID or turn the batch into a global rollback.
4. Archive permanent, archive expiring, and delete retain D-010 and Phase 7
   semantics per successful item. Timed results return the authoritative
   server/upstream `expiresAt`; permanent and delete results do not manufacture
   a browser deadline. Delete removes its binding and has no v1 Archive
   tombstone. Batch does not include Restore or alter Archive countdown or
   reconciliation rules.
5. The result is authoritative JSON with `requested`, `succeeded`, `failed`,
   and exactly one sanitized result per accepted requested ID. Each result
   identifies its Add-on entry ID and either a safe final public state or a
   stable sanitized failure code plus retryability. It contains no password,
   management URL, raw upstream response/error, token, scope, Paste body, or
   credential ciphertext. The SPEC must choose and test the top-level status
   for all-success, mixed, and pre-dispatch rejection; UI logic relies on JSON
   result details for processed batches.
6. A batch is explicitly not globally transactional. Completed item effects
   remain committed if later items fail. The backend reports every known item
   outcome, preserves enough durable operation evidence for ambiguous dispatch,
   and never reports all-success/all-failed merely because one item failed.
7. Retry/idempotency prevents accidental duplicate effects. A repeat with the
   same request identity and same authorized request shape replays or returns
   the recorded compatible result; incompatible reuse is rejected. The SPEC
   must define the request identity scope, canonical request fingerprint,
   retention, concurrent duplicate handling, and per-item final-state handling
   (including already-deleted/missing content) using the existing durable
   operation/reconciliation model. A retry must not issue a second destructive
   delete simply because the first response was lost.
8. On confirmation, the Phase 8 client enters a batch in-flight state, disables
   duplicate batch actions, submits the safe request with current session/CSRF
   material, and shows no optimistic lifecycle mutation. On an authoritative
   result it removes/moves only successful Active entries as their returned
   state dictates, leaves failed items visible and preferably selected, stores
   `batchResult`, and presents a concise summary such as `已处理 18 项，2 项失败`.
   It provides retry from the retained failed selection without forcing users to
   reconstruct it. The Phase 8 selection/confirmation UI is extended, not
   redesigned.
9. Transport, authentication, validation, or unavailable-result failures do
   not invent per-item success. The UI retains safe selection and gives a
   sanitized retryable/unavailable state. Raw upstream errors and secret-bearing
   data never reach browser output, telemetry, or logs.

## Non-goals

- No change to the Phase 6 session/OAuth/Origin/CSRF/principal-to-scope trust
  boundary; no browser-held Feishu/Paste credential, client scope, or new
  authorization source.
- No Phase 7 behavior change: no batch Restore, polling, client-authored
  `expiresAt`, tombstones, Trash view, or changed single-entry Archive/countdown/
  Restore/reconciliation semantics.
- No Phase 8 redesign: selectors remain distinct from Markdown checkboxes;
  visible/current-loaded selection, compact action bar, interaction lock, and
  one expiring/delete confirmation remain intact.
- No Phase 10 release hardening, E2E/release assembly, deployment, upstream
  patch/root dependency/workflow change, patch-series work, `upstream-sync`,
  `goshujin`, or PR #5 work.
- No new content database or Add-on authoritative Paste-body copy.

## Risks and unresolved implementation questions

- **Batch idempotency record:** API_CONTRACT §9 gives mechanisms rather than a
  finalized shape. The SPEC must select the durable batch/request representation,
  same-key fingerprint/conflict response, replay policy, TTL/cleanup, and its
  interaction with Phase 3 per-entry operation records. It must be implementable
  without making a duplicate delete possible after ambiguous dispatch.
- **Input limits and duplicate IDs:** The SPEC must select documented maximum
  item count/body size, whether duplicate IDs are rejected versus normalized,
  ordering guarantees, and the behavior of empty/malformed requests. These are
  API limits, not a product expansion.
- **Processed-item status policy:** The exact 200 versus 207-like status for a
  mixed processed batch, and whether authorization/missing-item failures appear
  per-item or reject the full request before processing, must be settled in the
  SPEC with a security review. The choice must not leak scope/binding existence
  or create an untested global-transaction implication.
- **Failure result taxonomy:** Map existing lifecycle/Paste-client outcomes to
  stable public codes and `retryable` conservatively. The SPEC must distinguish
  confirmed missing/expired from uncertain upstream/storage outcomes and retain
  Phase 7 reconciliation rules.
- **Frontend state transition:** The SPEC must define the precise successful-row
  application order, selection pruning, result-summary dismissal, retry key
  creation, and how a list refresh during flight is handled. It must retain
  failed selections and never apply a returned state to a mismatched ID.

No unresolved owner product decision is currently identified: D-010, D-014,
and D-015 prescribe actions, selector separation, and partial success. The
contract/security decisions above must be made explicitly in the Phase 9 SPEC;
if they require a new observable API/security/acceptance behavior beyond the
cited documentation, D-030 requires STOP and owner direction.

## Proposed implementation approach

1. Inspect the merged Phase 6/7 Worker route composition, browser protection,
   binding/store interfaces, durable-operation records, lifecycle service, and
   tests; inspect Phase 8.3's `BatchActionIntent` and UI tests. Record the
   smallest Add-on-local integration point before changing code.
2. Write the Phase 9 SPEC request/result schemas and authorization/idempotency
   rules first, including explicit limits, mixed-status policy, sanitized codes,
   and exact retry behavior. Define frontend-safe shared types only after the
   wire contract is approved by the planning sequence.
3. Add RED Worker tests for method/input limits; no-session, Origin, CSRF,
   scope, guessed-ID, and browser-supplied-credential negatives; independent
   per-item processing; aggregate/result integrity; secret redaction; duplicate
   request replay/conflict; and ambiguous/delete retry behavior.
4. Implement the smallest batch handler/service adapter that authorizes and
   resolves each binding/credential server-side, delegates each action to the
   existing lifecycle semantics, persists/replays idempotent operation results,
   and produces only public sanitized results. Do not introduce a browser loop
   over individual mutation endpoints or a global transaction claim.
5. Replace the Phase 8 deferred callback with a frontend batch request adapter.
   Add RED then GREEN tests for in-flight disabling, request safety,
   authoritative successful-row updates, retained failed selection, aggregate
   summary, and retry. Preserve existing Batch Mode controls and dialogs.
6. Record TDD RED/GREEN/REFACTOR/REGRESSION evidence in the Phase 9 TODO after
   the subsequent planning artifacts exist. Run focused Worker/frontend tests,
   type/format/build and prior-phase regressions, then obtain current-HEAD CI
   and the mandatory AI Review Bot Phase Review Gate for every implementation
   PR before merge.

## Expected files/components (candidates, not a forced file list)

- `downstream/addons/feishu/worker/` — route composition plus a batch handler
  and minimal service/store adapters reusing browser authorization and lifecycle
  work; no upstream Worker modifications.
- `downstream/addons/feishu/shared/` — public-safe batch request/result/action
  types and validation helpers where they avoid frontend/Worker contract drift;
  never secret-bearing binding or Paste types.
- `downstream/addons/feishu/frontend/` — replacement for the 8.3 deferred
  intent with authenticated request, `batchResult`, in-flight disable, mixed
  result summary, successful-row reconciliation, failed-selection retention,
  and retry presentation.
- `downstream/addons/feishu/tests/` and frontend `*.spec.tsx` — Worker
  contract/security/idempotency and frontend partial-result/retry regressions.
- `downstream/addons/feishu/docs/`, `docs/API_CONTRACT.md`,
  `docs/FRONTEND.md`, `docs/SECURITY.md`, and planning artifacts — update only
  where implementation locks or clarifies the approved Phase 9 contract.

## Validation strategy

- Worker RED-first contract tests: only POST JSON with bounded safe fields;
  valid action/IDs; exact result cardinality/aggregate counts; success states
  including authoritative timed `expiresAt`; sanitized per-item failure codes;
  and documented all-success/mixed/rejected statuses.
- Trust/secret tests from `SECURITY.md` §§2, 6–8: no/invalid/revoked session
  is `401`; invalid Origin/CSRF rejects before operation; scope and guessed-ID
  authorization cannot expand; arbitrary paste/password/URL/body/deadline
  fields are rejected; credentials/tokens/scopes/raw errors do not appear in
  responses/logs.
- Per-item/idempotency tests: a later failure leaves prior success intact;
  results report the mix accurately; same-key equivalent retry replays safely;
  conflicting key reuse rejects; concurrent/ambiguous retry does not duplicate
  mutation or delete; retryable failed rows can be sent again safely.
- Frontend RED-first tests from `docs/FRONTEND.md` §§6–8 and §11: confirmation
  starts one request; controls are disabled while in flight; no optimistic row
  change; successes leave Active appropriately; failures remain selected and
  retryable; summary reports aggregate counts; transport failure claims no
  unverified item result; Phase 8 separate-selector and dialog semantics stay
  unchanged.
- Regression checks: Phase 6 single completion/trust, Phase 7 authoritative
  Archive/countdown/Restore/reconciliation, Phase 8 selection/lock/action bar,
  Add-on type checking, lint/Prettier, frontend build, Worker tests, and
  relevant security tests. Confirm no polling, tombstones, deployment, root or
  upstream/patch work occurs.
- For every implementation PR, record exact TDD evidence and validation
  commands/results, require current-HEAD CI and completed AI Review Bot Phase
  Review Gate, and do not self-merge or treat bot unavailability as approval.

## Internal consistency review

Reviewed against `AGENTS.md` §§12–18 (including §18 continuous-mode rules),
D-007, D-010, D-014, D-015, and D-030; `docs/IMPLEMENTATION_ORDER.md` Phase 9;
`docs/CHANGE_CONTEXT_AND_REVIEW.md` §§9–10.7; `docs/DESIGN.md` §§6.3–6.4 and
§7; `docs/FRONTEND.md` §§6–8 and §11; `docs/API_CONTRACT.md` §§7–9;
`docs/SECURITY.md` §§1–2 and §§5–8; and the Phase 8 PLAN/SPEC/TODO deferred
`BatchActionIntent` seam. The PLAN keeps credentials and authorization
server-side, makes every operation per-item rather than globally transactional,
requires authoritative aggregate/per-item partial results and safe retries,
and extends the existing frontend for in-flight/mixed-result behavior. It
reuses Phase 6 trust, Phase 7 lifecycle semantics, and Phase 8 UI without
redesign. It excludes Phase 10, polling, tombstones, deployment, upstream,
PR #5, and `goshujin`. No D-030 STOP condition is currently present.

Implementation has NOT started.
