# FT-06 PLAN — Single permanent archive

Status: **PLAN APPROVED** (`OWNER_APPROVAL: FT06_PLAN`).

```text
PLANNING_CLASSIFICATION=FIXTURE_CORRECTED_DEDICATED_LIFECYCLE_FIXTURE
FT06_TARGET_NOT_ARCHIVABLE_AS_CANONICAL_FIXTURE=RESOLVED_BY_OWNER_FIXTURE_CORRECTION
FT06_HISTORICAL_FIXTURE_DESIGN_MISMATCH=CONFIRMED
OWNER_CORRECTION_SCOPE=FIXTURE_ONLY
FT04_PASTE_PRESERVED=YES
LIFECYCLE_FIXTURE_SOURCE_PENDING=YES
APPROVED_PLAN_HEAD=82840e4769213055a37e6b4331ecb07762d6bd7b
FT06_STARTED=NO
PRODUCTION_MUTATION=NO
```

Tracking: [#160](https://github.com/Skyline-Gazer/pastebin-worker/issues/160). Parent Function Test sequence: owner instruction `START PRODUCTION FUNCTION TEST` (2026-09-12). FT-04 / FT-05 complete. Non-blocking #159 and separate #153 remain out of scope.

SPEC: [ft-06-spec.md](ft-06-spec.md) (same planning PR; SPEC approval and later stage-specific execution authorizations still required separately).

This PLAN does **not** authorize FT06_SETUP P2P, FT-06 archive execution, UI clicks, lifecycle API calls, D1 writes, Paste updates, deploy, or FT-07+.

## 1. Canonical source

Authoritative historical definition (verbatim intent recovered from the 2026-09-12 production Function Test instruction; retained for provenance):

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

FT-07 handoff (same instruction; historical wording retained):

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
| Closed [#149](https://github.com/Skyline-Gazer/pastebin-worker/issues/149) | FT-04 create; retained Paste for FT-04/FT-05 evidence      |
| Closed [#157](https://github.com/Skyline-Gazer/pastebin-worker/issues/157) | FT-05 PASS; Paste still active/permanent at completion     |
| [ft-05-plan.md](ft-05-plan.md) / [ft-05-spec.md](ft-05-spec.md)            | Idempotency complete; lifecycle mutation starts at FT-06   |
| `AGENTS.md` §14                                                            | Permanent archive vs timed archive vs delete product rules |
| Open [#159](https://github.com/Skyline-Gazer/pastebin-worker/issues/159)   | Non-blocking create-idempotency **test** gap — not FT-06   |
| Open [#153](https://github.com/Skyline-Gazer/pastebin-worker/issues/153)   | Separate — do not mix; fixture uses standard `- [ ]` GFM   |

## 1.1 Owner fixture correction

Owner disposition (`OWNER_SCOPE_DECISION: FT06_USE_DEDICATED_LIFECYCLE_FIXTURE`):

```text
HISTORICAL_TARGET=7Zf3ZDjmyj2dQMWpSwfc7CK8
HISTORICAL_TARGET_ARCHIVABLE=NO
FT06_HISTORICAL_FIXTURE_DESIGN_MISMATCH=CONFIRMED_REAL_FIXTURE_CONTRACT_MISMATCH
DISPOSITION=PRESERVE_HISTORICAL_PASTE_AND_USE_DEDICATED_LIFECYCLE_FIXTURE
OWNER_CORRECTION_SCOPE=FIXTURE_ONLY
FT04_PASTE_PRESERVED=YES
```

### Why

Historical FT sequence said FT-06 uses the FT-04 entry. Retained FT-04 Paste body is:

```text
FT_CREATE_20260915_02\n
```

with **zero** top-level unchecked GFM tasks. Current product contract requires permanent archive to complete exactly one managed task (`[ ]` → `[x]` via `completeManagedTask`). Therefore the historical **test-fixture assumption** is incompatible with the product contract.

```text
CLASSIFY_AS=FT06_HISTORICAL_FIXTURE_DESIGN_MISMATCH
NOT=runtime archive defect
NOT=Markdown parser defect
NOT=#153 shorthand defect
```

### What this correction overrides

**Fixture identity only.** Executable contract becomes:

> using the dedicated lifecycle fixture created by **FT06_SETUP**, because the retained FT-04 exact-body fixture does not satisfy the managed-task lifecycle precondition.

### What this correction does **not** change

- permanent archive semantics
- frontend single-item requirement
- managed task `[ ]` → `[x]`
- same-Paste update-in-place
- permanent retention (`e=never`)
- D1 lifecycle contract
- single-mutation rule
- runtime/product code (`completeManagedTask`, `completeEntry`, UI, schema)

```text
FT06_TARGET_NOT_ARCHIVABLE_AS_CANONICAL_FIXTURE=RESOLVED_BY_OWNER_FIXTURE_CORRECTION
DO_NOT_REWRITE_FT04_PASTE=YES
```

## 2. Purpose

Validate **exactly one** frontend single-item **permanent** archive of the **dedicated lifecycle fixture** (after FT06_SETUP):

- UI succeeds
- backend succeeds
- entry leaves Active and appears in Archive
- same Paste name retained (no second Paste)
- retention remains **permanent**
- D1 lifecycle agrees
- no DLQ / reconciliation anomaly

## 3. Stages (must not collapse)

```text
FT06_SETUP      — one normal Feishu create to establish archivable lifecycle fixture
FT06_EXECUTION  — one frontend single-item permanent archive of that fixture
```

FT06_SETUP is **not**: a replay of FT-04; another FT-04 attempt; FT-06 archive itself; FT-07; a synthetic webhook.

Each stage requires its own later explicit production authorization. Until then:

```text
P2P_SENT=NO
PRODUCTION_MUTATION=NO
FT06_STARTED=NO
```

## 4. Preconditions

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

## 5. Target entry (corrected)

### 5.1 Historical FT-04 evidence (immutable; not FT-06 target)

```text
FT04_PASTE=7Zf3ZDjmyj2dQMWpSwfc7CK8
PUBLIC_URL=https://pb.223.im/7Zf3ZDjmyj2dQMWpSwfc7CK8
BODY=FT_CREATE_20260915_02\n
HAS_TOP_LEVEL_UNCHECKED_GFM_TASK=NO
```

Do **not** rewrite, prepend `- [ ]`, update, archive, delete, or reuse as FT-06 target.

### 5.2 Dedicated lifecycle fixture (execution target)

```text
LIFECYCLE_FIXTURE_TOKEN=FT_LIFECYCLE_20260916_01
TARGET_MARKDOWN_SOURCE=- [ ] FT_LIFECYCLE_20260916_01
TARGET_PASTE=PENDING_FIXTURE_CREATE
LIFECYCLE_FIXTURE_SOURCE_PENDING=YES
TARGET_REQUIRED_INITIAL_STATE=active/permanent
TARGET_REQUIRED_TASK_STATE=unchecked
```

Exact semantic requirements for MarkdownSource:

- exactly one top-level unchecked GFM task
- standard GFM syntax `- [ ] …` (**not** bare `[ ]` shorthand; does not depend on #153)
- no nested task; no second task
- no fenced Markdown stored in Paste body
- provider-supplied terminal LF may be preserved exactly if present

Suggested later setup container: Feishu native Code Block with inner source:

```text
- [ ] FT_LIFECYCLE_20260916_01
```

Do **not** send in this planning turn.

## 6. Lifecycle-chain ownership

Unless a later canonical test explicitly requires another fixture, this dedicated lifecycle fixture is the chain fixture for:

```text
FT-06 permanent archive
→ FT-07 permanent restore
→ FT-08 timed archive
→ FT-09 timed restore
→ FT-10 Markdown rendering observation where applicable
→ FT-11 single delete
```

Do **not** create a fresh Paste for every lifecycle test.

- FT-07 MUST use the FT-06 archived result
- FT-08 SHOULD use the FT-07 restored result if requirements remain compatible
- FT-09 SHOULD use the FT-08 timed-archived result
- FT-11 may ultimately delete the lifecycle fixture if the canonical sequence confirms it

Do not execute any of these now.

## 7. Owner / user action (FT06_EXECUTION)

Canonical action remains a **frontend single-item** lifecycle action — **not** a direct HTTP call as the Function Test surface, and **not** batch mode.

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

Exactly **one** authorized owner activation for FT06_EXECUTION (one confirm). No repeated clicking; no API retry; no manual replay. Uncertain result → STOP and observe.

## 8. User surface under test

1. Authenticated Add-on frontend (`https://pb.test.223.im`)
2. Active list shows the **lifecycle fixture** entry (not the FT-04 evidence Paste)
3. Single-item permanent archive via checkbox chooser **or** LifecycleMenu (same `archive_permanent` completion flow)
4. After success: entry absent from Active; present under Archive with permanent status

API exercised by that UI (not the owner-facing primary surface):

```text
POST /api/entries/:id/complete
body: { "action": "archive_permanent" }
+ session / CSRF / Idempotency-Key
```

Handler: `worker/completion.ts` → `EntryService.completeEntry` (`worker/service.ts`).

## 9. Managed Markdown prerequisite (unchanged product contract)

`EntryService.completeManagedTask` (`service.ts`):

- Skips fenced code blocks
- Collects **top-level** unchecked GFM tasks matching `/^(?:[-+*]|\d+[.)])\s+\[ \]/`
- Requires **exactly one** candidate; otherwise returns `null`
- On archive: transforms that `[ ]` → `[x]` (lowercase x)
- On `null`: `MANAGED_TASK_AMBIGUOUS` (HTTP **409**)

Do **not** change this contract to make arbitrary plain-text Pastes archivable merely to satisfy FT-06. A future product requirement for non-task archival would need its own PLAN/SPEC.

The dedicated lifecycle fixture is designed so this prerequisite holds after FT06_SETUP.

## 10. Future FT06_SETUP gates (SPEC later; not authorized now)

Before setup:

- live Worker versions reconfirmed
- collision for lifecycle token `FT_LIFECYCLE_20260916_01` = 0
- D1/create baseline recorded
- ingress/DLQ healthy
- no existing lifecycle fixture matching token

Authorized setup (**later only**, separate owner authorization):

```text
one Feishu native Code Block P2P
inner source: - [ ] FT_LIFECYCLE_20260916_01
```

Expected:

```text
webhook → queue → create → Service Binding → one new Paste
→ one succeeded create op
→ active/permanent
→ frontend renders one interactive unchecked task
```

No automatic second send. No replay. No synthetic webhook.

## 11. Future FT06_EXECUTION gates (after setup; before archive auth)

Read-only proof required:

- exactly one lifecycle fixture binding for the new Paste
- visibility=`active`; retention_mode=`permanent`; expires_at NULL
- exactly one top-level unchecked GFM task
- public GET body matches provider-preserved MarkdownSource
- frontend renders exactly one interactive task
- no pending / `reconciliation_required` mutation
- no existing `complete_permanent` op for that entry
- Paste-count and DLQ baselines recorded

Then FT-06 may later authorize exactly **ONE** frontend archive confirmation.

## 12. Expected lifecycle path (FT06_EXECUTION)

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

## 13. Expected Paste mutation (FT06_EXECUTION)

| Field            | Before                                           | After                                                   |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------- |
| paste name       | lifecycle fixture Paste (from FT06_SETUP)        | **same** (update in place; no `create`)                 |
| managed task     | `- [ ] FT_LIFECYCLE_20260916_01` (+ optional LF) | `- [x] FT_LIFECYCLE_20260916_01` (+ same LF if present) |
| other body bytes | unchanged aside from that mark                   | unchanged aside from that mark                          |
| retention param  | n/a                                              | upstream update with `e=never`                          |

```text
NEW_PASTE_CREATED=NO
```

## 14. Expected D1 mutation (FT06_EXECUTION)

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

## 15. Idempotency / concurrency safety

From current `completeEntry` / store (document for later SPEC; do not execute):

- Fingerprint domain: `["complete", scopeId, entryId, action]`
- Client supplies `Idempotency-Key` as `requestId`
- Same request + same fingerprint + succeeded → return prior result; **no** second upstream update
- Same request + different fingerprint → `REQUEST_CONFLICT`
- Unresolved prior op → `RECONCILIATION_REQUIRED` (fail closed; no blind retry)
- `reserveCompletion` before `PasteClient.update`
- Race / unique conflict → re-read + duplicate semantics or conflict; no second blind update
- Stale version → `VERSION_CONFLICT`
- Wrong lifecycle state (not active+permanent) → fail closed

Single-mutation rule for FT06_EXECUTION: **one** owner confirm only.

## 16. Permanent retention semantics

```text
FT-06 action = archive_permanent
retention_mode = permanent
expires_at = NULL
PasteClient.update(..., "never")   # e=never
```

**Not** FT-08 (timed archive / `e=max` / countdown). Do not introduce timed retention into FT-06.

## 17. PASS criteria (planning-level; SPEC will freeze tokens)

After FT06_SETUP succeeds and later SPEC/execution authorization:

- UI permanent archive succeeds once on the lifecycle fixture
- Backend succeeds once
- Entry leaves Active; appears in Archive
- Same `paste_name`; public Paste still exists
- Managed task exactly `[ ]` → `[x]` (LF preserved iff provider-supplied)
- D1: archived + permanent + expires_at NULL + version +1
- Operation `complete_permanent` succeeded exactly once for the action identity
- No extra Paste; no DLQ / reconciliation anomaly
- FT-04 evidence Paste untouched
- Result retained for FT-07 (**no** cleanup)

## 18. Failure / STOP conditions (planning-level)

| Class (planning names; SPEC may rename)     | Meaning                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| Historical finding retained                 | FT-04 body not archivable (resolved via fixture correction) |
| Setup collision / duplicate lifecycle token | Existing fixture matching `FT_LIFECYCLE_20260916_01`        |
| Ambiguous target identity                   | ≠1 binding for lifecycle Paste / scope mismatch             |
| Pending / reconciliation exists             | Outstanding mutation claim                                  |
| Lifecycle request rejected                  | HTTP/error from complete (incl. `MANAGED_TASK_AMBIGUOUS`)   |
| Upstream update uncertain                   | `RECONCILIATION_REQUIRED` after dispatch                    |
| D1 finalization conflict                    | finish/reserve/version failure                              |
| Duplicate mutation evidence                 | Extra succeeded `complete_permanent` / extra Paste          |
| Unexpected new Paste on archive             | `create` observed during archive                            |
| Retention not permanent                     | timed / non-null expires_at after FT-06                     |
| Task source not transformed exactly         | Wrong/missing `[x]` transform                               |
| FT-04 evidence mutated                      | Historical Paste rewritten/archived/deleted                 |

Do not repair production in the same Function Test run.

## 19. Cleanup policy

```text
FT06_CLEANUP=NONE
FT04_PASTE_PRESERVED=YES
```

Do **not** restore, delete, or rewrite the lifecycle fixture after a successful FT-06. Do **not** touch the historical FT-04 Paste.

## 20. FT-07 handoff

```text
FT07_USES_FT06_RESULT=YES
FT07_STARTED=NO
```

Successful FT-06 must leave the **lifecycle fixture** **archived + permanent** as the FT-07 fixture. FT-06 success does **not** auto-start FT-07. Historical FT-07 wording (“same FT-04 entry”) is superseded for **fixture identity** by §1.1; restore semantics remain unchanged.

## 21. Production mutation boundary

```text
PRODUCTION_MUTATION=NO   (this planning amendment)
P2P_SENT=NO
LIVE_REPLAY=NO
FT06_STARTED=NO
FT07_STARTED=NO
FT04_PASTE_PRESERVED=YES
```

Forbidden now: lifecycle fixture P2P; archive checkbox/menu; lifecycle POST; D1 write; Paste create/update/delete; webhook/queue/DLQ mutation; Worker deploy/traffic; FT-07+; any change to runtime lifecycle code.

## 22. #153 / #159

- [#153](https://github.com/Skyline-Gazer/pastebin-worker/issues/153) remains OPEN and untouched; fixture uses standard `- [ ]`, not bare `[ ]`.
- [#159](https://github.com/Skyline-Gazer/pastebin-worker/issues/159) remains non-blocking and separate.

## Next workflow stage

PLAN approved at `82840e4769213055a37e6b4331ecb07762d6bd7b` → SPEC in [ft-06-spec.md](ft-06-spec.md) awaiting owner review → separate production authorizations for `FT06_SETUP` then `FT06_EXECUTION`.
