# SPEC — FT-09 blocker #170: timed restore post-cancel failure must reconcile

Status: **SPEC DRAFT FOR OWNER REVIEW** (docs-only; implementation requires separate owner approval)

Parent PLAN: [ft09-post-cancel-reconciliation-plan.md](ft09-post-cancel-reconciliation-plan.md)

```text
DEFECT170_PLANNING_SOURCE_BASELINE=de6f6a38e384eee7f0581755425e9b7180be70c9
DEFECT170_SCOPE=restore_timed_post_expiry_cancel_only
POST_CANCEL_FAILURE_MUST_RECONCILE=YES
FT09_EXECUTION_ALLOWED=NO
RETROACTIVE_EVIDENCE=NO
```

## 1. Scope

Fix classification and persistence of a **timed restore** partial-mutation state
that occurs **after Stage 1 expiry cancellation is confirmed upstream** and before
the restore can safely complete. This SPEC freezes mechanical gates. It does
**not** authorize implementation or deployment; implementation requires a
separate owner approval.

## 2. Core rule

```text
POST_CANCEL_FAILURE_MUST_RECONCILE=YES
```

Once `expiry_cancel_completed == YES`, any later inability to complete the same
restore safely must persist:

```text
status=reconciliation_required    (NOT status=failed)
```

and must **not** pretend the local lifecycle transition completed.

## 3. Behavior contract

| Scenario                                                         | Current behavior (baseline `de6f6a3…`)                                      | Required behavior                                                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A. Stage 2 deterministic upstream failure (post Stage 1 success) | `store.fail` → `status=failed`; binding stays archived/timed/old expires_at | `store.uncertain` → `reconciliation_required`; `upstream_update_failed` marker; API `RECONCILIATION_REQUIRED`; binding unchanged |
| B. Stage 2 uncertain/infrastructure failure                      | `reconciliation_required` (existing fail-closed)                            | Unchanged (no regression)                                                                                                        |
| C. finish/persistence failure after Stage 2 confirmed success    | `reconciliation_required`                                                   | Unchanged (no regression)                                                                                                        |
| D. Stage 1 deterministic failure (pre-`expiry_cancel_completed`) | clean `failed` allowed (Stage 1 never confirmed)                            | Unchanged                                                                                                                        |
| E. Permanent restore deterministic Stage 2 upstream failure      | per current semantics                                                       | Unchanged; MUST NOT be converted to reconciliation semantics by #170                                                             |

## 4. Binding-state policy

- On post-cancel failure before `finishPermanentRestore`, binding remains the
  conservative pre-operation local snapshot: `archived / timed / old expires_at /
version unchanged`.
- The outstanding `reconciliation_required` operation is the authority marking
  the binding unsafe/unsettled.
- Do NOT rewrite to `active/permanent/NULL`; do NOT manufacture a new
  authoritative expiry; do NOT attempt `e=max` compensation.

## 5. Scope boundary (no automatic recovery)

- No automatic Stage 2 resume / retry worker / generic lifecycle reconciliation
  engine / new browser UX / new D1 state machine / automatic `e=max` rollback /
  automatic deletion / new admin API.
- The existing D-011 `reconcileArchivedAbsence` path is a separate
  absence-reconciliation path, **not** a continuation engine for a partially
  completed timed restore.

## 6. Duplicate / retry contract

- After post-cancel failure: operation `reconciliation_required`; replay with the
  **same** request/idempotency identity resolves via `duplicate()` →
  `RECONCILIATION_REQUIRED`; no second Stage 1/Stage 2, no new upstream call.
- No blind automatic retry.
- Entry remains fail-closed while a `reconciliation_required` op exists; no new
  request may bypass the outstanding claim.
- During implementation, verify these from tests; if not true, record as
  additional implementation requirements.

## 7. Telemetry contract

- Successful path unchanged; `RESTORE_STAGE` ordering preserved.
- Post-cancel Stage 2 failure:

```text
dispatch_completed
expiry_cancel_started
expiry_cancel_completed
upstream_update_started
upstream_update_failed
```

- Must NOT emit `upstream_update_completed` / `finish_completed` after the failed
  Stage 2 attempt.
- `code=` may preserve safe original cause (`UPSTREAM_REJECTED` /
  `ENTRY_NOT_FOUND`); lifecycle/API settlement after confirmed Stage 1 =
  `RECONCILIATION_REQUIRED`.

## 8. Test matrix (freeze in SPEC)

| ID  | Scenario                                                   | Expected                                                                                                                                                                        |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Timed restore happy path                                   | `restore_timed / succeeded`; binding active/permanent/NULL/version+1                                                                                                            |
| T2  | Stage 1 `UPSTREAM_REJECTED`                                | no `expiry_cancel_completed`; op `failed` allowed; binding unchanged; original upstream error returned; Stage 2 not attempted                                                   |
| T3  | Stage 1 `ENTRY_NOT_FOUND`                                  | pre-cancel semantics; no Stage 2; no false reconciliation from #170                                                                                                             |
| T4  | Stage 1 success + Stage 2 `UPSTREAM_REJECTED`              | `expiry_cancel_completed`; `upstream_update_failed`; op `reconciliation_required`; binding unchanged archived/timed/version; API `RECONCILIATION_REQUIRED`; no finish; no retry |
| T5  | Stage 1 success + Stage 2 `ENTRY_NOT_FOUND`                | `reconciliation_required` (not clean `failed`)                                                                                                                                  |
| T6  | Stage 1 success + Stage 2 uncertain/infrastructure failure | `reconciliation_required`                                                                                                                                                       |
| T7  | Stage 1 + Stage 2 success + finish failure                 | `reconciliation_required`                                                                                                                                                       |
| T8  | Duplicate same request after T4/T5                         | no new upstream call; no second Stage 1/Stage 2; response `RECONCILIATION_REQUIRED`                                                                                             |
| T9  | Permanent restore deterministic upstream failure           | not converted to post-cancel reconciliation semantics by #170                                                                                                                   |

## 9. Implementation constraints

- Prefer smallest change inside `restoreEntry`.
- Use existing `store.uncertain(op.id)` / `reconciliation_required`.
- Return `RECONCILIATION_REQUIRED` for post-cancel incomplete restore.
- Preserve original safe error cause only as telemetry if useful.
- Avoid schema changes / new operation kinds unless proven necessary.
- Avoid changes outside `restoreEntry` unless tests demonstrate they are required.

## 10. FT-09 unblock milestones

```text
DEFECT170_SOURCE_FIXED
DEFECT170_SOURCE_REVIEWED
DEFECT170_MERGED
DEFECT170_DEPLOYED
```

Production deploy is a **separate owner-authorized** gate. #170 merge alone does
NOT set `FT09_EXECUTION_ALLOWED=YES`.

## 11. Non-retroactivity / persistent state

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

HT-07/FT-08 historical evidence unchanged.

Status: SPEC DRAFT
