# FT-09 TODO — Restore timed archive / cancel expiry execution runbook

Status: **TODO DRAFT** (planning only; `FT09_AUTHORIZED=NO` / `FT09_STARTED=NO`)

Parent PLAN/SPEC: [ft-09-plan.md](ft-09-plan.md), [ft-09-spec.md](ft-09-spec.md)

```text
OWNER_AUTHORIZATION_REQUIRED_BEFORE_PHASE_D=YES
FT09_AUTHORIZED=NO
FT09_STARTED=NO
FT09_ACTION_SUBMITTED=NO
FT09_FUNCTIONAL_RESULT=NOT_RUN
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
```

## Phase A — read-only preflight

- [ ] Confirm `downstream/main` (planning source; not a production pin) and FT-08 evidence/handoff baseline intact.
- [ ] Resolve actual production `WORKER_PIN` read-only; do **not** assume compatibility from FT-08 PASS.
- [ ] Verify deployed Worker supports the FT-09 runtime requirements (`FT09_RUNTIME_DEPLOYMENT_REQUIREMENT=version-compatible-with-timed-restore-and-RESTORE_STAGE`): timed restore, expiry-cancel, `restore_timed`, `RESTORE_STAGE` timed markers.
- [ ] Read-only fixture verification: `d6450b83…` binding = `archived/timed/expires_at=2026-12-16T07:18:12.000Z/version=4`; public GET `- [x] FT_LIFECYCLE_20260916_01` (HAS_LF=NO); no pending/uncertain op; `expiresAt > now`.
- [ ] Record `FT09_FIXTURE_VALID=YES/NO`; if NO → STOP.

## Phase B — telemetry / deployment gate (if required)

- [ ] If live production lacks `RESTORE_STAGE` telemetry: **STOP** — a separate
      owner-authorized deployment gate is required before Phase C. Do not deploy.

## Phase C — owner execution authorization checkpoint

- [ ] STOP — present PLAN/SPEC/TODO to owner; obtain fresh explicit owner authorization covering only Phase D single action. Owner authorization sets `FT09_AUTHORIZED=YES` only; `FT09_STARTED` stays NO until Phase D begins.
- [ ] Pre-ARM snapshot recorded per SPEC §11.

## Phase D — single production action

- [ ] Enter Phase D only after `FT09_AUTHORIZED=YES`; set `FT09_STARTED=YES`.
- [ ] Canonical frontend Archive single-item: select target, click `恢复`.

  ⚠ The restore chooser must be **non-submitting**; opening a chooser must not mutate state. If it is not mechanically provable mutation-free, click the action control directly (which submits the single restore once).

- [ ] Exactly one submission → `FT09_ACTION_SUBMITTED=YES`, `FT09_ACTION_SINGLE_SUBMISSION=YES`. No double-click / replay / direct API secondary request / retry after terminal success.

## Phase E — immediate evidence collection

- [ ] HTTP status + body entry JSON (Active/permanent/null/v5).
- [ ] D1 after: target binding row + op row (`restore_timed`/`succeeded`/`expected_version=4`).
- [ ] Upstream Paste: public GET body `- [ ] FT_LIFECYCLE_20260916_01` (no LF) + metadata expireAt (non-expiring/null).
- [ ] Frontend: Archive target absent; Active target present unchecked; `OBSERVED_AT_UTC`.
- [ ] Correlation: one key → one `restore_timed` op → one HTTP 200.

## Phase F — mechanical settlement

- [ ] Evaluate `FT09_PRECONDITION_*` (1–8 + deploy compat), `FT09_ACTION_SINGLE_SUBMISSION`, `FT09_RESULT_1..11`, including `FT09_RESULT_10_ORDERING` (RESTORE_STAGE timed seq ordering under one correlation).
- [ ] `FT08`/`FT07` flags remain unchanged even on FT-09 PASS (`FT07_ORDERING_EVIDENCE=INCONCLUSIVE`, `ORDERING_VERIFIED_BY_STEP_LOGS=NO`, `FT08_FUNCTIONAL_RESULT=PASS`).
- [ ] Record `FT09_FUNCTIONAL_RESULT=PASS/FAIL/INCONCLUSIVE` (or `BLOCKED_PRECONDITION`/`NOT_RUN`) in a durable evidence doc.

## Phase G — durable evidence / next handoff

- [ ] Write `docs/planning/evidence/ft-09-*.md` with identity/preconditions/action/result/gates/handoff.
- [ ] Prepare handoff for FT-10 if applicable; `FT10_STARTED=NO`.
- [ ] Report; STOP. No auto-start of FT-10.

## Retry policy

- No automatic retry.
- If retry-safety is uncertain after a stop condition or failure **do not blind-retry**; record and stop.
- Only a fresh explicit owner authorization may permit a repeat action.

## Persistent invariants

```text
NO deploy (incl. #165) triggered by this TODO
NO production mutation before Phase D without owner authorization
NO FT-07/FT-08 replay or restore (beyond the one authorized timed restore)
FT09_AUTHORIZED=NO
FT09_STARTED=NO
FT09_ACTION_SUBMITTED=NO
FT09_FUNCTIONAL_RESULT=NOT_RUN
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
PRODUCTION_MUTATION_THIS_ROUND=NO
```
