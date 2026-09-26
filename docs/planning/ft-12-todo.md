# FT-12 TODO — Batch Mode production Function Test

Tracking: Issue [#183](https://github.com/Skyline-Gazer/pastebin-worker/issues/183).
This checklist records the completed owner-authorized execution. The original
unauthenticated stop and the later preflight-baseline correction remain
historical; see [execution evidence](evidence/ft-12-batch-delete-pass.md).

## Phase A — repository and governance reconnaissance

- [x] Verify the planning baseline and current downstream/main before work.
- [x] Confirm FT-11 is complete and Issue #180 is closed.
- [x] Create tracking Issue #183 with explicit initial no-mutation scope.
- [x] Read locked decisions and the Batch/API/security/testing contracts.

## Phase B — current Batch contract verification

- [x] `/api/batch` route is POST-only.
- [x] BatchSelector is separate from Markdown/GFM task checkboxes.
- [x] Ordered unique IDs, max 50 IDs, 16 KiB body limit, and eligible Active
      selection are implemented/documented.
- [x] Session, exact Origin, CSRF, server-derived scope, and server-side
      credentials remain required.
- [x] One batch idempotency key and durable replay/conflict handling are
      present.
- [x] Per-item ordered results and aggregate partial-result semantics are
      present.
- [x] Browser does not fall back to repeated single-entry calls.
- [x] Failed IDs remain retryable only under a new request identity and
      authorization.

## Phase C — fresh authenticated production preflight

- [x] Revalidate the authenticated Add-on session and principal/scope facts.
- [x] Inventory Active/Archive and identify exactly A2 and B as the authorized
      disposable batch targets.
- [x] Capture the corrected D1 baseline: 19 entry operations, 12 bindings,
      0 batch operations, 0 reconciliation-required, 0 in-flight.
- [x] Capture Worker version and Queue/DLQ configuration; no queue replay or
      configuration change was performed.
- [x] Verify both targets active/permanent/NULL-expiry and their exact marker,
      entry ID, Paste ID, and create-success provenance.

The earlier unauthenticated preflight stop is retained in the planning record
and issue history. Its later owner-authorized authenticated replacement
preflight passed. The issue’s expected binding value of 10 was corrected by the
owner to 12 before execution; the original stop comment was not rewritten.

## Phase D — fixture owner gate

- [x] Owner chose delete for the two explicitly disposable entries.
- [x] Original Fixture A’s create authorization was consumed by its timed-out
      submission; final read-only reconciliation classified it
      `CASE_B_TERMINAL_NOT_CREATED`. It was not retried.
- [x] A2 was created through the authorized Add-on path and reconciled as
      active/permanent/NULL-expiry.
- [x] Existing Fixture B’s held create authorization was not reused; B was
      separately reconciled as active/permanent/NULL-expiry.
- [x] Owner authorized the single delete batch for the exact A2 and B entry IDs.

## Phase E — batch execution and postconditions

- [x] One selection-level confirmation submitted one `POST /api/batch`.
- [x] The ordered result contains A2 then B, both `status=ok, deleted=true`;
      2 succeeded and 0 failed.
- [x] Active and Archive no longer contain either target.
- [x] Public GET for both Paste IDs returned 404.
- [x] D1 contains exactly two successful target delete operations, one completed
      batch result, no targeted bindings, and no reconciliation/in-flight work.
- [x] No unrelated/historical mutation, secret exposure, serial fallback,
      retry, queue replay, or direct D1 SQL write occurred.

## PR and issue settlement

- [x] Commit this secret-free evidence with full review context.
- [x] Open evidence PR against `downstream/main`, referencing Issue #183.
- [x] Complete exact-HEAD required CI; all four required checks passed.
- [x] Keep Project #183 Blocked while reviewer quorum is unmet.
- [ ] Complete the exact-HEAD AI Review Bot gate; do not override reviewer
      quorum or unresolved blocking findings.
- [ ] Merge only after the complete gate passes.
- [ ] Refresh `downstream/main`, add closure evidence, close Issue #183 as
      completed, and set its Project item Done.
- [ ] Refresh Project #3. Do not invent or start FT-13.

## Current settlement

```text
FT12_FUNCTIONAL_RESULT=PASS
FT12_BATCH_EXECUTION_AUTHORIZATION=CONSUMED_BY_SUBMISSION
FT12_STATE=EXECUTION_PASS_EVIDENCE_PR_PENDING
FT12_COMPLETE=NO
BATCH_REQUEST_COUNT=1
BATCH_RESULT_SUCCEEDED=2
BATCH_RESULT_FAILED=0
D1_POST_ENTRY_OPERATIONS=21
D1_POST_BINDINGS=10
D1_POST_BATCH_OPERATIONS=1
D1_POST_RECONCILIATION_REQUIRED=0
D1_POST_INFLIGHT=0
NEXT_ALLOWED_ACTION=EVIDENCE_PR_REVIEW_ONLY
FT13_STARTED=NO
```
