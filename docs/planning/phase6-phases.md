# Phase 6 — Single completion actions PHASE decomposition

Status: CONTINUOUS-MODE STOP — implementation blocked pending owner-approved browser authorization / scope resolution

This durable decomposition follows [Phase 6 SPEC](phase6-spec.md) and CHANGE_CONTEXT §10.4. The Phase 4 webhook is not a browser authorization adapter. No implementation phase may start until the owner resolves SPEC §3.13 and the artifacts are updated through §10.5.

## Phase 6.0 — Trust-boundary resolution (planning only)

- **Goal:** obtain owner-approved browser authentication, principal, and server-side scope-resolution contract.
- **Scope:** record the decision and revise/review affected SPEC/PHASE/TODO; no auth/product code.
- **Dependencies / inputs:** owner decision; Phase 6 SPEC §3.8/§3.13; Phase 3 trusted-context restriction; Phase 4 webhook boundary.
- **Deliverables:** durable approved trust contract and unblocked revised plan.
- **Acceptance criteria:** exactly one approved browser boundary resolves the caller to allowed scope server-side; browser scope/global/default paths are rejected; security tests are specified.
- **Tests required:** N/A until the owner selects a design; test requirements are added with the revised contract.
- **Expected branch / PR target:** `docs/*` → `downstream/main` if required.
- **Risks:** silent trust-boundary invention. **Exit:** owner decision recorded; §10.5 artifacts updated and internally reviewed.

## Phase 6.1 — Scoped lifecycle completion service and adapter

- **Goal:** after 6.0, add the narrow authenticated single-completion route and lifecycle transitions.
- **Scope:** additive state/operation extensions, deterministic managed-source update, permanent/timed metadata capture/delete ordering, and Worker adapter.
- **Dependencies / inputs:** merged 6.0 decision; refreshed `downstream/main`; Phase 3 service claim protocol.
- **Deliverables:** scoped completion service/adapter and tests.
- **Acceptance criteria:** SPEC §3.11 criteria 2–7; no browser secret/scope; archive/delete persistence ordering and reconciliation are fail-closed.
- **Tests required:** SPEC §3.12 service/store/client/adapter/security/migration tests plus regressions.
- **Expected branch / PR target:** `feat/feishu-single-completion` → `downstream/main`.
- **Risks:** scope bypass, uncertain upstream write, expiry fabrication, destructive migration. **Exit:** current-HEAD checks/review gate pass and merge with authority.

## Phase 6.2 — Completion chooser and authoritative Archive presentation

- **Goal:** replace Phase 5's no-op with the accessible single-item flow.
- **Scope:** chooser, delete confirmation, pending state, returned-result Active/Archive updates; no restore/countdown loop/batch behavior.
- **Dependencies / inputs:** merged 6.1, refreshed `downstream/main`, approved adapter contract.
- **Deliverables:** frontend flow/tests/docs.
- **Acceptance criteria:** SPEC §3.11 criteria 1, 3, and 4.
- **Tests required:** SPEC §3.12 frontend/a11y/error/no-secret regressions.
- **Expected branch / PR target:** `feat/feishu-single-completion-ui` → `downstream/main`.
- **Risks:** optimistic mutation, accidental delete, arbitrary Markdown task mapping. **Exit:** current-HEAD checks/review gate pass and merge with authority.

## Internal consistency review

The phases respect the dependency rule: 6.1 cannot begin before the owner trust decision, and 6.2 cannot begin from an unmerged 6.1 branch. They retain the API's semantic route without exposing it prematurely, maintain Phase 3's trusted-context model, and avoid later Phase 7–9 scope.

Status: CONTINUOUS-MODE STOP — implementation blocked pending owner-approved browser authorization / scope resolution

Implementation has NOT started.
