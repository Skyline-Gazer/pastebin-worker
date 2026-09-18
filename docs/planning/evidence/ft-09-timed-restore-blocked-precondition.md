# FT-09 execution evidence — Timed restore — BLOCKED at final drift check

Status: **FT09_EXECUTION_STATUS=BLOCKED_PRECONDITION** (no mutation executed).

This file is the durable acceptance evidence for the owner-authorized FT-09
timed-restore execution. It records a **fail-closed drift-check stop**: the
mandatory final drift check (SPEC §1 / runbook Phase D) failed on
`FT09_PRECONDITION_5_AUTH`, so the authorized single `恢复` submission was
**never made**. No production lifecycle mutation occurred.

```text
FT09_AUTHORIZED=YES                  # owner Phase C grant (received)
FT09_PRECONDITION_8_OWNER=YES        # owner authorization intact (not consumed)
FT09_EXECUTION_ALLOWED=YES           # per Phase A acceptance
FT09_STARTED=NO                      # Phase D never began: drift check STOP
FT09_ACTION_SUBMITTED=NO             # no canonical submission occurred
FT09_CANONICAL_RESTORE_CLICK_COUNT=0 # no click performed
FT09_EXECUTION_STATUS=BLOCKED_PRECONDITION
FT09_FUNCTIONAL_RESULT=NOT_RUN
PRODUCTION_MUTATION_THIS_ROUND=NO
```

---

## 1. Frozen source contract

```text
FT09_TEST_OBJECTIVE=timed_restore_and_expiry_cancellation
FT09_CANONICAL_TRANSITION=ARCHIVED_EXPIRING -> ACTIVE_PERMANENT
CANONICAL_ACTION=Archive single-item 恢复 (one click, no chooser/second confirm)
ENDPOINT=POST /api/entries/<id>/restore   (empty body, opaque Idempotency-Key)
TARGET_BINDING_ID=d6450b83-a11d-4f45-9272-2197dcc5da60
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
EXPECTED_FINAL=active/permanent/expires_at=NULL/version=5
EXPECTED_OP=restore_timed/succeeded/expected_version=4
```

Source contract (two-stage upstream update via `messaging` Worker):

```text
Stage 1: update(paste, password, checked_source, "never")   # expiry cancellation
Stage 2: update(paste, password, unchecked_content, "never") # restore content
final:   visible active / permanent / NULL / version 4 -> 5
```

`RESTORE_STAGE` telemetry markers present in the deployed Worker
(`downstream/addons/messaging/worker/restore-telemetry.ts` @
`89ce85e3feb275cb0f79cc36fe62745a69530b72`), including the FT-09 required
timed-ordering markers `expiry_cancel_started/completed` and the defect #170
post-cancel fail-closed path (`store.uncertain` → `RECONCILIATION_REQUIRED`).

---

## 2. Phase A pre-ARM evidence (owner-accepted fresh post-deploy snapshot)

Accepted by owner immediately before this execution (quoted in the
authorization):

```text
OBSERVED_AT_UTC=2026-09-18T05:47:15Z
WORKER_PIN=0f19b190-0cd9-4d4c-ae50-08425a2e7d84
PRODUCTION_DEPLOYMENT_ID=43a7b4d1-ba0f-47a3-a35f-e45a7068c4a8
DEPLOYED_SOURCE_SHA=89ce85e3feb275cb0f79cc36fe62745a69530b72
TARGET_BINDING_ID=d6450b83-a11d-4f45-9272-2197dcc5da60
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
visibility=archived
retention_mode=timed
expires_at=2026-12-16T07:18:12.000Z
version=4
body=- [x] FT_LIFECYCLE_20260916_01
HAS_LF=NO
HAS_CR=NO
last_completed_operation=complete_expiring/succeeded/expected_version=3
pending_nonterminal_operation_count=0
```

```text
FT09_PRECONDITION_1_FT08_PASS=YES
FT09_PRECONDITION_2_FIXTURE_TIMED_ARCHIVE=YES
FT09_PRECONDITION_3_FIXTURE_BODY=YES
FT09_PRECONDITION_4_NOT_EXPIRED=YES
FT09_PRECONDITION_5_AUTH=YES          # at Phase A (~05:47Z)
FT09_PRECONDITION_6_DEPLOY_COMPAT=YES
FT09_PRECONDITION_7_NO_PENDING_OP=YES
FT09_PHASE_A_RESULT=PASS
FT09_FIXTURE_VALID=YES
FT09_KNOWN_SOURCE_BLOCKER_POST_CANCEL_COMPENSATION=RESOLVED
```

---

## 3. Final drift check (Phase D entry requirement) — FAILED

Per SPEC §1, the drift check is **read-only** and performed immediately before
the `恢复` click. Any difference → STOP (`BLOCKED_PRECONDITION`), confirmed by
the SPEC's explicit rule: owner authorization does not survive drift.

| #   | Drift item (required)                                      | Observed at 2026-09-18T06:32:51Z                                                                                                                                                                                   | Result                                                                               |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1   | Paste exists + exact body `- [x] FT_LIFECYCLE_20260916_01` | `GET https://pb.223.im/DMkerQPTisMNhhp8tdQc5Ech` → **200**; body 30 bytes `- [x] FT_LIFECYCLE_20260916_01`; hex `2d20 5b78 5d20 4654 5f4c 4946 4543 5943 4c45 5f32 3032 3630 3931 365f 3031`; HAS_LF=NO, HAS_CR=NO | ✅ PASS                                                                              |
| 2   | `expiresAt` future (fixture `2026-12-16T07:18:12.000Z`)    | `last-modified: Thu, 17 Sep 2026 07:18:12 GMT` on Paste GET; fixture upstream `expiresAt` future per Phase A; no expiry evidence found                                                                             | ✅ PASS (Paste alive; upstream deadline default `90d` in Phase A and not approached) |
| 3   | Authenticated canonical session valid                      | `GET /api/auth/session` (same-origin, credentials include) → **HTTP 401** `{"code":"UNAUTHENTICATED","brand":"Feishu","providers":["feishu","lark"]}`                                                              | ❌ **FAIL**                                                                          |
| 4   | Frontend boots to authenticated `ready` state              | frontend boot state = `unauthenticated` (renders "Continue with Feishu" / "Continue with Lark")                                                                                                                    | ❌ **FAIL**                                                                          |
| 5   | Target Archive row visible + `恢复` available              | no Archive list rendered; no target row; no `恢复` control                                                                                                                                                         | ❌ **FAIL**                                                                          |
| 6   | D1 binding/ops re-confirm at drift time                    | no production D1 access path available in this environment (`wrangler` unauthenticated/absent; bindings MCP `needsAuth`); relied on Phase A baseline                                                               | ⚠️ not independently refreshable                                                     |

Drift decision:

```text
FT09_EXECUTION_STATUS=BLOCKED_PRECONDITION
FT09_FUNCTIONAL_RESULT=NOT_RUN
FT09_ACTION_SUBMITTED=NO
FT09_CANONICAL_RESTORE_CLICK_COUNT=0
```

Deviant gate: **`FT09_PRECONDITION_5_AUTH=NO` at drift-check time** (the
Phase A session did not survive into Phase D; login surface is displayed).

---

## 4. No mutation performed

All network interactions were **read-only**:

```text
GET  https://pb.223.im/DMkerQPTisMNhhp8tdQc5Ech          -> 200 (paste body)
GET  https://pb.test.223.im/                               -> frontend shell
GET  https://pb.test.223.im/api/auth/session (browser)     -> 401 UNAUTHENTICATED
GET  https://shz.al/... (read-only probe; wrong origin)    -> 404 (not a mutation)
```

No `POST`, no `PUT`, no `DELETE`, no restore, no direct API call, no
Idempotency-Key generation/replay, no D1 write, no Paste write.

```text
PRODUCTION_LIFECYCLE_ACTION_AUTHORIZED=FT09_SINGLE_RESTORE
PRODUCTION_ADDITIONAL_MUTATION_AUTHORIZED=NO
PRODUCTION_MUTATION_THIS_ROUND=NO
```

The one authorized mutation (single `恢复`) was **not** consumed; owner
authorization remains unconsumed and does **not** survive drift — a fresh
Phase A → Phase C authorization is required for any future attempt.

---

## 5. Result gates (not applicable — action never submitted)

```text
FT09_RESULT_1_HTTP=INCONCLUSIVE        # no submission; per SPEC §6 no HTTP result captured
FT09_RESULT_2_ENTRY=INCONCLUSIVE
FT09_RESULT_3_D1_BINDING=INCONCLUSIVE
FT09_RESULT_4_D1_OP=INCONCLUSIVE
FT09_RESULT_5_PASTE_BODY=INCONCLUSIVE
FT09_RESULT_6_EXPIRY_CANCEL_EFFECT=INCONCLUSIVE
FT09_RESULT_7_UI_ARCHIVE=INCONCLUSIVE
FT09_RESULT_8_UI_ACTIVE=INCONCLUSIVE
FT09_RESULT_9_VERSION=INCONCLUSIVE
FT09_RESULT_10_ORDERING=INCONCLUSIVE
FT09_RESULT_11_NO_ANOMALY=INCONCLUSIVE
FT09_ACTION_SINGLE_SUBMISSION=NO       # no submission occurred
NO_RETRY=NO                            # no retry needed; tri-state not entered
```

No gate may be upgraded from INCONCLUSIVE because no authorized mutation
occurred (SPEC §9: BLOCKED_PRECONDITION → NOT_RUN, not a functional result).

---

## 6. FT-06/07/08 non-retroactivity (persistent historical state)

```text
FT08_FUNCTIONAL_RESULT=PASS
FT08_COMPLETE=YES
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
ORDERING_VERIFIED_BY_STEP_LOGS=NO
```

This BLOCKED_PRECONDITION outcome does **not** alter FT-07/FT-08 historical
conclusions and gains **no** RESTORE_STAGE ordering value (no invocation ran).

---

## 7. Issue #170 closure policy

```text
ISSUE170_STATE=OPEN
DEFECT170_OPERATIONAL_SETTLEMENT=INCONCLUSIVE
```

#170 is **not** closed. The authorized FT-09 execution did not complete
(no mutation), so the "#170 production blocker operationally settled" condition
is not met.

---

## 8. Limitations / environment notes

- The canonical production frontend (`https://pb.test.223.im/`) currently shows
  the unauthenticated login surface; no authenticated browser session was
  present at drift-check time (401 from `/api/auth/session`).
- No production D1 read path (`wrangler d1`, Cloudflare bindings/observability
  MCP) was authenticated/available in this environment, so D1 rows could not be
  re-refreshed read-only at drift time. This is recorded as an explicit
  unavailability, not invented data.
- The paste body was independently verified live via public GET at
  `pb.223.im/...` (200, exact bytes, no LF/CR), which is the strongest
  read-only live signal available in this environment.
- Evidence PR/merge is a later governance step; nothing in this change is
  merged.

---

# Appendix A — Post-auth fresh Phase A preflight (2026-09-18)

Owner disposition superseded the previous Phase C authorization after the
blocked drift check (`FT09_PRECONDITION_8_OWNER=EXPIRED_BY_DRIFT`). A new
authorization permitted only (1) canonical auth recovery, (2) fresh Phase A
read-only preflight, (3) Pre-ARM snapshot creation if all gates pass. **No
restore submission was authorized.**

## A.1 Auth recovery

```text
FT09_AUTH_RECOVERY_AUTHORIZED=YES
FT09_PHASE_A_AUTHORIZED=YES
FT09_AUTHORIZED=NO
FT09_STARTED=NO
FT09_ACTION_SUBMITTED=NO
```

Performed canonical Feishu OAuth login at `https://pb.test.223.im/`
(login surface → `/api/auth/login/feishu` → Feishu authorize → callback):

```text
FT09_AUTH_SESSION_RECOVERED=YES
session_brand=Feishu
session_expires_at=2026-09-18T14:56:00.524Z
csrf_token_present=YES
canonical_frontend_boot=authenticated (进行中 3 / 归档 1)
```

The Feishu account consent surface was the canonical app authorization for
the existing user (no new account created); no cookies were manipulated
manually.

## A.2 Fresh Phase A evidence (all read-only; no mutation)

```text
FT09_PREFLIGHT_SOURCE=POST_AUTH_FRESH
OBSERVED_AT_UTC=2026-09-18T07:22:40Z
```

- **Worker pin / control-plane (fresh resolve):**
  Live Workers Observability invocation events for `pastebin-feishu-prod`
  (~2026-09-18T06:5xZ–07:0xZ) report
  `$workers.scriptVersion.id = 0f19b190-0cd9-4d4c-ae50-08425a2e7d84` on every
  event — **matches the frozen `WORKER_PIN`**. Worker modified_on
  `2026-09-18T03:19:59Z` consistent with the #172 fix deployment.
  Deployed bundled code (fetched read-only) contains `RESTORE_STAGE` timed
  markers (`expiry_cancel_started/completed/failed`, `upstream_update_*`) and
  the #170 post-cancel fail-closed path (`upstream_update_failed` + `timed` →
  `store.uncertain` → `RECONCILIATION_REQUIRED`).
  `PRODUCTION_DEPLOYMENT_ID=43a7b4d1-ba0f-47a3-a35f-e45a7068c4a8` remains the
  accepted deployment record from Phase A (deployment ID not re-exposed by the
  read-only control-plane surface available here).
- **D1 target binding (fresh read-only, `rows_written=0`, `changed_db=false`):**
  ```text
  id=d6450b83-a11d-4f45-9272-2197dcc5da60
  paste_name=DMkerQPTisMNhhp8tdQc5Ech
  visibility=archived
  retention_mode=timed
  expires_at=2026-12-16T07:18:12.000Z
  version=4
  updated_at=2026-09-17T07:18:13.044Z
  scope_id=feishu:v1:scope:eFFJBEJs2z9oH6HSTmqgg4eRiFikVl_hS9VoSleV_bQ
  ```
- **D1 operations tail (fresh read-only):**
  ```text
  create            succeeded  expected_version=0  2026-09-16T07:45:27.237Z
  complete_permanent succeeded  expected_version=1  2026-09-16T09:21:20.648Z
  restore_permanent succeeded  expected_version=2  2026-09-17T01:24:04.093Z
  complete_expiring succeeded  expected_version=3  2026-09-17T07:18:12.367Z
  ```
  No `restore_timed` anywhere (`restore_timed_ops_total=0`,
  `target_restore_timed_ops=0`); no `reserved`/`dispatched`/
  `reconciliation_required` (`global_pending_claims=0`,
  `reconciliation_required_total=0`); `bindings_total=9`.
- **Paste body (fresh read-only):**
  `GET https://pb.223.im/DMkerQPTisMNhhp8tdQc5Ech` → 200, 30 bytes,
  `- [x] FT_LIFECYCLE_20260916_01`, `HAS_LF=NO`, `HAS_CR=NO`,
  `NO_PREFIX_SUFFIX_BYTES=YES`, hex
  `2d20 5b78 5d20 4654 5f4c 4946 4543 5943 4c45 5f32 3032 3630 3931 365f 3031`.
- **Authoritative upstream expiry (fresh read-only):**
  `GET https://pb.223.im/m/DMkerQPTisMNhhp8tdQc5Ech` → 200,
  `{"lastModifiedAt":"2026-09-17T07:18:12.000Z","expireAt":"2026-12-16T07:18:12.000Z","sizeBytes":30,"location":"KV"}`.
  `expireAt=2026-12-16T07:18:12.000Z > OBSERVED_AT_UTC=2026-09-18T07:22:40Z`.
- **Authenticated frontend / Archive (fresh read-only):**
  `https://pb.test.223.im/` authenticated; Archive tab shows exactly one row:
  target `DMkerQPTisMNhhp8tdQc5Ech`, article
  `- [x] FT_LIFECYCLE_20260916_01`, status
  `限期归档，剩余 88d 23h 57m` (authoritative countdown), checkbox
  checked/disabled/readonly, **恢复 control visible**. Origin
  `https://pb.test.223.im` matches configured `FEISHU_ALLOWED_ORIGINS`;
  CSRF token available from `/api/auth/session`.

## A.3 Fresh Phase A settlement

```text
FT09_PRIOR_AUTHORIZATION=EXPIRED_BY_DRIFT
FT09_PRECONDITION_1_FT08_PASS=YES
FT09_PRECONDITION_2_FIXTURE_TIMED_ARCHIVE=YES
FT09_PRECONDITION_3_FIXTURE_BODY=YES
FT09_PRECONDITION_4_NOT_EXPIRED=YES
FT09_PRECONDITION_5_AUTH=YES
FT09_PRECONDITION_6_DEPLOY_COMPAT=YES
FT09_PRECONDITION_7_NO_PENDING_OP=YES
FT09_PRECONDITION_8_OWNER=NOT_YET      # new Phase C authorization NOT granted
FT09_PHASE_A_RESULT=PASS
FT09_FIXTURE_VALID=YES
FT09_PRE_ARM_SNAPSHOT=READY
FT09_EXECUTION_ALLOWED=YES             # technical only; does not authorize submission
FT09_AUTHORIZED=NO
FT09_STARTED=NO
FT09_ACTION_SUBMITTED=NO
FT09_FUNCTIONAL_RESULT=NOT_RUN
FT09_EXECUTION_STATUS=BLOCKED_PRECONDITION  # preserved from prior round; unchanged
```

`FT09_EXECUTION_ALLOWED=YES` means only that technical conditions allow a
return to Phase C for a fresh owner grant; it is **not** a submission
authorization.

## A.4 Historical invariants / #170 posture (unchanged)

```text
FT08_FUNCTIONAL_RESULT=PASS
FT08_COMPLETE=YES
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
ORDERING_VERIFIED_BY_STEP_LOGS=NO
DEFECT170_SOURCE_FIXED=YES
DEFECT170_SOURCE_REVIEWED=YES
DEFECT170_MERGED=YES
DEFECT170_DEPLOYED=YES
FT09_KNOWN_SOURCE_BLOCKER_POST_CANCEL_COMPENSATION=RESOLVED
ISSUE170_STATE=OPEN
PRODUCTION_DATA_MUTATION_THIS_ROUND=NO
```

## A.5 Production mutation boundary (this round)

```text
AUTH_SESSION_CREATION_OR_REFRESH=YES   # canonical OAuth login (authorized side effect)
FT09_LIFECYCLE_MUTATION=NO
PASTE_MUTATION=NO
D1_LIFECYCLE_MUTATION=NO
DEPLOYMENT_MUTATION=NO
ROLLBACK=NO
RESTORE_CLICK=NO
```

No restore submission, no lifecycle mutation, no deployment change occurred in
this round.
