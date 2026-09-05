# Phase 8 — Batch Mode frontend PHASE decomposition

Status: CONTINUOUS-MODE PHASE READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started. This decomposition follows the approved
[Phase 8 SPEC](phase8-spec.md) and [Phase 8 PLAN](phase8-plan.md). It is
Add-on frontend work only. Phase 9 exclusively owns `/api/batch` (or its
equivalent), real multi-entry mutation, server-side credential resolution,
partial-success results, retry/idempotency, and result UX.

## Phase 8.1 — Batch Mode shell and separate selection controls

- **Goal:** establish an explicit, accessible, transient Batch Mode without
  changing Markdown or single-entry lifecycle semantics.
- **Scope:** Add a compact entry/exit control; Add-on-local `batchMode` and
  empty `selectedIds` state; and an accessible `BatchSelector` beside each
  currently visible eligible Active entry only while mode is active. Keep the
  selector structurally, visually, semantically, and behaviorally separate
  from `ManagedTaskCheckbox` and rendered Markdown tasks.
- **Dependencies:** Phase 7 is merged; start from refreshed, clean
  `downstream/main`. Phase 8.2 and 8.3 must not begin from this unmerged
  branch.
- **Inputs:** Phase 8 PLAN/SPEC; D-014/D-015; `docs/DESIGN.md` §§6–7 and §10;
  `docs/FRONTEND.md` §§3, 5–6, and §12; Phase 6 browser-trust decision; Phase
  6/7 Active-list and managed-completion implementation/tests.
- **Deliverables:** smallest frontend-local state owner, `BatchModeToggle`,
  `BatchSelector`, Active-row integration, and focused tests. No Worker,
  shared API contract, persistence, fixture result, or network change.
- **Acceptance criteria:** entering starts a fresh empty selection and shows a
  separately labelled selector for every current visible eligible Active row;
  selector interaction changes only transient selection membership; entry exit
  clears selection and restores normal presentation; Markdown, bindings,
  lifecycle, Archive, countdown, Paste data, and network state remain
  unchanged.
- **Tests required:** RED-first frontend tests for mode entry/exit, selector
  visibility and distinct accessible identity/markup, pointer and keyboard
  selection, no Markdown/chooser/lifecycle mutation, and existing GFM
  nested-task/fenced-code behavior. Regression coverage confirms normal Phase
  6 completion remains unchanged while Batch Mode is off.
- **Expected branch type:** `feat/feishu-batch-mode-shell` from refreshed
  `downstream/main`.
- **Expected PR target:** `downstream/main`.
- **Risks:** accidentally reusing `ManagedTaskCheckbox`, treating arbitrary
  rendered Markdown tasks as entry selectors, or storing selection outside the
  frontend. Keep labels and test identities separate; do not expose secrets or
  browser authority.
- **Exit criteria:** focused RED/GREEN/REFACTOR/REGRESSION evidence is
  recorded; frontend type/format/build and relevant Phase 5–7 regressions pass;
  documentation impact is checked; current-HEAD CI and AI Review Bot Phase
  Review Gate pass; PR merges and `downstream/main` is refreshed before 8.2.

## Phase 8.2 — Visible-set selection and normal-completion interaction lock

- **Goal:** make selection bounded, inspectable, and unambiguous while Batch
  Mode is active.
- **Scope:** add `全选` and `清空` for the current loaded/visible eligible
  Active-ID set; prune stale/ineligible IDs before count/action use; and
  disable or suppress normal `ManagedTaskCheckbox` pointer/keyboard completion
  with an accessible explanation that directs users to Batch Selectors or
  exiting the mode. Restore unchanged Phase 6 normal completion on exit.
- **Dependencies:** Phase 8.1 is merged and `downstream/main` is refreshed.
- **Inputs:** merged 8.1 implementation and tests; Phase 8 SPEC §§3.5, 3.7,
  3.10–3.12; `docs/FRONTEND.md` §6.1; `docs/DESIGN.md` §§6–7, §9–10; Phase 6
  browser-trust boundary and Phase 7 Active/Archive behavior.
- **Deliverables:** visible-eligible set derivation, all/clear/selection-prune
  behavior, managed-control lock and accessible reason, plus focused frontend
  tests. This does not add pagination, Archive selectors, a mutation, request,
  endpoint, expiry calculation, or retained batch state.
- **Acceptance criteria:** all selects exactly the present visible eligible
  Active IDs; clear and exit empty selection; filtered, unloaded, archived, or
  stale IDs are neither counted nor actionable; normal managed completion
  cannot open by pointer or keyboard in Batch Mode and resumes unchanged after
  exit; no selection control changes Markdown or lifecycle state.
- **Tests required:** RED-first tests for all/clear bounds, refresh/filter
  pruning before count/action use, empty selection, pointer/keyboard lock and
  accessible explanation, normal-mode chooser restoration, and no request or
  Phase 7 Archive/countdown/Restore/reconciliation regression.
- **Expected branch type:** `feat/feishu-batch-selection` from refreshed
  `downstream/main` after 8.1 merges.
- **Expected PR target:** `downstream/main`.
- **Risks:** invisible selection, an inaccessible lock, or accidental widening
  of visible-set semantics. Fail closed by withholding batch controls/actions
  when the eligible set cannot be determined; reuse Phase 6 trust without
  adding browser-supplied scope, identity, credentials, or deadline authority.
- **Exit criteria:** RED/GREEN/REFACTOR/REGRESSION evidence, focused and
  Phase 5–7 regression checks, type/format/build, documentation review,
  current-HEAD CI, and the AI Review Bot Phase Review Gate pass; merge and
  refresh `downstream/main` before 8.3.

## Phase 8.3 — Action bar, selection confirmations, and Phase 9 handoff seam

- **Goal:** present the three selection-level action intents safely without
  performing or claiming a batch lifecycle operation.
- **Scope:** compact, content-local sticky-capable action bar for a nonempty
  selection; exact selected count; exactly `永久归档`, `限期归档`, and `删除`;
  selection-level confirmation/focus management for expiring archive and
  destructive delete; and a visibly deferred, injectable frontend-local
  `BatchActionIntent` handoff/fixture seam. Permanent archive may hand off
  directly or use one lightweight selection-level confirmation, never one per
  item.
- **Dependencies:** Phase 8.2 is merged and `downstream/main` is refreshed.
- **Inputs:** merged 8.2 state/control behavior; Phase 8 SPEC §§3.5–3.12;
  `docs/DESIGN.md` §6.3 and §10; `docs/FRONTEND.md` §§7–8 and §12;
  `docs/SECURITY.md` §§5–7; `docs/TESTING.md` §6.
- **Deliverables:** minimal action bar, confirmations, focus restoration, and
  local deferred intent seam using only action plus current Add-on entry IDs;
  tests and any narrowly necessary Add-on developer documentation. No
  `/api/batch`, Worker route, API payload/promise, serial single-entry loop,
  optimistic row change, expiry construction, result notice, partial-failure
  state, retry, or idempotency behavior.
- **Acceptance criteria:** zero selection has no enabled action; nonempty
  selection has an exact count and only the three required actions; expiring
  archive has exactly one count-bearing confirmation; delete has exactly one
  destructive count-bearing confirmation; cancel preserves selection and all
  displayed lifecycle/content state; confirm reaches only sanitized local
  deferred behavior and makes no request or success claim.
- **Tests required:** RED-first action-bar/count/three-action tests; one-dialog
  expiring/delete and no-per-item permanent tests; focus trap/restoration and
  destructive naming tests; cancel/no-fetch/no-mutation tests; spies proving no
  batch route or single-entry adapter use, no optimistic Active/Archive/countdown
  change, no partial-result/retry UI, and no secret/deadline authority in state,
  fixtures, logs, or output. Regress Phase 6 normal mode and Phase 7
  Archive/Restore/countdown/reconciliation.
- **Expected branch type:** `feat/feishu-batch-actions` from refreshed
  `downstream/main` after 8.2 merges.
- **Expected PR target:** `downstream/main`.
- **Risks:** a fixture being mistaken for success, confirmation creating stale
  invisible intent, dashboard-like chrome, or early Phase 9 API/result work.
  If a real request, aggregate/per-item result, retry/idempotency, mutation, or
  a changed trust/API/acceptance contract is needed, STOP under §10.5 and defer
  it to Phase 9.
- **Exit criteria:** all Phase 8 SPEC acceptance criteria and RED/GREEN/
  REFACTOR/REGRESSION evidence are complete; focused frontend, type, format,
  build, and Phase 5–7 regression checks pass; documentation review,
  current-HEAD CI, and AI Review Bot Phase Review Gate pass; PR merges. Only
  then may the separately planned Phase 9 backend begin from refreshed
  `downstream/main`.

## Internal consistency review

This sequence maps each Phase 8 SPEC acceptance criterion to a small,
mergeable Add-on frontend increment. It preserves the distinct BatchSelector,
visible-set bounds, transient-only selection, normal-completion lock, minimal
action bar, and one selection-level expiring/delete confirmation. It reuses the
Phase 6 opaque session, exact Origin, CSRF, and server-derived
principal-to-scope boundary without introducing a request or browser authority;
it preserves Phase 7 single-entry Archive, countdown, Restore, and
reconciliation behavior.

Phase 9 retains sole ownership of `/api/batch`, real multi-mutation,
server-side credentials, partial success, retry/idempotency, and result UX.
No STOP condition is present. Any need to alter the approved behavior, API,
state/data model, security/trust boundary, acceptance criteria, or ownership
boundary invokes `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.5.
