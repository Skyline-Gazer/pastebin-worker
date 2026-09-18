# FT-09 execution evidence — Timed restore + expiry cancellation (PASS)

Status: **FT09_EXECUTION_STATUS=COMPLETED / FT09_FUNCTIONAL_RESULT=PASS** (production Function Test execution).

This file is the durable acceptance evidence for the owner-authorized single
FT-09 timed-restore submission on
[#162](https://github.com/Skyline-Gazer/pastebin-worker/issues/162). The
historical blocked-run record is preserved separately in
[`ft-09-timed-restore-blocked-precondition.md`](ft-09-timed-restore-blocked-precondition.md)
and is **not** rewritten.

```text
FT09_PRIOR_EXECUTION_STATUS=BLOCKED_PRECONDITION
FT09_PRIOR_ACTION_SUBMITTED=NO
FT09_EXECUTION_STATUS=COMPLETED
FT09_FUNCTIONAL_RESULT=PASS
FT09_COMPLETE=YES
```

---

## 1. Scope identity

```text
FT09_TEST_OBJECTIVE=timed_restore_and_expiry_cancellation
FT09_CANONICAL_TRANSITION=ARCHIVED_EXPIRING -> ACTIVE_PERMANENT
TARGET_BINDING_ID=d6450b83-a11d-4f45-9272-2197dcc5da60
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
CANONICAL_ACTION=Archive single-item 恢复 (one click; no chooser / no second confirm)
ENDPOINT=POST /api/entries/<id>/restore (empty body, frontend-generated Idempotency-Key)
```

---

## 2. Post-auth fresh Phase A (accepted by owner)

```text
FT09_PREFLIGHT_SOURCE=POST_AUTH_FRESH
OBSERVED_AT_UTC=2026-09-18T07:22:40Z
WORKER_PIN=0f19b190-0cd9-4d4c-ae50-08425a2e7d84
DEPLOYED_SOURCE_SHA=89ce85e3feb275cb0f79cc36fe62745a69530b72
FT09_AUTH_SESSION_RECOVERED=YES

binding: d6450b83-a11d-4f45-9272-2197dcc5da60 / DMkerQPTisMNhhp8tdQc5Ech
         archived / timed / 2026-12-16T07:18:12.000Z / version=4
body:    - [x] FT_LIFECYCLE_20260916_01  (30 bytes; HAS_LF=NO; HAS_CR=NO)
ops:     restore_timed_ops_total=0; target_restore_timed_ops=0;
         global_pending_claims=0; reconciliation_required_total=0
auth:    session brand=Feishu; CSRF present; Archive row visible; 恢复 visible

FT09_PRECONDITION_1_FT08_PASS=YES
FT09_PRECONDITION_2_FIXTURE_TIMED_ARCHIVE=YES
FT09_PRECONDITION_3_FIXTURE_BODY=YES
FT09_PRECONDITION_4_NOT_EXPIRED=YES
FT09_PRECONDITION_5_AUTH=YES
FT09_PRECONDITION_6_DEPLOY_COMPAT=YES
FT09_PRECONDITION_7_NO_PENDING_OP=YES
FT09_PRECONDITION_8_OWNER=YES       # fresh independent Phase C grant
FT09_PHASE_A_RESULT=PASS
FT09_FIXTURE_VALID=YES
FT09_PRE_ARM_SNAPSHOT=READY
```

---

## 3. Final drift check (immediately before single click)

Performed read-only immediately before Phase D; every mandatory item re-verified
(live pin re-resolved, not inherited):

| #   | Item                                | Observed                                                                               |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Live Worker pin                     | `0f19b190-0cd9-4d4c-ae50-08425a2e7d84` (fresh observability events ~2026-09-18T07:28Z) |
| 2   | binding id / paste                  | `d6450b83-a11d-4f45-9272-2197dcc5da60` / `DMkerQPTisMNhhp8tdQc5Ech`                    |
| 3   | visibility/retention/expiry/version | `archived/timed/2026-12-16T07:18:12.000Z/version=4`                                    |
| 4   | Paste body                          | 30 bytes `- [x] FT_LIFECYCLE_20260916_01`; HAS_LF=NO; HAS_CR=NO                        |
| 5   | Authoritative expiry                | `GET /m/...` → `expireAt=2026-12-16T07:18:12.000Z` > current UTC                       |
| 6   | Pending ops                         | `pending_target=0`; `restore_timed_any=0`; `target_restore_timed=0`                    |
| 7   | Session valid                       | `/api/auth/session` → 200; CSRF present                                                |
| 8   | Archive row + 恢复                  | target row visible; 恢复 control visible                                               |
| 9   | Origin                              | `https://pb.test.223.im` (matches configured allowed origin)                           |

```text
FT09_FINAL_DRIFT_CHECK=PASS
FT09_STARTED=YES
```

---

## 4. Single canonical action

One `恢复` click on the frozen Archive row (button transitions to
`恢复中…`/disabled immediately, proving the request was dispatched by the
frontend):

```text
FT09_CANONICAL_RESTORE_CLICK_COUNT=1
FT09_ACTION_SINGLE_SUBMISSION=YES
FT09_ACTION_SUBMITTED=YES
NO_RETRY=YES
PRODUCTION_LIFECYCLE_ACTION_AUTHORIZED=FT09_SINGLE_RESTORE
PRODUCTION_ADDITIONAL_MUTATION_AUTHORIZED=NO
```

No double-click, no direct API POST, no alternate browser submission, no second
request identity, no manual Idempotency-Key replay.

---

## 5. Evidence (actual captured)

### 5.1 HTTP (production invocation log)

```text
FT09_EVIDENCE_REQUEST_TIME≈2026-09-18T07:29:47Z
HTTP_METHOD=POST
HTTP_PATH=/api/entries/<target-id>/restore    # target id REDACTED by tooling
HTTP_BODY=empty
response.status=200
scriptVersion=0f19b190-0cd9-4d4c-ae50-08425a2e7d84
requestId=0d2b5dfa46dcbefe7153164b018a253f
outcome=ok
exactly_one_event=YES
```

### 5.2 D1 binding after

```text
id=d6450b83-a11d-4f45-9272-2197dcc5da60
paste_name=DMkerQPTisMNhhp8tdQc5Ech
visibility=active
retention_mode=permanent
expires_at=NULL
version=5
updated_at=2026-09-18T07:29:47.655Z
```

### 5.3 D1 operation after (exactly one)

```text
op_id=73d34aea-be76-4e03-b93e-93300c47a6a5
kind=restore_timed
status=succeeded
expected_version=4
request_id=680dcb67-de63-4fa4-a9b5-e0fd2b2707e4   # frontend Idempotency-Key
result={"visibility":"active","retentionMode":"permanent","expiresAt":null,"version":5,...}
created_at=2026-09-18T07:29:46.538Z
updated_at=2026-09-18T07:29:47.655Z
restore_timed_total=1
target_pending_unresolved=0
reconciliation_total=0
```

### 5.4 Paste after

```text
GET https://pb.223.im/DMkerQPTisMNhhp8tdQc5Ech -> 200
body=- [ ] FT_LIFECYCLE_20260916_01      # [x] -> [ ] managed task only
hex=2d20 5b20 5d20 4654 5f4c 4946 4543 5943 4c45 5f32 3032 3630 3931 365f 3031
len=30; HAS_LF=NO; HAS_CR=NO; NO_UNRELATED_BYTE_CHANGE=YES
```

### 5.5 Authoritative upstream expiry after

```text
GET https://pb.223.im/m/DMkerQPTisMNhhp8tdQc5Ech -> 200
{"lastModifiedAt":"2026-09-18T07:29:47.000Z","createdAt":"2026-09-16T07:45:27.000Z",
 "expireAt":null,"sizeBytes":30,"location":"KV"}
```

`expireAt=null` (was `2026-12-16T07:18:12.000Z`): authoritative non-expiring;
D1 `expires_at=NULL`; Paste still exists.

### 5.6 Frontend after (observed 2026-09-18T07:34:32Z)

```text
Archive (归档): target absent         (tab count 归档 0; 暂无条目)
Active (进行中): target present        (tab count 进行中 4)
  article="- [ ] FT_LIFECYCLE_20260916_01" / DMkerQPTisMNhhp8tdQc5Ech
  managed task checkbox unchecked (readonly)
API /api/entries (authenticated): target -> active / permanent / expiresAt=null / version=5
```

---

## 6. RESTORE_STAGE ordering (same-invocation telemetry)

```text
request_id=680dcb67-de63-4fa4-a9b5-e0fd2b2707e4
op_id=73d34aea-be76-4e03-b93e-93300c47a6a5
kind=restore_timed
```

```text
seq=1  request_accepted               seq=9  operation_constructed (op_id)
seq=2  duplicate_lookup_completed     seq=10 reservation_completed
seq=3  binding_lookup_completed       seq=11 dispatch_completed
seq=4  lifecycle_gate_passed          seq=12 expiry_cancel_started
seq=5  fingerprint_kind_completed     seq=13 expiry_cancel_completed
seq=6  credential_open_completed      seq=14 upstream_update_started
seq=7  paste_read_completed           seq=15 upstream_update_completed
seq=8  managed_task_completed         seq=16 finish_completed
```

Mechanical minimum comparisons (same invocation):

```text
seq(reservation_completed)=10  < seq(dispatch_completed)=11        PASS
seq(dispatch_completed)=11     < seq(expiry_cancel_started)=12     PASS
seq(expiry_cancel_started)=12  < seq(expiry_cancel_completed)=13   PASS
seq(expiry_cancel_completed)=13< seq(upstream_update_started)=14    PASS
seq(upstream_update_started)=14< seq(upstream_update_completed)=15 PASS
seq(upstream_update_completed)=15< seq(finish_completed)=16        PASS
```

All lines belong to the same request_id/op_id. No extra RESTORE_STAGE lines
from another invocation.

---

## 7. Mechanical gate settlement

```text
FT09_RESULT_1_HTTP=PASS                 # HTTP 200 captured event
FT09_RESULT_2_ENTRY=PASS                # active/permanent/null/v5 (API + D1 result)
FT09_RESULT_3_D1_BINDING=PASS           # active/permanent/NULL/v5 same identity
FT09_RESULT_4_D1_OP=PASS                # restore_timed/succeeded/expected_version=4, exactly 1
FT09_RESULT_5_PASTE_BODY=PASS           # unchecked exact bytes; LF=NO; CR=NO; no unrelated change
FT09_RESULT_6_EXPIRY_CANCEL_EFFECT=PASS # upward expireAt=null; D1 expires_at=NULL
FT09_RESULT_7_UI_ARCHIVE=PASS           # target absent
FT09_RESULT_8_UI_ACTIVE=PASS            # target present unchecked
FT09_RESULT_9_VERSION=PASS              # version 4 -> 5
FT09_RESULT_10_ORDERING=PASS            # mechanical same-invocation RESTORE_STAGE ordering
FT09_RESULT_11_NO_ANOMALY=PASS          # no second Paste/binding/op/pending/reconciliation; others untouched

FT09_PRECONDITION_1..7=YES
FT09_PRECONDITION_8_OWNER=YES
FT09_FINAL_DRIFT_CHECK=PASS
FT09_ACTION_SINGLE_SUBMISSION=YES
FT09_CANONICAL_RESTORE_CLICK_COUNT=1
NO_RETRY=YES
```

Therefore:

```text
FT09_EXECUTION_STATUS=COMPLETED
FT09_FUNCTIONAL_RESULT=PASS
FT09_COMPLETE=YES
```

No FAIL / INCONCLUSIVE token triggered.

---

## 8. No-anomaly details and limitations

- `bindings_total=9` (unchanged); `bindings_with_target_paste=1` (no duplicate
  Paste); `ops_total=13` (12 + 1 restore_timed); no `reserved`/`dispatched`;
  `reconciliation_total=0`.
- No other entry was mutated: the other three binding rows show
  `updated_at` = Sep 12–15; the only op in the restore window is the target's
  `restore_timed`.
- DLQ: the available read-only surfaces expose no DLQ backlog metadata; that
  limitation is recorded rather than inventing a zero. DLQ was **not** drained.

---

## 9. #170 interpretation

A successful happy-path timed restore proves the deployed restore path works
and that expiry cancellation + Stage-2 content update both completed. It does
**not** dynamically exercise the post-cancel deterministic failure branch fixed
by #170 (that branch did not occur). Therefore:

```text
DEFECT170_OPERATIONAL_SETTLEMENT=NOT_TRIGGERED   # happy path; #170 error branch not exercised
ISSUE170_STATE=OPEN                              # NOT closed
```

No attempt was made to induce the #170 error path.

---

## 10. Non-retroactivity / persistent invariants

```text
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT08_FUNCTIONAL_RESULT=PASS
FT08_COMPLETE=YES
DEFECT170_SOURCE_FIXED=YES
DEFECT170_SOURCE_REVIEWED=YES
DEFECT170_MERGED=YES
DEFECT170_DEPLOYED=YES
FT09_KNOWN_SOURCE_BLOCKER_POST_CANCEL_COMPENSATION=RESOLVED
```

FT-09 `RESTORE_STAGE` ordering evidence applies **only** to this invocation and
does not retroactively change FT-07 historical ordering conclusions.

---

## 11. Production mutation boundary (this round)

```text
PRODUCTION_LIFECYCLE_ACTION_AUTHORIZED=FT09_SINGLE_RESTORE
PRODUCTION_ADDITIONAL_MUTATION_AUTHORIZED=NO
AUTH_SESSION_CREATION_OR_REFRESH=NO       # session reused from prior post-auth recovery
FT09_LIFECYCLE_MUTATION=YES               # exactly the one authorized restore
PASTE_MUTATION=YES                        # internal two-stage upstream update of the 1 authorized restore
D1_LIFECYCLE_MUTATION=YES                 # the one restore_timed op + binding transition
DEPLOYMENT_MUTATION=NO
ROLLBACK=NO
```

The authorized single restore produced the expected internal mutational
consequences (two upstream updates + one D1 lifecycle transition) as explicitly
permitted by the authorization.

Workspace-only evidence; no evidence PR opened; no merge performed.
