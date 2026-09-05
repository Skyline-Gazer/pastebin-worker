# Phase 8 — Batch Mode frontend PLAN

Status: CONTINUOUS-MODE PLAN READY AFTER INTERNAL CONSISTENCY REVIEW.

Implementation has NOT started.

## Authorization and baseline

This is an in-scope planning artifact for roadmap Phase 8 under **Owner
Delegated Continuous Execution** (D-030) and
`docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.1.1. It follows Phase 7 completion
through PR #29, with `downstream/main` at
`fa82219280178a49190bcaa914db21fc586ffc53`. It does not authorize work beyond
Phase 8, a production deployment, a destructive migration, PR #5,
`upstream-sync`, or a `goshujin` rewrite.

Phases 6 and 7 established the approved browser boundary and lifecycle view:
an opaque server-side Add-on session, exact allowed Origin, session-bound CSRF
token, and server-derived principal joined to stored allowed scopes before any
lifecycle or Paste operation. Archive, restore, countdown, and reconciliation
remain their Phase 7 behavior. Phase 8 reuses those boundaries unchanged; it
does not introduce a browser-supplied identity, scope, credential, expiry
authority, or another trust boundary.

## Objective

Define the Phase 8 frontend-only implementation contract for an explicit Batch
Mode: a separate selection control, transient selection state, visible-set
select-all/clear controls, a compact sticky-capable action bar, an interaction
lock for normal managed-task completion, and one confirmation per selected set
for expiring archive or delete. It deliberately stops before a real batch
mutation API and its partial-success orchestration.

## Context

Single-item completion asks for one retention decision per managed entry. D-014
requires Batch Mode to add a temporary selection layer without changing the
meaning of Markdown task checkboxes: a `BatchSelector` is never a
`ManagedTaskCheckbox`, and selection is never Markdown completion. The three
batch action intents are permanent archive, expiring archive, and delete.

The current Add-on already has the Phase 6 browser trust boundary and Phase 7
Archive/restore/reconciliation behavior. This phase is limited to making the
selection and confirmation experience explicit in the frontend. D-015's
backend-orchestrated per-Paste operation, aggregate/per-item response,
partial-success handling, and retry/idempotency belong to Phase 9. Phase 8 may
use local fixtures or a deliberately inert stub seam to exercise presentation
state, but it must neither disguise fixture results as committed lifecycle
state nor send a real multi-entry mutation.

## Assumptions and verification

| Assumption                                                                                              | Verification method / current basis                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The managed completion control is entry-level and distinct from ordinary rendered Markdown checkboxes.  | Verify the merged Phase 6/7 frontend and `docs/DESIGN.md` §9. Batch Mode may lock only the normal managed completion flow; it must preserve GFM rendering semantics, including nested tasks and fenced code.                                                         |
| The page already has an Active list on which Batch Mode can operate without changing Archive semantics. | Verify the merged Phase 7 view model. Phase 8 defines its select-all/clear set as the currently loaded and visible eligible Active entries, per `docs/FRONTEND.md` §6.1; it does not add pagination or a broader read contract.                                      |
| A separate visual control can fit the existing minimal Pastebin-aligned layout.                         | Verify `AGENTS.md` §11 and `docs/FRONTEND.md` §§2–3. The control/action bar remains compact and must not introduce dashboard chrome, sidebars, avatars, or Feishu-client styling.                                                                                    |
| The three action names and confirmation rules are already prescribed.                                   | Verify D-014, `AGENTS.md` §15, and `docs/DESIGN.md` §6.3: permanent archive has no per-item dialog; expiring archive and delete each receive exactly one confirmation for the current selection.                                                                     |
| Phase 9 is the sole owner of batch execution and results.                                               | Verify D-015, `docs/IMPLEMENTATION_ORDER.md` Phase 9, and `docs/FRONTEND.md` §8. Phase 8 can expose a typed future adapter boundary, but it cannot add `/api/batch`, multiple-Paste calls, partial-success state, retry behavior, or an optimistic lifecycle update. |

## Expected behavior and acceptance direction

1. The Active view offers an explicit compact Batch Mode entry/exit control.
   Entering sets transient `batchMode` state and presents a separate,
   accessible `BatchSelector` for every currently visible eligible entry.
   Exiting by Cancel clears transient selection and restores normal interaction;
   it does not mutate Markdown, binding state, Archive state, or Paste data.
2. Selecting or clearing a `BatchSelector` changes only `selectedIds`. It must
   never set a Markdown task checked, invoke a normal completion chooser, or
   represent a lifecycle outcome. A selected entry may have rendered content
   task checkboxes, but neither checkbox type may be overloaded as the other.
3. `全选` and `清空` operate only on the defined currently loaded/visible
   eligible set. The UI must not claim that it selected unloaded, filtered,
   archived, or future paginated entries. The action bar count equals the
   current selected set.
4. While Batch Mode is active, the normal `ManagedTaskCheckbox` completion
   interaction is disabled or suppressed so a click cannot ambiguously mean
   select or complete. Normal-mode behavior, including the Phase 6 chooser,
   destructive confirmation, Phase 7 Archive/restore, countdown, and
   reconciliation behavior, remains unchanged when Batch Mode is inactive.
5. When at least one entry is selected, a minimal sticky-capable action bar
   exposes exactly permanent archive, expiring archive, and delete. Its styling
   follows the content-first upstream-aligned visual rules; it is not an admin
   dashboard toolbar. Empty selection has no actionable batch mutation state.
6. Choosing permanent archive may proceed directly or show one lightweight
   selection-level confirmation, but it must never produce per-item dialogs.
   Choosing expiring archive opens exactly one selection-level confirmation
   that states the selected count and longest-retention countdown consequence.
   Choosing delete opens exactly one destructive selection-level confirmation
   that states the selected count and irreversibility. Cancel in either case
   leaves selection, Markdown, lifecycle, Archive, and Paste state unchanged.
7. Phase 8 does not claim a final lifecycle result after confirmation. Until
   Phase 9 supplies a server-authoritative batch operation and result shape,
   confirmation may end in an explicit deferred/inert fixture/stub state only.
   It must not issue independent single-item requests as a hidden batch
   implementation, optimistically move rows, manufacture expiry, delete
   entries, report success, or introduce per-item failure UI.
8. Browser-visible UI, fixture/stub values, analytics, errors, and logs remain
   secret-free. Batch state and future action intent must not carry a Feishu
   token, trusted scope, management password/URL, Paste body, or client-owned
   expiration authority.

## Non-goals

- No Phase 9 `/api/batch` equivalent, Worker route, backend credential
  resolution, per-Paste execution, partial-success result/orchestration,
  idempotency/retry, or real multi-mutation request.
- No new browser session, OAuth, Origin/CSRF, principal/scope authorization,
  credential, or lifecycle trust boundary. Phase 6 browser trust is reused
  unchanged.
- No change to Phase 7 Archive, restore ordering, authoritative `expiresAt`,
  countdown, polling posture, or confirmed-missing reconciliation; no
  tombstones or Trash view.
- No normal checkbox semantic change, Markdown parser change, nested-task
  lifecycle mapping, or use of a Markdown task checkbox as selection state.
- No pagination, polling, deployment, upstream/root dependency/workflow or
  patch-series changes, production release, PR #5, `upstream-sync`, or
  `goshujin` work.

## Risks and unresolved implementation questions

- **Eligible visible set:** the SPEC must identify the current Active-list
  filtering/loading boundary precisely, including what happens when an entry is
  removed from view while selected. The locked rule is only that all/clear is
  bounded to currently loaded/visible entries; expanding that scope requires a
  documented API/product decision.
- **Normal-control lock accessibility:** the SPEC must select the accessible
  disabled/suppressed behavior for the managed task control (label, keyboard,
  focus, and screen-reader explanation) without changing rendered Markdown
  task semantics. It must not make selection a hidden alternate click target.
- **Confirmation-to-Phase-9 seam:** the SPEC must define a presentation-safe
  action intent/confirmation boundary. If a real request, observable endpoint,
  success/failure aggregate, or lifecycle transition is required to make the
  UI meaningful, that is Phase 9 work and continuous execution must STOP for
  sequencing rather than implement it early.
- **Selection reset timing:** explicit Cancel clears the selection. The SPEC
  must decide the equally transient behavior for Active-list refresh/filter
  changes while retaining the rule that no Batch Mode state survives as
  authoritative lifecycle data. This is an implementation detail only if it
  does not imply selection outside the visible set.

No unresolved owner product decision is currently identified: D-014 and the
Batch Mode design prescribe the selector, lock, actions, and confirmation
semantics; D-015 explicitly defers execution. The visible-set and UI-state
details above require a SPEC but do not authorize backend/API drift.

## Proposed implementation approach

1. Inspect the merged Phase 7 frontend component tree, Active list model,
   managed task control, normal chooser/dialog state, and existing test setup.
   Record the smallest Add-on-local state owner and the exact visible eligible
   set before changing components.
2. Add test-first frontend state for `batchMode`, `selectedIds`, and a pending
   batch action/confirmation state. Keep this state local and transient; never
   encode it in rendered Markdown, binding records, Archive data, or Paste
   content.
3. Add an accessible `BatchSelector` rendered only in Batch Mode, separate in
   markup, event handling, label, and test identity from `ManagedTaskCheckbox`.
   Add Batch Mode entry/Cancel plus visible-set `全选/清空` controls.
4. Lock the normal managed completion interaction only while Batch Mode is
   active. Preserve the Phase 6 single-item chooser and the Phase 7
   Archive/restore/countdown/reconciliation components unchanged outside that
   mode.
5. Add the compact sticky-capable action bar and selection-level confirmation
   dialogs. The Phase 8 action handler must end at an explicit deferred,
   injectable fixture/stub seam; it must make no request or lifecycle change.
   Document the typed handoff requirements for Phase 9 rather than inventing a
   result contract now.
6. Use TDD for frontend behavior, accessibility, and regression coverage.
   Record RED/GREEN/REFACTOR/REGRESSION evidence in the Phase 8 TODO once that
   artifact exists, then run focused and regression checks before each
   review-gated PR.

## Expected files/components (candidates, not a forced file list)

- `downstream/addons/feishu/frontend/` — Batch Mode state owner,
  `BatchModeToggle`, `BatchSelector`, Active entry row integration, normal
  managed-control lock, compact action bar, batch confirmation dialog, and
  fixture/stub seam.
- `downstream/addons/feishu/frontend/*.spec.tsx` and related frontend tests —
  test-first state, selector distinction, visible-set all/clear, interaction
  lock, confirmation, accessibility, and no-mutation regressions.
- `downstream/addons/feishu/shared/` — only a frontend-safe action-intent type
  if existing local typing needs one; no API request/response or backend batch
  contract is added in this phase.
- `downstream/addons/feishu/docs/` and `README.md` — only if the implemented
  Batch Mode interaction or deferred Phase 9 seam needs durable developer
  documentation.
- `docs/planning/phase8-spec.md`, `phase8-phases.md`, and `phase8-todo.md` —
  subsequent durable planning artifacts. Update architecture/API docs only if
  implementation reveals a documentation gap without changing locked behavior.

## Validation strategy

- Frontend RED-first tests from `docs/TESTING.md` §6: entering Batch Mode
  reveals separate selectors; selector and Markdown checkbox are different
  controls; selection does not mutate Markdown; normal completion is
  suppressed/disabled; visible-set all/clear works; and the action-bar count
  matches selection.
- Confirmation tests: permanent archive has no per-item confirmation; expiring
  archive has exactly one selection-level confirmation; delete has exactly one
  destructive count-bearing confirmation; Cancel produces no request, source,
  lifecycle, Active, or Archive mutation.
- Boundary/regression tests: no batch backend request, no hidden serial
  single-item completion, no optimistic row movement or expiry construction,
  and Phase 6 normal-mode/Phase 7 Archive, restore, countdown, and
  reconciliation behavior remains unchanged when Batch Mode is inactive.
- Accessibility/visual tests: labels and keyboard behavior for Batch Mode,
  selector, action bar, and confirmations; minimal upstream-aligned
  light/dark-compatible presentation; no dashboard/Feishu-client chrome.
- Add-on TypeScript, frontend lint/format, frontend build, focused frontend
  suite, and Phase 5–7 regression checks. Confirm no Worker, migration,
  upstream/root workflow/lockfile, patch-series, polling, or secret-boundary
  drift.
- For every implementation PR: record TDD RED/GREEN/REFACTOR/REGRESSION
  evidence; obtain current-HEAD CI and a completed AI Review Bot Phase Review
  Gate before merge. No deploy, release assembly, or Phase 9 API check is part
  of this phase.

## Internal consistency review

Reviewed against `AGENTS.md` §15 and §16, D-014, D-015, and D-030,
`docs/IMPLEMENTATION_ORDER.md` Phases 8–9,
`docs/CHANGE_CONTEXT_AND_REVIEW.md` §§10.1.1–10.7,
`docs/DESIGN.md` §§6–7 and §10, `docs/FRONTEND.md` §§6–8,
`docs/TESTING.md` §6, and the merged Phase 6 browser-trust and Phase 7
Archive/restore/reconcile boundaries. The PLAN treats Batch Mode as transient
frontend selection state; keeps selectors distinct from Markdown semantics;
locks ambiguous normal completion; requires one confirmation for expiring and
delete; and excludes all backend execution, partial-success behavior,
polling/tombstones/deployment, and upstream work. No STOP condition is
currently present. Implementation has NOT started.
