# Phase 7 — Countdown + restore PHASE decomposition

Status: CONTINUOUS-MODE PHASE READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started. This follows the [Phase 7 PLAN](phase7-plan.md)
and [Phase 7 SPEC](phase7-spec.md). Each implementation phase requires a
separate review-gated PR; a dependent phase starts only after its predecessor
has merged and `downstream/main` has been refreshed and verified clean.

## Phase 7.1 — Archive countdown presentation

- **Goal:** make the authoritative timed-archive deadline legible without
  giving the browser lifecycle or retention authority.
- **Scope:** compact accessible permanent/timed Archive status, deterministic
  ISO validation and formatting, coarse local refresh lifecycle, elapsed and
  invalid stale presentation, and narrow authenticated reconciliation trigger
  wiring if the existing authorized adapter can support it without changing
  the SPEC contract.
- **Dependencies:** merged Phase 6.2; current public projection with exact
  timed `expiresAt`; Phase 6 browser trust boundary.
- **Inputs:** SPEC §§3.5–3.6 and 3.11–3.12; `docs/FRONTEND.md` §§9–12;
  `docs/RETENTION_LIFECYCLE.md` §7; Phase 6 trusted browser-route contract.
- **Deliverables:** frontend countdown/status component or hook, stale/error
  presentation, and frontend/adapter tests. If reconciliation needs a new
  route rather than a contract-preserving adapter extension, STOP for SPEC
  change control before implementation.
- **Acceptance criteria:** satisfies SPEC acceptance criteria 1–3 and the
  applicable display/security portions of 6 and 9: valid timed entries use
  only returned `expiresAt`; permanent entries have no timer; updates are
  coarse and cleaned up; elapsed/invalid values never show negative time,
  poll upstream, or locally remove/move a row.
- **Tests required (RED first):** valid timed and permanent rendering,
  frozen-time compact format, coarse cadence and cleanup, accessible
  non-color stale status, invalid/elapsed no-negative behavior, and no
  tick-driven fetch. Exercise session/CSRF handling and secret-free UI errors
  for any reconciliation request.
- **Expected branch type:** `feat/feishu-phase7-countdown`.
- **Expected PR target:** `downstream/main`.
- **Risks:** browser clock skew, interval leaks/excess rendering, malformed
  legacy metadata, and accidentally making an elapsed timer authoritative.
- **Exit criteria:** focused frontend checks and regressions pass; TDD
  RED/GREEN/REFACTOR/REGRESSION evidence is recorded; docs are updated if the
  implemented adapter contract needs it; current-HEAD CI and AI Review Bot
  Phase Review Gate pass before merge.

## Phase 7.2 — Permanent archived-entry restore

- **Goal:** safely return a permanent archived entry and exactly its managed
  task to Active/permanent state.
- **Scope:** narrow authenticated restore adapter, Phase 3 scoped durable
  restore claim/replay/conflict handling, archived-state validation,
  deterministic checked-to-unchecked managed-task source update, final
  lifecycle persistence/public projection, and Archive Restore UI pending,
  success, and failure behavior for permanent entries.
- **Dependencies:** Phase 7.1 merged, refreshed `downstream/main`, and the
  Phase 6 `authorizeBrowserMutation` boundary plus lifecycle/client/store
  extension points verified against actual code.
- **Inputs:** SPEC §§3.5–3.10; `docs/API_CONTRACT.md` §§1, 2, and 6;
  `docs/RETENTION_LIFECYCLE.md` §§6 and 9; Phase 6 browser-trust note.
- **Deliverables:** server-only permanent restore flow and allowlisted result,
  Restore control/request wiring, additive metadata only if tests prove it is
  needed, and Worker/frontend regression coverage.
- **Acceptance criteria:** satisfies SPEC acceptance criteria 4, 6, 7, and 9
  for permanent restore: only archived authorized entries restore; the source
  change is exact; final state is returned/persisted as
  `active/permanent/null` only after required server-side work; identical
  replay is stable and conflicting/concurrent/uncertain work is fail-closed.
- **Tests required (RED first):** session/Origin/CSRF/scope/cross-scope
  rejection before claim/store/Paste activity; archived-state and
  managed-source precision; upstream/source/persistence ordering; public
  result and secret/log redaction; replay/conflict/pending/uncertain cases;
  Restore pending disable, no optimistic move, success move, and failure
  retention.
- **Expected branch type:** `feat/feishu-phase7-permanent-restore`.
- **Expected PR target:** `downstream/main`.
- **Risks:** source-location ambiguity, duplicate restore dispatch, a
  persistence failure after upstream work, and accidental browser authority
  expansion.
- **Exit criteria:** all permanent-restore acceptance/tests and Phase 3/6
  regressions pass; TDD evidence and documentation impact are recorded;
  current-HEAD CI and AI Review Bot Phase Review Gate pass before merge.

## Phase 7.3 — Timed restore and expiry cancellation

- **Goal:** restore a timed archive only after the same upstream Paste has
  definitely become non-expiring.
- **Scope:** timed restore specialization through the server-held credential,
  confirmed `e=never`/generic-equivalent transition before source/final state,
  authoritative deadline retention/clearing, durable ambiguous-outcome
  reconciliation evidence, and timed Restore UI behavior.
- **Dependencies:** Phase 7.2 merged and `downstream/main` refreshed. It must
  reuse, not redesign, its authenticated restore adapter and durable operation
  semantics.
- **Inputs:** SPEC §§3.5, 3.6, 3.7, 3.10–3.12;
  `docs/DESIGN.md` §5; `docs/RETENTION_LIFECYCLE.md` §§6 and 9;
  `docs/FRONTEND.md` §10.
- **Deliverables:** ordered timed restore lifecycle/client behavior, safe
  public result/error mapping, and worker/frontend tests proving no optimistic
  countdown clear or Active move.
- **Acceptance criteria:** satisfies SPEC acceptance criteria 5, 6, 7, and 9:
  upstream cancellation succeeds before source restoration/final persistence;
  `expiresAt` is cleared only in the confirmed final
  `active/permanent/null` result; cancellation/source/persistence uncertainty
  remains archived/timed and reconciliation-required without blind retry.
- **Tests required (RED first):** `e=never` before source/final lifecycle
  state; failed cancellation preserves checked source and exact prior deadline;
  ambiguous post-dispatch and persistence failure preserve durable evidence;
  replay/conflict/concurrency; browser authorization negatives; timed Restore
  pending/failure/success and no optimistic timer clear/tab move.
- **Expected branch type:** `feat/feishu-phase7-timed-restore`.
- **Expected PR target:** `downstream/main`.
- **Risks:** treating an upstream response as confirmation when dispatch is
  ambiguous, clearing expiry too early, and breaking generic upstream
  retention compatibility.
- **Exit criteria:** ordering, failure, and UI tests pass with Phase 3/6
  regressions; TDD evidence is recorded; no upstream patch/root change is
  introduced; current-HEAD CI and AI Review Bot Phase Review Gate pass before
  merge.

## Phase 7.4 — Confirmed missing/expired reconciliation

- **Goal:** ensure Archive omits only archived bindings whose upstream Paste
  is definitely missing or expired, while preserving uncertain cases for safe
  retry/reconciliation.
- **Scope:** narrow authorized reconciliation operation or a
  contract-preserving equivalent, server-side confirmation classification,
  archived-binding removal after definitive absence, completed-operation
  cleanup under established store policy, sanitized retryable/
  `RECONCILIATION_REQUIRED` outcomes, and stale-row frontend handling.
- **Dependencies:** Phase 7.3 merged and `downstream/main` refreshed. The
  phase depends on the finalized restore durable-operation behavior so it
  cannot steal or clear an in-flight restore claim.
- **Inputs:** SPEC §§3.5–3.6 and 3.10–3.12; D-011; `docs/FRONTEND.md` §11;
  `docs/RETENTION_LIFECYCLE.md` §7; Phase 6 browser trust boundary.
- **Deliverables:** server-authoritative reconcile path/result classification,
  Archive list/row update behavior, and service/store/adapter/frontend tests.
- **Acceptance criteria:** satisfies SPEC acceptance criteria 3, 6, 8, and 9:
  only classified definitive `ENTRY_NOT_FOUND`/expired evidence removes an
  archived row; outage, ambiguous response, invalid metadata, credential/auth,
  pending operation, and persistence failure retain it with secret-free stable
  retry/reconciliation status.
- **Tests required (RED first):** confirmed missing/expired removal and list
  omission; outage/transport/ambiguous 404-like response; malformed metadata;
  credential/auth error; pending restore claim; persistence failure; no
  browser-supplied authority; secret-free response/log/UI errors; retry and
  retained-row behavior.
- **Expected branch type:** `feat/feishu-phase7-reconciliation`.
- **Expected PR target:** `downstream/main`.
- **Risks:** over-classifying absence, removing a binding after transient
  failure, operation-claim races, and exposing raw upstream diagnostics.
- **Exit criteria:** reconciliation acceptance/tests and full relevant Worker,
  frontend, Phase 3–6 regressions pass; TDD evidence/docs impact are recorded;
  current-HEAD CI and AI Review Bot Phase Review Gate pass before merge.

## Internal consistency review

Reviewed against the Phase 7 PLAN/SPEC, `AGENTS.md`, D-011–D-013 and D-030,
`docs/CHANGE_CONTEXT_AND_REVIEW.md` §§10.4–10.5,
`docs/DESIGN.md` §§4–5 and §10, `docs/FRONTEND.md` §§9–12,
`docs/RETENTION_LIFECYCLE.md` §§6–9, `docs/SECURITY.md`,
`docs/API_CONTRACT.md` §§1–2 and §6, and
`downstream/addons/feishu/docs/phase6-browser-trust.md`. The sequence is
small and mergeable, makes dependencies explicit, reuses the Phase 6 browser
trust boundary without new browser authority, retains upstream Paste-body and
credential ownership, and excludes Batch Mode, upstream work, deployment,
and destructive migration. A new route or observable contract outside the
SPEC is a §10.5 STOP. No STOP currently exists. Implementation has NOT
started.
