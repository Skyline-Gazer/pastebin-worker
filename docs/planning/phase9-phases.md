# Phase 9 — Batch backend PHASE decomposition

Status: CONTINUOUS-MODE PHASE READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started. This decomposition implements the approved
[Phase 9 PLAN](phase9-plan.md) and [Phase 9 SPEC](phase9-spec.md), after
Phases 6–8. It is Add-on work targeting `downstream/main`; it does not change
upstream-owned Pastebin code.

## Phase 9.1 — Protected batch route, public types, and strict dispatch gate

- **Goal:** establish one safely bounded, authenticated entry point for a batch
  request before any binding, credential, lifecycle, or upstream work occurs.
- **Scope:** add public-safe batch action/request/result type boundaries,
  `POST /api/batch`, strict JSON/key/size/ID/action validation, and the
  unchanged Phase 6 session, exact-Origin, CSRF, and server-derived
  principal-to-allowed-scope gate. This phase establishes no lifecycle dispatch
  and does not make a browser authorization source.
- **Dependencies:** Phase 8.3 is merged and `downstream/main` is refreshed;
  inspect the actual Phase 6 authorization helper and the Phase 8
  `BatchActionIntent` seam before coding.
- **Inputs:** Phase 9 SPEC §§3.5–3.8 and 3.11–3.12; `docs/API_CONTRACT.md`
  §§7–9; `docs/SECURITY.md` §§2 and 6–8; Phase 6 browser-trust decision.
- **Deliverables:** route composition, public-safe schema/types, bounded
  request parser (50 unique ordered IDs, 256 characters each, 16 KiB body),
  documented pre-dispatch error mapping, and Worker contract/security tests.
- **Acceptance criteria:** only POST JSON with exactly `ids` and `action`, a
  valid `Idempotency-Key`, and Phase 6 protections reaches later dispatch;
  malformed, duplicate, oversize, or credential/scope/body/deadline-bearing
  input is rejected; no check touches binding/store/credential/Paste services
  before session/Origin/CSRF rejection; browser IDs do not authorize access.
- **Tests required:** RED-first method/media/strict-shape/body-limit/ID/action
  and idempotency-key tests; no/invalid/revoked session, bad Origin/CSRF,
  no-scope/cross-scope/guessed-ID and browser-supplied-authority negatives;
  secret/log redaction and Phase 6 regression tests.
- **Expected branch type:** `feat/feishu-batch-route` from refreshed
  `downstream/main`.
- **Expected PR target:** `downstream/main`.
- **Risks:** validation drift from the shared public contract, checking a
  binding too early, or accidentally widening the Phase 6 trust boundary.
- **Exit criteria:** RED/GREEN/REFACTOR/REGRESSION evidence is recorded;
  focused Worker/type/format checks and Phase 6–8 regressions pass; docs impact
  is reviewed; current-HEAD CI and AI Review Bot Phase Review Gate pass before
  merge.

## Phase 9.2 — Server-side lifecycle delegation and durable batch operation

- **Goal:** independently execute the three existing lifecycle actions using
  server-held authority while safely retaining durable batch/reconciliation
  evidence.
- **Scope:** for each accepted ID, derive allowed scopes server-side, resolve
  its binding and management password only server-side, create/coordinate an
  additive durable batch-operation record, derive per-item request identities,
  and delegate to existing archive-permanent, archive-expiring, or delete
  services. No lifecycle is reimplemented in the route.
- **Dependencies:** Phase 9.1 is merged and `downstream/main` refreshed; reuse
  Phase 3/7 binding, durable-operation, reconciliation, and Paste-client
  primitives verified against their merged implementation.
- **Inputs:** Phase 9 SPEC §§3.5–3.8 and 3.10–3.12; `docs/RETENTION_LIFECYCLE.md`
  §§9–10; `docs/SECURITY.md` §§1–2 and 6–7; API contract §§7–9.
- **Deliverables:** minimal batch service/store extensions, server-only
  credential resolution and per-item delegation, durable batch record and
  server-only item evidence, plus lifecycle/store tests.
- **Acceptance criteria:** each ID is authorized and executed independently;
  inaccessible/missing IDs become indistinguishable `ENTRY_UNAVAILABLE` item
  outcomes without granting other access; successes preserve existing ordering
  and transitions; delete creates no Archive tombstone; no batch Restore,
  fourth lifecycle, browser expiry authority, or second Paste-body store exists.
- **Tests required:** RED-first server credential lookup and rejected browser
  credential tests; all three action delegation/order tests; later failure
  retaining earlier success; scope/missing-binding isolation; timed authoritative
  `expiresAt`; delete binding removal; persistence/ambiguous-upstream
  reconciliation evidence; secret-free public/log output.
- **Expected branch type:** `feat/feishu-batch-lifecycle` from refreshed
  `downstream/main` after 9.1.
- **Expected PR target:** `downstream/main`.
- **Risks:** duplicate lifecycle logic, a password leak, misclassifying an
  uncertain dispatch, or an unsafe batch record cleanup policy.
- **Exit criteria:** delegation and durable-evidence acceptance/tests pass with
  Phase 3/6/7 regressions; TDD evidence and docs impact are recorded;
  current-HEAD CI and AI Review Bot Phase Review Gate pass before merge.

## Phase 9.3 — Authoritative partial result and safe idempotent replay

- **Goal:** finish batch execution with an exact sanitized result and prevent a
  lost response or concurrent retry from duplicating a mutation.
- **Scope:** canonical action-plus-ordered-ID fingerprint scoped to the
  server-derived principal and key; reserve/complete/replay/conflict behavior;
  aggregate counts and one input-order outcome per accepted ID; conservative
  retryability/error mapping. This phase completes the route's processed
  response contract.
- **Dependencies:** Phase 9.2 is merged and `downstream/main` refreshed; it
  builds on the durable record and per-entry operation/reconciliation evidence.
- **Inputs:** Phase 9 SPEC §§3.6–3.7 and 3.10–3.12; `docs/API_CONTRACT.md`
  §§8–9; `docs/TESTING.md` §§7–9.
- **Deliverables:** completed-result serializer, aggregate/result invariants,
  same-key replay, incompatible-key conflict, in-progress response, and
  corresponding Worker/store tests and narrowly necessary API/security docs.
- **Acceptance criteria:** processed all-success, mixed, and all-item-failed
  batches return `200` with exact counts and one ordered result each; an `ok`
  has only public state or `deleted: true`; failures expose only stable code and
  retryability; same principal/key/fingerprint replays the compatible recorded
  result without upstream calls; changed fingerprint is `409 REQUEST_CONFLICT`;
  concurrent/uncertain work is `409 BATCH_IN_PROGRESS`, never a second delete.
- **Tests required:** RED-first result cardinality/count/order/invariant tests;
  all-success/mixed/all-failed and public failure taxonomy; same-key replay,
  conflicting reuse, concurrent reservation, ambiguous delete/update and
  reconciliation-required cases; raw upstream/credential/scope redaction;
  prior lifecycle/idempotency regressions.
- **Expected branch type:** `feat/feishu-batch-idempotency` from refreshed
  `downstream/main` after 9.2.
- **Expected PR target:** `downstream/main`.
- **Risks:** treating HTTP status as item authority, returning an incomplete
  result, duplicate delete after response loss, or exposing internal evidence.
- **Exit criteria:** response and replay behavior meets the SPEC; Worker,
  shared-type, security, and Phase 3/6/7 regressions pass; TDD evidence/docs,
  current-HEAD CI, and AI Review Bot Phase Review Gate are complete before merge.

## Phase 9.4 — Phase 8 intent execution and mixed-result retry UX

- **Goal:** replace the inert Phase 8 handoff with one protected batch request
  and authoritative mixed-result presentation without redesigning Batch Mode.
- **Scope:** adapt `BatchActionIntent` to the approved request, create a fresh
  idempotency key per attempt, send existing session/CSRF material, maintain
  in-flight/result state, apply only matching successful rows, retain failed
  IDs for retry, and show accessible aggregate/per-item-safe results. Existing
  selectors, visible-set bound, action bar, confirmation rules, and lock stay
  intact.
- **Dependencies:** Phase 9.3 is merged and `downstream/main` refreshed; use
  its final public request/result contract rather than inventing client types.
- **Inputs:** Phase 9 SPEC §§3.5–3.6 and 3.9–3.12; `docs/FRONTEND.md` §§6–8
  and 11; `docs/DESIGN.md` §§6.3–6.4 and 7; Phase 8.3 seam/tests.
- **Deliverables:** frontend request adapter, in-flight disable, `batchResult`,
  successful-row reconciliation, retained failed selection/retry presentation,
  accessible summary, and frontend tests. No Batch Mode redesign or serial
  single-entry request loop.
- **Acceptance criteria:** confirmation makes exactly one safe request and no
  optimistic lifecycle claim; a valid processed result removes only matching
  successful archived/deleted Active rows, keeps failures selected/retryable,
  and announces accurate counts; retry submits only retained failed IDs with a
  new key; transport/auth/validation/unreadable failures retain selection and
  claim no per-item outcome.
- **Tests required:** RED-first request shape/CSRF/key and one-request tests;
  in-flight duplicate disable; mixed result row/selection/count behavior;
  retry fresh-key/failed-set behavior; malformed/transport failure retention;
  no secret/raw-error/deadline display; Phase 8 separate-selector,
  confirmation/lock and Phase 6/7 UI regressions.
- **Expected branch type:** `feat/feishu-batch-results` from refreshed
  `downstream/main` after 9.3.
- **Expected PR target:** `downstream/main`.
- **Risks:** stale response applied to a mismatched row, clearing failures,
  reusing a completed key, or smuggling a Batch Mode redesign into result UX.
- **Exit criteria:** all Phase 9 frontend acceptance/tests and relevant Worker
  contract regressions pass; TDD evidence/docs impact are recorded; current-HEAD
  CI and AI Review Bot Phase Review Gate pass before merge.

## Internal consistency review

Reviewed against the Phase 9 PLAN/SPEC, `docs/CHANGE_CONTEXT_AND_REVIEW.md`
§§10.4–10.5, `docs/API_CONTRACT.md`, `docs/SECURITY.md`,
`docs/RETENTION_LIFECYCLE.md`, `docs/DESIGN.md`, `docs/FRONTEND.md`,
`docs/TESTING.md`, `docs/IMPLEMENTATION_ORDER.md` Phase 9, Phase 6–8
PHASE/TODO artifacts, the Phase 6 browser-trust decision, and the Phase 8
`BatchActionIntent` seam. The sequence is mergeable and preserves Phase 6
trust unchanged. It introduces neither batch Restore, a fourth lifecycle, a
second Paste-body store, Phase 10/release/deploy work, destructive migration,
PR #5, `upstream-sync`, nor `goshujin` work. No STOP condition is present.
