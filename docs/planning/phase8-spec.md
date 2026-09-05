# Phase 8 — Batch Mode frontend SPEC

Status: CONTINUOUS-MODE SPEC READY AFTER INTERNAL CONSISTENCY REVIEW.

Implementation has NOT started.

Parent: [Phase 8 PLAN](phase8-plan.md). This behavioral contract is scoped to
the D-030 continuous-execution roadmap Phase 8. It permits the subsequent
Phase/TODO planning artifact, not implementation. It is grounded in Phase 6
single-completion and Phase 7 countdown/restore contracts; Phase 9 remains the
sole owner of real batch mutation and result handling.

## 3.1 Problem statement

Completing several Active managed entries one at a time forces a user through
the normal completion chooser repeatedly. A faster selection experience must
not change the meaning of the rendered Markdown task checkbox or accidentally
make a lifecycle decision. A user needs to select a bounded visible set, see
the applicable actions and count, and understand when an expiring or destructive
choice is about to be made—without this frontend phase pretending to archive or
delete anything before the Phase 9 backend exists.

## 3.2 Goals

1. Add explicit compact Batch Mode for current loaded, visible, eligible Active
   entries.
2. Render an accessible `BatchSelector` structurally, semantically, visually,
   and behaviorally separate from `ManagedTaskCheckbox` and Markdown tasks.
3. Hold `batchMode`, `selectedIds`, and pending selection-level intent only as
   transient frontend state, with visible-set `全选` and `清空` controls.
4. Show a minimal sticky-capable selection action bar with exactly permanent
   archive, expiring archive, and delete intents for a nonempty selection.
5. Suppress or disable normal managed-task completion during Batch Mode, with
   an accessible explanation, so one click never has two meanings.
6. Require exactly one selection-level confirmation for expiring archive and
   exactly one destructive, count-bearing confirmation for delete.
7. Reuse, without redesign, Phase 6 browser trust and Phase 7 single-entry
   Archive/restore/countdown/reconciliation behavior.

## 3.3 Non-goals

- A Phase 9 `/api/batch` equivalent, Worker route, request/response schema,
  credential lookup, multi-Paste operation, partial-success result,
  idempotency/retry behavior, or frontend partial-failure/retry UX.
- A hidden serial loop over Phase 6 single-entry mutations, optimistic row
  movement, fabricated expiry/countdown, or claimed batch success.
- Batch restore, batch Archive changes, or a change to Phase 7 `expiresAt`,
  countdown, restore ordering, or missing/expired reconciliation.
- New OAuth/session/Origin/CSRF/principal/scope rules, browser-supplied trust
  attributes, secrets, retention authority, migration, storage, polling,
  deployment, or trust-boundary redesign.
- Markdown parser/semantic change, nested-task lifecycle mapping, or using a
  Markdown checkbox as a batch selector.
- Phase 10 release hardening; upstream/root dependency, workflow, patch-series,
  `upstream-sync`, `goshujin`, PR #5, or production deployment work.

## 3.4 Current behavior

Repository inspection at the approved PLAN baseline finds `frontend/App.tsx`
rendering Phase 6 Active and Archive views. An unchecked
`ManagedTaskCheckbox` opens the single-entry completion chooser; confirming
`archive_permanent`, `archive_expiring`, or `delete` calls the single-entry
completion path. It is not a batch control.

The frontend renders Phase 7 `ArchiveStatus` from public
`retentionMode`/authoritative `expiresAt` and offers a per-entry Restore button.
Restore keeps its Archive row in place until the backend returns an authoritative
active/permanent result. Fixtures validate active entries as permanent/null and
timed archives as having a valid ISO timestamp. There is no Batch Mode state,
`BatchSelector`, action bar, batch confirmation dialog, or batch endpoint.

The existing Worker/browser contract establishes an opaque Add-on session,
exact Origin, session-bound CSRF, and server-derived principal-to-stored-scope
authorization for single-entry mutations. Credentials and Paste bodies remain
server-side. Phase 8 must not widen this contract.

## 3.5 Desired behavior and state transitions

### Batch Mode and selection

The Active view has a compact, labelled Batch Mode entry control. Entering
initializes a fresh empty selection and exposes a `BatchSelector` beside every
entry in the current loaded/visible eligible Active set. It does not alter
Markdown, bindings, lifecycle fields, Archive contents, or Paste data.

`BatchSelector` changes only membership in `selectedIds`. It must not invoke
the normal chooser, set a managed Markdown task checked, or be an alternate
event target for a Markdown checkbox. Its accessible label identifies selection
(for example, select this entry), not task completion.

`全选` replaces `selectedIds` with IDs in the current visible eligible set;
`清空` empties it. Neither claims to select filtered, unloaded, archived, or
future paginated entries. If refresh/filtering makes an ID no longer
eligible/visible, the frontend prunes that ID before rendering a count or action
control. This prevents invisible selection and is not a lifecycle mutation.
Cancel/exit clears selection and exits Batch Mode.

```text
normal Active -> batch Active / selectedIds = {}
batch Active + selector toggle -> batch Active / selectedIds +/- entryId
batch Active + 全选 -> batch Active / selectedIds = visibleEligibleIds
batch Active + 清空 -> batch Active / selectedIds = {}
batch Active + Cancel -> normal Active / selectedIds = {}
```

### Interaction lock and action bar

During Batch Mode normal `ManagedTaskCheckbox` completion is disabled or
suppressed. Keyboard and pointer activation cannot open its single-entry
chooser. The managed control remains recognizably a task control, not a hidden
selector, and provides an accessible disabled/suppressed reason directing the
user to Batch Selectors or exit. Normal rendered Markdown retains GFM behavior;
code-fence content remains literal.

With one or more selected IDs, a compact action bar is shown near Active
content and may stick within the normal content layout while scrolling. It
states the selected count and exposes exactly `永久归档`, `限期归档`, and `删除`.
It is not dashboard chrome. At zero selection it has no enabled mutation action
state; it may be absent or retain only a non-actionable count.

### Confirmation and Phase 9 handoff

Permanent archive may use one lightweight selection-level confirmation or
proceed to an explicit deferred handoff; it never opens per-item dialogs.
Expiring archive opens exactly one selection-level confirmation, with current
selected count and the longest-retention countdown consequence. Delete opens
exactly one destructive selection-level confirmation with selected count and
irreversibility. Dialog focus is managed and restored to the initiating action.

Cancel leaves selection, Markdown, lifecycle state, Archive, countdown, Paste
data, and network state unchanged. Confirm only creates a local injectable
action-intent/handoff suitable for Phase 9 fixtures/stubs. It does not make a
request, construct an endpoint, invoke single-entry completion repeatedly,
report an outcome, change rows, calculate expiry, or clear selection as if work
completed. A fixture/stub is visibly/development-scoped deferred behavior, not
a fabricated production success. Real execution/result handling is Phase 9.

## 3.6 User and API flows

### User flow: selection

1. User opens Active and chooses Batch Mode.
2. The page presents separate selectors, `全选`, `清空`, and Cancel/exit.
3. User selects visible eligible rows individually or via `全选`; count derives
   only from selected IDs.
4. `清空` keeps Batch Mode with an empty selection. Cancel/exit also clears it
   and restores normal completion.
5. No lifecycle, Markdown, Archive, countdown, Paste, or request state changes.

### User flow: batch intent confirmation

1. With a nonempty selection, user chooses an action in the compact bar.
2. Permanent archive reaches deferred handoff directly or after one lightweight
   selection-level confirmation; it never shows a dialog for each row.
3. Expiring archive shows one count-bearing selection confirmation. Delete
   shows one count-bearing destructive confirmation.
4. Cancel preserves selection. Confirm closes or advances to inert/stub handoff
   without a mutation or claimed outcome.
5. User may adjust selection or exit; the UI never claims any row changed.

### API flow

There is intentionally no new batch API flow: no route, method, request body,
response, authorization extension, idempotency contract, or partial-failure
semantics is specified or implemented. The only allowed seam is frontend-local:

```ts
type BatchActionIntent = {
  action: "archive_permanent" | "archive_expiring" | "delete"
  entryIds: readonly string[]
}
```

This is not an API payload or promise of a future wire shape. It contains only
current Add-on entry IDs and an allowed action. Phase 9 must define backend
authorization, execution, aggregate/per-item results, retry, and idempotency
before a browser/server equivalent can exist.

## 3.7 Data and state model

Phase 8 adds no persistent model, database row, migration, lifecycle state, or
second content source. Existing public entry state remains the Phase 6/7
allowlisted shape, including `id`, `visibility`, `retentionMode`, `expiresAt`,
and `version`; private bindings retain credentials and Paste metadata only on
the backend.

The narrowest practical Active-list owner may hold:

```ts
type BatchAction = "archive_permanent" | "archive_expiring" | "delete"

interface BatchPresentationState {
  batchMode: boolean
  selectedIds: Set<string>
  pendingAction: BatchAction | null
  confirmationOpen: boolean
  deferredIntent: BatchActionIntent | null
}
```

`selectedIds` is always intersected with current visible eligible Active IDs.
It is discarded on explicit exit and must never be serialized into Markdown, a
binding, public entry state, URL, analytics, or persistent browser storage.
`deferredIntent` is presentation-only; it is not operation state, accepted work,
idempotency, a countdown deadline, or success.

Phase 7 Archive/Restore state remains single-entry. Archived rows are outside
the visible eligible selection set. Batch Mode neither changes countdown nor
adds batch restore.

## 3.8 Security and trust boundaries

Phase 8 reuses Phase 6 unchanged: browser access is an opaque server-established
session; real mutations require exact Origin, session-bound CSRF, and
server-derived principal joined to stored allowed scope. Batch Mode state is not
authority, and an entry ID does not grant access to a binding.

The frontend must never display, persist, log, or place in fixture/stub, intent,
URL, telemetry, error, or client-visible state: passwords, management URLs,
credential ciphertext, Paste bodies, OAuth/session/CSRF secrets, raw Feishu
identity/scope values, raw upstream errors, or client-derived expiry deadlines.
Fixtures use only safe public sample data.

Although this phase sends no batch request, its seam must not encourage browser-
supplied Paste names, passwords, scope, identity, or expiry authority. Phase 9
will independently enforce per-ID server-side authorization and credentials.

## 3.9 Compatibility

This Add-on-only frontend enhancement does not alter upstream Paste behavior,
the generic retention patch, bindings/migrations, or single-entry Phase 6
routes. With Batch Mode inactive, existing normal completion plus Phase 7
Archive, countdown, restore, and reconciliation behavior is unchanged.

Active fixtures/lists remain compatible because selection derives from existing
public IDs and visibility. Archive rows receive no selectors or new behavior. A
UI unable to determine the visible eligible set fails closed by withholding
select-all and batch actions rather than selecting an unknown broader set.

## 3.10 Failure behavior

Phase 8 has no batch network operation and cannot surface real upstream or
partial results. Canceled confirmation is a no-op. An empty, stale, or pruned
selection has no actionable state and cannot open a valid confirmation. If the
Active set changes while confirmation is open so selected IDs are no longer
eligible/visible, close confirmation, prune selection, and require a new action
choice; do not execute or preserve an invisible stale intent.

An unavailable/misconfigured fixture or inert handoff shows only a sanitized
deferred/unavailable presentation and leaves visible entry state unchanged. It
must not fall back to individual completion requests. Network/auth/upstream/
partial failure/retry/duplicate/inconsistent multi-Paste outcomes are Phase 9;
this phase neither models nor masks them.

## 3.11 Acceptance criteria

- [ ] Entering Batch Mode on Active reveals a separately labelled
      `BatchSelector` for each current visible eligible Active entry and starts an
      empty transient selection.
- [ ] Selector markup, handling, and accessible name differ from managed
      Markdown completion; selecting changes no Markdown/lifecycle state and opens
      no single-item chooser.
- [ ] `全选` selects exactly current visible eligible Active IDs; `清空` selects
      none; exit clears selection; invisible/stale IDs are never counted/actionable.
- [ ] Batch Mode locks normal managed completion for pointer and keyboard with
      an accessible reason, then restores unchanged normal behavior on exit.
- [ ] A nonempty selection shows compact upstream-aligned sticky-capable bar,
      exact count, and only permanent archive, expiring archive, and delete; empty
      selection has no enabled action.
- [ ] Expiring has exactly one count-bearing confirmation; delete exactly one
      count-bearing destructive confirmation; neither creates per-item dialogs.
      Cancel makes no mutation/request and preserves selection.
- [ ] Confirmed Phase 8 intent reaches only inert/local fixture handoff: no
      batch route, serial single-entry request, optimistic update, expiry creation,
      success claim, or partial-success/failure UI.
- [ ] Phase 6 trust and Phase 7 per-entry Archive/countdown/restore/reconcile
      behavior stay unchanged; protected values stay absent from browser state.
- [ ] UI remains minimal, content-first, accessible, and light/dark compatible;
      no Feishu-client or dashboard chrome is introduced.

## 3.12 Test specification

| Behavior                | Test level and observable assertion                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode entry and selector | RED-first frontend tests: entering shows selectors only in mode; accessible control identity differs from `ManagedTaskCheckbox`; pointer/keyboard selection changes only selection/count. |
| All/clear and pruning   | Frontend state tests: all selects supplied visible eligible IDs only; clear/exit empties; Active refresh/filter removes stale IDs before count/action use.                                |
| Interaction lock        | Regression tests: managed task pointer/keyboard cannot open completion in mode and communicates the lock; exit restores Phase 6 chooser.                                                  |
| Action bar              | Structure/accessibility tests: bar appears only for nonempty selection, exact count, precisely three actions, and compact/sticky-capable existing-token styling.                          |
| Confirmation            | Tests: expiring/delete give one count-bearing dialog, delete is destructive, permanent has no per-item dialog, focus is managed, and Cancel makes no fetch/content/lifecycle mutation.    |
| Phase 9 boundary        | Negative tests spy on `fetch` and single completion adapters: confirmed stub makes no request, changes no row/countdown/Markdown, claims no success, and has no per-item result UI.       |
| Phase 6/7 regression    | Existing/additive tests: normal completion when mode off; authoritative countdown; single-entry Restore waits for backend; reconciliation presentation unchanged.                         |
| Secrets/trust           | Static/component/fixture tests: no password/manage URL/token/scope/body/deadline authority in Batch Mode state/output and no Worker/API changes.                                          |

Implementation records actual RED/GREEN/REFACTOR/REGRESSION evidence in the
Phase 8 TODO/PR per `docs/TESTING.md` §1.1. This docs-only SPEC records:

```text
TDD: N/A
Reason: This change defines a planning contract and has no executable behavior.
Alternative verification: Repository and governing-contract consistency review.
```

## 3.13 Open questions

No unresolved owner product decision blocks PHASE/TODO planning. D-014, D-015,
the approved PLAN, and design docs lock separation, actions, interaction lock,
and confirmation semantics while reserving execution for Phase 9.

Implementation may choose the smallest accessible control primitive, exact
within-content sticky positioning, and local fixture/injection shape if every
rule above holds. If it needs a real request/endpoint, aggregate/per-item
outcome, retry/idempotency, selection beyond visible set, batch Restore,
different action semantics, or trust/API change, continuous execution MUST STOP
for owner decision and SPEC change control.

## Internal consistency review

Reviewed against the approved [Phase 8 PLAN](phase8-plan.md),
`docs/IMPLEMENTATION_ORDER.md` Phase 8–9, D-005–D-007, D-010–D-015, D-019,
D-029, D-030; `AGENTS.md` §§11–16 and §18;
`docs/CHANGE_CONTEXT_AND_REVIEW.md` §§10.1.1–10.7; `docs/DESIGN.md` §§2–7 and
§§10–11; `docs/FRONTEND.md` §§2–12; `docs/SECURITY.md` §§2, 5–7; and
`docs/TESTING.md` §§1 and 6–8. Repository inspection confirms Phase 6
single-entry completion plus Phase 7 ArchiveStatus/Restore baseline and no
existing batch frontend contract.

The SPEC preserves PLAN-bounded visible-set selection, distinct selectors,
normal-completion lock, compact action bar, one expiring/delete confirmation,
Phase 6 trust reuse, and Phase 7 single-entry behavior. It expressly defers
batch API/execution, partial success, retry/idempotency, and result UX to Phase
9; it adds no ownership, API, lifecycle, storage, or trust drift. No D-030 STOP
condition is present.

Status: CONTINUOUS-MODE SPEC READY AFTER INTERNAL CONSISTENCY REVIEW.

Implementation has NOT started.
