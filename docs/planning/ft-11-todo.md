# FT-11 TODO — single-item delete production Function Test

Tracking: Issue [#180](https://github.com/Skyline-Gazer/pastebin-worker/issues/180).
The checklist stops at an owner gate; it does not authorize production
mutation.

## Phase A — read-only reconnaissance

- [x] Verify remote `downstream/main` is
      `8980c1d9a973e6b44b61998a3a365242be18603c`.
- [x] Read the lifecycle/API contracts and existing Function-Test evidence.
- [x] Confirm the known FT-09 target is retained and non-disposable.
- [x] Check the production Add-on session without reusing stale cookies.
- [ ] Obtain a fresh authenticated D1/entry inventory and operational counts.
- [x] Record that no explicit disposable FT-11 fixture was found.

## Phase B — planning persistence

- [x] Create Issue #180 with context, acceptance criteria, constraints, and
      no-mutation scope.
- [x] Persist the PLAN, SPEC, and TODO at these durable paths.
- [ ] Complete the repository's current-HEAD review/merge workflow for these
      planning-only documentation changes, if required by owner governance.

## Phase C — fixture gate (not executed)

- [ ] Owner authorizes exactly one fixture creation.
- [ ] Fresh authenticated session and supported create preconditions pass.
- [ ] Create one unique FT-11 fixture; record only secret-free identifiers.
- [ ] Read back the binding/Paste/lifecycle and mark it explicitly disposable.

## Phase D — delete gate (not executed)

- [ ] Owner separately authorizes the armed delete action.
- [ ] Capture D1/reconciliation/in-flight/queue baselines.
- [ ] Submit exactly one canonical `delete` action.
- [ ] Verify all SPEC postconditions and record evidence.

## Current settlement

```text
FT11_STATE=BLOCKED_DISPOSABLE_FIXTURE_REQUIRED
FT11_BLOCKER=DISPOSABLE_FIXTURE_REQUIRED
FT11_OWNER_ACTION_REQUIRED=YES
PRODUCTION_MUTATION=NO
DELETE_EXECUTED=NO
NEXT_ALLOWED_ACTION=OWNER_AUTHORIZATION_FOR_ONE_DISPOSABLE_FIXTURE
```
