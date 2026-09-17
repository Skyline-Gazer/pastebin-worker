# FT-08 execution evidence — Timed archive + countdown

Status: **FT08_FUNCTIONAL_RESULT=PASS** (production Function Test execution).

This file is durable acceptance evidence for tracker
[#162](https://github.com/Skyline-Gazer/pastebin-worker/issues/162).
It is **not** a product-implementation PR review record.

```text
APPROVED_FT08_SPEC_HEAD=64e8772382d0e104b70d9a08794ff26ab8c496fd
FT08_PLANNING_MERGE=d558f951f5379e4083070ad2536e573c8264e49c
WORKER_PIN=4c18eccc-0d80-472f-8d33-349047442fde @100%
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
BINDING_ID_PREFIX=d6450b83…
```

Parent SPEC: [ft-08-spec.md](../ft-08-spec.md). Parent PLAN: [ft-08-plan.md](../ft-08-plan.md).
Parent TODO: [ft-08-todo.md](../ft-08-todo.md).

---

## 1. Scope identity

| Ref                                                                 | Kind                | Role                                                     |
| ------------------------------------------------------------------- | ------------------- | -------------------------------------------------------- |
| [#162](https://github.com/Skyline-Gazer/pastebin-worker/issues/162) | **Issue** (tracker) | FT-07/FT-08 planning + execution tracker; **not** a PR   |
| [#166](https://github.com/Skyline-Gazer/pastebin-worker/pull/166)   | Pull Request        | FT-08 PLAN/SPEC/TODO docs; merged into `downstream/main` |
| This evidence file                                                  | Docs                | Functional PASS archive + FT-09 handoff baseline         |

Existing FT-07 historical evidence conclusions are **not** modified by this
file; FT-08 PASS has **no retroactive evidentiary effect** on FT-07 runtime
ordering.

---

## 2. Execution timeline (execution-time evidence)

Owner authorized exactly one canonical frontend single-item lifecycle action
(`限期归档`). Agent drove the **canonical authenticated frontend** flow using the
existing authenticated browser session (no cookie decryption, no session/cookie
recording, no direct API submit).

| Event                                 | Time (UTC) (approx)           | Evidence class                       |
| ------------------------------------- | ----------------------------- | ------------------------------------ |
| Phase A read-only preflight           | ~2026-09-17T06:2xZ            | D1 + public GET + Workflows OK       |
| Auth-readiness closure (browser)      | ~2026-09-17T06:3xZ            | authenticated frontend snapshot      |
| Pre-submit drift check (D1 + browser) | ~2026-09-17T07:17Z            | binding v3 / no pending op / session |
| Chooser request-time snapshot         | 2026-09-17T07:18:02.368Z      | browser client clock (pre-submit)    |
| Submit `确认归档` (single action)     | ~2026-09-17T07:18:12Z         | frontend in-flight → dialog closed   |
| D1 op created → updated               | 07:18:12.367Z → 07:18:13.044Z | `feishu_operations`                  |
| Frontend Archive observation          | 2026-09-17T07:22:57.198Z      | authenticated Archive tab snapshot   |

```text
FT08_AUTHORIZED=YES
FT08_STARTED=YES
FT08_ACTION_SUBMITTED=YES
FT08_ACTION_SINGLE_SUBMISSION=YES
PRODUCTION_MUTATION_COUNT=1
NO_DOUBLE_CLICK=YES
NO_REPLAY=YES
NO_DIRECT_API_SECONDARY_REQUEST=YES
NO_RETRY_AFTER_TERMINAL_SUCCESS=YES
```

---

## 3. Pre-ARM (read-only, pre-submit)

All Phase A gates PASS:

```text
FT08_PRECONDITION_1_FT07_PASS=YES
FT08_PRECONDITION_2_FIXTURE_ACTIVE=YES
FT08_PRECONDITION_3_FIXTURE_BODY=YES
FT08_PRECONDITION_4_AUTH=YES
FT08_PRECONDITION_5_DEPLOY_COMPAT=YES   # WORKER_PIN cited; version-compatible
FT08_PRECONDITION_6_NO_PENDING_OP=YES
FT08_PRECONDITION_7_OWNER=YES           # owner authorization before Phase C
```

Before lifecycle state:

```text
visibility=active
retention_mode=permanent
expires_at=NULL
version=3
body=- [ ] FT_LIFECYCLE_20260916_01
HAS_LF=NO
```

No pending / uncertain / reconciliation operation on the target before submit.

---

## 4. Authorized action (single production mutation)

```text
action=archive_expiring  (限期归档)   # canonical frontend single-item flow
surface=authenticated Add-on frontend
backend=POST /api/entries/:id/complete  {"action":"archive_expiring"}
version_before=3
expected_transition=ACTIVE_PERMANENT → ARCHIVED_EXPIRING
```

One submission only; `Idempotency-Key` set by the frontend form; no manual
request replay; no second lifecycle mutation.

---

## 5. Result (post-action, execution-time evidence)

```text
HTTP=200  (frontend completed; dialog closed; list refreshed)
D1 binding:
  id            d6450b83-a11d-4f45-9272-2197dcc5da60 (same)
  paste_name    DMkerQPTisMNhhp8tdQc5Ech (same)
  visibility    active → archived
  retention_mode permanent → timed
  expires_at    NULL → 2026-12-16T07:18:12.000Z (authoritative from upstream)
  version       3 → 4
  updated_at    2026-09-17T07:18:13.044Z
D1 operation:
  id             70c51e2c-8286-4311-85cd-71c51faa3c56
  kind           complete_expiring
  status         succeeded
  expected_version 3
  created_at     2026-09-17T07:18:12.367Z
  updated_at     2026-09-17T07:18:13.044Z
Paste:
  public GET 200
  body          - [x] FT_LIFECYCLE_20260916_01   ([ ] → [x], managed marker only)
  HAS_LF=NO
  upstream metadata expireAt == D1 expires_at == 2026-12-16T07:18:12.000Z
```

Frontend (authenticated, observed):

```text
进行中 tab: target absent (4 → 3)
归档 tab: target present, checkbox checked/disabled,
          role=status name="限期归档，剩余 89d 23h 55m"
          (computed from authoritative expiresAt; never from MAX_EXPIRATION)
OBSERVED_AT_UTC=2026-09-17T07:22:57.198Z
```

No new binding (bindings total unchanged = 9), no second Paste, no DLQ /
reconciliation / deleted entry.

---

## 6. Mechanical settlement (approved SPEC gates)

```text
FT08_RESULT_1_HTTP=YES
FT08_RESULT_2_ENTRY=YES
FT08_RESULT_3_D1_BINDING=YES
FT08_RESULT_4_D1_OP=YES
FT08_RESULT_5_PASTE_BODY=YES
FT08_RESULT_6_TIMED_EFFECT=YES
FT08_RESULT_7_UI_ACTIVE=YES
FT08_RESULT_8_UI_ARCHIVE=YES
FT08_RESULT_9_VERSION=YES
FT08_RESULT_10_NO_ANOMALY=YES
FT08_ACTION_SINGLE_SUBMISSION=YES
```

Therefore:

```text
FT08_FUNCTIONAL_RESULT=PASS
FT08_COMPLETE=YES
FT08_PHASE_A_PREFLIGHT=PASS
FT08_FIXTURE_VALID=YES
```

No FAIL / INCONCLUSIVE token triggered.

---

## 7. Non-retroactivity (FT-07)

FT-08 PASS does **not** prove FT-07 historical runtime ordering:

```text
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
ORDERING_VERIFIED_BY_STEP_LOGS=NO
```

Existing FT-07 evidence and conclusions remain as archived. `RESTORE_STAGE`
markers (post-deploy) remain future-evidence only; FT-08 executed
`completeEntry` (archive path), not restore.

---

## 8. FT-09 handoff baseline (freeze)

FT-08 PASS leaves the timed-archived fixture as FT-09 input:

```text
FT09_USES_FT08_RESULT=YES
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
visibility=archived
retention_mode=timed
expires_at=2026-12-16T07:18:12.000Z
version=4
body=- [x] FT_LIFECYCLE_20260916_01
task_state=checked
operation=complete_expiring succeeded
FT08_CLEANUP=NONE
FT09_STARTED=NO
```

Do **not** restore / cancel expiry from this evidence. FT-09 is not authorized
by this document.

---

## 9. Production write boundary (this closeout)

```text
PRODUCTION_MUTATION_THIS_ROUND=NO
FT09_STARTED=NO
```

Execution-time production mutation was limited to the single owner-authorized
`archive_expiring` (COUNT=1) described above.
