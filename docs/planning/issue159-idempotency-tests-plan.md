# Issue #159 create idempotency test-hardening PLAN

Status: **PLAN READY — internal consistency review PASS**

Issue: [#159](https://github.com/Skyline-Gazer/pastebin-worker/issues/159)

## Context

FT-05 established the durable create-idempotency contract, but its unit suite
does not explicitly prove the changed-content conflict branch and does not
assert terminal outcomes for both callers in a concurrent duplicate race.

## Objective and scope

Add tests only. The tests must prove that a repeated `(scopeId, recordKey,
requestId)` with different content returns `REQUEST_CONFLICT` without a second
upstream POST, and that concurrent identical creates produce terminal results
without a second POST. No runtime behavior, schema, deployment, production
data, or provider state is in scope.

## Acceptance criteria

- Changed-content replay returns `REQUEST_CONFLICT` and exactly one POST total.
- Concurrent duplicate creates assert both returned results and exactly one
  POST, matching the existing duplicate/race contract.
- Existing service, typecheck, and relevant regression tests remain green.
- TDD RED/GREEN/REFACTOR/REGRESSION evidence is recorded in the TODO and PR.

## Constraints and stop conditions

- Use the existing Vitest/Cloudflare test harness and fixtures.
- If a test exposes a runtime defect, stop implementation and mark the item
  blocked for a new approved behavior change; do not alter production code in
  this test-hardening item.
- No production mutation or secret-bearing evidence.

## Validation plan

Run the focused service test, then the full messaging test suite and the
repository-required checks applicable to this downstream-only test change.

```text
PROJECT_ITEM=159
PROJECT_PHASE=TEST-HARDENING
PROJECT_WORK_TYPE=Test Hardening
PROJECT_PRIORITY=P1
OWNER_GATE_REQUIRED=NO
PRODUCTION_MUTATION=NO
```
