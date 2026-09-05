# Phase 7 — Countdown + restore TODO

Status: CONTINUOUS-MODE TODO READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started. Active implementation checklist for the
[Phase 7 SPEC](phase7-spec.md) and [PHASE decomposition](phase7-phases.md).
Complete each numbered phase on a fresh branch from its merged predecessor;
do not start a dependent phase from an unmerged branch.

## 1. Phase 7.1 — countdown presentation

- [x] Refresh `downstream/main`; inspect Phase 6 public projection and trust
      reuse points; record RED tests before implementation.
- [x] Add frozen-time frontend RED tests for valid authoritative timed ISO,
      permanent no-timer state, compact accessible formatting, coarse refresh and
      cleanup, elapsed/invalid non-negative stale status, and no tick-driven fetch.
- [x] Implement display-only countdown state derived solely from returned
      `expiresAt`; never derive/store/change a deadline from duration or browser
      receipt time.
- [x] Keep elapsed/invalid rows archived and use only the approved
      authenticated reconciliation pathway; STOP before adding a route or changing
      the public contract outside SPEC §3.6.
- [ ] Record GREEN/REFACTOR/REGRESSION evidence; run focused frontend/type/
      format checks and current-HEAD review gate before merge.

## 2. Phase 7.2 — permanent restore

- [x] After 7.1 merges, refresh `downstream/main`; verify the actual Phase 6
      `authorizeBrowserMutation`, durable claim, lifecycle, store, and Paste
      client extension points; start RED-first.
- [x] Add Worker RED tests that valid session, exact Origin, CSRF, and
      principal-to-stored-scope authorization occur before claim/store/Paste work;
      cover no/invalid/revoked session, bad Origin/CSRF, no scope, cross-scope,
      guessed ID, and browser-supplied scope/expiry/credential inputs.
- [x] Add RED lifecycle tests for archived-only permanent restore, exact
      checked-to-unchecked managed-task precision, upstream/source/persistence
      ordering, final `active/permanent/null`, idempotent replay/conflict/pending,
      uncertain outcome handling, and secret-free public/log output.
- [x] Add RED UI tests for Restore availability, pending duplicate prevention,
      no optimistic Active move, authoritative success movement, and retained row
      on failure/uncertainty.
- [x] Implement the narrow server-only restore flow and allowlisted response;
      add metadata only when required by tests and preserve Phase 3/6 behavior,
      upstream body authority, and existing bindings.
- [x] Record GREEN/REFACTOR/REGRESSION evidence; run focused Worker/frontend
      checks plus Phase 3–6 regressions and current-HEAD review gate before merge.

## 3. Phase 7.3 — timed restore and expiry cancellation

- [ ] After 7.2 merges, refresh `downstream/main`; extend the approved restore
      path rather than create a second trust boundary; start RED-first.
- [ ] Add RED tests proving the server-held credential confirms `e=never` (or
      generic equivalent) before managed-source restore, final persistence, public
      `expiresAt: null`, or UI Active transition.
- [ ] Add RED tests that cancellation failure preserves the checked source and
      exact authoritative timed deadline; ambiguous dispatch and persistence
      failure retain durable reconciliation evidence and return sanitized
      `RECONCILIATION_REQUIRED` without blind retry.
- [ ] Add RED UI tests that timed Restore remains archived/timed with its
      countdown while pending/failing and clears/moves only from final returned
      success.
- [ ] Implement ordered timed restoration, public result/error mapping, and
      durable reconciliation behavior without changing generic upstream code or
      exposing credentials, raw upstream errors, Paste body, or deadline input.
- [ ] Record GREEN/REFACTOR/REGRESSION evidence; run Worker/frontend and
      Phase 3–6 regression checks and current-HEAD review gate before merge.

## 4. Phase 7.4 — confirmed-absence reconciliation

- [ ] After 7.3 merges, refresh `downstream/main`; inspect durable-operation
      coordination and server error classification; start RED-first.
- [ ] Add RED service/store/adapter tests for classified definitive upstream
      missing/expired removal and Archive-list omission only for an archived
      binding.
- [ ] Add RED negative tests for transport outage, ambiguous 404-like result,
      invalid metadata, credential/auth failure, pending restore claim, and local
      persistence failure: each retains the binding and returns a stable sanitized
      retryable or `RECONCILIATION_REQUIRED` outcome.
- [ ] Add RED frontend tests for confirmed-absence row removal, retained stale
      row/retry messaging otherwise, authorized request metadata, and secret-free
      UI error output.
- [ ] Implement only the SPEC §3.6 narrow reconciliation contract; do not
      introduce polling, local deletion authority, tombstones, Batch Mode, or a
      route/API/state/security change without §10.5 STOP and owner re-approval.
- [ ] Record GREEN/REFACTOR/REGRESSION evidence; run focused and Phase 3–6
      Worker/frontend regressions, documentation checks, current-HEAD CI, and AI
      Review Bot Phase Review Gate before merge.

## Evidence

### TDD

Documentation-only §10.5 artifact update: TDD is N/A for this commit.
RED/GREEN/REFACTOR/REGRESSION evidence is required in the applicable checklist
items before every Phase 7 implementation PR is merged. Use deterministic or
frozen time for countdown tests. Do not mark an unavailable sandbox test as
passing; record the limitation and retain the check for CI.

Phase 7.1 implementation evidence (2026-09-05):

- RED: `node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts ArchiveStatus.spec.tsx`
  failed because `./ArchiveStatus` did not yet exist.
- GREEN: `node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts`
  passed: 2 files, 22 tests. It covers frozen valid ISO formatting, permanent no-timer,
  minute-only refresh and cleanup, elapsed/invalid stale state, and no tick-driven fetch.
- REFACTOR: the same focused suite remained green after integrating `ArchiveStatus` into `App`.
- REGRESSION: `node_modules/.bin/tsc --noEmit -p downstream/addons/feishu/frontend/tsconfig.json`
  passed; `node_modules/.bin/prettier --check` passed for the changed frontend files. Current-HEAD CI
  and the required AI Review Bot Phase Review Gate remain required before merge.
- Limitation: the Phase 3–6 Worker suite command
  `node_modules/.bin/vitest run --config downstream/addons/feishu/vitest.config.js` could not start
  because the sandbox denied its required `127.0.0.1` listener (`EPERM`). It is not recorded as passing.

Phase 7.2 implementation evidence (2026-09-05):

- RED: Worker lifecycle/adapter test cases were added before the restore implementation, but the
  Worker test command could not execute in this sandbox because its Cloudflare runtime requires a
  `127.0.0.1` listener and receives `EPERM`. No unobserved failing result is claimed.
- GREEN: `node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts`
  passed: 2 files, 24 tests, including permanent-only Restore availability, pending disable, no
  optimistic Archive move, authoritative success movement, and sanitized retained-row failure.
- REFACTOR: the same frontend suite stayed green after formatting the restore adapter and UI code.
- REGRESSION: `node_modules/.bin/tsc --noEmit -p downstream/addons/feishu/tsconfig.json`,
  `node_modules/.bin/tsc --noEmit -p downstream/addons/feishu/frontend/tsconfig.json`, and
  `node_modules/.bin/prettier --check` for the changed TypeScript files passed.
- Limitation: `node_modules/.bin/vitest run --config downstream/addons/feishu/vitest.config.js
downstream/addons/feishu/tests/service.spec.ts downstream/addons/feishu/tests/restore.spec.ts`
  could not start because sandbox policy denied the required `127.0.0.1` listener (`EPERM`). The
  new Worker service/auth tests remain required for CI; this limitation is not approval.

### Regression and review

- [ ] Record exact focused test/type/lint/format/build commands and results
      for each implementation phase.
- [ ] Record relevant Phase 3–6 regression results and any environment
      limitation without treating it as approval.
- [ ] Confirm docs/API/trust-contract impact for each phase; update only when
      the implemented behavior remains inside the approved SPEC.
- [ ] Obtain current-HEAD CI and completed AI Review Bot Phase Review Gate for
      every implementation PR; any new commit requires a new latest-HEAD review.

## Internal consistency review

This checklist maps directly to Phase 7 SPEC acceptance criteria and test
specification, follows the four mergeable phases, and requires RED-first TDD
before every behavioral implementation step. It reuses the Phase 6 opaque
session, exact Origin, CSRF, and server-derived principal-to-scope boundary;
keeps passwords, upstream management data, Paste bodies, and expiry authority
off the browser; and treats uncertain absence/restore as fail-closed. It
excludes Batch Mode, upstream/patch-series work, destructive migration, and
deployment. Any observable API, data/state, security, ownership, acceptance,
or behavior drift invokes §10.5 STOP. No STOP currently exists.
