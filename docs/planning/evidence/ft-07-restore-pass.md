# FT-07 execution evidence — Restore permanent archive

Status: **FT07_FUNCTIONAL_RESULT=PASS** (production Function Test execution).

This file is durable acceptance evidence for tracker
[#162](https://github.com/Skyline-Gazer/pastebin-worker/issues/162).
It is **not** a product-implementation PR review record.

```text
APPROVED_PLAN_HEAD=bdb9d3eb5dfa874d6ed465fcf472a5a380c075b5
APPROVED_SPEC_HEAD=3694155fc5e2f30c6660f1b6d54689de9178db1c
PLANNING_PR=#163 MERGED
MERGE_SHA=c7bcbe9b91bbc7bdaab5cad8dab694605588db37
RESULTING_DOWNSTREAM_MAIN=c7bcbe9b91bbc7bdaab5cad8dab694605588db37
```

Parent SPEC: [ft-07-spec.md](../ft-07-spec.md). Parent PLAN: [ft-07-plan.md](../ft-07-plan.md).

---

## 1. Scope identity clarification

| Ref                                                                 | Kind                | Role                                                       |
| ------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------- |
| [#162](https://github.com/Skyline-Gazer/pastebin-worker/issues/162) | **Issue** (tracker) | FT-07 planning + execution tracker; **not** a Pull Request |
| [#163](https://github.com/Skyline-Gazer/pastebin-worker/pull/163)   | Pull Request        | PLAN+SPEC docs; merged into `downstream/main`              |
| This evidence file                                                  | Docs                | Functional PASS archive + FT-08 handoff baseline           |

There is **no** Pull Request numbered 162. Reviewer-quorum / CI / mergeability
checks that apply to implementation PRs do **not** attach to Issue #162.

`OWNER_OVERRIDE=FT07_SPEC_REVIEW_QUORUM` on #163 applied **only** to that SPEC
review at HEAD `3694155fc5e2f30c6660f1b6d54689de9178db1c` and does **not**
transfer to Issue #162 or any later docs PR.

---

## 2. Execution timeline (execution-time evidence)

Owner UI action (authorized single Restore click; agent did not click):

| Event                      | Time (UTC)                                                 | Evidence class                         |
| -------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| Pre-click gate PASS        | ~2026-09-17T01:22Z                                         | read-only D1 + public GET + Archive UI |
| Owner confirm `已点击恢复` | conversation turn after unlock                             | owner attestation                      |
| Restore HTTP               | **2026-09-17T01:24:04Z**                                   | Cloudflare zone HTTP analytics         |
| Op created → updated       | **2026-09-17T01:24:04.093Z** → **01:24:04.775Z** (~681 ms) | D1 `feishu_operations`                 |

```text
UI_ACTION_SINGLE_ITEM=YES
RESTORE_CLICK_COUNT=1
AGENT_CLICKED_RESTORE=NO
RESTORE_API_CALLED_BY_AGENT=NO
NO_SECOND_CLICK=YES
NO_REPLAY=YES
NO_IDEMPOTENCY_KEY_RETRY=YES
```

---

## 3. Target identity

```text
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
PUBLIC_URL=https://pb.223.im/DMkerQPTisMNhhp8tdQc5Ech
BINDING_ID_PREFIX=d6450b83…
BINDING_ID_FULL_AT_EXECUTION=d6450b83-a11d-4f45-9272-2197dcc5da60
```

Historical FT-04 evidence Paste `7Zf3ZDjmyj2dQMWpSwfc7CK8` was not restored /
archived / deleted / rewritten in this run (`FT04_HTTP=200` guard GET).

---

## 4. Pre-action baselines (ARM / pre-click)

Captured before the Restore click (ARM + pre-click reconfirm):

| Metric                                     | Before |
| ------------------------------------------ | ------ |
| `OPERATIONS_TOTAL_BEFORE`                  | 10     |
| `RESTORE_PERMANENT_SUCCEEDED_TOTAL_BEFORE` | 0      |
| `TARGET_RESTORE_PERMANENT_COUNT_BEFORE`    | 0      |
| `RECONCILIATION_REQUIRED_TOTAL_BEFORE`     | 0      |
| `TARGET_RECONCILIATION_COUNT_BEFORE`       | 0      |
| `BINDINGS_TOTAL_BEFORE`                    | 9      |
| `CREATE_SUCCEEDED_TOTAL_BEFORE`            | 4      |
| `TARGET_VERSION_BEFORE`                    | 2      |
| `DLQ_BASELINE`                             | 0      |

Pre-click lifecycle:

```text
visibility=archived
retention_mode=permanent
expires_at=NULL
version=2
body=- [x] FT_LIFECYCLE_20260916_01
HAS_LF=NO
TARGET_BINDING_COUNT=1
```

---

## 5. Post-action functional results (execution-time)

Observed immediately after owner click (same session; ~2026-09-17T01:24–01:26Z):

### 5.1 Paste

```text
PUBLIC_PASTE_GET_200=YES
SAME_PASTE_NAME=YES
NEW_PASTE_COUNT_DELTA=0
BODY_AFTER=- [ ] FT_LIFECYCLE_20260916_01
TASK_TRANSFORM_EXACT=YES
HAS_LF=NO
```

Hex of after body: `2d205b205d2046545f4c4946454359434c455f32303236303931365f3031`

### 5.2 D1 binding

```text
SAME_BINDING=YES
visibility=active
retention_mode=permanent
expires_at=NULL
version=3
VERSION_DELTA=1
BINDINGS_DELTA=0
```

### 5.3 Operations (target-attributed)

```text
kind=restore_permanent
status=succeeded
op_id_prefix=75ab5e32…
expected_version=2
request_id_prefix=13601301…
result_version=3
result_visibility=active
result_paste=DMkerQPTisMNhhp8tdQc5Ech
TARGET_RESTORE_PERMANENT_DELTA=+1
TARGET_RECONCILIATION=0
TARGET_PENDING=0
CREATE_SUCCEEDED_DELTA=0
```

Global counters vs baseline (attributable; no conflicting concurrent target ops):

| Metric                             | Before | After | Δ   |
| ---------------------------------- | ------ | ----- | --- |
| operations_total                   | 10     | 11    | +1  |
| restore_permanent_succeeded_total  | 0      | 1     | +1  |
| target restore_permanent succeeded | 0      | 1     | +1  |
| reconciliation_required_total      | 0      | 0     | 0   |
| bindings_total                     | 9      | 9     | 0   |
| create_succeeded_total             | 4      | 4     | 0   |
| DLQ backlog                        | 0      | 0     | 0   |

### 5.4 HTTP request correlation

Cloudflare zone analytics (`pb.test.223.im`, path like `%/restore%`):

```text
method=POST
path=/api/entries/d6450b83-a11d-4f45-9272-2197dcc5da60/restore
edgeResponseStatus=200
count=1
datetime=2026-09-17T01:24:04Z
```

Matches binding id and op minute.

### 5.5 Frontend (authenticated observe-only after click)

```text
ARCHIVE_LIST_TARGET_COUNT=0
ARCHIVE_LIST_REMOVED=YES
ACTIVE_LIST_TARGET_COUNT=1
ACTIVE_LIST_PRESENT=YES
TASK_RENDER_STATE=UNCHECKED
tab_counts_observed=进行中 4 / 归档 0
```

---

## 6. Ordering contract evidence and gap

### 6.1 Source contract (live Worker continuity pin)

Messaging Worker at execution: `4c18eccc-0d80-472f-8d33-349047442fde` @100%.

Shipped `EntryService.restoreEntry` permanent path (repo source on
`downstream/main` at planning merge) orders:

```text
duplicate lookup
→ binding lookup
→ archived/permanent/NULL gate
→ credential open
→ Paste read
→ restoreManagedTask
→ reservePermanentRestore
→ dispatch
→ PasteClient.update(restoredContent, "never")   # timed expiry-cancel NOT used
→ finishPermanentRestore
```

```text
RESERVATION_BEFORE_UPSTREAM_UPDATE=YES  (source)
PRE_RESERVE_PASTE_READ=YES                 (source)
PRE_RESERVE_TASK_GATE=YES                  (source)
TIMED_EXPIRY_CANCEL_ON_PERMANENT_PATH=NO   (source)
```

### 6.2 Runtime evidence that **was** obtained

- Exactly one succeeded `restore_permanent` with `expected_version=2` and
  public result projecting `version=3` / `active` / same paste name.
- Single HTTP `POST …/restore` → 200 aligned to the op timestamps.
- Final Paste body and D1 lifecycle match permanent restore (not create).

### 6.3 Evidence gap (do **not** re-restore to fill)

```text
ORDERING_STEP_TELEMETRY=NOT_OBTAINED
```

No Workers Observability / per-step log chain was captured that independently
proves the wall-clock order `reserve → dispatch → update → finish` beyond:

1. source-enforced ordering on the pinned Worker, and
2. terminal succeeded finalize within ~681 ms.

Therefore:

```text
ORDERING_VERIFIED_BY_STEP_LOGS=NO
ORDERING_CONSISTENT_WITH_SOURCE_AND_FINALIZE=YES
```

This gap does **not** overturn `FT07_FUNCTIONAL_RESULT=PASS` under the SPEC PASS
gate (which requires reservation-before-update as a contract property plus
functional outcomes). It **must not** be restated as “step logs proved the
sequence.”

---

## 7. FT-08 handoff baseline

### 7.1 At execution success (~2026-09-17T01:24Z)

```text
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
visibility=active
retention_mode=permanent
expires_at=NULL
version=3
body=- [ ] FT_LIFECYCLE_20260916_01
task_state=unchecked
FT07_CLEANUP=NONE
FT08_USES_FT07_RESULT=YES
FT08_STARTED=NO
```

### 7.2 Closeout re-observation (read-only)

```text
HANDOFF_REOBSERVED_AT_UTC=2026-09-17T01:32:21Z
PUBLIC_GET_200=YES
BODY_STILL=- [ ] FT_LIFECYCLE_20260916_01
HAS_LF=NO
visibility=active
retention_mode=permanent
expires_at=NULL
version=3
restore_permanent_succeeded=1
reconciliation_required=0
```

Distinguish:

- **Execution-time state** — §5 (immediately after click).
- **Closeout re-observation** — §7.2 (later read-only confirm; still matches).

---

## 8. Production write boundary (this closeout turn)

```text
PRODUCTION_MUTATION_THIS_CLOSEOUT=NO
RESTORE_CLICK_THIS_CLOSEOUT=NO
D1_WRITE_THIS_CLOSEOUT=NO
PASTE_MUTATION_THIS_CLOSEOUT=NO
DEPLOY_THIS_CLOSEOUT=NO
FT08_STARTED=NO
```

Execution-time production mutation was limited to the owner-authorized single
Restore path already completed before this closeout.

---

## 9. Review / merge posture for tracker #162

```text
ISSUE_162_IS_PULL_REQUEST=NO
ISSUE_162_CI=N/A
ISSUE_162_REVIEWER_QUORUM=N/A
ISSUE_162_MERGEABLE=N/A
READY_FOR_PR_MERGE_APPROVAL=N/A (not a PR)
```

Planning PR #163 already merged. Functional PASS does not by itself create a
mergeable implementation PR. Any later docs PR that archives this evidence is a
**separate** review subject and does not inherit #163’s quorum override.
