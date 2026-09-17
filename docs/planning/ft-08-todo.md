# FT-08 TODO — Timed archive + countdown execution runbook

Status: **TODO DRAFT** (execution not authorized; `FT08_STARTED=NO`)

Parent PLAN/SPEC: [ft-08-plan.md](ft-08-plan.md), [ft-08-spec.md](ft-08-spec.md)

```text
OWNER_AUTHORIZATION_REQUIRED_BEFORE_PHASE_C=YES
FT08_AUTHORIZED=NO
FT08_STARTED=NO
FT08_ACTION_SUBMITTED=NO
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
```

## Phase A — read-only preflight

- [ ] Confirm `downstream/main` at or after `PLANNING_SOURCE_BASELINE=38b4ff0de33b3bcf0785f99f0eba899ca18d523a`, clean tree (planning source anchor; not a production pin).
- [ ] Resolve actual production deployment pin read-only; record `WORKER_PIN`. Do **not** force `production == PLANNING_SOURCE_BASELINE`; FT-08 runtime requirement is version-compat with the `archive_expiring` contract (`completeEntry` / `archive_expiring` / `e=max` / authoritative `expiresAt`). If docs/evidence already identify the FT-06/FT-07 deployment pin, cite it; otherwise resolve read-only.
- [ ] Verify deployed Worker compatibility with the FT-08 contract (per PLAN §3.1 `FT08_RUNTIME_DEPLOYMENT_REQUIREMENT`). No upgrade required solely for #165 restore telemetry.
- [ ] Read FT-07 evidence (§7 handoff) and confirm fixture identity (paste id, binding prefix) and expected state.
- [ ] Read-only fixture verification (D1 read + public GET + frontend Archive/Active as allowed):
  - [ ] `feishu_bindings` row: visibility=active, retention_mode=permanent, expires_at=NULL, version=3, paste_name=DMkerQPTisMNhhp8tdQc5Ech
  - [ ] public GET `https://pb.223.im/DMkerQPTisMNhhp8tdQc5Ech` → 200 body `- [ ] FT_LIFECYCLE_20260916_01`, HAS_LF=NO
  - [ ] no pending/uncertain `feishu_operations` row for the fixture
  - [ ] authenticated session available for the canonical single-item surface (no test action performed)
- [ ] Record `FT08_FIXTURE_VALID=YES/NO`; if NO: record differences, STOP, do not proceed.

## Phase B — owner authorization checkpoint

- [ ] STOP — present PLAN/SPEC/TODO to owner with exact action, gates, evidence set, risks.
- [ ] Obtain explicit fresh owner authorization for **only** Phase C (single `archive_expiring` on the fixture), recorded on #162 with `APPROVED_FT08_SPEC_HEAD`, `FT08_AUTHORIZED_ACTION=archive_expiring`, exact target paste (public name), and `ORDERING_VERIFIED_BY_STEP_LOGS` unchanged.
- [ ] Owner authorization sets **`FT08_AUTHORIZED=YES`** only. `FT08_STARTED` stays `NO` until Phase C begins; do not describe authorization as the test having started.
- [ ] Pre-ARM snapshot recorded per PLAN §7 (bindings totals, target row, ops kind totals, create_succeeded, DLQ baseline, idempotency key prefix reserved). If any precondition is false here: record `FT08_EXECUTION_STATUS=BLOCKED_PRECONDITION`, `FT08_FUNCTIONAL_RESULT=NOT_RUN`, `FT08_ACTION_SUBMITTED=NO`, STOP — do not proceed to Phase C.

## Phase C — single production action

- [ ] Open FT-08 **only after** owner authorization (`FT08_AUTHORIZED=YES`). On entering Phase C set `FT08_STARTED=YES`. Do not submit earlier.
- [ ] Frontend single-item flow on the fixture: select 限期归档 (chooser), confirm exactly once → `FT08_ACTION_SUBMITTED=YES`, `FT08_ACTION_SINGLE_SUBMISSION=YES`.
- [ ] Record request time (UTC ISO) + HTTP status + body after response.
- [ ] Do not click/retry after a terminal success; do not blind-retry any failure (STOP first).

## Phase D — immediate evidence collection

- [ ] Capture HTTP body entry JSON + timestamp.
- [ ] D1 after snapshot: target binding row (all fields) + target operation row (kind/status/expected_version/created_at/updated_at).
- [ ] Upstream Paste: public GET body (expect `- [x] FT_LIFECYCLE_20260916_01`) + metadata expireAt.
- [ ] Frontend observation: 进行中 target absent; 归档 target present with `限期归档：剩余 N…` (role=status aria-label), `OBSERVED_AT_UTC` + screenshot where possible.
- [ ] Collate correlation: one idempotency key → one complete_expiring op → one HTTP 200.

## Phase E — timed observation (if required)

- [ ] Only if the countdown boundary needs verification (not expected within FT-08): observe at `expiresAt - now <= 60s` boundary from a NEW owner authorization or a declared separate observation scope; record `OBSERVED_AT_UTC`, expect collapsed/expired-stale presentation change only from authoritative expiresAt. No timer-driven mutation, no negative countdown.

## Phase F — PASS/FAIL/INCONCLUSIVE settlement

- [ ] Evaluate each SPEC gate:
  - [ ] `FT08_PRECONDITION_*` (1–7 + deploy compat) recorded values
  - [ ] `FT08_ACTION_SINGLE_SUBMISSION` / `FT08_ACTION_SUBMITTED`
  - [ ] `FT08_RESULT_1..10` evidence values
  - [ ] FAIL conditions (only after an action was submitted) / INCONCLUSIVE conditions (evidence gap, correlation, timing, frontend)
- [ ] If no action was submitted (precondition blocked): record `FT08_EXECUTION_STATUS=BLOCKED_PRECONDITION`, `FT08_FUNCTIONAL_RESULT=NOT_RUN` (never PASS/FAIL/INCONCLUSIVE).
- [ ] After an action: `FT08_FUNCTIONAL_RESULT=PASS` (contract satisfied) / `FAIL` (contract violated) / `INCONCLUSIVE` (mechanical determination impossible), and record `FT08_EVIDENCE_*` in a new evidence doc under `docs/planning/evidence/`.
- [ ] Never use FT-08 PASS to alter FT07 state: `FT07_ORDERING_EVIDENCE=INCONCLUSIVE`, `ORDERING_VERIFIED_BY_STEP_LOGS=NO` remain; note non-retroactivity.

## Phase G — handoff / stop

- [ ] Write handoff baseline for FT-09 (timed-restore) reusing the timed-archived fixture, or stop if FT-09 not authorized.
- [ ] No auto-start of FT-09; `FT09_STARTED=NO`.
- [ ] Final report: gates, evidence list, `FT08_AUTHORIZED`, `FT08_STARTED`, `FT08_ACTION_SUBMITTED`, `FT08_EXECUTION_STATUS`, `FT08_FUNCTIONAL_RESULT`, `FT08_FIXTURE_VALID`, `WORKER_PIN`, correlation, next-decision-needed.
- [ ] STOP. Wait for owner.

## Retry policy

- No automatic retry.
- If retry-safety is uncertain after a stop condition or failure **do not blind-retry**; record and stop.
- Only a fresh explicit owner authorization may permit a repeat action.

## Persistent invariants

```text
NO deploy triggered by this TODO
NO production mutation before Phase C without owner authorization
NO FT-07 replay / restore
NO FT-08 start without explicit owner authorization (FT08_STARTED=YES only at Phase C entry)
FT08_AUTHORIZED=NO
FT08_STARTED=NO
FT08_ACTION_SUBMITTED=NO
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
FT08_EXECUTION_STATUS=NOT_RUN
FT08_FUNCTIONAL_RESULT=NOT_RUN
PRODUCTION_MUTATION_THIS_ROUND=NO
```