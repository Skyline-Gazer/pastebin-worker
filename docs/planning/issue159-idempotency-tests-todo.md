# Issue #159 create idempotency test-hardening TODO

Status: **TODO READY — internal consistency review PASS**

Parent PLAN: [`issue159-idempotency-tests-plan.md`](issue159-idempotency-tests-plan.md)

Parent SPEC: [`issue159-idempotency-tests-spec.md`](issue159-idempotency-tests-spec.md)

Phase: [`issue159-idempotency-tests-phases.md`](issue159-idempotency-tests-phases.md) (`TEST-159.1`)

## Preparation

- [x] Read Issue #159 and FT-05 service/test contracts.
- [x] Confirm clean isolated worktree from current `downstream/main`.
- [x] Confirm scope is tests only and production mutation is forbidden.

## TDD / implementation

- [x] Add same-request/different-content `REQUEST_CONFLICT` coverage.
- [x] Strengthen concurrent duplicate race terminal-result assertions.
- [x] RED: baseline command was attempted:
      `pnpm exec vitest run downstream/addons/messaging/tests/service.spec.ts
--config downstream/addons/messaging/vitest.config.js`; Vitest did not
      start because pnpm attempted dependency installation and registry access
      returned `EBADF`. No RED failure is claimed; this is assertion-only
      hardening against an already implemented contract.
- [x] GREEN: `./node_modules/.bin/vitest run
downstream/addons/messaging/tests/service.spec.ts --config
downstream/addons/messaging/vitest.config.js` — 34/34 passed.
- [x] REFACTOR: kept the existing setup/fixtures and reran the focused suite;
      34/34 passed.
- [x] REGRESSION: `./node_modules/.bin/vitest run --config
downstream/addons/messaging/vitest.config.js` — 22 files / 170 tests
      passed.
- [x] TypeScript check attempted with `./node_modules/.bin/tsc --noEmit -p
downstream/addons/messaging/tsconfig.json`; it is blocked by the
      pre-existing missing generated `dist/frontend/.vite/ssr-manifest.json`
      imports in `worker/pages` (no test-change diagnostic).

## Delivery

- [ ] Commit with full review context and docs impact.
- [ ] Push branch and open PR against `downstream/main`.
- [ ] Complete exact-head CI and normal AI reviewer settlement/quorum.
- [ ] Merge only with zero unresolved actionable findings.
- [ ] Read back `downstream/main`, close Issue #159, and set its Project item
      Done after acceptance.

## Stop conditions

Stop and mark the Project item Blocked if the tests reveal a runtime defect,
require behavior/API/security changes, or exact-head CI/reviewer gates cannot
be satisfied. Do not self-override a new owner gate.

```text
TDD=REQUIRED
OWNER_GATE_REQUIRED=NO
PRODUCTION_MUTATION=NO
```
