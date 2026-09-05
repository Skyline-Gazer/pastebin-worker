# Phase 7 — Countdown + restore PLAN

Status: CONTINUOUS-MODE PLAN READY AFTER INTERNAL CONSISTENCY REVIEW.

Implementation has NOT started.

## Authorization and baseline

This is an in-scope planning artifact for roadmap Phase 7 under **Owner
Delegated Continuous Execution** (D-030) and
`docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.1.1. It follows Phase 6 completion
through PRs #19–#22, with `downstream/main` at
`84afe5d0c141a20bd7932e5f052b45a241737338`. It does not authorize work beyond
Phase 7, a production deployment, a destructive migration, PR #5,
`upstream-sync`, or a `goshujin` rewrite.

Phase 6 established the approved browser boundary: an opaque server-side
Add-on session, exact allowed Origin, session-bound CSRF token, and a
server-derived principal joined to stored allowed scopes before any lifecycle
or Paste operation. Phase 7 reuses that boundary unchanged. It must not
introduce browser-supplied identity, scope, credentials, expiry authority, or
another trust boundary.

## Objective

Define the Phase 7 implementation contract for displaying a compact,
coarse/live countdown from the authoritative timed-archive `expiresAt`;
restoring archived permanent entries; restoring timed archives only after
expiration is cancelled upstream; and reconciling confirmed missing or expired
archived Pasts so Archive contains only still-existing entries.

## Context

Phase 6 can archive one managed entry as permanent or timed, captures the
upstream-returned ISO `expiresAt`, and presents Archive state after a confirmed
mutation. It intentionally excluded countdowns, restore, and stale/missing
reconciliation. Without Phase 7, a timed archive has no useful remaining-time
display and neither kind of archive can return safely to Active.

D-011 requires Archive to contain only archived entries that still exist.
D-012 makes the captured upstream deadline authoritative. D-013 requires a
timed restore to cancel expiration before success is reported. This work is
entirely an Add-on lifecycle/frontend concern under D-002 and D-017; the
generic upstream `e=never`/`e=max` capability remains unchanged and contains
no Feishu behavior.

## Assumptions and verification

| Assumption                                                                                                                            | Verification method / current basis                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 6's session, Origin, CSRF, and principal-to-scope authorization are the sole browser mutation boundary needed here.             | Verify `downstream/addons/feishu/docs/phase6-browser-trust.md` and the merged Phase 6 Worker routes/tests; Phase 7 may reuse `authorizeBrowserMutation` or its approved equivalent but may not broaden its inputs or authority. |
| Archived public state includes lifecycle fields sufficient for countdown and restore UI.                                              | Verify Phase 6 public projection and `docs/API_CONTRACT.md` §§2, 5–6. Timed state has an exact ISO `expiresAt`; permanent/active state has `expiresAt: null`.                                                                   |
| The lifecycle service and Paste client can make a password-backed same-Paste update and retain ambiguous outcomes for reconciliation. | Verify Phase 3/6 service, claim, and Paste-client tests plus `phase6-browser-trust.md`; restore must use that server-only capability rather than send a browser request to Pastebin.                                            |
| Confirmed upstream absence can be distinguished from a transient/ambiguous failure.                                                   | Verify existing sanitized Paste error/result handling. The Phase 7 SPEC must name the evidence and result codes used; unknown/outage outcomes may not be treated as deletion.                                                   |
| Countdown refresh can be client-local display state because the deadline itself is already authoritative.                             | Verify `docs/FRONTEND.md` §9 and `docs/RETENTION_LIFECYCLE.md` §7. The browser may calculate remaining time from returned `expiresAt` and current time, never manufacture `expiresAt` from `MAX_EXPIRATION`.                    |

## Expected behavior and acceptance direction

1. A timed Archive row with a valid authoritative `expiresAt` displays a
   compact remaining-time status (for example, days/hours). Refresh frequency
   is no finer than its displayed precision; minute-level or another coarse
   interval is sufficient. Permanent archives display their permanent state,
   not a countdown.
2. Countdown is display-only. A locally elapsed deadline is rendered as
   expired/stale rather than a negative timer and triggers an authenticated
   reconciliation path; it does not let browser time delete a binding, infer
   successful expiry, or establish a deadline.
3. Restore is available only for an archived entry. A permanent restore changes
   the managed task source back to unchecked and records/returns
   `active/permanent/null` only after its required upstream/source work
   succeeds.
4. A timed restore must first successfully switch the upstream Paste back to
   non-expiring (`e=never` or the generic equivalent), then restore the managed
   task source and persist/return `active/permanent/null`. The UI remains
   archived/timed with its existing authoritative deadline until that final
   success is returned; it must not optimistically clear the timer or move the
   row to Active.
5. Restore and reconciliation use the Phase 6 authenticated session, exact
   Origin, session CSRF, server-derived principal-to-scope authorization, and
   Phase 3 durable-operation/idempotency/reconciliation model before lifecycle
   or upstream work. Browser requests contain only the entry identifier and
   approved request metadata, never a scope, Feishu token, management password,
   management URL, Paste body, or expiry value as authority.
6. On a confirmed upstream missing/expired result, backend reconciliation
   removes or marks the stale archived binding so it no longer appears in
   Archive, consistent with D-011. A transient error, invalid metadata, local
   persistence failure after dispatch, or otherwise uncertain result remains
   reconciliation-required and returns a sanitized retryable outcome; it is
   not silently removed or reported as restored.
7. Browser-visible responses, rendered errors, telemetry, and logs remain
   secret-free and do not disclose server credentials, raw upstream management
   data/errors, principal/scope authority, OAuth/session/CSRF secrets, or Paste
   bodies beyond the already permitted rendered entry data.

## Non-goals

- No Batch Mode selectors, toolbar, interaction suppression, batch endpoint,
  partial-success flow, or batch restore (Phases 8–9).
- No change to the Phase 6 browser trust/session/CSRF/principal-to-scope
  contract, no browser Feishu token, and no new authorization source.
- No generic upstream patch, root/upstream dependency or workflow change,
  patch-series update, `upstream-sync` work, or Pastebin UI change.
- No second authoritative Paste-body store, management-password exposure,
  destructive D1 migration, production deployment, or tombstone/trash view.
- No precise per-second timer requirement, client-created deadline, automatic
  restore, or treating an uncertain upstream result as confirmed expiry.

## Risks and unresolved implementation questions

- **Restore ordering and uncertain dispatch:** an upstream transition may have
  occurred even if the response/persistence step fails. The existing durable
  claim/reconciliation path must preserve evidence and block unsafe blind
  retries; the SPEC must define replay/conflict behavior for restore.
- **Missing versus unknown:** only a confirmed upstream missing/expired result
  can reconcile an Archive row away. Network, authentication, metadata, or D1
  failures must remain visible as a sanitized retry/reconciliation state.
- **Timer lifecycle:** interval cleanup, tab changes, unmounts, invalid ISO
  timestamps, and clock skew can cause stale UI or excessive renders. The
  implementation must use one coarse, accessible display mechanism and must
  not turn timer ticks into upstream polling.
- **Exact reconciliation trigger/API shape:** existing docs require behavior,
  but do not fix a route. The SPEC will select the smallest authenticated
  adapter shape (for example a restore result that reports confirmed absence
  and/or a narrow reconcile request) while preserving the documented public
  contract and no browser authority expansion. If this requires an observable
  API or lifecycle rule beyond the cited documents, continuous execution must
  STOP for owner decision.
- **Source precision:** restoring only the one lifecycle-managed top-level task
  must not alter nested or ordinary rendered Markdown checkboxes. Existing
  Phase 6 source-location semantics must be verified before implementation.

No unresolved owner product decision is currently identified: D-011–D-013 and
the lifecycle/frontend/API documents prescribe the required outcomes. The
route-level detail above is an implementation choice only if it preserves those
outcomes and the approved Phase 6 public/security contract.

## Proposed implementation approach

1. Inspect the merged Phase 6 lifecycle service, binding schema, durable
   operation claims, Paste client, public DTOs, and frontend Archive model.
   Record the actual current restore/reconciliation extension points before
   changing code.
2. Extend Add-on-local lifecycle types and persistence additively only as
   necessary for restore operation state and confirmed stale reconciliation.
   Preserve existing bindings and the upstream Paste body as authoritative.
3. Add a narrow authenticated Worker adapter for restore and, if necessary, a
   narrow reconciliation operation. It reuses the Phase 6 authorization guard
   before resolving the binding/credential, uses bounded opaque idempotency
   identity for mutation/retry safety, and returns only allowlisted public
   state or stable sanitized outcomes.
4. Implement lifecycle restore ordering through the existing server-only
   Paste client: validate archived state and source precision; for timed state
   complete the non-expiring upstream transition before reporting success;
   make the deterministic managed-task change; then persist final
   active/permanent/null state only after confirmed upstream work. Route
   ambiguous post-dispatch outcomes to durable reconciliation.
5. Implement reconciliation as a server-authoritative verification of a stale
   timed archive. Remove Archive state only after confirmed absence/expiry;
   preserve retryable/uncertain state otherwise. Do not use a countdown tick as
   authority or poll upstream continuously.
6. Update Archive UI with an accessible compact countdown derived from the
   returned ISO timestamp and a coarse refresh lifecycle. Add a Restore action
   with pending/error handling; apply returned state only after success, move a
   restored row to Active, clear its timer, and leave the row unchanged on
   failure/reconciliation-required status.
7. Use TDD across service/store/client/adapter and frontend behavior. Record
   RED/GREEN/REFACTOR/REGRESSION evidence in the Phase 7 TODO once that artifact
   exists, then run focused and regression checks before each review-gated PR.

## Expected files/components (candidates, not a forced file list)

- `downstream/addons/feishu/worker/` — lifecycle service, browser adapter,
  authorization reuse, Paste client, public DTO/error mapping, and additive
  migration only if current persisted state needs it.
- `downstream/addons/feishu/shared/` — Add-on-local lifecycle/public-state and
  restore/reconciliation request-result types.
- `downstream/addons/feishu/frontend/` — Archive row/countdown, Restore action,
  coarse timer hook/state, and frontend tests.
- `downstream/addons/feishu/tests/` and colocated Worker/frontend test files —
  lifecycle, auth reuse, reconciliation, and UI regressions.
- `downstream/addons/feishu/docs/phase6-browser-trust.md` or a Phase 7
  Add-on-local lifecycle note — only if the implemented browser-route or
  operational contract needs durable operator/developer documentation.
- `docs/planning/phase7-spec.md`, `phase7-phases.md`, and `phase7-todo.md` —
  subsequent durable planning artifacts; relevant architecture/API/lifecycle
  docs only if implementation reveals a documentation gap without changing the
  locked behavior.

## Validation strategy

- Worker/service/store/client RED-first tests for permanent restore, timed
  restore ordering (`e=never` succeeds before final state), source precision,
  authoritative `expiresAt` clearing, archived-state validation, duplicate
  idempotency replay/conflict, and uncertain post-dispatch reconciliation.
- Authorization/security negative tests proving no session, invalid session,
  invalid Origin, invalid/missing CSRF, no scope, cross-scope entry, and
  browser-supplied scope/expiry/credential inputs fail before lifecycle or
  upstream activity; assert public responses/logs contain no secrets.
- Reconciliation tests for a confirmed missing/expired upstream Paste removing
  stale Archive state; transient 404-like ambiguity, outage, invalid metadata,
  and persistence failure retaining a sanitized reconciliation-required state.
- Frontend RED-first tests for compact timed countdown, no timer for permanent
  entries, coarse refresh and cleanup, elapsed status without negative display,
  accessible status text, restore pending/success/failure behavior, no
  optimistic Active transition, and Active/Archive movement only from returned
  authoritative state.
- Add-on TypeScript, lint/format, frontend build, Worker regression suite, and
  existing Phase 3–6 test suites. Confirm no upstream/root workflow/lockfile,
  patch-series, Batch Mode, or password/public-projection regressions.
- For every implementation PR: record TDD RED/GREEN/REFACTOR/REGRESSION
  evidence; obtain current-HEAD CI and a completed AI Review Bot Phase Review
  Gate before merge. No deploy or release assembly is part of this phase.

## Internal consistency review

Reviewed against `AGENTS.md`, D-001–D-030 (especially D-007, D-008,
D-011–D-017, and D-030), `docs/IMPLEMENTATION_ORDER.md` Phase 7,
`docs/CHANGE_CONTEXT_AND_REVIEW.md` §§10.1.1–10.7,
`docs/DESIGN.md` §§4–5 and §9, `docs/FRONTEND.md` §§9–12,
`docs/RETENTION_LIFECYCLE.md` §§6–9, `docs/SECURITY.md`,
`docs/API_CONTRACT.md` §§1–2 and §§5–6, and the merged Phase 6 browser-trust
contract. The plan reuses—not extends—the approved browser session, CSRF, and
principal-to-scope model; retains server-only credentials and upstream
Paste-body authority; makes reconciliation fail closed; and excludes Batch
Mode, destructive migration, deployment, and upstream work. No STOP condition
is currently present. Implementation has NOT started.
