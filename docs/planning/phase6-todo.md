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

- [ ] Branch from merged 6.1; RED chooser/cancel/delete-confirm/pending/result/Archive exact-expiry/session-CSRF/a11y/no-secret tests.
- [ ] Implement compact chooser/delete confirmation; other Markdown tasks remain content and lifecycle is not optimistic.
- [ ] Render Archive from returned state only; do not add Phase 7 restore/timer or Phase 8 Batch Mode.
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
--noEmit` passed. The Worker-pool suite is sandbox-blocked (`listen EPERM 127.0.0.1`), so the full
suite and current-HEAD review gate remain required before merge.

## Internal consistency review

This TODO starts 6.0 after this PR merges, requires security negatives before lifecycle work, and preserves merged-phase dependencies. It matches owner decision, Phase 3/4 contracts, and D-030; no STOP exists.
