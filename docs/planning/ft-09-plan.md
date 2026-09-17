# FT-09 PLAN — Restore timed archive / cancel expiry

Status: **PLAN READY FOR OWNER REVIEW** (docs-only; no execution)

```text
FT09_TEST_OBJECTIVE=timed_restore_and_expiry_cancellation
FT09_CANONICAL_TRANSITION=ARCHIVED_EXPIRING -> ACTIVE_PERMANENT
FT09_USES_FT08_RESULT=YES
FT09_AUTHORIZED=NO
FT09_STARTED=NO
FT09_ACTION_SUBMITTED=NO
FT09_FUNCTIONAL_RESULT=NOT_RUN
PRODUCTION_MUTATION=NO (this document)
FT07_ORDERING_EVIDENCE=INCONCLUSIVE (unchanged)
ORDERING_VERIFIED_BY_STEP_LOGS=NO (unchanged)
```

Tracking: Issue [#168](https://github.com/Skyline-Gazer/pastebin-worker/issues/168) (**Issue**, new independent tracker; does NOT reuse #162). Predecessor: [#162](https://github.com/Skyline-Gazer/pastebin-worker/issues/162) **CLOSED** (`state_reason=completed`).

## 1. Objective

Execute one canonical frontend single-item timed restore on the FT-08 timed-archive
fixture:

```text
ARCHIVED_EXPIRING --restore (恢复)--> ACTIVE_PERMANENT
```

Two-stage upstream transition (do **not** collapse):

- Stage 1: expiry cancellation — `PasteClient.update(paste, password, source, "never")` with original checked source `- [x] FT_LIFECYCLE_20260916_01`
- Stage 2: restore content — `PasteClient.update(paste, password, restoredContent, "never")` with unchecked source `- [ ] FT_LIFECYCLE_20260916_01`

## 2. Authoritative behavior sources

- `docs/planning/evidence/ft-08-timed-archive-pass.md` §8 (FT-09 handoff baseline; frozen fixture).
- `downstream/addons/messaging/worker/service.ts` `restoreEntry` — timed branch: reserve `reserveTimedRestore` → dispatch → Stage 1 expiry-cancel `update(..., source, "never")` → Stage 2 `update(..., content, "never")` → `finishPermanentRestore`; op kind `restore_timed`.
- `downstream/addons/messaging/worker/restore-telemetry.ts` — `RESTORE_STAGE` markers (merged #165) including `expiry_cancel_started/completed`, `upstream_update_*`, `finish_*`.
- `docs/planning/restore-ordering-telemetry-spec.md` — stage schema + correlation (`request_id`/`op_id`/monotonic `seq`).
- `docs/RETENTION_LIFECYCLE.md` §6 (restore cancels expiry first) / §7 (countdown authoritative).
- HTTP surface `POST /api/entries/:id/restore` (`restore.ts`): session+CSRF+Origin; empty body; opaque `Idempotency-Key`; 200 `{entry}`.

## 3. Frozen handoff fixture (FT-08 result)

```text
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
visibility=archived
retention_mode=timed
expires_at=2026-12-16T07:18:12.000Z
version=4
body=- [x] FT_LIFECYCLE_20260916_01
task_state=checked
operation=complete_expiring succeeded (last)
FT08_CLEANUP=NONE
```

Expected final state (after one authorized restore):

```text
visibility=active
retention_mode=permanent
expires_at=NULL
version=5
body=- [ ] FT_LIFECYCLE_20260916_01
task_state=unchecked
operation=restore_timed succeeded (expected_version=4)
```

## 4. Preconditions (frozen uppercase gates)

Evaluated **before** the first action:

```text
FT09_PRECONDITION_1_FT08_PASS      # FT08_FUNCTIONAL_RESULT=PASS and FT08_COMPLETE=YES
FT09_PRECONDITION_2_FIXTURE_TIMED_ARCHIVE  # archived/timed/expires_at=<finite ISO>/version=4, same identity
FT09_PRECONDITION_3_FIXTURE_BODY   # exact `- [x] FT_LIFECYCLE_20260916_01`, HAS_LF=NO
FT09_PRECONDITION_4_NOT_EXPIRED    # public Paste exists; authoritative expiresAt > current time; not stale/expired
FT09_PRECONDITION_5_AUTH           # authenticated canonical frontend session + CSRF/Origin + scope authorization
FT09_PRECONDITION_6_DEPLOY_COMPAT  # production Worker supports timed restore, expiry cancellation, restore_timed,
                                   #   and RESTORE_STAGE timed markers (#165)
FT09_PRECONDITION_7_NO_PENDING_OP  # no pending/uncertain/reconciliation-required target op
FT09_PRECONDITION_8_OWNER          # fresh explicit owner authorization before production action
```

`FT09_ACTION_SINGLE_SUBMISSION` is an **execution invariant**, not a precondition
(same as FT-08): the authorized action is submitted exactly once; no retry/replay
after a terminal result.

## 5. Deployment / telemetry gate (differs from FT-08)

```text
FT09_RESTORE_STAGE_REQUIRED_BEFORE_EXECUTION=YES
FT09_RUNTIME_DEPLOYMENT_REQUIREMENT=version-compatible-with-timed-restore-and-RESTORE_STAGE
```

FT-08 did **not** execute restore, so #165 telemetry deployment was not an FT-08
gate. FT-09 **does execute `restoreEntry`**; the prospective `RESTORE_STAGE`
telemetry (merged #165) exists specifically so a future restore can prove
same-invocation ordering. Therefore the production Worker used for FT-09 must
contain the equivalent of merged #165 `RESTORE_STAGE` telemetry (timed-stage
markers, safe correlation by request/op id).

Requirements:

- Do not require `production == PLANNING_SOURCE_BASELINE`; require **runtime
  capability**.
- Do **not** assume the currently retained production Worker is compatible
  merely because FT-08 passed (FT-08 did not exercise restore telemetry).
- Later Phase A must resolve the actual live `WORKER_PIN`.
- If live production lacks telemetry, a **separate owner-authorized deployment
  gate** is required before FT-09 execution.
- This planning round deploys **nothing**.

## 6. Expected result gates (frozen)

```text
FT09_RESULT_1_HTTP=200 + entry JSON
FT09_RESULT_2_ENTRY=active/permanent/expiresAt null/version 5
FT09_RESULT_3_D1_BINDING=same binding/paste; active/permanent/NULL/v5
FT09_RESULT_4_D1_OP=restore_timed / succeeded / expected_version=4
FT09_RESULT_5_PASTE_BODY=exact `- [ ] FT_LIFECYCLE_20260916_01`; no LF; no unrelated byte change
FT09_RESULT_6_EXPIRY_CANCEL_EFFECT=final upstream non-expiring; authoritative expiry absent/null (upstream metadata); D1 expires_at=NULL
FT09_RESULT_7_UI_ARCHIVE=target absent from Archive after restore
FT09_RESULT_8_UI_ACTIVE=target present in Active; managed task unchecked
FT09_RESULT_9_VERSION=4 -> 5
FT09_RESULT_10_ORDERING=required same-invocation RESTORE_STAGE timed ordering PASS
FT09_RESULT_11_NO_ANOMALY=no unexpected binding/second Paste/pending/uncertain/reconciliation; no unexpected list mutation
```

PASS gate:

```text
FT09_PASS_GATE = (all FT09_PRECONDITION_*) AND (FT09_ACTION_SINGLE_SUBMISSION) AND (all FT09_RESULT_*) AND (no prohibited retry/replay)
```

## 7. Failure / inconclusive semantics

Preserve FT-08 distinction:

```text
Before action, failed precondition:
  FT09_EXECUTION_STATUS=BLOCKED_PRECONDITION
  FT09_FUNCTIONAL_RESULT=NOT_RUN
  FT09_ACTION_SUBMITTED=NO

After submission — contract violation:  FT09_FUNCTIONAL_RESULT=FAIL
After submission — evidence insufficient: FT09_FUNCTIONAL_RESULT=INCONCLUSIVE
```

If restore succeeds but required `RESTORE_STAGE` evidence cannot be correlated /
mechanically proven, **do not replay**; classify ordering per SPEC (likely
`INCONCLUSIVE`), never claim PASS from final state alone.

## 8. Non-retroactivity (FT-07 / FT-08)

```text
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT08_FUNCTIONAL_RESULT=PASS (unchanged)
FT08_COMPLETE=YES (unchanged)
```

Even if FT-09 later produces perfect `RESTORE_STAGE` evidence, it proves only
the FT-09 invocation. Never retroactively change FT-07.

## 9. Not authorized

This PLAN does not authorize: production read, live `WORKER_PIN` resolution, any
deploy (incl. #165), production logs for execution preflight, restore, click 恢复,
POST restore, D1/Paste mutation, fixture recreation, expiry-cancel test, FT-09
execution, or FT-07/FT-08 evidence modification.

Status: PLAN READY FOR OWNER REVIEW
