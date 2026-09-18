# FT-10 TODO — Archive Markdown/GFM rendering execution runbook

Status: **TODO DRAFT** (planning only; `FT10_AUTHORIZED=NO` / `FT10_STARTED=NO`)

Parent PLAN/SPEC: [ft-10-plan.md](ft-10-plan.md), [ft-10-spec.md](ft-10-spec.md)

```text
OWNER_AUTHORIZATION_REQUIRED_BEFORE_PHASE_D=YES
FT10_AUTHORIZED=NO
FT10_STARTED=NO
FT10_ACTION_SUBMITTED=NO
FT10_FUNCTIONAL_RESULT=NOT_RUN
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
```

## Phase A — read-only preflight

- [ ] Confirm `downstream/main` planning source and Issue #174 tracker baseline.
- [ ] Resolve live production `WORKER_PIN` read-only.
- [ ] Verify deployed frontend matches the audited GFM contract (`RenderedMarkdown` GFM + sanitize + `disabled` on non-interactive; `TextEntryCard` archived → `interactive=false`).
- [ ] Create/identify the **dedicated FT-10 active fixture** (deterministic content; `- [ ] FT_MARKDOWN_RENDER_<unique-id>` + bold + inline code). Record source bytes + D1 identity.
- [ ] Verify fixture body exact bytes; no pending/uncertain op; session/auth valid.
- [ ] Record `FT10_FIXTURE_VALID=YES/NO`; if NO → STOP.

## Phase B — deployment / capability gate (if required)

- [ ] If live production lacks the audited GFM frontend contract, **STOP** — separate owner-authorized deployment gate required. Do not deploy.

If any deployment occurs: re-enter Phase A; re-resolve Worker pin; form fresh Pre-ARM snapshot; only fresh PASS may proceed.

## Phase C — owner execution authorization checkpoint

- [ ] STOP — present PLAN/SPEC/TODO to owner; obtain fresh explicit owner authorization covering only Phase D single action.
- [ ] Pre-ARM snapshot recorded per SPEC §7.

## Phase D — single production action

- [ ] **Final drift check immediately before submit:** Worker pin unchanged; fixture still active with exact bytes; no pending op; session valid.
- [ ] Exactly one canonical archive action (`永久归档` chooser → `确认归档`) → `FT10_ACTION_SUBMITTED=YES`, `FT10_CANONICAL_CLICK_COUNT=1`, `FT10_ACTION_SINGLE_SUBMISSION=YES`. No double-click / replay / direct API secondary submit / retry after terminal success.

## Phase E — immediate evidence collection (read-only)

- [ ] HTTP status + entry JSON.
- [ ] D1 after: binding `archived` + op (`complete_permanent` succeeded) + no-anomaly.
- [ ] Upstream Paste: public GET body = `- [x] FT_MARKDOWN_RENDER_<unique-id>` + bold + inline code (unchanged except managed task marker); metadata.
- [ ] **Archive view DOM/semantic evidence** (canonical authenticated frontend):
  - target article present; `checkbox(name="Markdown task")` present; **checked=true**; **disabled=true**;
  - literal `- [x]` marker NOT rendered as source text;
  - `<strong>bold-render-check</strong>` present;
  - `<code>inline-code-render-check</code>` present;
  - ArchiveStatus/countdown present and separate;
  - `OBSERVED_AT_UTC`.
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
NO production mutation before Phase D without owner authorization
NO FT-07/FT-08/FT-09 replay or fixture reuse
NO click of the archived Markdown checkbox in production
FT10_AUTHORIZED=NO
FT10_STARTED=NO
FT10_ACTION_SUBMITTED=NO
FT10_FUNCTIONAL_RESULT=NOT_RUN
PRODUCTION_MUTATION_THIS_ROUND=NO
```
