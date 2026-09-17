# PLAN — FT-09 blocker #170: timed restore post-cancel failure must reconcile

Status: **PLAN READY FOR OWNER REVIEW** (docs-only; no implementation)

```text
DEFECT170_PLANNING_SOURCE_BASELINE=de6f6a38e384eee7f0581755425e9b7180be70c9
DEFECT170_SCOPE=restore_timed_post_expiry_cancel_only
POST_CANCEL_FAILURE_MUST_RECONCILE=YES
FT09_KNOWN_SOURCE_BLOCKER_POST_CANCEL_COMPENSATION=OPEN
FT09_EXECUTION_ALLOWED=NO
FT09_STARTED=NO
PRODUCTION_MUTATION=NO (this document)
```

Tracking: Issue [#170](https://github.com/Skyline-Gazer/pastebin-worker/issues/170). Parent planning: [ft-09-plan.md](ft-09-plan.md) §5.1, [ft-09-spec.md](ft-09-spec.md) §4.

## 1. Goal

Scope a minimal, safe remediation so that a **timed restore** that has already
confirmed **Stage 1 expiry cancellation** to upstream, and then cannot complete
safely, is persisted **fail-closed** as `reconciliation_required` — never as a
clean terminal `failed` — without pretending the local lifecycle transition
completed.

## 2. Defect boundary (frozen)

Timed restore contract:

```text
reserveTimedRestore
→ dispatch
→ Stage 1 expiry cancellation: PasteClient.update(paste, password, originalCheckedSource, "never")
    └─ confirmed success boundary: expiry_cancel_completed
→ Stage 2 restore content:      PasteClient.update(paste, password, restoredUncheckedContent, "never")
→ finishPermanentRestore
```

Confirmed-success moment (`expiry_cancel_completed == YES`) means upstream has
already crossed the irreversible-for-this-attempt boundary:

```text
timed expiry → cancelled/non-expiring
```

while local binding is still:

```text
archived / timed / old expires_at / original version
```

**Current defect (source-verified on baseline `de6f6a3…`):** after
`expiry_cancel_completed`, a deterministic Stage 2 `UPSTREAM_REJECTED` /
`ENTRY_NOT_FOUND` takes a clean `store.fail(op.id)` path (`failed` terminal) while
the binding stays `archived/timed/old expires_at`. Upstream is already
non-expiring (or absent) — D1/UI drift from upstream, and the operation is not
marked for reconciliation.

## 3. Remediation contract (frozen)

```text
POST_CANCEL_FAILURE_MUST_RECONCILE=YES
```

Once `expiry_cancel_completed == YES`, **any later inability to complete the same
restore safely** must leave the lifecycle claim fail-closed:

```text
status=reconciliation_required   (NOT status=failed)
```

### A. Stage 2 deterministic upstream failure (post-cancel)

After Stage 1 success, if Stage 2 throws `UPSTREAM_REJECTED` / `ENTRY_NOT_FOUND`:

- emit `upstream_update_failed` telemetry marker (with safe cause code);
- persist operation as `reconciliation_required` (existing `store.uncertain`);
- do **not** change binding to active/permanent;
- return API result classified `RECONCILIATION_REQUIRED`;
- do **not** return a clean terminal upstream failure as though rollback-safe.

### B. Stage 2 uncertain / infrastructure failure

Keep existing fail-closed `reconciliation_required`. No regression.

### C. finish / persistence failure after Stage 2 confirmed success

Keep existing `reconciliation_required`. No regression.

## 4. Binding behavior

Minimal remediation must **not** pretend the local lifecycle transition completed.

On post-cancel failure before `finishPermanentRestore`:

- binding remains conservatively at the pre-operation local snapshot:
  `archived / timed / old expires_at / version unchanged`;
- the outstanding `reconciliation_required` operation is the authority marking
  the binding unsafe/unsettled;
- do **not** rewrite the binding to `active/permanent/NULL`;
- do **not** manufacture a new authoritative expiry;
- do **not** attempt compensation by restoring `e=max`.

## 5. Scope boundary — no automatic recovery

#170 does **not** expand into:

- automatic Stage 2 resume;
- retry worker;
- generic lifecycle reconciliation engine;
- new browser reconciliation UX;
- new D1 state machine;
- automatic `e=max` rollback;
- automatic deletion;
- new admin API.

```text
DEFECT170_SCOPE=restore_timed_post_expiry_cancel_only
```

Current `/api/entries/:id/reconcile` / `reconcileArchivedAbsence` (D-011) is a
**separate absence-reconciliation path**, not a continuation/resume engine for a
partially completed timed restore. This patch does **not** provide automatic
recovery. A future dedicated recovery capability may be planned separately.

## 6. Pre-cancel failures stay different

The remediation must **not** turn every restore failure into
reconciliation-required.

- **Stage 1 deterministic failure** (`UPSTREAM_REJECTED` / `ENTRY_NOT_FOUND`
  before `expiry_cancel_completed`): clean terminal failure remains allowed —
  Stage 1 success was never confirmed.
- **Permanent restore** (`restore_permanent`): no Stage 1; a deterministic Stage 2
  upstream failure before confirmed success should **not** automatically become
  reconciliation-required solely because #170 exists.

```text
DEFECT170_SCOPE=restore_timed_post_expiry_cancel_only
```

## 7. Duplicate / retry behavior (source-verified)

Expected existing fail-closed contract (verified on source):

- After post-cancel failure, operation is `reconciliation_required`.
- Replay with the **same** request/idempotency identity hits the duplicate path
  (`store.operation` → `duplicate()`), which returns `RECONCILIATION_REQUIRED`
  for a non-succeeded op — **no second Stage 1 / Stage 2, no new upstream call**.
- No blind automatic retry.
- No new request may bypass the outstanding lifecycle claim; the entry remains
  fail-closed while a `reconciliation_required` op exists.

If any of these claims are not satisfied by tests during implementation, record
them as additional implementation requirements rather than assuming.

## 8. Telemetry semantics

- Preserve `RESTORE_STAGE` ordering; successful path unchanged.
- Post-cancel Stage 2 failure stage prefix:

```text
...
dispatch_completed
expiry_cancel_started
expiry_cancel_completed
upstream_update_started
upstream_update_failed
```

- Must **not** emit `upstream_update_completed` or `finish_completed` after the
  failed Stage 2 attempt.
- `code=` may preserve safe original cause (`UPSTREAM_REJECTED` / `ENTRY_NOT_FOUND`)
  in telemetry, but lifecycle/API settlement after confirmed Stage 1 must be
  `RECONCILIATION_REQUIRED`.

## 9. Recommended implementation shape (not implemented here)

- Explicitly retain whether the timed expiry-cancel boundary was crossed;
- once crossed, the Stage 2 catch path must **never** call `store.fail(op.id)`;
- use existing durable `store.uncertain(op.id)` / `reconciliation_required`;
- return `RECONCILIATION_REQUIRED` for post-cancel incomplete restore;
- preserve original safe error cause only as telemetry if useful;
- avoid schema changes; avoid new operation kinds unless proven necessary;
- avoid changes outside `restoreEntry` unless tests demonstrate they are required.

## 10. FT-09 unblock milestones (frozen)

```text
DEFECT170_SOURCE_FIXED
DEFECT170_SOURCE_REVIEWED
DEFECT170_MERGED
DEFECT170_DEPLOYED
```

FT-09 requires: source remediation merged → production deployment separately
owner-authorized → deployed Worker contains #170 fix + required `RESTORE_STAGE`
telemetry → fresh post-deploy FT-09 Phase A PASS. Only then may later planning
evaluate `FT09_PRECONDITION_6_DEPLOY_COMPAT=YES` and
`FT09_EXECUTION_ALLOWED` eligibility. #170 merge by itself must **not** set
`FT09_EXECUTION_ALLOWED=YES`.

## 11. Non-goals / persistent state

```text
FT09_KNOWN_SOURCE_BLOCKER_POST_CANCEL_COMPENSATION=OPEN
FT09_EXECUTION_ALLOWED=NO
FT09_AUTHORIZED=NO
FT09_STARTED=NO
FT09_ACTION_SUBMITTED=NO
FT09_FUNCTIONAL_RESULT=NOT_RUN
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
```

No code change, deploy, or FT-09 Phase A in this planning round.

Status: PLAN READY FOR OWNER REVIEW
