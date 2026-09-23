# FT-12 TODO — Batch Mode production Function Test

Tracking: Issue [\#183](https://github.com/Skyline-Gazer/pastebin-worker/issues/183).
This checklist stops before fixture creation and does not authorize production
mutation.

## Phase A — repository and governance reconnaissance

- [x] Verify `origin/downstream/main` at
      `eb3df8c487145b8e74fec93ccdd49a3fb2ab2b4b`.
- [x] Confirm FT-11 is complete and Issue #180 is closed.
- [x] Confirm no canonical FT-12 Issue or active planning PR existed before
      this cycle.
- [x] Create tracking Issue #183 with explicit no-mutation scope.
- [x] Read locked decisions and the Batch/API/security/testing contracts.

## Phase B — current Batch contract verification

- [x] `/api/batch` route is present and POST-only.
- [x] BatchSelector is separate from Markdown/GFM task checkboxes.
- [x] Visible eligible Active selection, ordered unique IDs, max 50 IDs, and
      16 KiB body limit are implemented/documented.
- [x] Session, exact Origin, CSRF, server-derived scope, and server-side
      credentials remain required.
- [x] One batch idempotency key and durable replay/conflict handling are
      present.
- [x] Per-item ordered results and aggregate partial-result semantics are
      present.
- [x] Browser does not fall back to repeated single-entry completion calls.
- [x] Frontend retains failed IDs for retry with a new key.

## Phase C — fresh authenticated read-only production preflight

- [ ] Revalidate authenticated Add-on session and principal/scope facts.
- [ ] Inventory Active/Archive entries without reusing retained evidence.
- [ ] Classify every candidate; unknown and historical entries are not
      disposable.
- [ ] Capture D1 operation/reconciliation/in-flight baseline.
- [ ] Capture deployment versions and queue telemetry or explicit unavailable
      reasons.

Current Phase C stop: the canonical production Add-on presented the Feishu/Lark
login surface. No owner-authenticated session was available, so no entry
inventory, fixture classification, or production baseline is claimed.

## Phase D — fixture owner gate (not executed)

- [ ] Owner chooses/confirms the batch action; historical action is
      unspecified. Delete remains only the recommendation.
- [ ] Owner authorizes exactly two supported Add-on creates.
- [ ] Create A exactly once and reconcile read-only if ambiguous.
- [ ] Create B exactly once and reconcile read-only if ambiguous.
- [ ] Prove both entries active/permanent/NULL-expiry and explicitly
      disposable before any batch authorization.

## Phase E — batch owner gate (not executed)

- [ ] Owner authorizes one batch request bound to the exact two entry IDs.
- [ ] Submit one selection-level confirmation and one `POST /api/batch`.
- [ ] Verify two ordered succeeded results and all postconditions.
- [ ] Do not retry or mutate failed/successful IDs without a new owner gate.

## Current settlement

```text
FT12_STATE=BLOCKED_OWNER_AUTHENTICATION
FT12_FIXTURE_COUNT_REQUIRED=2
FT12_FIXTURE_CREATION_AUTHORIZED=NO
FT12_BATCH_EXECUTION_AUTHORIZED=NO
FT12_CANONICAL_ACTION_FROM_HISTORICAL_SPEC=UNSPECIFIED
FT12_RECOMMENDED_ACTION=delete
FT12_ACTION_OWNER_GATE=REQUIRED
AUTH_SESSION_VALID=NO
AUTH_OWNER_INTERACTION_REQUIRED=YES
FT12_BLOCKER=OWNER_AUTHENTICATED_READ_ONLY_PREFLIGHT_REQUIRED
PRODUCTION_MUTATION=NO
FIXTURES_CREATED=0
BATCH_REQUEST_SUBMITTED=NO
NEXT_ALLOWED_ACTION=OWNER_AUTHENTICATED_READ_ONLY_PREFLIGHT
```
