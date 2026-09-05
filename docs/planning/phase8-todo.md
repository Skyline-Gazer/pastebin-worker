# Phase 8 — Batch Mode frontend TODO

Status: CONTINUOUS-MODE TODO READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started. Active implementation checklist for the
[Phase 8 SPEC](phase8-spec.md) and [Phase 8 PHASE decomposition](phase8-phases.md).
Do not begin a dependent item from an unmerged prior Phase branch.

## 1. Phase 8.1 — Batch Mode shell and separate selection controls

- [x] After this artifact-update PR and Phase 7 are merged, refresh and verify
      clean `downstream/main`; create the dedicated 8.1 feature branch.
- [x] Inspect the Active-list owner and Phase 6 managed completion control;
      record the exact current visible eligible Active set before implementation.
- [x] Write RED-first frontend tests for Batch Mode entry/exit, fresh empty
      transient selection, BatchSelector visibility only in mode, separate
      accessible labels/markup/handlers, and pointer/keyboard selection.
- [x] Add RED negative tests that selecting never checks Markdown, opens the
      single-entry chooser, changes lifecycle/Archive/Paste data, or makes a
      request; retain nested-task and fenced-code literal regressions.
- [x] Implement only frontend-local Batch Mode state, compact toggle/exit, and
      structurally separate BatchSelector; do not persist selection, add a
      Worker/shared API contract, or add a fixture result.
- [x] Record GREEN/REFACTOR/REGRESSION evidence; run focused frontend,
      type/format/build, and relevant Phase 5–7 regression checks; document
      limitations without claiming unrun checks pass; obtain current-HEAD CI
      and AI Review Bot Phase Review Gate before merge.

### Phase 8.1 implementation evidence — 2026-09-05

- **Visible eligible set:** the approved fixture Active view currently contains
  only `active-fixture`; the shell renders its BatchSelector only while local
  Batch Mode is on. Phase 8.2 owns broader visible-set derivation/pruning.
- **RED:** `node_modules/.bin/vitest run --config
downstream/addons/feishu/frontend/vitest.config.ts
downstream/addons/feishu/frontend/App.spec.tsx` failed 2 new tests before
  implementation because `Enter Batch Mode` did not exist.
- **GREEN:** the same focused command passed: 23 tests.
- **REFACTOR:** extracted `BatchModeToggle` and `BatchSelector` components so
  selection has distinct markup, label, and handler from managed completion.
- **REGRESSION:** `node_modules/.bin/vitest run --config
downstream/addons/feishu/frontend/vitest.config.ts` passed (2 files, 28
  tests); frontend and Add-on type checks, focused formatting, and the frontend
  production build passed. No Worker, shared contract, fixture result, or
  network behavior was changed. Current-HEAD CI and the AI Review Bot review
  remain required before merge.

## 2. Phase 8.2 — visible-set selection and interaction lock

- [ ] Only after 8.1 merges, refresh/verify clean `downstream/main`; create
      the dedicated 8.2 feature branch and begin RED-first.
- [ ] Add RED tests for `全选` exact visible eligible IDs, `清空`, exit clearing,
      and filtering/refresh pruning stale, unloaded, and archived IDs before
      count or future action use.
- [ ] Add RED accessibility/interaction tests proving the managed completion
      control cannot open through pointer or keyboard in Batch Mode, explains
      the lock accessibly, remains distinct from BatchSelector, and resumes the
      unchanged Phase 6 chooser after exit.
- [ ] Add RED regressions for no fetch, no Markdown/lifecycle mutation, no
      Archive/countdown/Restore/reconciliation change, and no new browser
      identity, scope, credential, secret, or expiry authority.
- [ ] Implement only bounded visible-set selection, clear/prune behavior, and
      the normal-control lock. Fail closed if visible eligibility is unknown;
      do not add pagination, Archive selectors, lifecycle execution, or an API.
- [ ] Record GREEN/REFACTOR/REGRESSION evidence; run focused/frontend and
      Phase 5–7 regression checks plus type/format/build; complete current-HEAD
      CI and AI Review Bot Phase Review Gate before merge.

## 3. Phase 8.3 — action bar, confirmation, and deferred Phase 9 seam

- [ ] Only after 8.2 merges, refresh/verify clean `downstream/main`; create
      the dedicated 8.3 feature branch and begin RED-first.
- [ ] Add RED tests for a compact sticky-capable bar only with nonempty
      selection, exact count, and exactly permanent archive, expiring archive,
      and delete actions; no enabled action at zero selection.
- [ ] Add RED tests for exactly one count-bearing expiring confirmation, one
      destructive count-bearing delete confirmation, no per-item confirmation,
      focus trap/restoration, and Cancel preserving selection/state/network.
- [ ] Add RED boundary tests spying on fetch and Phase 6 single-item adapters:
      confirm creates only local deferred intent, does not call `/api/batch` or
      serial mutations, alter rows/Markdown/countdown, create expiry, claim
      success, clear selection as success, or show partial-result/retry UX.
- [ ] Add RED secret/trust tests for safe intent/fixture/output/log values;
      ensure they contain only action and Add-on entry IDs, never passwords,
      management URLs, tokens, scopes, Paste bodies, raw errors, or client
      expiry deadlines.
- [ ] Implement the compact bar, selection-level dialogs, focus handling, and
      visibly deferred local intent seam only. Do not add a Worker route,
      request/response contract, server operation, result state, retry,
      idempotency, or optimistic lifecycle behavior.
- [ ] Record GREEN/REFACTOR/REGRESSION evidence; run focused frontend,
      type/format/build, and Phase 5–7 regression checks; update durable
      developer docs only if needed within the SPEC; complete current-HEAD CI
      and AI Review Bot Phase Review Gate before merge.

## Evidence

### TDD

Documentation-only §10.5 artifact update: TDD is N/A for this commit.
RED/GREEN/REFACTOR/REGRESSION evidence is mandatory for every Phase 8
implementation PR and must be recorded in the applicable checklist item before
merge. Use deterministic inputs for selection and focus tests; do not mark an
unavailable sandbox/CI check as passing.

### Regression and review

- [ ] Record exact focused frontend test, type, format, and build commands and
      results for each implementation Phase.
- [ ] Record relevant Phase 5–7 regression results and any environment
      limitation without treating it as approval.
- [ ] Confirm no Worker/API/migration/storage/polling/upstream/patch-series or
      Phase 6 trust-boundary drift; update docs only within the approved SPEC.
- [ ] Obtain current-HEAD CI and a completed AI Review Bot Phase Review Gate
      for every implementation PR; any commit changing HEAD requires a new
      latest-HEAD review.

## Internal consistency review

The checklist is implementation-sized, RED-first, and traces directly to the
Phase 8 PLAN/SPEC and Phase 8.1–8.3 milestones. It retains distinct Markdown
and BatchSelector meanings, selection only over current visible eligible Active
entries, transient state, an accessible normal-completion lock, minimal action
presentation, and selection-level confirmation. It reuses Phase 6 browser
trust unchanged and preserves Phase 7 as single-entry Archive/countdown/
Restore/reconciliation behavior.

Phase 9 exclusively owns `/api/batch`, real multi-mutation, partial success,
retry/idempotency, and result UX. No STOP condition is present. A need for any
of those responsibilities—or for a changed observable behavior, API, state,
security/trust boundary, acceptance criteria, or ownership boundary—requires
STOP and §10.5 change control. Implementation has NOT started.
