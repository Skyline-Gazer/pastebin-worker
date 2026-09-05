# Phase 6 — Single completion actions TODO

Status: CONTINUOUS-MODE TODO READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started. Active checklist for [Phase 6](phase6-spec.md).

## 1. Phase 6.0 — browser trust boundary

- [ ] Start from refreshed `downstream/main`; record RED evidence first.
- [ ] Add failing OAuth/session tests: callback/state/error, server-only exchange/user-info, keyed principal, regenerated opaque eight-hour session, secure cookie, logout/revocation, token/session/CSRF redaction.
- [ ] Add failing negatives: no session `401`; invalid/expired/revoked session `401`; invalid Origin; missing/invalid CSRF; browser-supplied scope ineffective; guessed entry ID grants no scope.
- [ ] Add mapping tests: authenticated Phase 4 P2P event alone establishes/updates mapping; no scope forbidden; one principal multiple scopes; A cannot mutate B; Phase 3/4 remain compatible.
- [ ] Implement only approved OAuth/session/CSRF/Origin/principal-scope boundary and additive D1 metadata/session migration; no Paste body, receipt/idempotency table, destructive migration, or browser credential storage.
- [ ] Record GREEN/REFACTOR/REGRESSION; run checks/current-HEAD review gate and merge before 6.1.

## 2. Phase 6.1 — lifecycle completion backend

- [ ] Branch from merged 6.0; RED tests for authorization before Phase 3/upstream, request validation, and secret-free output/logs.
- [ ] RED tests for permanent/timed/delete, exact `expiresAt`, source precision, Phase 3 claims/replay/conflicts, duplicate idempotency, and reconciliation.
- [ ] Implement browser entry ID/action/idempotency/session/CSRF only; join principal allowed scopes to binding/entry and fail closed before mutation.
- [ ] Add lifecycle persistence only as tests require; retain binding compatibility, Phase 3/4 behavior, and upstream body authority.
- [ ] Record TDD/regression evidence; current-HEAD gate and merge before 6.2.

## 3. Phase 6.2 — completion UI

- [ ] Branch from merged 6.1; RED chooser/cancel/delete-confirm/pending/result/Archive exact-expiry/session-CSRF/a11y/no-secret tests.
- [ ] Implement compact chooser/delete confirmation; other Markdown tasks remain content and lifecycle is not optimistic.
- [ ] Render Archive from returned state only; do not add Phase 7 restore/timer or Phase 8 Batch Mode.
- [ ] Record TDD/regression evidence and current-HEAD gate before merge.

## Evidence

### TDD

Documentation-only §10.5 update: TDD is N/A. RED/GREEN/REFACTOR/REGRESSION evidence is required above for phases 6.0–6.2.

## Internal consistency review

This TODO starts 6.0 after this PR merges, requires security negatives before lifecycle work, and preserves merged-phase dependencies. It matches owner decision, Phase 3/4 contracts, and D-030; no STOP exists.
