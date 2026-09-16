# FT-06 PLAN — Single permanent archive

Status: **PLAN DRAFT — OWNER APPROVAL REQUIRED BEFORE SPEC/EXECUTION**.

```text
PLANNING_CLASSIFICATION=FT06_TARGET_NOT_ARCHIVABLE_AS_CANONICAL_FIXTURE
FT06_STARTED=NO
PRODUCTION_MUTATION=NO
```

Tracking: [#160](https://github.com/Skyline-Gazer/pastebin-worker/issues/160). Parent Function Test sequence: owner instruction `START PRODUCTION FUNCTION TEST` (2026-09-12). FT-04 / FT-05 complete. Non-blocking #159 and separate #153 remain out of scope.

This PLAN does **not** authorize FT-06 execution, UI archive clicks, lifecycle API calls, D1 writes, Paste updates, P2P, deploy, or FT-07+.

## 1. Canonical source

Authoritative definition (verbatim intent recovered from the 2026-09-12 production Function Test instruction; not invented in this turn):

```text
# FT-06 — Single permanent archive

Using the entry created by FT-04, exercise the frontend single-item action:

Active
→ Archive
→ permanent archive

Verify:

* UI action succeeds
* backend succeeds
* entry disappears from Active
* entry appears in Archive
* Paste still exists
* retention remains permanent
* D1 binding/lifecycle state agrees
* no extra Paste created
* no DLQ/reconciliation anomaly
```

FT-07 handoff (same instruction; fixture retention):

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

Supporting durable references (do not redefine FT-06 as timed archive / batch / delete):

| Source                                                                     | Relevance                                                  |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Owner instruction `START PRODUCTION FUNCTION TEST` (2026-09-12)            | Canonical FT-01…FT-15; FT-06 / FT-07 text above            |
| Closed [#149](https://github.com/Skyline-Gazer/pastebin-worker/issues/149) | FT-04 create; retained Paste for later lifecycle           |
| Closed [#157](https://github.com/Skyline-Gazer/pastebin-worker/issues/157) | FT-05 PASS; Paste still active/permanent at completion     |
| [ft-05-plan.md](ft-05-plan.md) / [ft-05-spec.md](ft-05-spec.md)            | Idempotency complete; FT-06+ owns first lifecycle mutation |
| `AGENTS.md` §14                                                            | Permanent archive vs timed archive vs delete product rules |
| Open [#159](https://github.com/Skyline-Gazer/pastebin-worker/issues/159)   | Non-blocking create-idempotency **test** gap — not FT-06   |
| Open [#153](https://github.com/Skyline-Gazer/pastebin-worker/issues/153)   | Separate — do not mix                                      |

No prior `docs/planning/ft-06-*.md` existed on `downstream/main` at `63b623548e749373716560d13effca24f3be6388`.

## 2. Purpose

Validate **exactly one** frontend single-item **permanent** archive of the retained FT-04 entry:

- UI succeeds
- backend succeeds
- entry leaves Active and appears in Archive
- same Paste name retained (no second Paste)
- retention remains **permanent**
- D1 lifecycle agrees
- no DLQ / reconciliation anomaly

## 3. Preconditions

```text
FT-01 PASS
FT-02 PASS
FT-03_DATA_PATH PASS
FT-04 PASS
FT-05 PASS (PASS_BY_PRODUCTION_STATE_AND_IDEMPOTENCY_CONTRACT)
```

Live Workers expected at later ARM (reconfirm; do not execute now):

```text
pastebin-feishu-prod  4c18eccc-0d80-472f-8d33-349047442fde @ 100%
pastebin-prod         1d84dbbd-fa52-4b5a-a158-d1dab939d32b @ 100%
```

Later ARM (SPEC/execution) MUST also confirm, read-only:

- target binding exists exactly once for the locked Paste
- visibility=`active`, retention_mode=`permanent`, expires_at NULL
- no pending / `reconciliation_required` operation on that entry
- public Paste GET 200
- authenticated Feishu frontend session usable for the canonical UI surface
- D1 create/completion baseline; DLQ/backlog healthy
- no prior succeeded `complete_permanent` for this entry

## 4. Target entry

```text
TARGET_PASTE=7Zf3ZDjmyj2dQMWpSwfc7CK8
PUBLIC_URL=https://pb.223.im/7Zf3ZDjmyj2dQMWpSwfc7CK8
```

Canonical instruction: **“Using the entry created by FT-04”** → this retained Paste is the locked target.

Known state at FT-05 completion (planning baseline; reconfirm at ARM):

```text
visibility=active
retention_mode=permanent
```

Do **not** mutate during planning.

## 5. Owner / user action

Canonical action is a **frontend single-item** lifecycle action — **not** a direct HTTP call as the Function Test surface, and **not** batch mode.

Mapped to current UI (`downstream/addons/messaging/frontend`):

| Canonical phrase                           | Current UI mapping                                                   |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Active                                     | Tab **进行中** (`active`)                                            |
| Archive → permanent archive                | Single-item **永久归档**                                             |
| Preferred interactive path (when eligible) | Rendered GFM task checkbox → chooser dialog → **永久归档** / confirm |
| Alternate single-item path                 | Lifecycle overflow **更多** → **永久归档** → same chooser/confirm    |

```text
OWNER_ACTION_SURFACE=FRONTEND_SINGLE_ITEM_PERMANENT_ARCHIVE
DIRECT_HTTP_AS_PRIMARY_FUNCTION_TEST=NO
BATCH_MODE=NO
```

Exactly **one** authorized owner activation later (one confirm). No repeated clicking; no API retry; no manual replay. Uncertain result → STOP and observe.

## 6. User surface under test

Primary product path under AGENTS.md §14 and current frontend:

1. Authenticated Add-on frontend (`https://pb.test.223.im`)
2. Active list shows the FT-04 entry
3. Single-item permanent archive via checkbox chooser **or** LifecycleMenu (same `archive_permanent` completion flow)
4. After success: entry absent from Active; present under Archive with permanent status

API exercised by that UI (not the owner-facing primary surface):

```text
POST /api/entries/:id/complete
body: { "action": "archive_permanent" }
+ session / CSRF / Idempotency-Key
```

Handler: `worker/completion.ts` → `EntryService.completeEntry` (`worker/service.ts`).

## 7. Managed Markdown prerequisite

### 7.1 Implementation contract (source)

`EntryService.completeManagedTask` (`service.ts`):

- Skips fenced code blocks
- Collects **top-level** unchecked GFM tasks matching `/^(?:[-+*]|\d+[.)])\s+\[ \]/`
- Requires **exactly one** candidate; otherwise returns `null`
- On archive: transforms that `[ ]` → `[x]` (lowercase x)
- On `null`: `MANAGED_TASK_AMBIGUOUS` (HTTP **409** via completion handler)

Frontend: interactive Markdown checkbox appears only when content has an eligible task; LifecycleMenu can still offer **永久归档** but backend will reject without the managed task.

### 7.2 Read-only fixture audit (planning)

Public GET of locked Paste (planning observation only; body not modified):

```text
BODY = FT_CREATE_20260915_02\n
HAS_TOP_LEVEL_UNCHECKED_GFM_TASK = NO
```

### 7.3 Planning classification (blocking for execution)

Under current source, this canonical FT-04 fixture **cannot** successfully permanent-archive:

```text
FT06_TARGET_NOT_ARCHIVABLE_AS_CANONICAL_FIXTURE
```

Reasons:

- Canonical FT-06 targets the FT-04 entry
- Permanent archive **requires** exactly one managed top-level unchecked GFM task
- Retained body has **zero** such tasks → `MANAGED_TASK_AMBIGUOUS`

```text
DO_NOT_REWRITE_PASTE_TO_FORCE_PASS=YES
```

Owner decision required before SPEC/execution (examples of decisions **not** made here): separate fixture creation under a new Function Test authorization; product change; or re-scope. Planning MUST NOT invent a Paste rewrite.

## 8. Expected lifecycle path (when precondition holds)

```text
UI permanent archive confirm
→ POST /api/entries/:id/complete { action: archive_permanent }
→ EntryService.completeEntry
→ read Paste
→ completeManagedTask ([ ] → [x])
→ fingerprint(["complete", scopeId, entryId, "archive_permanent"])
→ operation lookup (idempotency)
→ reserveCompletion (active+permanent only)
→ dispatch
→ PasteClient.update(same paste_name, content, e=never)
→ finishCompletion
```

Operation kind: `complete_permanent`.

## 9. Expected Paste mutation (when precondition holds)

| Field            | Before                         | After                                   |
| ---------------- | ------------------------------ | --------------------------------------- |
| paste name       | `7Zf3ZDjmyj2dQMWpSwfc7CK8`     | **same** (update in place; no `create`) |
| managed task     | exactly one top-level `[ ]`    | that task becomes `[x]`                 |
| other body bytes | unchanged aside from that mark | unchanged aside from that mark          |
| retention param  | n/a                            | upstream update with `e=never`          |

```text
NEW_PASTE_CREATED=NO
```

## 10. Expected D1 mutation (when precondition holds)

Same binding id / same `paste_name`:

| Field          | Before      | After       |
| -------------- | ----------- | ----------- |
| visibility     | `active`    | `archived`  |
| retention_mode | `permanent` | `permanent` |
| expires_at     | NULL        | NULL        |
| version        | N           | N+1         |

Operation row:

```text
kind=complete_permanent
status=succeeded
result present (projected PublicEntry)
```

Exactly one such succeeded completion attributable to this action identity under the SPEC request-id rules.

## 11. Idempotency / concurrency safety

From current `completeEntry` / store (document for later SPEC; do not execute):

- Fingerprint domain: `["complete", scopeId, entryId, action]`
- Client supplies `Idempotency-Key` as `requestId`
- Same request + same fingerprint + succeeded → return prior result; **no** second upstream update
- Same request + different fingerprint → `REQUEST_CONFLICT`
- Unresolved prior op → `RECONCILIATION_REQUIRED` (fail closed; no blind retry)
- `reserveCompletion` before `PasteClient.update`
- Race / unique conflict → re-read + duplicate semantics or conflict; no second blind update
- Stale version → `VERSION_CONFLICT`
- Wrong lifecycle state (not active+permanent) → fail closed (`INVALID_LIFECYCLE_STATE` / reserve false)

Single-mutation rule for FT-06 execution: **one** owner confirm only.

## 12. Permanent retention semantics

```text
FT-06 action = archive_permanent
retention_mode = permanent
expires_at = NULL
PasteClient.update(..., "never")   # e=never
```

**Not** FT-08:

```text
FT-08 = timed archive (archive_expiring / e=max / countdown)
```

Do not introduce timed retention into FT-06.

## 13. PASS criteria (planning-level; SPEC will freeze tokens)

Subject to clearing §7 fixture block and later SPEC:

- UI permanent archive succeeds once
- Backend succeeds once
- Entry leaves Active; appears in Archive
- Same `paste_name`; public Paste still exists
- Managed task exactly `[ ]` → `[x]` (when precondition holds)
- D1: archived + permanent + expires_at NULL + version +1
- Operation `complete_permanent` succeeded exactly once for the action identity
- No extra Paste; no DLQ / reconciliation anomaly
- Result retained for FT-07 (**no** cleanup)

While §7 classification stands, FT-06 **execution PASS is not available** on this fixture without owner scope decision.

## 14. Failure / STOP conditions (planning-level)

| Class (planning names; SPEC may rename)           | Meaning                                                    |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `FT06_TARGET_NOT_ARCHIVABLE_AS_CANONICAL_FIXTURE` | Locked FT-04 body lacks exactly one managed unchecked task |
| Ambiguous target identity                         | ≠1 binding for Paste / scope mismatch                      |
| Pending / reconciliation exists                   | Outstanding mutation claim                                 |
| Lifecycle request rejected                        | HTTP/error from complete (incl. `MANAGED_TASK_AMBIGUOUS`)  |
| Upstream update uncertain                         | `RECONCILIATION_REQUIRED` after dispatch                   |
| D1 finalization conflict                          | finish/reserve/version failure                             |
| Duplicate mutation evidence                       | Extra succeeded `complete_permanent` / extra Paste         |
| Unexpected new Paste                              | `create` observed                                          |
| Retention not permanent                           | timed / non-null expires_at after FT-06                    |
| Task source not transformed exactly               | Wrong/missing `[x]` transform                              |

Do not repair production in the same Function Test run.

## 15. Cleanup policy

```text
FT06_CLEANUP=NONE
```

Do **not** restore, delete, or rewrite the entry after a successful FT-06. Do **not** delete historical Pastes.

## 16. FT-07 handoff

Canonical FT-07 restores **the same FT-04 entry** after permanent archive.

```text
FT07_USES_FT06_RESULT=YES
FT07_STARTED=NO
```

Successful FT-06 must leave the entry **archived + permanent** as the FT-07 fixture. FT-06 success does **not** auto-start FT-07.

Note: with current fixture (§7), FT-07 is also blocked until an archivable permanent-archive result exists.

## 17. Production mutation boundary

```text
PRODUCTION_MUTATION=NO   (this planning turn)
P2P_SENT=NO
LIVE_REPLAY=NO
FT06_STARTED=NO
FT07_STARTED=NO
```

Forbidden now: archive checkbox/menu activation; lifecycle POST; D1 write; Paste update/create/delete; webhook/queue/DLQ mutation; Worker deploy/traffic; FT-07+.

## Next workflow stage

Owner review of this PLAN — including disposition of `FT06_TARGET_NOT_ARCHIVABLE_AS_CANONICAL_FIXTURE` — → SPEC only after PLAN approval and fixture/scope resolution → execution authorization separate.
