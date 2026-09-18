# FT-09 SPEC — Restore timed archive / cancel expiry

Status: **SPEC SETTLED — FT-09 executed PASS** (execution evidence: [ft-09-timed-restore-pass.md](evidence/ft-09-timed-restore-pass.md); historical blocked attempt: [ft-09-timed-restore-blocked-precondition.md](evidence/ft-09-timed-restore-blocked-precondition.md)). Frozen behavioral contract below is **unchanged**; this is a status/evidence sync only.

Parent PLAN: [ft-09-plan.md](ft-09-plan.md)

```text
FT09_TEST_OBJECTIVE=timed_restore_and_expiry_cancellation
FT09_CANONICAL_TRANSITION=ARCHIVED_EXPIRING -> ACTIVE_PERMANENT
FT09_USES_FT08_RESULT=YES
FT09_AUTHORIZED=YES
FT09_STARTED=YES
FT09_ACTION_SUBMITTED=YES
FT09_FUNCTIONAL_RESULT=PASS
FT09_COMPLETE=YES
RETROACTIVE_EVIDENCE=NO
```

## 0. Planning source baseline (frozen; single definition)

```text
PLANNING_SOURCE_BASELINE=20f65c28315fca3cd4ee8161c986ca91da5bdd70
```

Same meaning as PLAN §0: reviewed planning/source baseline, **not** a production
deployment pin. FT-09 runtime requires capability compatibility only. Actual
`WORKER_PIN` is resolved read-only at Phase A. No second baseline definition.

## 1. Scope

Verify the `restore_timed` path (expiry cancellation + restore content) and its
same-invocation `RESTORE_STAGE` ordering on the FT-08 timed-archive fixture. This
SPEC freezes mechanical PASS/FAIL/INCONCLUSIVE gates. It does **not** authorize
execution, deploy, restore, FT-10, or FT-09 replay.

## 2. Canonical contract

```text
ARCHIVED_EXPIRING --restore--> ACTIVE_PERMANENT
Stage 1 (expiry cancellation): update(paste, password, source, "never")   # source = original checked
Stage 2 (restore content):     update(paste, password, content, "never")  # content = unchecked
final D1: active / permanent / expires_at=NULL / version 4 -> 5
operation: kind=restore_timed, status=succeeded, expected_version=4
```

Do **not** collapse the two upstream `update` calls into one conceptual step.

## 3. Precondition gates (frozen uppercase)

Evaluated **before** the first action (Phase A/ARM). If any is false at that
time, do not submit any action:

```text
FT09_PRECONDITION_1_FT08_PASS       # FT08_FUNCTIONAL_RESULT=PASS, FT08_COMPLETE=YES
FT09_PRECONDITION_2_FIXTURE_TIMED_ARCHIVE
                                    # archived/timed/expires_at=<finite ISO>/version=4; same target identity
FT09_PRECONDITION_3_FIXTURE_BODY    # exact `- [x] FT_LIFECYCLE_20260916_01`; HAS_LF=NO
FT09_PRECONDITION_4_NOT_EXPIRED     # public Paste exists; expiresAt > current time; not stale/expired
FT09_PRECONDITION_5_AUTH            # authenticated canonical frontend session + CSRF/Origin + scope authorization
FT09_PRECONDITION_6_DEPLOY_COMPAT   # production Worker supports timed restore + restore_timed +
                                    #   RESTORE_STAGE timed markers (#165) AND post-expiry-cancel reconciliation
                                    #   fix deployed (FT09_KNOWN_SOURCE_BLOCKER_POST_CANCEL_COMPENSATION=OPEN until then)
FT09_PRECONDITION_7_NO_PENDING_OP   # no pending/uncertain/reconciliation-required target op
FT09_PRECONDITION_8_OWNER           # fresh explicit owner authorization before production action
```

`FT09_ACTION_SINGLE_SUBMISSION` is an **execution invariant** (Phase D), not a
precondition.

```text
FT09_EXECUTION_STATUS_BEFORE_ACTION=BLOCKED_PRECONDITION (if any precondition false)
FT09_FUNCTIONAL_RESULT_BEFORE_ACTION=NOT_RUN
FT09_ACTION_SUBMITTED_BEFORE_ACTION=NO
```

## 4. Deployment / telemetry gate

```text
FT09_RESTORE_STAGE_REQUIRED_BEFORE_EXECUTION=YES
FT09_RUNTIME_DEPLOYMENT_REQUIREMENT=version-compatible-with-timed-restore-and-RESTORE_STAGE
FT09_EXECUTION_ALLOWED=NO   # until blocker fix deployed + fresh Phase A PASS
FT09_KNOWN_SOURCE_BLOCKER_POST_CANCEL_COMPENSATION=OPEN
```

- Production Worker must contain the equivalent of merged #165 `RESTORE_STAGE`
  telemetry (timed-stage markers; safe correlation by request/op id).
- Do **not** require production SHA == planning baseline; require runtime
  capability.
- Do **not** assume current retained production Worker is compatible merely
  because FT-08 passed (FT-08 did not exercise restore telemetry).
- Phase A resolves actual live `WORKER_PIN`; if live production lacks telemetry,
  a **separate owner-authorized deployment gate** is required before execution.
- **Known source blocker (see PLAN §5.1, tracker [#170](https://github.com/Skyline-Gazer/pastebin-worker/issues/170)):** post-expiry-cancel Stage-2 / finish
  failure must enter reconciliation-required / fail-closed, never clean terminal
  `failed` with an apparently normal archived/timed binding. `FT09_PRECONDITION_6_DEPLOY_COMPAT`
  additionally requires this defect fixed and deployed. Until then
  `FT09_EXECUTION_ALLOWED=NO`.
- **Revalidation after deployment (Phase B):** if any production Worker deployment
  occurs, pre-deployment Phase A results MUST NOT be used for Phase C — re-enter
  Phase A, resolve new `WORKER_PIN`, re-verify fixture/auth/capability/ordering
  markers, form a fresh Pre-ARM snapshot; only a fresh Phase A PASS may proceed
  to Phase C (`FT09_PREFLIGHT_REVALIDATION_AFTER_DEPLOY=REQUIRED`).
- This planning round deploys nothing.

## 5. Action gate

```text
FT09_ACTION_1_ENDPOINT=POST /api/entries/<id>/restore
FT09_ACTION_2_BODY=empty
FT09_ACTION_3_AUTH=session + CSRF + Origin + scope authorization
FT09_ACTION_4_IDEMPOTENCY=frontend supplies opaque Idempotency-Key
FT09_ACTION_5_SINGLE=exactly one submission (execution invariant; no retry/replay after terminal result)
FT09_ACTION_6_SURFACE=canonical frontend Archive single-item 恢复
```

## 6. Result gates (measured after one action)

```text
FT09_RESULT_1_HTTP=200 and body entry JSON
FT09_RESULT_2_ENTRY={visibility:active, retentionMode:permanent, expiresAt:null, version:5}
FT09_RESULT_3_D1_BINDING=same binding/paste; active/permanent/NULL/v5
FT09_RESULT_4_D1_OP={kind:restore_timed, status:succeeded, expected_version:4}
FT09_RESULT_5_PASTE_BODY=exact `- [ ] FT_LIFECYCLE_20260916_01`; no LF; no unrelated byte change
FT09_RESULT_6_EXPIRY_CANCEL_EFFECT=final upstream non-expiring; authoritative expiry absent/null (upstream metadata); D1 expires_at=NULL
FT09_RESULT_7_UI_ARCHIVE=target absent from Archive after restore
FT09_RESULT_8_UI_ACTIVE=target present in Active; managed task unchecked
FT09_RESULT_9_VERSION=4 -> 5
FT09_RESULT_10_ORDERING=required same-invocation RESTORE_STAGE timed ordering PASS
FT09_RESULT_11_NO_ANOMALY=no unexpected binding / second Paste / pending/uncertain / reconciliation; no unexpected list mutation
```

## 7. Mechanical telemetry ordering gate

Successful timed restore requires same-invocation stage evidence consistent with:

```text
request_accepted
-> duplicate_lookup_completed
-> binding_lookup_completed
-> lifecycle_gate_passed
-> fingerprint_kind_completed
-> credential_open_completed
-> paste_read_completed
-> managed_task_completed
-> operation_constructed
-> reservation_completed
-> dispatch_completed
-> expiry_cancel_started
-> expiry_cancel_completed
-> upstream_update_started
-> upstream_update_completed
-> finish_completed
```

Mechanical ordering must include at least (same authorized invocation/correlation):

```text
seq(reservation_completed) < seq(dispatch_completed)
seq(dispatch_completed) < seq(expiry_cancel_started)
seq(expiry_cancel_started) < seq(expiry_cancel_completed)
seq(expiry_cancel_completed) < seq(upstream_update_started)
seq(upstream_update_started) < seq(upstream_update_completed)
seq(upstream_update_completed) < seq(finish_completed)
```

All comparisons must belong to the same `request_id`/`op_id` correlation. Do not
use final state alone as proof of ordering.

## 8. Runtime evidence vs source-contract evidence

- **Source contract (reviewed, not runtime):** first update uses original checked
  `source` + `"never"`; second update uses restored unchecked `content` + `"never"`.
- **Runtime evidence:** expiry cancellation completed; second upstream update
  completed; final upstream metadata non-expiring; final Paste body unchecked;
  D1 active/permanent/NULL/v5; same binding/paste identity; `RESTORE_STAGE`
  ordering (§7).
- Unless an actual captured request body exists, do **not** claim logs alone
  mechanically prove literal body bytes or literal `e=never`.

## 9. PASS gate

```text
FT09_PASS_GATE =
  (all FT09_PRECONDITION_* held before action) AND
  (FT09_ACTION_SINGLE_SUBMISSION held) AND
  (all FT09_RESULT_* hold) AND
  (no prohibited retry/replay)
```

Distinct states (report `FT09_AUTHORIZED`, `FT09_STARTED`, `FT09_ACTION_SUBMITTED`
independently):

```text
Before action, precondition false:
  FT09_EXECUTION_STATUS=BLOCKED_PRECONDITION
  FT09_FUNCTIONAL_RESULT=NOT_RUN
  FT09_ACTION_SUBMITTED=NO

Executed + contract satisfied:    FT09_FUNCTIONAL_RESULT=PASS
Executed + contract violated:     FT09_FUNCTIONAL_RESULT=FAIL
Executed + evidence insufficient: FT09_FUNCTIONAL_RESULT=INCONCLUSIVE
```

If restore succeeds but required `RESTORE_STAGE` evidence cannot be correlated /
mechanically proven: **do not replay**; classify per SPEC (likely `INCONCLUSIVE`).

## 10. Timing requirements

- `expiresAt` authoritative from upstream `e=max` response (frozen `2026-12-16T07:18:12.000Z`).
- `FT09_PRECONDITION_4_NOT_EXPIRED`: at preflight, `expiresAt > current time`.
- If already expired / ambiguous: STOP; do not recreate fixture.
- Countdown display is not part of FT-09; deadline-boundary observation remains
  future / separately authorized.

## 11. Evidence requirements

```text
FT09_EVIDENCE_PRE_ARM=full before snapshot (binding + ops + DLQ + target row)
FT09_EVIDENCE_REQUEST_TIME=UTC ISO of submission
FT09_EVIDENCE_HTTP=status + body
FT09_EVIDENCE_D1_AFTER=binding + op rows
FT09_EVIDENCE_PASTE_AFTER=public GET body + metadata expireAt
FT09_EVIDENCE_UI=Archive absence + Active presence (unchecked) + OBSERVED_AT_UTC
FT09_EVIDENCE_CORRELATION=request_id/op_id prefix + created/updated columns
FT09_EVIDENCE_STAGES=RESTORE_STAGE lines for the same correlation (timed ordering)
FT09_EVIDENCE_NO_ANOMALY=DLQ/reconciliation counts
```

## 12. Non-retroactivity

```text
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT08_FUNCTIONAL_RESULT=PASS (unchanged)
FT08_COMPLETE=YES (unchanged)
```

FT-09 evidence (even perfect `RESTORE_STAGE`) proves only the FT-09 invocation;
it never retroactively changes FT-07.

## 13. Not-in-scope

FT-10 markdown rendering of archive, FT-11 delete, batch, permanent restore,
replay of FT-07/FT-08, deploy, telemetry deploy, adding production behavior.

```text
Status: SPEC DRAFT
FT09_STARTED=NO
PRODUCTION_MUTATION_THIS_ROUND=NO
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
```
