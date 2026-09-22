# FT-10 TODO — Archive Markdown/GFM rendering execution runbook

Status: **TODO READY** — no production execution authorized (`FT10_AUTHORIZED=NO` / `FT10_STARTED=NO`)

Parent PLAN/SPEC: [ft-10-plan.md](ft-10-plan.md), [ft-10-spec.md](ft-10-spec.md)

```text
OWNER_AUTHORIZATION_REQUIRED_BEFORE_PHASE_0=YES   # fixture provisioning
OWNER_AUTHORIZATION_REQUIRED_BEFORE_PHASE_D=YES   # archive submission
FT10_AUTHORIZED=NO
FT10_STARTED=NO
FT10_FUNCTIONAL_RESULT=NOT_RUN
FT10_FIXTURE_PROVISIONING_REQUIRED=YES
FT10_FIXTURE_PROVISIONING_AUTHORIZED=NO
FT10_FIXTURE_P2P_SENT=NO
FT10_FIXTURE_CREATED=NO
FT10_FIXTURE_CREATE_SUBMITTED=NO
FT10_FIXTURE_PROVISIONING_RESULT=NOT_RUN
FT10_ARCHIVE_ACTION_SUBMITTED=NO
FT10_ARCHIVE_SUBMISSION_COUNT=0
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
```

## Phase 0 — dedicated fixture provisioning (future separate owner authorization)

- [ ] STOP — present frozen fixture contract (SPEC §3) + canonical provisioning surface (SPEC §3.1) to owner; obtain a **separate explicit owner authorization** to create the FT-10 fixture.
- [ ] **Pre-send guard (read-only):** confirm `FT10_FIXTURE_MARKER=FT_MARKDOWN_RENDER_20260918_01` has no existing live binding/Paste, no existing succeeded create, no ambiguous pending/reconciliation create state; Feishu ingress/create path available. Do NOT mutate during the guard.
- [ ] Owner sends **exactly one real Feishu P2P plain-text message** carrying the frozen multiline fixture (surface `FEISHU_P2P_PLAIN_TEXT`; provider=FEISHU; native Code Block / synthetic webhook / direct API create disallowed) → `FT10_FIXTURE_P2P_SENT=YES`.
- [ ] Ingress creates the entry → `FT10_FIXTURE_CREATE_SUBMITTED=YES`.
- [ ] **Phase 0 acceptance (read-only):** exactly one new Active entry, one new Paste, one succeeded create op; binding active/permanent, managed task unchecked; Paste body exactly equals frozen 87-byte active body (HAS_CR=NO, HAS_FINAL_LF=NO); no duplicate Paste; no reconciliation_required; no unexpected pending create. Record `FT10_FIXTURE_BINDING_ID` / `FT10_FIXTURE_PASTE_NAME` / `FT10_FIXTURE_CREATE_OP_ID` (no secrets).
- [ ] Success → `FT10_FIXTURE_CREATED=YES`, `FT10_FIXTURE_PROVISIONING_RESULT=PASS`. Do NOT set `FT10_STARTED=YES`.
- [ ] **No-retry:** `FT10_FIXTURE_PROVISIONING_SEND_COUNT_MAX=1`, `FT10_FIXTURE_PROVISIONING_NO_AUTOMATIC_RETRY=YES`. If outcome ambiguous, do not resend; settle PASS/FAIL/INCONCLUSIVE read-only.
- [ ] **Mismatch FAIL:** if provider bytes ≠ frozen 87-byte contract (terminal LF / CRLF / prefix/suffix / transformation) → `FT10_FIXTURE_PROVISIONING_RESULT=FAIL`, `FT10_FIXTURE_CREATED=NO`, `FT10_STARTED=NO`, `FT10_ARCHIVE_ACTION_SUBMITTED=NO`; STOP. Do NOT trim/normalize, edit D1, resend, create a second fixture, archive or auto-clean; retry/cleanup requires a new explicit owner decision.
- [ ] STOP and perform a fresh read-only Phase A against the created fixture.

## Phase A — read-only preflight (no creation/repair)

- [ ] Confirm `downstream/main` planning source and Issue #174 tracker baseline.
- [ ] Resolve live production `WORKER_PIN` read-only.
- [ ] Verify deployed frontend matches the audited GFM contract (`RenderedMarkdown` GFM + sanitize + `disabled` on non-interactive; `TextEntryCard` archived → `interactive=false`).
- [ ] **Identify** the dedicated FT-10 fixture (already created in Phase 0); read Paste bytes + D1 identity. Must NOT create or repair anything.
- [ ] Verify fixture body exact bytes; no pending/uncertain op; session/auth valid.
- [ ] Record `FT10_FIXTURE_VALID=YES/NO`; if NO → STOP.

## Phase B — deployment / capability gate (if required)

- [ ] If live production lacks the audited GFM frontend contract, **STOP** — separate owner-authorized deployment gate required. Do not deploy.

If any deployment occurs: re-enter Phase A; re-resolve Worker pin; form fresh Pre-ARM snapshot; only fresh PASS may proceed.

## Phase C — owner execution authorization checkpoint

- [ ] STOP — present PLAN/SPEC/TODO to owner; obtain fresh explicit owner authorization covering only Phase D single action.
- [ ] Pre-ARM snapshot recorded per SPEC §7.

## Phase D — single production action

- [ ] **Final drift check immediately before submit** (Phase-D archive-execution preconditions `FT10_PRECONDITION_1..7`, evaluated only AFTER successful Phase 0 provisioning + fresh read-only Phase A): Worker pin unchanged; fixture still active with exact bytes; no pending op; session valid. Any false gate → `FT10_EXECUTION_STATUS=BLOCKED_PRECONDITION`, `FT10_FUNCTIONAL_RESULT=NOT_RUN`, `FT10_ARCHIVE_ACTION_SUBMITTED=NO`, STOP.
- [ ] Canonical permanent-archive UI path (not single-click):
  1. click the active managed Markdown checkbox → completion chooser opens (`archive_permanent` already selected);
  2. click `确认归档` exactly once;
  3. exactly one lifecycle HTTP submission `POST /api/entries/<id>/complete {"action":"archive_permanent"}`.
     → `FT10_ARCHIVE_ACTION_SUBMITTED=YES`, `FT10_ARCHIVE_SUBMISSION_COUNT=1`, `FT10_ACTION_SINGLE_SUBMISSION=YES`. No direct API secondary submit; no duplicate confirm; no replay; no retry after terminal success.

## Phase E — immediate evidence collection (read-only)

- [ ] (A) Immediately after confirmed archive success: GET Paste; record `POST_ARCHIVE_SOURCE_BYTES`; expect exact archived fixture bytes (`- [x] FT_MARKDOWN_RENDER_20260918_01` + bold + inline code).
- [ ] HTTP status + entry JSON.
- [ ] D1 after-archive snapshot: binding `archived` + op (`complete_permanent` succeeded) + no-anomaly (record snapshot R1).
- [ ] **Archive view DOM/semantic evidence** (canonical authenticated frontend):
  - target article present; `checkbox(name="Markdown task")` present; **checked=true**; **disabled=true**;
  - literal `- [x]` marker NOT rendered as source text;
  - `<strong>bold-render-check</strong>` present;
  - `<code>inline-code-render-check</code>` present;
  - `role=status` `text=永久归档` present and separate (no countdown required for permanent);
  - `OBSERVED_AT_UTC`.
- [ ] (C) After Archive inspection: GET Paste again; record `POST_VIEW_SOURCE_BYTES`.
- [ ] (D) Compare `POST_VIEW_SOURCE_BYTES == POST_ARCHIVE_SOURCE_BYTES` (`FT10_RESULT_9`).
- [ ] D1 after-view snapshot: compare with after-archive snapshot; no new lifecycle op created by rendering/viewing (`FT10_RESULT_10`).
- [ ] **No-click proof: do not click the archived checkbox**; rely on DOM `disabled=true` semantic evidence.
- [ ] Correlation: one request identity → one op → one HTTP 200.

## Phase F — mechanical settlement

- [ ] Evaluate `FT10_PRECONDITION_1..7`, `FT10_ACTION_SINGLE_SUBMISSION`, `FT10_RESULT_1..10`.
- [ ] Record `FT10_FUNCTIONAL_RESULT=PASS/FAIL/INCONCLUSIVE` (or `BLOCKED_PRECONDITION`/`NOT_RUN`) in a durable evidence doc.
- [ ] Preserve `FT07_ORDERING_EVIDENCE=INCONCLUSIVE`, `ORDERING_VERIFIED_BY_STEP_LOGS=NO`, `FT08_FUNCTIONAL_RESULT=PASS`, `FT09_FUNCTIONAL_RESULT=PASS`.

## Phase G — durable evidence / next handoff

- [ ] Write `docs/planning/evidence/ft-10-*.md` with identity/preconditions/action/result/gates/DOM evidence.
- [ ] If `FT10_IMPLEMENTATION_REQUIRED=YES`: record the gap, STOP, and await separate owner authorization before any code change.
- [ ] Report; STOP. No auto-start of any next FT.

## Retry policy

- No automatic retry.
- If retry-safety is uncertain after a stop condition or failure **do not blind-retry**; record and stop.
- Only a fresh explicit owner authorization may permit a repeat action.

## Persistent invariants

```text
NO deploy triggered by this TODO
NO production mutation except:
  1. separately owner-authorized FT-10 fixture provisioning (Phase 0); and
  2. separately owner-authorized Phase D archive submission.
NO other production mutation.
NO FT-07/FT-08/FT-09 replay or fixture reuse
NO click of the archived Markdown checkbox in production
FT10_FIXTURE_PROVISIONING_AUTHORIZED=NO
FT10_FIXTURE_P2P_SENT=NO
FT10_FIXTURE_CREATED=NO
FT10_FIXTURE_CREATE_SUBMITTED=NO
FT10_FIXTURE_PROVISIONING_RESULT=NOT_RUN
FT10_ARCHIVE_ACTION_SUBMITTED=NO
FT10_ARCHIVE_SUBMISSION_COUNT=0
FT10_AUTHORIZED=NO
FT10_STARTED=NO
FT10_FUNCTIONAL_RESULT=NOT_RUN
PRODUCTION_MUTATION_THIS_ROUND=NO
```

## Phase F/G settlement (2026-09-22)

The checklist's execution-not-authorized values above are the historical
planning baseline. Owner-authorized execution completed with the following
durable result; details are in
[`evidence/ft-10-archive-markdown-pass.md`](evidence/ft-10-archive-markdown-pass.md).

```text
FT10_FINAL_DRIFT_CHECK=PASS
FT10_PRECONDITION_1_PLAN_APPROVED=YES
FT10_PRECONDITION_2_FIXTURE_ACTIVE_STATE=PASS
FT10_PRECONDITION_3_FIXTURE_BODY_BYTES=PASS
FT10_PRECONDITION_4_AUTH=PASS
FT10_PRECONDITION_5_DEPLOY_COMPAT=PASS
FT10_PRECONDITION_6_NO_PENDING_OP=PASS
FT10_PRECONDITION_7_OWNER=YES
FT10_ACTION_SINGLE_SUBMISSION=YES
FT10_ARCHIVE_SUBMISSION_COUNT=1
FT10_FUNCTIONAL_RESULT=PASS
FT10_COMPLETE=YES
FT10_IMPLEMENTATION_REQUIRED=NO
NO_RETRY=YES
```
