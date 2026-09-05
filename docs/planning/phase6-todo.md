# Phase 6 — Single completion actions TODO

Status: CONTINUOUS-MODE TODO READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started. Active checklist for [Phase 6](phase6-spec.md).

## 1. Phase 6.0 — browser trust boundary

- [x] Start from refreshed `downstream/main`; record RED evidence first.
- [x] Add OAuth/session coverage: callback/state/error, server-only exchange/user-info, keyed principal, regenerated opaque eight-hour session, secure cookie, logout/revocation, token/session/CSRF redaction.
- [x] Add negative coverage: no session `401`; invalid/expired/revoked session `401`; invalid Origin; missing/invalid CSRF; browser-supplied scope ineffective; guessed entry ID grants no scope.
- [x] Add mapping coverage: authenticated Phase 4 P2P event establishes mapping, no scope is forbidden, multi-scope works, and a scope mismatch is denied.
- [x] Implement only approved OAuth/session/CSRF/Origin/principal-scope boundary and additive D1 metadata/session migration; no Paste body, receipt/idempotency table, destructive migration, or browser credential storage.
- [x] Record GREEN/REFACTOR/REGRESSION; run checks/current-HEAD review gate and merge before 6.1.

## 2. Phase 6.1 — lifecycle completion backend

- [x] Branch from merged 6.0; RED tests for authorization before Phase 3/upstream, request validation, and secret-free output/logs.
- [x] RED tests for permanent/timed/delete, exact `expiresAt`, source precision, Phase 3 claims/replay/conflicts, duplicate idempotency, and reconciliation.
- [x] Implement browser entry ID/action/idempotency/session/CSRF only; join principal allowed scopes to binding/entry and fail closed before mutation.
- [x] Add lifecycle persistence only as tests require; retain binding compatibility, Phase 3/4 behavior, and upstream body authority.
- [ ] Record TDD/regression evidence; current-HEAD gate and merge before 6.2.

## 3. Phase 6.2 — completion UI

- [x] Branch from merged 6.1; RED chooser/cancel/delete-confirm/pending/result/Archive exact-expiry/session-CSRF/a11y/no-secret tests.
- [x] Implement compact chooser/delete confirmation; other Markdown tasks remain content and lifecycle is not optimistic.
- [x] Render Archive from returned state only; do not add Phase 7 restore/timer or Phase 8 Batch Mode.
- [ ] Record TDD/regression evidence and current-HEAD gate before merge.

## Evidence

### TDD

Documentation-only §10.5 update: TDD is N/A. RED/GREEN/REFACTOR/REGRESSION evidence is required above for phases 6.0–6.2.

Phase 6.0: RED coverage was added in `browser-auth.spec.ts` and `webhook.spec.ts`; GREEN is
recorded by Worker TypeScript and lint success. The Worker-pool suite could not start in this
sandbox because it is denied a loopback listener (`listen EPERM 127.0.0.1`); it remains required
in CI before merge. REFACTOR split OAuth/session/store/principal concerns into focused Worker
modules. Regression type/lint cover Phase 3/4 imports; full Worker suite remains CI-required.

Phase 6.1: RED coverage was added for the browser completion adapter and lifecycle service in
`completion.spec.ts` and `service.spec.ts`. GREEN: `tsc -p downstream/addons/feishu/tsconfig.json
--noEmit` passed; `vitest run --config downstream/addons/feishu/vitest.config.js` reported 37
passed. REFACTOR extracted completion adapter helpers into `worker/completion.ts` and additive
migration `0003_lifecycle_completion.sql`. Current-HEAD review gate (CI + Bugbot + CODEX_VERIFIED)
and merge remain required before 6.2.

Phase 6.1 Bugbot cycle 1: regression coverage was added before the fix for a delete reservation
race replay, a pre-reservation upstream `ENTRY_NOT_FOUND`, adapter D1/upstream unavailability, and
timed archived read/reconciliation metadata. The focused Worker Vitest command could not execute
in this sandbox because its pool is denied the required loopback listener (`listen EPERM
127.0.0.1`), so no local RED/GREEN result is claimed for this cycle; it remains CI-required.
Prettier, ESLint on the touched TypeScript files, and `tsc -p
downstream/addons/feishu/tsconfig.json --noEmit` passed. The fix replays a successful delete race
as `204`, preserves `PasteError` codes from the pre-reservation source read, maps D1/upstream
outages to sanitized 5xx responses, and verifies archived timed metadata against the binding's
authoritative `expiresAt` rather than requiring permanence.

Phase 6.2: RED: the frontend suite reported four failures because the Phase 5 managed checkbox
was still inert and had no chooser or completion flow. GREEN:
`node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts`
passed 14 tests, and `node_modules/.bin/tsc -p downstream/addons/feishu/frontend/tsconfig.json
--noEmit` passed. REFACTOR keeps session/CSRF completion handling in `App.tsx`; it submits only
the entry ID, action, and idempotency key, then applies only the Worker allowlisted result.
REGRESSION: existing GFM sanitization, inert Markdown task, theme, fixture, and archive-display
tests remain in that 14-test run. Current-HEAD gate and merge remain required.

## Internal consistency review

This TODO starts 6.0 after this PR merges, requires security negatives before lifecycle work, and preserves merged-phase dependencies. It matches owner decision, Phase 3/4 contracts, and D-030; no STOP exists.
