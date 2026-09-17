# FT-08 SPEC — Timed archive + countdown

Status: **SPEC DRAFT FOR OWNER REVIEW** (docs-only; execution requires a separate owner authorization)

Parent PLAN: [ft-08-plan.md](ft-08-plan.md)

```text
FT08_TEST_OBJECTIVE=timed_archive_and_countdown
FT08_USES_FT07_RESULT=YES
FT07_ORDERING_EVIDENCE=INCONCLUSIVE (unchanged)
ORDERING_VERIFIED_BY_STEP_LOGS=NO (unchanged)
FT08_STARTED=NO
RETROACTIVE_EVIDENCE=NO
```

## 1. Scope

Verify the `archive_expiring` completion path and countdown of the FT-07 Active
fixture. This SPEC freezes mechanical PASS/FAIL/INCONCLUSIVE gates. It does **not**
authorize execution, deploy, restore, FT-09, or FT-08 replay.

## 2. Canonical contract

```text
ACTIVE_PERMANENT --archive_expiring--> ARCHIVED_EXPIRING
task: [ ] -> [x] (managed marker only)
Paste: e=never -> e=max (enum:max = deployment MAX_EXPIRATION)
expiresAt: authoritative from upstream update response expireAt (ISO, finite Date.parse)
persist: visibility=archived retention_mode=timed expires_at=<ISO> version+1 (3→4)
countdown: display-only from expiresAt; never from MAX_EXPIRATION/browser storage/duration
```

## 3. Precondition gates

```text
FT08_PRECONDITION_1_FT07_PASS=YES           # FT07_FUNCTIONAL_RESULT=PASS, handoff baseline §7
FT08_PRECONDITION_2_FIXTURE_ACTIVE=YES      # visibility=active, retention=permanent, expires_at=NULL, version=3
FT08_PRECONDITION_3_FIXTURE_BODY=YES        # body `- [ ] FT_LIFECYCLE_20260916_01`, task_state unchecked, no LF
FT08_PRECONDITION_4_AUTH=YES                # session + CSRF + Origin + scope join (canonical single-item surface)
FT08_PRECONDITION_5_DEPLOY_PIN=YES          # deployed Worker == pinned downstream/main behavior (record version pin in Pre-ARM)
FT08_PRECONDITION_6_NO_PENDING_OP=YES       # no pending/uncertain op on target fixture
FT08_PRECONDITION_7_OWNER=YES               # explicit fresh owner authorization before Phase C
FT08_PRECONDITION_8_FIRST_ACTION=YES        # exactly one action submission; no retries after success
```

`ORDERING_VERIFIED_BY_STEP_LOGS=NO` is a **known FT07 evidence gap only**; it is NOT an
FT-08 precondition and there is no exception gate tied to it.

## 4. Action gate

```text
FT08_ACTION_1_ENDPOINT=POST /api/entries/<id>/complete
FT08_ACTION_2_BODY={"action":"archive_expiring"}
FT08_ACTION_3_AUTH=session+CSRF+Origin
FT08_ACTION_4_SINGLE=exactly one submission (idempotency key collapses retries)
FT08_ACTION_5_INPUT_ONLY=no other browser-controlled fields
```

## 5. Result gates (measured after one action)

```text
FT08_RESULT_1_HTTP=200 and body entry JSON
FT08_RESULT_2_ENTRY={visibility:archived, retentionMode:timed, expiresAt:<ISO>, version:4}
FT08_RESULT_3_D1_BINDING=visibility=archived, retention_mode=timed, expires_at=<ISO>, version=4, same id/paste_name
FT08_RESULT_4_D1_OP={kind:complete_expiring, status:succeeded, expected_version:3, created_at<=updated_at}
FT08_RESULT_5_PASTE_BODY=`- [x] FT_LIFECYCLE_20260916_01` (single managed marker toggled; no other byte change; HAS_LF=NO)
FT08_RESULT_6_PASTE_RETENTION=e=max; metadata expireAt == D1 expires_at (ISO)
FT08_RESULT_7_UI_ACTIVE=target row absent from 进行中
FT08_RESULT_8_UI_ARCHIVE=target row present in 归档 with `限期归档：剩余 N…` (role=status aria-label 限期归档，剩余 …)
FT08_RESULT_9_VERSION=3→4
FT08_RESULT_10_NO_ANOMALY=no DLQ row, no reconciliation_required, no new binding, no unexpected live list change
```

## 6. PASS gate

```text
FT08_PASS_GATE = all FT08_PRECONDITION_* hold AND all FT08_RESULT_* hold
```

Each condition:

```text
requirement → evidence source → expected value
```

| Requirement | Evidence source | Expected |
| --- | --- | --- |
| preconditions 1–8 | PLAN §3 + Pre-ARM record | YES each |
| HTTP 200 entry | request/response capture incl. time | 200 + entry JSON |
| entry archived/timed/ISO/v4 | HTTP body + D1 | exact match |
| D1 binding row | SELECT feishu_bindings by id | archived/timed/ISO/4 |
| D1 op row | SELECT feishu_operations by request_id | complete_expiring/succeeded/3 |
| Paste body | public GET 200 text | `- [x] FT_LIFECYCLE_20260916_01`, no LF |
| Paste retention | metadata GET expireAt | ISO == D1 expires_at |
| UI active/archive | frontend observation + screenshot/aria | row move + countdown label |
| version delta | binding before/after | +1 (3→4) |
| no anomaly | D1 / queue / DLQ counts | zero delta for listed anomalies |

## 7. FAIL conditions

```text
FT08_FAIL_ANY_PRECONDITION      # any precondition false → STOP before Phase C (no action submitted)
FT08_FAIL_HTTP                  # non-200 / non-entry body
FT08_FAIL_BINDING_MISMATCH      # any D1 binding field off
FT08_FAIL_OP_MISMATCH           # op kind/status/version off; unexpected reconciliation_required
FT08_FAIL_PASTE_BODY            # body differs (incl. LF introduced / other bytes changed)
FT08_FAIL_RETENTION             # upstream not e=max / expireAt invalid or absent
FT08_FAIL_UI                    # row not moved / countdown missing or from MAX_EXPIRATION
FT08_FAIL_VERSION               # version not 3→4
FT08_FAIL_ANOMALY               # DLQ/reconciliation/new binding/unexpected mutation
FT08_FAIL_STOPPED               # any stop condition triggered → record, no retry
```

## 8. INCONCLUSIVE conditions

```text
FT08_INCONCLUSIVE_EVIDENCE_GAP   # required evidence (request time, before/after, D1 rows, upstream, UI time)
FT08_INCONCLUSIVE_CORRELATION    # cannot tie one key/op/HTTP to one execution (e.g. multiple ops raced)
FT08_INCONCLUSIVE_TIMING         # countdown observed without observation timestamp, or ambiguity expiry-boundary (before/after)
FT08_INCONCLUSIVE_FRONTEND       # frontend unobservable at execution (backend-only result cannot alone satisfy UI gates)
```

## 9. Timing / countdown requirements

- authoritative: `expiresAt` (ISO ms, UTC) from upstream `e=max` response; stored as `feishu_bindings.expires_at`.
- display: `remaining = expiresAt - now`; refresh ≤ 60 s; `剩余 Nd Nh Nm`; if `remaining <= 0` at observation → `限期归档：等待确认过期状态` (expired/stale), never negative countdown.
- CLOCK: server time vs client time not conflated — the deadline is server/upstream authoritative; the browser only subtracts its own clock for display (tolerance: human-visible coarse label; no acceptance on ms equality).
- boundary: if `expiresAt - now <= 60 s` at observation, mark `AMBIGUOUS_TIMING` unless a second observation confirms stable presentation (do not infer ordering from a single tick).
- observation timing: record `OBSERVED_AT_UTC` with each UI/log check.

Observation phase window: the countdown is a long-duration display (days until MAX_EXPIRATION on a new expiry); `expired/stale` is triggered only if the fixture reaches the deadline, which is not expected within FT-08. If the expiration boundary is required for FT-09, that is future scope and requires a separate plan.

## 10. Evidence requirements

See PLAN §7. Minimum mandatory set:

```text
FT08_EVIDENCE_PRE_ARM=full before snapshot (bindings + ops + DLQ + target row)
FT08_EVIDENCE_REQUEST_TIME=UTC ISO of submission
FT08_EVIDENCE_HTTP=status + body
FT08_EVIDENCE_D1_AFTER=binding + op rows
FT08_EVIDENCE_PASTE_AFTER=public GET body + metadata expireAt
FT08_EVIDENCE_UI=Active absence + Archive countdown presence with aria-label + OBSERVED_AT_UTC (+ screenshot where possible)
FT08_EVIDENCE_CORRELATION=request_id/op_id prefix + created/updated columns
FT08_EVIDENCE_NO_ANOMALY=DLQ/reconciliation counts
```

## 11. Evidence gap policy (non-retroactive)

- Missing evidence → `FT08_INCONCLUSIVE_*`; do NOT re-execute to fill unless a fresh owner
  authorization explicitly permits a repeat action (STOP first).
- FT-08 success does NOT retroactively verify FT-07 ordering. `RESTORE_STAGE` markers (post-deploy)
  are future-only evidence.

## 12. Not-in-scope

FT-09 timed restore / expiry cancellation restore, FT-10 rendering of the timed archive,
FT-11 delete, Batch Mode, permanent archive, restore, any replay of FT-07, deploy, telemetry
deploy, and adding new production behavior.

```text
Status: SPEC DRAFT
FT08_STARTED=NO
PRODUCTION_MUTATION_THIS_ROUND=NO
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
```