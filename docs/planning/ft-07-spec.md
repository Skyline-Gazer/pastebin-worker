# FT-07 SPEC — Restore permanent archive

Status: **SPEC READY FOR OWNER REVIEW**. Not executed.

Parent PLAN: [ft-07-plan.md](ft-07-plan.md)

```text
APPROVED_PLAN_HEAD=bdb9d3eb5dfa874d6ed465fcf472a5a380c075b5
FT07_USES_FT06_RESULT=YES
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
FT07_TARGET_NOT_RESTORABLE=NO
FT07_STARTED=NO
FT08_STARTED=NO
PRODUCTION_MUTATION=NO
```

Tracking: [#162](https://github.com/Skyline-Gazer/pastebin-worker/issues/162)

This SPEC defines future production execution stages only:

```text
FT07_PRE_ARM   (read-only)
FT07_EXECUTION (exactly one Restore click; separate owner authorization)
```

They MUST NOT be collapsed. This document does **not** authorize Restore clicks, restore API calls, D1 writes, Paste mutation, P2P, replay, deploy, or FT-08.

## 1. Objective

Define the executable contract for **exactly one** frontend single-item permanent-archive restore of the FT-06 result fixture:

- UI restore succeeds via Archive **恢复**
- backend `restore_permanent` succeeds
- entry leaves Archive and appears in Active
- same Paste name retained (no second Paste / no new create)
- retention remains permanent; `expires_at` remains NULL
- managed task transforms `[x]` → `[ ]` with all other bytes unchanged
- D1 lifecycle agrees (version 2 → 3)
- no DLQ / reconciliation anomaly

## 2. Canonical source / adjudication

Historical definition (2026-09-12 `START PRODUCTION FUNCTION TEST`):

```text
# FT-07 — Restore permanent archive

Restore the same FT-04 entry.

Verify:

* Archive → Active
* Paste remains same paste name
* no second Paste
* retention remains permanent
* content unchanged
```

Owner-approved adjudications:

```text
FT07_USES_FT06_RESULT=YES
EXECUTABLE_TARGET=DMkerQPTisMNhhp8tdQc5Ech
HISTORICAL_FT04_EVIDENCE=7Zf3ZDjmyj2dQMWpSwfc7CK8
DO_NOT_MUTATE_FT04_EVIDENCE=YES

HISTORICAL_VERIFY_CONTENT_UNCHANGED=
SUPERSEDED_BY_MANAGED_TASK_RESTORE_CONTRACT
```

Executable content invariant:

```text
- [x] FT_LIFECYCLE_20260916_01
→
- [ ] FT_LIFECYCLE_20260916_01
```

Do **not** reinterpret “content unchanged” to mean the task marker must remain checked.

## 3. Locked target

```text
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
PUBLIC_URL=https://pb.223.im/DMkerQPTisMNhhp8tdQc5Ech
```

Approved precondition (FT-06 PASS handoff):

| Field          | Value                            |
| -------------- | -------------------------------- |
| visibility     | `archived`                       |
| retention_mode | `permanent`                      |
| expires_at     | `NULL`                           |
| version        | `2`                              |
| task_state     | checked                          |
| body           | `- [x] FT_LIFECYCLE_20260916_01` |

```text
FT07_TARGET_NOT_RESTORABLE=NO
TOP_LEVEL_CHECKED_TASK_COUNT=1
```

## 4. Preconditions

Before any execution ARM:

```text
FT06_COMPLETE=YES
FT07_USES_FT06_RESULT=YES
TARGET_BINDING_COUNT=1
TARGET_VISIBILITY=archived
TARGET_RETENTION_MODE=permanent
TARGET_EXPIRES_AT_NULL=YES
TARGET_VERSION=2
BODY_STILL_FT06_RESULT=YES
RESTORE_MANAGED_TASK_PRECONDITION=PASS
OUTSTANDING_TARGET_MUTATION=0
TARGET_RESTORE_PERMANENT_SUCCEEDED_COUNT=0
TARGET_RECONCILIATION_REQUIRED=0
```

Historical FT-04 Paste `7Zf3ZDjmyj2dQMWpSwfc7CK8` must remain untouched.

## 5. Frontend owner surface

Canonical Function Test surface:

```text
authenticated Add-on (https://pb.test.223.im)
→ 归档 / Archive
→ target entry DMkerQPTisMNhhp8tdQc5Ech
→ 恢复
```

```text
OWNER_ACTION_SURFACE=FRONTEND_SINGLE_ITEM_PERMANENT_RESTORE
SECOND_CONFIRM_DIALOG=NO
RESTORE_CLICK_COUNT=1
DIRECT_HTTP_AS_PRIMARY_FUNCTION_TEST=NO
BATCH_MODE=NO
```

Current UI has **no** second confirmation dialog. The single **恢复** click is the production mutation trigger.

Do not use Markdown task checkbox as the restore action. Do not use LifecycleMenu. Do not use batch restore. Do not use direct HTTP as the primary Function Test surface.

## 6. Restore request contract

```text
Frontend: requestIdentity() → Idempotency-Key
Route:    POST /api/entries/:id/restore
Body:     empty (no action fields)
Scope:    resolved server-side from binding after authz
```

Handler: `worker/restore.ts` → `EntryService.restoreEntry`.

Operation kind:

```text
restore_permanent
```

Permanent fingerprint domain:

```text
["restore_permanent", scopeId, entryId]
```

## 7. Managed-task restore prerequisite

`EntryService.restoreManagedTask`:

- ignores fenced ` ``` ` / `~~~` regions
- matches top-level checked GFM: `/^(?:[-+*]|\d+[.)])\s+\[[xX]\]/`
- accepts lowercase `x` or uppercase `X`
- requires **exactly one** candidate
- transforms that marker to `[ ]`

Zero or multiple candidates:

```text
MANAGED_TASK_AMBIGUOUS
HTTP 409
```

For this target:

```text
TOP_LEVEL_CHECKED_TASK_COUNT=1
EXPECTED_AFTER=- [ ] FT_LIFECYCLE_20260916_01
```

No trim. No normalization. No new LF. No unrelated byte changes.

## 8. Request / idempotency behavior

| Case                                            | Result                            |
| ----------------------------------------------- | --------------------------------- |
| same request id + matching succeeded op         | return prior result               |
| same request id + fingerprint mismatch          | `REQUEST_CONFLICT`                |
| prior unresolved op (not succeeded / no result) | `RECONCILIATION_REQUIRED`         |
| reserve/version miss                            | `VERSION_CONFLICT`                |
| reservation/dispatch race                       | `MUTATION_CONFLICT` / fail closed |

Do not treat “owner clicks once” as the only idempotency protection. Transport retries must collapse by idempotency key; independently initiated restores must not be invented by the observer.

## 9. Runtime ordering

Frozen permanent-restore source order:

```text
duplicate lookup
→ binding lookup
→ archived/permanent/expires_at NULL lifecycle gate
→ fingerprint / kind resolution (restore_permanent)
→ credential open
→ Paste read
→ restoreManagedTask
→ operation construction
→ reservePermanentRestore
→ dispatch
→ PasteClient.update(pasteName, password, restoredContent, "never")
→ finishPermanentRestore
```

Permanent FT-07 does **not** execute the timed restore’s first expiry-cancellation `update(..., source, "never")`.

## 10. Reservation safety

```text
RESERVATION_BEFORE_UPSTREAM_UPDATE=YES
PRE_RESERVE_PASTE_READ=YES
PRE_RESERVE_TASK_GATE=YES
```

`reservePermanentRestore` inserts only when binding is archived/permanent/`expires_at IS NULL` and version matches. Upstream body mutation must not precede that reservation.

## 11. Paste mutation

```text
SAME_PASTE_NAME=YES
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
NEW_PASTE_COUNT_DELTA=0
CREATE_SUCCEEDED_DELTA=0
PUBLIC_PASTE_GET_200=YES
```

One in-place upstream update with `e=never` / `"never"`.

Before:

```text
- [x] FT_LIFECYCLE_20260916_01
```

After:

```text
- [ ] FT_LIFECYCLE_20260916_01
```

FT-06 result had no LF; unexpected LF after restore is investigate/fail, not silent normalize.

## 12. D1 mutation

Same binding id; same `paste_name`.

| Field          | Before    | After     |
| -------------- | --------- | --------- |
| visibility     | archived  | active    |
| retention_mode | permanent | permanent |
| expires_at     | NULL      | NULL      |
| version        | 2         | 3         |

Expected operation:

```text
kind=restore_permanent
status=succeeded
expected_version=2
result present
```

Expected deltas:

```text
OPERATIONS_DELTA=+1
RESTORE_PERMANENT_SUCCEEDED_DELTA=+1
TARGET_RESTORE_PERMANENT_DELTA=+1
BINDINGS_DELTA=0
CREATE_SUCCEEDED_DELTA=0
RECONCILIATION_DELTA=0
VERSION_DELTA=1
```

## 13. Frontend transition

Before owner action:

```text
ARCHIVE_LIST_TARGET_COUNT=1
ACTIVE_LIST_TARGET_COUNT=0
ARCHIVE_RETENTION_PRESENTATION=PERMANENT
RESTORE_BUTTON_COUNT_FOR_TARGET=1
```

Owner action (later, separate authorization): click **恢复** exactly once.

After success:

```text
ARCHIVE_LIST_TARGET_COUNT=0
ARCHIVE_LIST_REMOVED=YES
ACTIVE_LIST_TARGET_COUNT=1
ACTIVE_LIST_PRESENT=YES
TASK_RENDER_STATE=UNCHECKED
INTERACTIVE_UNCHECKED_TASK_COUNT=1
```

Frontend evidence is mandatory for full FT-07 PASS. Backend-only success is insufficient if authenticated frontend state cannot be verified (`FT07_FAIL_UI_UNAVAILABLE` / `FT07_FAIL_FRONTEND_STATE`).

Do not click Active Markdown checkbox during FT-07 observation (FT-08 territory).

## 14. Permanent-retention semantics

```text
before: archived / permanent / expires_at=NULL
after:  active   / permanent / expires_at=NULL
```

FT-07 is **not** FT-09. Do not require countdown disappearance, expiry-cancel success as a separate stage, or timed-retention assertions.

If retention becomes timed or `expires_at` becomes non-null:

```text
FT07_FAIL_RETENTION
```

## 15. Pre-ARM gates

Read-only reconfirmation immediately before execution ARM. If any fails:

```text
FT07_EXECUTION_NOT_ARMED
```

No mutation.

### LIVE

- messaging Worker exact live version = `4c18eccc-0d80-472f-8d33-349047442fde` @100%
  (`pastebin-feishu-prod`; same pin as FT-06)
- generic Worker exact live version = `1d84dbbd-fa52-4b5a-a158-d1dab939d32b` @100%
  (`pastebin-prod`; same pin as FT-06)
- `SPLIT_TRAFFIC=NO`

If either live version differs from the pins above, or traffic is split:

```text
FT07_EXECUTION_NOT_ARMED
```

Do not proceed against an unapproved deployment.

### TARGET

- `TARGET_PASTE` exactly `DMkerQPTisMNhhp8tdQc5Ech`
- exactly one binding
- visibility=`archived`
- retention_mode=`permanent`
- expires_at=`NULL`
- version=`2`

### BODY

- public GET 200
- exact body still `- [x] FT_LIFECYCLE_20260916_01`
- exactly one valid top-level checked task
- `restoreManagedTask` precondition PASS

### FRONTEND

- authenticated Feishu session
- Archive target count=1
- Restore button available exactly once for target
- target presented as **永久归档**

### OPERATIONS

- target `restore_permanent` succeeded count=0
- no pending mutation for target
- no `reconciliation_required` for target

Capture exact pre-action baselines for every PASS delta (required evidence; do not invent missing counters after the click):

```text
OPERATIONS_TOTAL_BEFORE=<n>
RESTORE_PERMANENT_SUCCEEDED_TOTAL_BEFORE=<n>
TARGET_RESTORE_PERMANENT_COUNT_BEFORE=0
RECONCILIATION_REQUIRED_TOTAL_BEFORE=<n>
TARGET_RECONCILIATION_COUNT_BEFORE=0
BINDINGS_TOTAL_BEFORE=<n>
CREATE_SUCCEEDED_TOTAL_BEFORE=<n>
TARGET_VERSION_BEFORE=2
```

### QUEUE

- DLQ healthy
- DLQ baseline captured as `DLQ_BASELINE=<n>` (expected `0` unless continuity evidence shows otherwise)

ARM return token on success:

```text
FT07_EXECUTION_ARMED_OWNER_CLICK_REQUIRED
```

ARM is read-only only. STOP. Do not click.

## 16. Owner-action boundary

Because Restore is immediate (no second confirm dialog):

1. Pre-ARM / ARM: **READ-ONLY ONLY** → `FT07_EXECUTION_ARMED_OWNER_CLICK_REQUIRED`
2. Separate owner acknowledgement / authorization for exactly **one** **恢复** click
3. After the click: **STOP** → observe-and-decide only

Forbidden after the single click / on ambiguity:

```text
NO_SECOND_RESTORE_CLICK
NO_REFRESH_AND_RETRY
NO_API_FALLBACK
NO_SECOND_BROWSER_RETRY
NO_BATCH_RESTORE
NO_D1_MANUAL_MUTATION
NO_REQUEST_REPLAY
```

Ambiguous result: STOP and observe. Do not repair in the same Function Test run.

## 17. PASS criteria

`FT-07: PASS` only if **all** hold:

```text
UI_ACTION_SINGLE_ITEM=YES
RESTORE_CLICK_COUNT=1

BACKEND_RESTORE_SUCCEEDED=YES

SAME_PASTE_NAME=YES
NEW_PASTE_COUNT_DELTA=0
CREATE_SUCCEEDED_DELTA=0

TASK_TRANSFORM_EXACT=YES

VISIBILITY_ACTIVE=YES
RETENTION_PERMANENT=YES
EXPIRES_AT_NULL=YES

VERSION_DELTA=1

RESTORE_PERMANENT_SUCCEEDED_DELTA=1
TARGET_RESTORE_PERMANENT_DELTA=1

BINDINGS_DELTA=0
RECONCILIATION_DELTA=0
DLQ_DELTA=0

ARCHIVE_LIST_REMOVED=YES
ACTIVE_LIST_PRESENT=YES
INTERACTIVE_UNCHECKED_TASK_COUNT=1

PUBLIC_PASTE_GET_200=YES

RESERVATION_BEFORE_UPSTREAM_UPDATE=YES
```

Then:

```text
FT07=PASS
```

## 18. Failure / STOP classes

Exact terminal classes:

- `FT07_FAIL_TARGET_PRECONDITION`
- `FT07_FAIL_UI_UNAVAILABLE`
- `FT07_FAIL_UI_ACTION`
- `FT07_FAIL_MANAGED_TASK_AMBIGUOUS`
- `FT07_FAIL_REQUEST_CONFLICT`
- `FT07_FAIL_VERSION_CONFLICT`
- `FT07_FAIL_MUTATION_CONFLICT`
- `FT07_FAIL_RESERVATION`
- `FT07_FAIL_UPSTREAM_UPDATE`
- `FT07_FAIL_RECONCILIATION_REQUIRED`
- `FT07_FAIL_D1_FINALIZATION`
- `FT07_FAIL_TASK_TRANSFORM`
- `FT07_FAIL_UNEXPECTED_NEW_PASTE`
- `FT07_FAIL_RETENTION`
- `FT07_FAIL_FRONTEND_STATE`
- `FT07_FAIL_DLQ`
- `FT07_FAIL_UNRESOLVED`

Also for ARM gate failure without mutation:

```text
FT07_EXECUTION_NOT_ARMED
```

On failure:

```text
STOP
NO_SECOND_RESTORE_CLICK
NO_API_RETRY
NO_REPLAY
NO_REPAIR_IN_SAME_RUN
```

## 19. Security / redaction boundary

Never publish in issue/PR evidence:

- management passwords / sealed credentials
- full OAuth / session / CSRF / idempotency secrets
- full durable ids when prefixes suffice
- full operation result JSON when boolean checks suffice

Prefer:

```text
entry_id_ref=<sanitized>
paste_name=<public>
scope_id_prefix=<prefix>…
request_id_prefix=<prefix>…
counts / deltas only
```

## 20. FT-08 handoff

On `FT-07: PASS`, retain exactly:

```text
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
visibility=active
retention_mode=permanent
expires_at=NULL
version=3
body=- [ ] FT_LIFECYCLE_20260916_01
task_state=unchecked
```

```text
FT07_CLEANUP=NONE
FT08_USES_FT07_RESULT=YES
FT08_STARTED=NO
```

No new lifecycle fixture. Do not auto-start FT-08.

## 21. Production authorization boundary

This SPEC defines future execution only.

Current turn remains:

```text
FT04_PASTE_PRESERVED=YES
PRODUCTION_MUTATION=NO
FT07_STARTED=NO
FT08_STARTED=NO
RESTORE_CLICK_SENT=NO
```

Not authorized by this SPEC draft alone:

- Restore / **恢复** click
- restore API POST
- D1 write
- Paste create/update/delete
- Feishu/Lark P2P
- webhook/queue/DLQ mutation
- Worker deploy/traffic change
- FT-08+
- any mutation of `7Zf3ZDjmyj2dQMWpSwfc7CK8`

## 22. Compatibility

```text
COMPATIBILITY_CLASS=PRODUCTION_FUNCTION_TEST_OF_SHIPPED_RESTORE
CODE_CHANGE_IN_FT07=NO
SCHEMA_MIGRATION_IN_FT07=NO
UPSTREAM_PATCH_IN_FT07=NO
```

FT-07 exercises already-shipped permanent restore against the FT-06 result fixture. It MUST NOT:

- alter restore API contracts;
- alter D1 schema;
- alter managed-task matcher/transform semantics;
- introduce timed-restore expiry-cancel on the permanent path;
- mutate historical FT-04 evidence Paste `7Zf3ZDjmyj2dQMWpSwfc7CK8`.

Backward compatibility expectation: after PASS, Active permanent entry with unchecked managed task remains valid input for FT-08 (timed archive) without fixture recreation.

## 23. Test specification

This is a production Function Test SPEC, not a product-implementation SPEC. Mapping:

| Behavior                                                                                                                | Evidence class                                                                                                       | When                                 |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Pre-ARM LIVE/TARGET/BODY/FRONTEND/OPERATIONS/QUEUE gates                                                                | read-only production observation                                                                                     | `FT07_PRE_ARM`                       |
| `restoreManagedTask` exact `[x]`→`[ ]` byte transform                                                                   | public Paste GET before/after + unit regression already covering matcher                                             | execution observe                    |
| `POST /api/entries/:id/restore` empty body + Idempotency-Key                                                            | frontend network / sanitized op evidence                                                                             | execution observe                    |
| `restore_permanent` fingerprint / reservation-before-update                                                             | D1 operation row + live Worker version continuity                                                                    | execution observe                    |
| D1 visibility/active + version 2→3                                                                                      | D1 binding read                                                                                                      | execution observe                    |
| Paste in-place `e=never` update, no new Paste                                                                           | public GET + create-op delta=0                                                                                       | execution observe                    |
| Archive→Active frontend transition, unchecked interactive task                                                          | authenticated UI observation                                                                                         | execution observe                    |
| Idempotency / conflict classes (`REQUEST_CONFLICT`, `VERSION_CONFLICT`, `MUTATION_CONFLICT`, `RECONCILIATION_REQUIRED`) | negative: do **not** force in production; covered by existing automated tests; production STOP classes listed in §18 | tests already shipped / FAIL classes |
| DLQ unchanged                                                                                                           | queue observation vs `DLQ_BASELINE`                                                                                  | execution observe                    |

Required repository regression posture (already expected green on planning PR; not re-authorized as product work here):

- messaging unit/integration covering `restoreManagedTask`, permanent restore reservation/finish, restore route empty-body contract
- no new product test suite is required solely to approve this SPEC

Negative production behaviors are fail-closed via §18; they are not intentionally induced during FT-07.

## 24. Open questions

```text
OPEN_QUESTIONS=NONE
```

Owner-resolved before SPEC review:

| Topic                                 | Disposition                                                          |
| ------------------------------------- | -------------------------------------------------------------------- |
| Target identity                       | `FT07_USES_FT06_RESULT=YES`; `TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech` |
| Historical “content unchanged”        | `SUPERSEDED_BY_MANAGED_TASK_RESTORE_CONTRACT`                        |
| Confirm dialog                        | none; one **恢复** click is the mutation trigger                     |
| Timed expiry-cancel on permanent path | not executed                                                         |
| Batch restore                         | out of scope                                                         |
| Cleanup                               | `FT07_CLEANUP=NONE`                                                  |
| FT-08                                 | not started; handoff retains same Paste                              |

Any later ambiguity during Pre-ARM or execution → STOP / `FT07_FAIL_UNRESOLVED` / owner escalation. Do not invent answers in-run.

---

```text
Status: SPEC READY FOR OWNER REVIEW
Implementation has NOT started.
PRODUCTION_MUTATION=NO
FT07_STARTED=NO
FT08_STARTED=NO
```
