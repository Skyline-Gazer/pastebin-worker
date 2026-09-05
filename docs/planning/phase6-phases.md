# Phase 6 — Single completion actions PHASE decomposition

Status: CONTINUOUS-MODE PHASE READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started. This follows the owner-approved trust decision and [Phase 6 SPEC](phase6-spec.md).

## Phase 6.0 — Browser trust-boundary implementation

- **Goal:** implement approved Feishu OAuth authorization-code, opaque Add-on session, CSRF/Origin, and server-side principal-to-scope boundary.
- **Scope:** OAuth callback state validation, server code exchange/identity lookup, keyed principal, regenerated eight-hour server session, secure cookie, logout/revocation invalidation, exact Origin plus session-bound CSRF, additive principal-scope/session persistence, and authenticated Phase 4 P2P event mapping.
- **Constraints:** no browser Feishu token/identity/scope authority, global/default scope, second Paste body/receipt table, destructive migration, or Phase 3/4 semantic change.
- **Tests (RED first):** all SPEC §3.10 negatives; callback/state/error, session-cookie, trusted-event mapping, multi-scope/absence, secret/log redaction, Phase 3/4 regressions.
- **Exit:** TDD evidence and current-HEAD checks/review gate pass; merge before 6.1.

## Phase 6.1 — Scoped lifecycle completion service and adapter

- **Goal:** add narrow authenticated completion and lifecycle transitions using 6.0 authorization.
- **Scope:** additive state/operation extensions, principal-to-allowed-scopes join before Phase 3/upstream activity, deterministic source update, retention metadata/delete ordering, Worker adapter.
- **Constraints:** browser supplies only entry ID/action/idempotency/session/CSRF—not scope, Feishu token, Paste secret/body/URL, or deadline. No UI/restore/timer/Batch Mode.
- **Tests (RED first):** authorization regressions; permanent/timed/delete, exact `expiresAt`, source precision, claims/replay/conflicts/reconciliation, adapter validation, additive migration, secret-free output/logs.
- **Exit:** lifecycle acceptance, TDD evidence, current-HEAD gate; merge before 6.2.

## Phase 6.2 — Completion chooser and Archive presentation

- **Goal:** replace Phase 5 no-op with accessible single-item UI.
- **Scope:** chooser, delete confirmation, pending state, session/CSRF request wiring, returned-result Active/Archive updates; no restore/countdown/Batch Mode.
- **Dependencies:** merged 6.1 and refreshed `downstream/main`.
- **Tests (RED first):** chooser/cancel/delete-confirm/pending/result-only/Archive exact-expiry/session-CSRF/a11y/no-secret regressions.
- **Exit:** TDD evidence and current-HEAD gate before merge.

## Internal consistency review

The sequence implements trust before completion and backend before UI, retains lifecycle semantics, Phase 3 idempotency, Phase 4 compatibility, Add-on ownership, additive-only migration, and D-030/CHANGE_CONTEXT §10.5. No STOP exists; code has not started.
