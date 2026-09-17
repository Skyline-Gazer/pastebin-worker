# PLAN — Restore ordering telemetry (observability debt)

Status: **PLAN READY FOR OWNER REVIEW** (owner request supplied the design contract in-session)

```text
SCOPE=observability_debt_only
FT07_HISTORICAL_ORDERING=INCONCLUSIVE (unchanged)
ORDERING_VERIFIED_BY_STEP_LOGS=NO (FT-07 unchanged)
FT08_STARTED=NO
PRODUCTION_MUTATION=NO
DEPLOY=NOT_IN_THIS_CHANGE
```

## Context

FT-07 functional restore PASS is recorded, but `ORDERING_VERIFIED_BY_STEP_LOGS=NO` /
`FT07_ORDERING_EVIDENCE=INCONCLUSIVE` because the permanent restore path emitted no
per-step stage markers. Create-path already has `PASTE_CREATE_STAGE`; restore had none.

This PLAN covers **future** restore executions only. It does **not** replay FT-07,
mutate production, deploy, or start FT-08. New markers have **no retroactive
evidentiary value** for the historical FT-07 run.

## Goal

Add same-invocation `RESTORE_STAGE` console markers on `EntryService.restoreEntry`
so a later FT ordering gate can mechanically prove SPEC order from Workers Logs:

`reserve → dispatch → upstream update → finish` under one `request_id` / `op_id`,
with monotonic `seq`.

## Non-goals

- FT-07 re-execution or changing #162 historical conclusion to VERIFIED
- FT-08 start
- Production restore / D1 / KV / Queue / Paste mutation
- Deploy
- New tracing framework / OpenTelemetry SDK
- Durable D1 stage-row sink
- Changing restore business order, compensation, or API contracts

## Approach

Reuse `PASTE_CREATE_STAGE` / `PASTEBIN_SERVICE_STAGE` style: `console.log` lines with
allowlisted fields only. Emit from `restoreEntry` (covers permanent and timed).
`store.dispatch` is synchronous in-process — same Worker invocation; correlation is
`request_id` + `op_id` + monotonic `seq`.

## Acceptance criteria

- Critical stages emit with shared correlation and increasing `seq`
- `reservation_completed.seq < upstream_update_started.seq`
- Failure paths emit `*_failed` and do not emit later `*_completed`
- No credential, paste body, token, secret, or full sensitive identifier in payloads
- Unit tests cover success order, reserve-before-update, correlation, failure, redaction
- Docs state FT-07 remains INCONCLUSIVE; markers are post-deploy only

## Validation

- `pnpm` / messaging Vitest for restore telemetry + service restore tests
- No production calls

## Docs

- This PLAN + SPEC
- `MESSAGING_ADDON.md` stage list
- `docs/INDEX.md` links
- Note on `ft-07-restore-pass.md` that future telemetry is non-retroactive

## Refs

- Issue #162 (historical INCONCLUSIVE ordering; do not flip to VERIFIED)
- FT-07 SPEC §9 ordering
- Owner observability-debt request (this change)

Status: PLAN READY FOR OWNER REVIEW
