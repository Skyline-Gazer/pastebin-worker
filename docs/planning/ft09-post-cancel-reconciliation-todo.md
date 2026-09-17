# TODO — FT-09 blocker #170: timed restore post-cancel reconciliation

Status: **TODO DRAFT** (planning only; no implementation)

Parent PLAN/SPEC: [ft09-post-cancel-reconciliation-plan.md](ft09-post-cancel-reconciliation-plan.md), [ft09-post-cancel-reconciliation-spec.md](ft09-post-cancel-reconciliation-spec.md)

```text
DEFECT170_PLANNING_SOURCE_BASELINE=de6f6a38e384eee7f0581755425e9b7180be70c9
DEFECT170_SCOPE=restore_timed_post_expiry_cancel_only
POST_CANCEL_FAILURE_MUST_RECONCILE=YES
FT09_EXECUTION_ALLOWED=NO
```

## Phase A — source analysis / freeze defect boundary

- [ ] Confirm `downstream/main` at or after `de6f6a38e384eee7f0581755425e9b7180be70c9`.
- [ ] Confirm `restoreEntry` timed branch: reserve → dispatch → Stage 1 → Stage 2 → finish.
- [ ] Confirm defect: post-`expiry_cancel_completed` Stage 2 deterministic failure calls `store.fail`.

## Phase B — owner PLAN/SPEC approval

- [ ] STOP — present PLAN/SPEC/TODO; obtain explicit owner approval of exact HEAD.
- [ ] Record `APPROVED_DEFECT170_SPEC_HEAD`.

## Phase C — TDD implementation (only after owner approval)

- [ ] Write failing tests first (SPEC §8 matrix T1–T9):
      T2/T3 (pre-cancel unchanged), T4/T5 (post-cancel → `reconciliation_required`),
      T6/T7 (unchanged), T8 (duplicate replay → `RECONCILIATION_REQUIRED`), T9 (permanent unchanged).
- [ ] Implement smallest change in `restoreEntry` (use `store.uncertain`; never `store.fail` after `expiry_cancel_completed`; API `RECONCILIATION_REQUIRED`).
- [ ] Do NOT modify `store.ts`/`reconcile.ts`/frontend/migration unless a test requires it.

## Phase D — local / CI verification

- [ ] `vitest run --config downstream/addons/messaging/vitest.config.js`
- [ ] messaging `tsc --noEmit`, eslint, prettier
- [ ] Push; CI (`test`, `feishu-validation`, coverage) PASS on latest HEAD.

## Phase E — AI reviewer settlement

- [ ] Reviewer settlement on exact HEAD (Bugbot/Greptile/Codex per governance).
- [ ] No self-merge; any finding → fix → new HEAD → re-review.

## Phase F — source merge authorization (owner)

- [ ] Record owner merge authorization (merge source fix PR).
- [ ] Record `DEFECT170_MERGED` + merge SHA.

## Phase G — separate production deployment handoff (NOT performed by this TODO)

- [ ] Stop. Owner separately authorizes production deployment.
- [ ] Deployment must be of a Worker containing #170 fix + required `RESTORE_STAGE` telemetry.
- [ ] Record `DEFECT170_DEPLOYED`.
- [ ] After deploy → fresh post-deploy FT-09 Phase A PASS → only then re-evaluate `FT09_PRECONDITION_6_DEPLOY_COMPAT` / `FT09_EXECUTION_ALLOWED`.

## Retry policy

- No blind automatic retry; no second Stage 1/Stage 2 on same identity.
- Same-request replay → `RECONCILIATION_REQUIRED` via duplicate handling.
- Only a fresh explicit owner authorization may permit operational recovery actions.

## Persistent invariants

```text
FT09_KNOWN_SOURCE_BLOCKER_POST_CANCEL_COMPENSATION=OPEN
FT09_EXECUTION_ALLOWED=NO
FT09_AUTHORIZED=NO
FT09_STARTED=NO
FT09_ACTION_SUBMITTED=NO
FT09_FUNCTIONAL_RESULT=NOT_RUN
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
PRODUCTION_MUTATION_THIS_ROUND=NO
```
