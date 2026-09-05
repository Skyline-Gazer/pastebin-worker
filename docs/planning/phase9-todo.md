# Phase 9 — Batch backend TODO

Status: CONTINUOUS-MODE TODO READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started. Active checklist for the [Phase 9 SPEC](phase9-spec.md)
and [PHASE decomposition](phase9-phases.md). Do not start a dependent phase
from an unmerged predecessor.

## NEXT — Phase 9.1: Protected batch route, public types, and strict dispatch gate

- [x] After this artifact-update PR and Phase 8 merge, refresh and verify clean
      `downstream/main`; inspect the Phase 6 protection helper and Phase 8.3
      `BatchActionIntent` seam before creating `feat/feishu-batch-route`.
- [x] Write RED Worker tests for POST-only, JSON-only, exact request shape,
      valid opaque key, 16 KiB body limit, 50 unique ordered IDs, ID length,
      and exactly the three allowed actions.
- [ ] Write RED trust tests proving no/invalid/revoked session, wrong Origin,
      missing/invalid CSRF, no-scope/cross-scope/guessed IDs, and browser
      credentials/scopes/Paste data/expiry fields reject before binding,
      credential, lifecycle, or Paste activity.
- [x] Implement only public-safe request/result types, strict validation, and
      the Phase 6 trust gate for `POST /api/batch`; do not dispatch a lifecycle
      action, add browser authority, or alter Phase 6 protections.
- [x] Record observed GREEN/REFACTOR/REGRESSION evidence; run focused Worker,
      type/format, and Phase 6–8 regressions; document limitations honestly;
      obtain current-HEAD CI and AI Review Bot Phase Review Gate before merge.

## 2. Phase 9.2 — Server-side lifecycle delegation and durable batch operation

- [x] Only after 9.1 merges, refresh `downstream/main`; inspect existing
      binding, credential, lifecycle, durable-operation, and reconciliation
      interfaces; begin RED-first on `feat/feishu-batch-lifecycle`.
- [x] Add RED tests for per-ID server-only scope/binding/password resolution,
      the three existing action delegations, archive ordering, timed
      authoritative `expiresAt`, delete binding removal, and no tombstone.
- [x] Add RED partial-execution tests proving inaccessible/missing IDs yield
      sanitized `ENTRY_UNAVAILABLE`, later failure does not undo prior success,
      and ambiguity/persistence failure retains durable reconciliation evidence.
- [x] Implement the smallest additive batch record/item evidence and deterministic
      server-only per-item identities; delegate instead of duplicating lifecycle
      or Paste-client logic. Do not add batch Restore, fourth lifecycle, second
      Paste-body storage, or client expiry authority.
- [ ] Record observed GREEN/REFACTOR/REGRESSION evidence, relevant Phase 3/6/7
      regressions, docs impact, current-HEAD CI, and AI Review Bot gate before
      merge.

## 3. Phase 9.3 — Authoritative partial result and safe idempotent replay

- [x] Only after 9.2 merges, refresh `downstream/main`; write RED tests for
      count/cardinality/order invariants, public success shapes, stable failure
      codes/retryability, and processed `200` all-success/mixed/all-failed results.
- [x] Add RED tests for principal-scoped key plus canonical action/ordered-ID
      fingerprint: completed same-key replay with no upstream call, changed-key
      conflict, in-progress conflict, and ambiguous delete/update safety.
- [x] Implement result serialization and durable reserve/complete/replay rules;
      retain raw upstream, credential, scope, and operation details server-side.
- [ ] Run RED/GREEN/REFACTOR/REGRESSION checks including Phase 3/6/7 idempotency
      and security regressions; record exact results and complete current-HEAD
      CI and AI Review Bot gate before merge.

## 4. Phase 9.4 — Phase 8 intent execution and mixed-result retry UX

- [ ] Only after 9.3 merges, refresh `downstream/main`; write RED frontend tests
      for one safe request from `BatchActionIntent`, fresh opaque key, existing
      CSRF/session use, and in-flight duplicate-action disable.
- [ ] Add RED mixed-result tests for matching successful-row updates, failed-ID
      selection retention, concise accessible aggregate summary, and retry of
      only failed IDs with a new key.
- [ ] Add RED failure-boundary tests proving transport/auth/validation/unreadable
      result failures retain selection and claim no item success; preserve Phase
      8 selectors/confirmation/lock and Phase 6/7 behavior.
- [ ] Replace only the deferred seam with the approved adapter/result UX; do not
      redesign Batch Mode, use serial single-entry calls, expose secrets/raw
      errors, or construct expiry deadlines in the browser.
- [ ] Record observed GREEN/REFACTOR/REGRESSION evidence, focused frontend and
      relevant Worker contract checks, type/format/build, current-HEAD CI, and
      AI Review Bot gate before merge.

## Evidence

### TDD

Documentation-only §10.5 artifact update: TDD is N/A for this commit.
RED/GREEN/REFACTOR/REGRESSION evidence is mandatory and must be recorded with
each Phase 9 implementation PR; do not claim an unrun or sandbox-blocked check
passed.

Phase 9.1 evidence (local branch `feat/feishu-batch-route`): RED contract
tests were added in `downstream/addons/feishu/tests/batch.spec.ts` before the
route/types; they cover no session, Origin/CSRF, no scope, and rejected
browser-authority fields. GREEN: `node_modules/.bin/tsc --noEmit -p
downstream/addons/feishu/tsconfig.json` passed; targeted Prettier check passed.
Codex sandbox observed Worker-pool `listen EPERM` on `127.0.0.1`; orchestrator
re-ran `node_modules/.bin/vitest run --config downstream/addons/feishu/vitest.config.js
downstream/addons/feishu/tests/batch.spec.ts` outside that sandbox and recorded
GREEN (3/3). Targeted ESLint also passed. REFACTOR kept Phase 6 helpers unchanged and made
the dispatch seam structurally incapable of accessing bindings, credentials,
lifecycle, or Paste services. REGRESSION/CI/review gate remain for the
orchestrator. Phase 9.2 must add per-ID binding/scope resolution; Phase 9.1
only proves an authenticated principal has at least one server-derived scope
and never treats an ID as scope authority.

Phase 9.2 evidence (local branch `feat/feishu-batch-lifecycle`): RED was
observed as a TypeScript failure because `BatchLifecycleCoordinator` did not
exist; the new tests name the missing server-only delegation/evidence boundary.
GREEN: `node_modules/.bin/tsc --noEmit -p downstream/addons/feishu/tsconfig.json`
and targeted Prettier checks passed after implementation. Focused Worker tests
remain blocked in this Codex sandbox because the Cloudflare Worker pool cannot
bind `127.0.0.1` (`listen EPERM`); they require orchestrator execution outside
the sandbox. REFACTOR keeps password opening, Paste calls, lifecycle ordering,
and entry operation claims in `EntryService.completeEntry`; the coordinator
only resolves server-side binding/scope facts and records batch evidence.
REGRESSION/CI/review gate remain for the orchestrator. Migration 0006 is
additive and does not add a Paste-body store, batch Restore, or client expiry
authority.

Phase 9.3 evidence (local branch `feat/feishu-batch-idempotency`): RED was
observed as TypeScript failures for the absent authoritative `result` field on
the lifecycle execution. The new tests cover ordered/cardinal public results,
all-success/mixed/all-failed `200` serialization, completed replay without a
second lifecycle call, and conflict/in-progress/reconciliation rejection before
dispatch. GREEN: `node_modules/.bin/tsc --noEmit -p
downstream/addons/feishu/tsconfig.json`, targeted Prettier check, and `git diff
--check` passed. The focused Worker test command remains blocked in this Codex
sandbox by the Cloudflare Worker-pool loopback restriction (`listen EPERM` on
`127.0.0.1`) and requires orchestrator execution outside the sandbox.
REFACTOR isolates HTTP serialization in `createBatchDispatch`, keeps raw
lifecycle evidence server-side, and uses additive migration `0007` for only the
sanitized completed response. REGRESSION/CI/review gate remain for the
orchestrator.

### Regression and review

- [ ] Record exact focused Worker/frontend test, type, format, and build results
      for every implementation phase, plus relevant Phase 3 and Phase 6–8
      regressions and any environmental limitation.
- [ ] Confirm no change to Phase 6 trust, no batch Restore/fourth lifecycle/
      second Paste-body store, and no Phase 10, deployment, destructive
      migration, PR #5, `upstream-sync`, or `goshujin` work.
- [ ] Obtain current-HEAD CI and a completed AI Review Bot Phase Review Gate for
      every implementation PR; a new HEAD requires a new review.

## Internal consistency review

This TODO maps directly to the Phase 9 SPEC and its four mergeable PHASE
milestones, begins every behavioral slice RED-first, and names Phase 9.1 as
NEXT. It preserves the unchanged Phase 6 opaque-session, exact-Origin,
session-bound-CSRF, server-derived-principal-to-stored-scope boundary; keeps
credentials, Paste bodies, and expiry authority server-side; and extends the
Phase 8 `BatchActionIntent` seam without a Batch Mode redesign. It excludes
batch Restore, a fourth lifecycle, a second Paste-body store, Phase 10,
deployment, destructive migrations, PR #5, `upstream-sync`, and `goshujin`.
No STOP condition is present.
