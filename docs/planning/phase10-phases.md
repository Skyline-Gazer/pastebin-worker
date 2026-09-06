# Phase 10 — Release hardening PHASE decomposition

Status: CONTINUOUS-MODE PHASE 10 COMPLETE under D-030 (implementation PRs #46–#49 merged).

This decomposition implemented the approved
[Phase 10 PLAN](phase10-plan.md) and [Phase 10 SPEC](phase10-spec.md) after
Phases 5–9. It hardens downstream release evidence and validation without
changing their product, API, lifecycle, browser-trust, or webhook contracts.

## Phase 10.1 — Pinned release assembly and independent target gate

- **Goal:** make a downstream candidate fail closed unless its exact committed
  inputs assemble reproducibly and both independently owned targets pass their
  required checks.
- **Scope:** validate clean checkout, manifest/schema and exact upstream commit,
  comments/blank-aware explicit `series` parsing, safe unique listed paths and
  hashes, and fresh detached sequential `git am` replay. Orchestrate separate
  patched-Pastebin and Add-on check results from those pinned inputs. Do not
  deploy, tag, alter upstream-owned source/workflows, or hand-repair a generated
  worktree.
- **Dependencies:** this PHASE/TODO artifact-update PR is merged; refresh and
  verify clean/current `downstream/main`. No unmerged phase branch is an input.
- **Inputs:** Phase 10 SPEC §§3.4–3.6, 3.9–3.12; `docs/BUILD_DEPLOY.md` §§1–7;
  `docs/PATCH_AND_UPSTREAM.md` §§7–13; `docs/TESTING.md` §§11–12; AGENTS.md
  §§2, 5–8, 16, and 18.
- **Deliverables:** downstream-only release/CI guardrail tooling and fixture
  tests; a documented candidate check matrix with independently named target
  outcomes and sanitized diagnostics.
- **Acceptance criteria:** dirty/malformed/noncommit/unsafe/duplicate/missing
  inputs fail before assembly; only listed patch bytes replay once in file order
  from the exact pin; first replay failure prevents either build, tag eligibility,
  or deploy claim; neither `git am --3way` nor `git apply --3way` exists in the
  release path; each target failure/blocked result fails the candidate.
- **Tests required:** RED-first fixtures for dirty checkout, invalid/noncommit
  pin, comments/blanks, unsafe/duplicate/missing entries, unlisted patch ignored,
  exact ordered replay, first-failure cleanup, and no-`--3way` assertion;
  intentional independent target failure/blocking tests and existing patch
  compatibility regressions.
- **Expected branch type:** `build/phase10-release-gate` from refreshed
  `downstream/main`.
- **Expected PR target:** `downstream/main`.
- **Risks:** accidentally treating a moving branch/patch head as an input,
  allowing partial success, modifying an upstream-owned workflow without the
  explicit patch path, or leaving a generated integration tree repairable.
- **Exit criteria:** RED/GREEN/REFACTOR/REGRESSION evidence is recorded;
  affected script/fixture, patch replay, both target, type/format/build checks,
  docs impact, current-HEAD CI, and AI Review Bot Phase Review Gate pass before
  merge.

## Phase 10.2 — Local integration, webhook retry, and secret-leakage observables

- **Goal:** prove the existing Phase 5–9 contracts through deterministic
  local/mock boundaries while showing that retries and release-visible evidence
  do not leak secrets.
- **Scope:** add controlled local/mock Pastebin and Worker/frontend integration
  harnesses; exercise existing binding/lifecycle/batch/reconciliation paths,
  raw webhook verification and retry/idempotency observables, and sentinel-secret
  absence from public and release-visible surfaces. Do not add a route, lifecycle
  action, credential, storage authority, live dependency, or automatic DLQ
  replay.
- **Dependencies:** Phase 10.1 is merged and `downstream/main` refreshed; reuse
  its candidate-check interfaces and actual merged Phase 5–9 interfaces.
- **Inputs:** Phase 10 SPEC §§3.5–3.8 and 3.10–3.12; `docs/SECURITY.md` §§1–3
  and 7; `docs/TESTING.md` §§1 and 8–9, 13–14; Phase 5–9 planning/docs and
  their merged tests.
- **Deliverables:** deterministic local/mock integration fixtures; Add-on
  integration/webhook/security regression tests; documented safe sentinel and
  logging/telemetry test seams.
- **Acceptance criteria:** tests prove create/repeated update uses one mapped
  Paste; existing archive/delete, partial batch, authoritative `expiresAt`,
  Restore, and missing/expired reconciliation semantics remain unchanged;
  invalid webhook input effects nothing; same-event duplicate/concurrent delivery
  creates no second Paste effect; sentinels never occur in responses, sanitized
  errors, logs/telemetry, webhook/queue records, reports, annotations, artifacts,
  or candidate provenance.
- **Tests required:** RED-first local/mock integration tests for every named
  lifecycle/reconciliation case; raw valid/invalid webhook and same-event
  duplicate/concurrent retry tests; queue/storage uncertainty/DLQ-boundary tests;
  sentinel absence tests across every named surface; Phase 5–9 regressions.
- **Expected branch type:** `test/phase10-integration-security` from refreshed
  `downstream/main` after 10.1.
- **Expected PR target:** `downstream/main`.
- **Risks:** a mock hides an upstream contract mismatch, a test itself records a
  secret, retry tests weaken raw-body or durable-idempotency protections, or
  release hardening silently changes Phase 5–9 behavior.
- **Exit criteria:** observed RED/GREEN/REFACTOR/REGRESSION evidence covers all
  required observables; focused and Phase 5–9 regression suites, type/format/
  build checks, docs impact, current-HEAD CI, and AI Review Bot gate pass.

## Phase 10.3 — Versioned provenance and protected release-tag eligibility

- **Goal:** create auditable, secret-free evidence for a validated candidate and
  define immutable downstream tag eligibility without granting ordinary CI tag
  or deploy authority.
- **Scope:** implement versioned provenance generation/retention with exact
  inputs, assembled refs, ordered SHA-256 hashes, per-target check outcomes, and
  explicit unavailable optional identifiers; add guarded validation for the
  `downstream-vYYYY.MM.DD.N` tag contract. Tag creation/push remains a protected
  authorized-release-actor operation and is not executed by this phase or PR CI.
- **Dependencies:** Phase 10.1 and 10.2 are merged and `downstream/main` is
  refreshed; consume their validated result and sentinel-test interfaces.
- **Inputs:** Phase 10 SPEC §§3.5–3.8 and 3.10–3.12; `docs/BUILD_DEPLOY.md`
  §§2–3 and 7–9; `docs/SECURITY.md` §§1–2 and 7; `docs/TESTING.md` §§1 and
  11–14.
- **Deliverables:** provenance schema/producer/retention documentation,
  deterministic fixtures, protected tag-eligibility guard, and downstream-only
  CI wiring using read-only PR permissions and safe artifact paths.
- **Acceptance criteria:** provenance contains schema version, timestamp, exact
  upstream/downstream SHA, explicit tag state, series/path hashes, assembled
  head/tree, and passed/failed/blocked target checks; unavailable IDs are
  explicit; retention failure fails closed; collision/SHA mismatch/dirty or
  unvalidated candidate refuses tag mutation; PR CI neither creates/pushes a
  tag nor deploys; provenance contains no sentinel secrets/raw errors.
- **Tests required:** RED-first deterministic schema/hash/order/SHA/tag-state
  fixtures; null/unavailable identifier and retention-failure tests; collision,
  mismatch, dirty/unvalidated candidate, and no-PR-CI-mutation negatives;
  provenance sentinel-leakage regressions.
- **Expected branch type:** `build/phase10-provenance-tag` from refreshed
  `downstream/main` after 10.2.
- **Expected PR target:** `downstream/main`.
- **Risks:** provenance becomes an eligibility authority, retention is vague,
  tags can be retargeted, privileged secrets reach PR CI, or implementation
  assumes authority to push an immutable release tag.
- **Exit criteria:** exact RED/GREEN/REFACTOR/REGRESSION evidence is recorded;
  provenance/tag/security/release-gate tests, type/format/build checks, docs
  impact, current-HEAD CI, and AI Review Bot gate pass before merge.

## Phase 10.4 — Non-production rollback rehearsal and release-documentation closure

- **Goal:** demonstrate that a prior immutable release can be reconstructed and
  revalidated without live deployment, then close Phase 10 with an accurate
  operational/risk record.
- **Scope:** implement a controlled rollback rehearsal that selects a prior tag,
  resolves its committed inputs, repeats clean replay and both target checks,
  records selected tag/SHA/provenance and per-target result, and reports safe
  failure. Review/update build/deploy, patch, security, testing, Add-on
  operational, and Phase 10 docs; wire residual risks/runbook boundaries.
  Do not redeploy production, push/create tags, provision credentials, reset
  data, operate queue/DLQ, or automatically repair/roll back anything.
- **Dependencies:** Phase 10.3 is merged and `downstream/main` is refreshed.
  Owner decision 2026-09-06 option 2 authorizes this first-cycle-only isolated
  `fixture-nonprod-*` rehearsal in place of the prior STOP for a missing
  production tag. It is a **FIRST-RELEASE EXCEPTION**, not production rollback
  evidence. The next real release cycle MUST rehearse against an actual,
  immutable `downstream-v*` tag; never fabricate one from the current tip.
- **Inputs:** Phase 10 SPEC §§3.5–3.6 and 3.10–3.12; `docs/BUILD_DEPLOY.md`
  §§8–10; `docs/PATCH_AND_UPSTREAM.md` §§7–13; `docs/SECURITY.md`; `docs/TESTING.md`
  §§11–14; Phase 10.1–10.3 merged artifacts.
- **Deliverables:** non-production rollback-rehearsal command/harness and
  fixtures, selected-input/per-target safe report, updated operator/release
  documentation, and Phase 10 residual-risk register/review record.
- **Acceptance criteria:** rehearsal starts only from an existing immutable tag
  (a `fixture-nonprod-*` tag only under the documented first-release exception,
  otherwise a protected `downstream-v…` tag),
  loads that tag's committed manifest/series/Add-on, replays cleanly, rebuilds/
  rechecks both targets, and records selected tag/SHA/provenance; a failed stage
  cannot claim success; production rollback/deploy remains an owner-authorized,
  separately credentialed handoff; docs consistently preserve Phase 5–9 and
  target-ownership contracts.
- **Tests required:** RED-first prior-tag selection/validation, clean replay,
  dual-target result, provenance-match, and failure-no-success fixtures;
  documentation reference/link checks and complete Phase 10 release/security/
  integration regression suite.
- **Expected branch type:** `build/phase10-rollback-docs` from refreshed
  `downstream/main` after 10.3.
- **Expected PR target:** `downstream/main`.
- **Risks:** accidentally treating a branch as rollback authority, treating a
  fixture as production evidence, asserting a
  deployment occurred when it did not, availability of no prior tag, or letting
  docs normalize a production operation that needs owner approval.
- **Exit criteria:** rehearsal evidence shows pass or safely reported failure;
  all required documentation/risk review is complete; RED/GREEN/REFACTOR/
  REGRESSION evidence, current-HEAD CI, and AI Review Bot Phase Review Gate are
  complete before merge.

## Internal consistency review

Reviewed against the Phase 10 PLAN/SPEC (especially SPEC §§3.5–3.12 and its
acceptance criteria), `docs/CHANGE_CONTEXT_AND_REVIEW.md` §§10.4–10.5,
`docs/IMPLEMENTATION_ORDER.md` Phase 10, `docs/BUILD_DEPLOY.md`,
`docs/PATCH_AND_UPSTREAM.md`, `docs/SECURITY.md`, `docs/TESTING.md`,
`DECISIONS.md` D-030, and AGENTS.md. The sequence is merge-dependent,
reviewable, and preserves all Phase 5–9 contracts. It authorizes only
implementation within this SPEC after this artifact-update PR merges; it does
not authorize production deployment/rollback, tag push/creation, credential
provisioning, destructive migration, PR #5, `upstream-sync`, `goshujin`, an
upstream-owned workflow change without its explicit patch path, or new product
scope. No STOP condition is currently present.
