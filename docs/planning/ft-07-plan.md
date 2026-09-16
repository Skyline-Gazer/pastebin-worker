# FT-07 PLAN — Restore permanent archive

Status: **PLAN APPROVED** (`OWNER_APPROVAL: FT07_PLAN`).

```text
PLANNING_CLASSIFICATION=FT06_RESULT_RESTORE_FIXTURE_LOCKED
FT07_TARGET=DMkerQPTisMNhhp8tdQc5Ech
FT07_USES_FT06_RESULT=YES
FT04_PASTE_PRESERVED=YES
APPROVED_PLAN_HEAD=bdb9d3eb5dfa874d6ed465fcf472a5a380c075b5
FT07_STARTED=NO
FT08_STARTED=NO
PRODUCTION_MUTATION=NO
```

Tracking: [#162](https://github.com/Skyline-Gazer/pastebin-worker/issues/162). Parent Function Test sequence: owner instruction `START PRODUCTION FUNCTION TEST` (2026-09-12). Predecessor [#160](https://github.com/Skyline-Gazer/pastebin-worker/issues/160) **CLOSED** (`FT06_COMPLETE=YES`).

SPEC: [ft-07-spec.md](ft-07-spec.md) (same planning PR; SPEC approval and later stage-specific execution authorizations still required separately).

This PLAN does **not** authorize Restore clicks, restore API calls, D1 writes, Paste updates, P2P, deploy, FT-07 execution, or FT-08+.

## 1. Canonical source

Authoritative historical definition (verbatim intent recovered from the 2026-09-12 production Function Test instruction):

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

Supporting durable references:

| Source                                                                     | Relevance                                                           |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Owner instruction `START PRODUCTION FUNCTION TEST` (2026-09-12)            | Canonical FT-01…FT-15; FT-07 text above                             |
| Closed [#160](https://github.com/Skyline-Gazer/pastebin-worker/issues/160) | FT-06 PASS; lifecycle fixture archived/permanent/version=2          |
| [ft-06-plan.md](ft-06-plan.md) / [ft-06-spec.md](ft-06-spec.md)            | Dedicated lifecycle fixture correction; FT-07 MUST use FT-06 result |
| `AGENTS.md` §14                                                            | Restore → Markdown unchecked, active, permanent, `expiresAt=null`   |
| Current messaging source                                                   | `restoreEntry` / `restoreManagedTask` / Archive **恢复** UI         |

### 1.1 Fixture-identity inheritance (not reinvented here)

FT-06 already resolved that the retained FT-04 evidence Paste `7Zf3ZDjmyj2dQMWpSwfc7CK8` is **not** the lifecycle chain fixture. Historical FT-07 wording “Restore the same FT-04 entry” is therefore **fixture-identity superseded** the same way FT-06 was:

```text
EXECUTABLE_TARGET=DMkerQPTisMNhhp8tdQc5Ech
HISTORICAL_FT04_EVIDENCE=7Zf3ZDjmyj2dQMWpSwfc7CK8
DO_NOT_MUTATE_FT04_EVIDENCE=YES
```

Restore **semantics** (Archive→Active, same paste name, no second Paste, retention permanent) remain from the canonical verify list.

### 1.2 Historical “content unchanged” vs managed-task restore

Canonical verify includes `content unchanged`. Current product restore **must** transform the managed task:

```text
[x] → [ ]
```

per `AGENTS.md` §14 and `EntryService.restoreManagedTask`. That is not a new invention in this PLAN; it is the already-shipped restore contract that FT-06’s checked body was designed to satisfy.

```text
HISTORICAL_VERIFY_CONTENT_UNCHANGED=SUPERSEDED_BY_MANAGED_TASK_RESTORE_CONTRACT
EXECUTABLE_BODY_TRANSITION=[x]→[ ]
SAME_PASTE_OTHER_BYTES_UNCHANGED=YES
```

Do not rewrite the Paste during planning to “make content unchanged.”

## 2. Purpose

Validate **exactly one** frontend single-item **permanent-archive restore** of the FT-06 result fixture:

- UI restore succeeds
- backend restore succeeds
- entry leaves Archive and appears in Active
- same Paste name retained (no second Paste / no new create)
- retention remains **permanent**; `expires_at` remains **NULL**
- Markdown managed task becomes unchecked exactly once
- D1 lifecycle agrees (`restore_permanent` succeeded; version +1)
- no DLQ / reconciliation anomaly

**Not** FT-09 (timed restore / expiry cancellation path as the primary subject). Permanent restore shares `restoreEntry` but must not import timed-expiry waiting or FT-09 countdown assertions.

## 3. Preconditions

Before any later FT-07 execution authorization:

```text
FT06_COMPLETE=YES
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
TARGET_VISIBILITY=archived
TARGET_RETENTION_MODE=permanent
TARGET_EXPIRES_AT_NULL=YES
TARGET_VERSION=2
TASK_STATE=checked
BODY=- [x] FT_LIFECYCLE_20260916_01
LIVE_VERSION_MATCH=YES   # reconfirm at execution ARM
SPLIT_TRAFFIC=NO
OUTSTANDING_TARGET_MUTATION=0
RECONCILIATION_REQUIRED_FOR_TARGET=0
```

Planning does **not** re-verify production live state beyond the FT-06 PASS handoff record. Execution ARM (later) must reconfirm.

## 4. Locked target

```text
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
PUBLIC_URL=https://pb.223.im/DMkerQPTisMNhhp8tdQc5Ech
```

Expected precondition (FT-06 handoff; do not mutate in planning):

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
```

Audit against `restoreManagedTask` (see §7): exactly one top-level checked GFM candidate; fixture is restorable under current contract.

## 5. Owner / user surface

Canonical Function Test surface is the **authenticated Add-on frontend**, not direct HTTP.

Mapped to current UI (`downstream/addons/messaging/frontend`):

| Canonical phrase    | Current UI mapping                                         |
| ------------------- | ---------------------------------------------------------- |
| Archive             | Tab **归档** (`archived`)                                  |
| Restore             | Single-item button **恢复** on the Archive card            |
| Confirmation dialog | **None** for permanent restore (click submits immediately) |

Exact owner path for later execution:

```text
Authenticated Add-on (https://pb.test.223.im)
→ Archive / 归档
→ target entry DMkerQPTisMNhhp8tdQc5Ech
→ click 恢复 exactly once
→ STOP and observe
```

```text
OWNER_ACTION_SURFACE=FRONTEND_SINGLE_ITEM_PERMANENT_RESTORE
DIRECT_HTTP_AS_PRIMARY_FUNCTION_TEST=NO
BATCH_MODE=NO
SECOND_CONFIRM_DIALOG=NO
```

Implementation notes:

- `TextEntryCard` / `FileEntryCard` Archive branch renders `<Button>恢复</Button>` → `onRestore`
- `App.submitRestore` generates `requestIdentity()`, sets pending, POSTs restore, applies response, refreshes
- Pending disables further restore clicks (`restorePendingId` gate)
- Do **not** click Markdown task checkbox as the restore action (Archive task is checked/disabled presentation)

API exercised by that UI (not the owner-facing primary surface):

```text
POST /api/entries/:id/restore
empty body
+ session / CSRF / Idempotency-Key
```

Handler: `worker/restore.ts` → `EntryService.restoreEntry` (`worker/service.ts`).

## 6. Restore implementation audit

End-to-end permanent restore path (current source):

1. **Frontend Archive view** — tab `归档`; permanent rows show status **永久归档** and **恢复**
2. **Single-item Restore** — `submitRestore(entry)` → `restoreEntry(id, requestId)`
3. **HTTP adapter** — `createRestoreHandler` (`restore.ts`): session + CSRF; binding by id; scope membership; empty body only; no browser-controlled action fields
4. **Service** — `EntryService.restoreEntry`
5. **Task transform** — `restoreManagedTask(source)` → `[x]`/`[X]` → `[ ]`
6. **Request identity** — client `Idempotency-Key` = `requestIdentity()` UUID
7. **Reserve** — `store.reservePermanentRestore(op)` (SQL inserts only if archived/permanent/`expires_at IS NULL`/version match)
8. **Dispatch** — `store.dispatch`
9. **Upstream** — for **permanent**: single `PasteClient.update(paste, password, content, "never")` (no separate expiry-cancel update)
10. **D1 finalize** — `store.finishPermanentRestore` → binding `active`/`permanent`/`expires_at NULL`/`version+1`; op `succeeded`
11. **Frontend refresh** — apply public entry + `refreshLiveEntries()`; expect Archive→Active move from response/list

Important: restore is **not** merely `completeEntry` inverted. Differences vs permanent archive:

| Concern            | Permanent archive (`completeEntry`)      | Permanent restore (`restoreEntry`)                          |
| ------------------ | ---------------------------------------- | ----------------------------------------------------------- |
| HTTP route         | `POST .../complete` + `{action}`         | `POST .../restore` + empty body                             |
| Op kind            | `complete_permanent`                     | `restore_permanent`                                         |
| Fingerprint domain | `["complete", scopeId, entryId, action]` | `["restore_permanent", scopeId, entryId]`                   |
| Task matcher       | unchecked `[ ]`                          | checked `[x]`/`[X]`                                         |
| Reserve helper     | `reserveCompletion`                      | `reservePermanentRestore`                                   |
| Timed branch       | N/A for FT-06                            | Timed uses **two** upstream updates; permanent uses **one** |

## 7. Managed-task restore prerequisite

`EntryService.restoreManagedTask` (`service.ts`):

- Skips fenced ` ``` ` / `~~~` regions
- Collects **top-level** checked GFM tasks matching `/^(?:[-+*]|\d+[.)])\s+\[[xX]\]/`
- Accepts lowercase `x` or uppercase `X`
- Requires **exactly one** candidate; otherwise returns `null` → `MANAGED_TASK_AMBIGUOUS` (HTTP **409**)
- Transforms that marker to `[ ]` (space), preserving all other bytes

Locked fixture evaluation:

```text
SOURCE=- [x] FT_LIFECYCLE_20260916_01
TOP_LEVEL_CHECKED_TASK_COUNT=1
RESTORE_MANAGED_TASK_PRECONDITION=PASS
EXPECTED_AFTER=- [ ] FT_LIFECYCLE_20260916_01
```

```text
FT07_TARGET_NOT_RESTORABLE=NO
```

## 8. Request / idempotency model

| Element                            | Actual behavior                                                          |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Client request id                  | `requestIdentity()` → `Idempotency-Key`                                  |
| Scope                              | Resolved **server-side** from binding after authz                        |
| Fingerprint (permanent)            | HMAC of `JSON.stringify(["restore_permanent", scopeId, entryId])`        |
| Duplicate succeeded                | Same request id + matching fingerprint → returns prior `result` entry    |
| Fingerprint mismatch               | `REQUEST_CONFLICT`                                                       |
| Prior op not succeeded / no result | `RECONCILIATION_REQUIRED`                                                |
| Version mismatch on reserve        | `VERSION_CONFLICT`                                                       |
| Outstanding mutation               | Reserve/dispatch fail-closed (`MUTATION_CONFLICT` / race duplicate path) |

Do not rely only on “owner clicks once”; SPEC/execution must still count distinct initiated restore requests and collapse transport retries by idempotency key.

## 9. Reservation ordering

Actual permanent-restore order:

```text
duplicate lookup (by requestId)
→ binding lookup
→ lifecycle gate (archived/permanent/expires_at NULL)
→ Paste read
→ restoreManagedTask
→ reservePermanentRestore
→ dispatch
→ PasteClient.update(..., content, "never")
→ finishPermanentRestore
```

```text
RESERVATION_BEFORE_UPSTREAM_UPDATE=YES
PRE_RESERVE_PASTE_READ=YES
PRE_RESERVE_TASK_GATE=YES
```

For **permanent** restores there is **no** pre-body expiry-cancellation update. (Timed restore inserts an extra `update(..., source, "never")` **after** reserve/dispatch and **before** the body transform update — that path is FT-09, not FT-07.)

Planning blocker if upstream mutation preceded reservation: **not present** for permanent restore.

## 10. Paste mutation

Expected:

```text
SAME_PASTE_NAME=YES
NEW_PASTE_COUNT_DELTA=0
CREATE_SUCCEEDED_DELTA=0
PUBLIC_PASTE_GET_200=YES
```

Body transition (byte-preserving except managed marker):

```text
- [x] FT_LIFECYCLE_20260916_01
→
- [ ] FT_LIFECYCLE_20260916_01
```

Upstream call: `PasteClient.update(pasteName, password, restoredContent, "never")` once.

No LF was present after FT-06; expected after restore also has no LF unless upstream/provider introduces one during this operation (SPEC must treat unexpected LF as investigate/fail, not silent normalize).

## 11. D1 mutation

Same binding id; same `paste_name`.

| Field          | Before (FT-06 result) | After (expected) |
| -------------- | --------------------- | ---------------- |
| visibility     | `archived`            | `active`         |
| retention_mode | `permanent`           | `permanent`      |
| expires_at     | `NULL`                | `NULL`           |
| version        | `2`                   | `3`              |

Runtime operation kind (from source, not invented):

```text
kind=restore_permanent
status=succeeded
expected_version=2
```

Expected deltas (conceptual; SPEC freezes baselines at ARM):

```text
OPERATIONS_DELTA=+1
RESTORE_PERMANENT_SUCCEEDED_DELTA=+1
TARGET_RESTORE_PERMANENT_DELTA=+1
BINDINGS_DELTA=0
CREATE_SUCCEEDED_DELTA=0
RECONCILIATION_DELTA=0
VERSION_DELTA=1
```

## 12. Frontend state transition

Require after success:

```text
ARCHIVE_LIST_TARGET_COUNT=0
ARCHIVE_LIST_REMOVED=YES
ACTIVE_LIST_TARGET_COUNT=1
ACTIVE_LIST_PRESENT=YES
TASK_RENDER_STATE=UNCHECKED
INTERACTIVE_UNCHECKED_TASK_COUNT=1
```

Do not click Restore twice. Do not click Active Markdown checkbox during FT-07 observation (that begins FT-08 territory).

## 13. Permanent-retention semantics

FT-07 before/after retention:

```text
before: archived / permanent / expires_at=NULL
after:  active   / permanent / expires_at=NULL
```

Distinguish from FT-09:

| Topic                      | FT-07               | FT-09                   |
| -------------------------- | ------------------- | ----------------------- |
| Starting retention         | permanent           | timed                   |
| Expiry cancellation update | not applicable      | required before success |
| Countdown assertions       | none                | required                |
| Op kind                    | `restore_permanent` | `restore_timed`         |

Do not import FT-09 timed-expiry behavior into FT-07 PASS criteria.

## 14. PASS criteria

Later SPEC should cover at minimum (token names may be refined at SPEC):

- exactly one owner restore UI action (`恢复` ×1)
- backend restore succeeds (`restore_permanent` succeeded)
- same Paste name; no new Paste; no new create op
- body transform exact: `[x]` → `[ ]` only
- visibility archived → active
- retention permanent → permanent
- expires_at NULL → NULL
- version 2 → 3 exactly once
- reconciliation delta 0
- DLQ delta 0
- removed from Archive; present in Active with unchecked interactive task
- public Paste GET 200 with exact body
- reservation before upstream update
- no FT-08 side effect (no timed archive)

## 15. Failure / STOP conditions

Planning distinguishes (exact `FT07_FAIL_*` tokens freeze in SPEC):

- target precondition invalid
- target identity ambiguous (`TARGET_BINDING_COUNT≠1`)
- restore UI unavailable / unauthenticated
- task restore ambiguous (`MANAGED_TASK_AMBIGUOUS`)
- request conflict
- version conflict
- reservation failure
- upstream update failure
- reconciliation required
- D1 finalization failure
- body transform mismatch
- unexpected new Paste
- retention changed incorrectly (e.g. timed / non-null expires_at)
- frontend state mismatch
- DLQ anomaly
- unresolved / multiple independently initiated restores

On failure:

```text
STOP
NO_SECOND_OWNER_RESTORE
NO_DIRECT_API_RETRY
NO_REPLAY
NO_REPAIR_IN_SAME_RUN
```

## 16. Cleanup

```text
FT07_CLEANUP=NONE
```

On PASS, retain the restored fixture for FT-08. Do not delete Pastes, bindings, or historical FT-04 evidence.

## 17. FT-08 handoff

Canonical FT-08 (same 2026-09-12 instruction; historical wording retained):

```text
# FT-08 — Timed archive + countdown

Archive the FT-04 entry again using a finite expiry option.
...
```

With the FT-06 fixture correction already applied to the lifecycle chain:

```text
FT08_USES_FT07_RESULT=YES
```

Expected FT-07 result retained for FT-08:

```text
visibility=active
retention_mode=permanent
expires_at=NULL
task_state=unchecked
same Paste=DMkerQPTisMNhhp8tdQc5Ech
body=- [ ] FT_LIFECYCLE_20260916_01
version=3
```

```text
FT08_STARTED=NO
```

Do **not** execute FT-08 from this PLAN.

## 18. Production mutation boundary

Authorized by this planning turn only:

- docs under `docs/planning/`
- tracking issue / planning PR bookkeeping

Forbidden now:

```text
Restore / 恢复 click
restore API POST
D1 write
Paste create/update/delete
Feishu/Lark P2P
webhook/queue/DLQ mutation
Worker deploy/traffic change
FT-07 execution
FT-08+
mutation of 7Zf3ZDjmyj2dQMWpSwfc7CK8
```

```text
PRODUCTION_MUTATION=NO
FT07_STARTED=NO
FT08_STARTED=NO
```
