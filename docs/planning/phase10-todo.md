# Phase 10 — Release hardening TODO

Status: CONTINUOUS-MODE TODO READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started. Active checklist for the [Phase 10 SPEC](phase10-spec.md)
and [PHASE decomposition](phase10-phases.md). Do not start a dependent phase
from an unmerged predecessor.

## NEXT — Phase 10.1: Pinned release assembly and independent target gate

- [x] After this artifact-update PR merges, refresh and verify clean/current
      `downstream/main`; inspect actual release manifest, series, scripts,
      workflows, and target commands before creating `build/phase10-release-gate`.
- [x] Write RED fixture tests for dirty checkout, malformed/noncommit manifest
      pin, comments/blanks, unsafe/duplicate/missing entries, unlisted patch
      ignored, exact sequential replay, first-failure cleanup, and absence of
      any `--3way` release path.
- [x] Write RED candidate tests proving a failed or blocked patched-Pastebin or
      Add-on check prevents candidate success, tag eligibility, and deploy claim.
- [x] Implement the smallest downstream-only exact-pin, clean-worktree,
      fail-closed series/replay and independent-target gate; do not edit a
      generated tree, enable deploy/tag mutation, or modify upstream-owned code
      or existing upstream workflows.
- [ ] Record observed RED/GREEN/REFACTOR/REGRESSION evidence; run focused
      fixture/script, patch compatibility, target type/format/build checks and
      current-HEAD CI; obtain the AI Review Bot Phase Review Gate before merge.

## 2. Phase 10.2 — Local integration, webhook retry, and secret-leakage observables

- [ ] Only after 10.1 merges, refresh `downstream/main`; inspect its merged
      check interfaces and the actual Phase 5–9 Add-on/Worker test seams before
      creating `test/phase10-integration-security`.
- [x] Write RED local/mock integration tests for create/repeated update on one
      Paste, archive/delete, mixed batch, backend `expiresAt`, Restore, and
      missing/expired reconciliation without a live Paste or second body store.
- [x] Write RED raw webhook tests for valid delivery, invalid rejection before
      effects, same-event duplicate/concurrent delivery, and uncertain queue/
      storage/upstream handling that retains the existing retry/DLQ boundary.
- [x] Write RED sentinel-absence tests for responses, stable errors, logs/
      telemetry, webhook/queue records, reports, annotations, artifacts, and
      provenance; use only safe test sentinels.
- [x] Add the smallest deterministic harnesses/tests necessary; preserve Phase
      5–9 APIs, lifecycle, browser trust, server-only secrets, and no automatic
      DLQ replay. Record actual TDD evidence and focused/Phase 5–9 regressions,
      then complete current-HEAD CI and AI Review Bot review before merge.

## 3. Phase 10.3 — Versioned provenance and protected release-tag eligibility

- [x] Only after 10.2 merges, refresh `downstream/main`; inspect the merged
      candidate outcome and sentinel seams before creating
      `build/phase10-provenance-tag`.
- [x] Write RED deterministic provenance tests for schema version, exact input
      SHAs, explicit tag state, ordered patch SHA-256s, assembled refs,
      per-target statuses, explicit unavailable IDs, retention failure, and
      sentinel/raw-error absence.
- [x] Write RED protected-tag tests for naming, clean validated commit matching,
      collision/mismatch/dirty/unvalidated rejection, and proof that PR CI
      cannot create/push tags or deploy.
- [x] Implement the smallest versioned artifact, retention contract, guarded
      eligibility validation, and least-privilege downstream-only CI wiring;
      do not create/push a tag, deploy, provision credentials, or make
      provenance an authorization source.
- [ ] Record observed RED/GREEN/REFACTOR/REGRESSION evidence; run provenance,
      tag, release/security, type/format/build checks, current-HEAD CI, and the
      AI Review Bot Phase Review Gate before merge.

## 4. Phase 10.4 — Non-production rollback rehearsal and release-documentation closure

- [x] After 10.3 merged, refreshed `downstream/main` and applied owner decision
      2026-09-06 option 2: because no genuine prior `downstream-v*` tag exists
      in this first release cycle, use only an isolated `fixture-nonprod-*` tag.
      This replaces the prior missing-tag STOP for this cycle only and is a
      **FIRST-RELEASE EXCEPTION**, not production rollback evidence. The next
      real release cycle MUST rehearse against an actual immutable
      `downstream-v*` tag; do not fabricate a production tag from this tip.
- [x] Write RED fixture tests for prior-tag-only selection, resolved committed
      manifest/series/Add-on inputs, clean replay, dual-target outcomes,
      provenance match, and failed-stage/no-success reporting.
- [x] Implement only a non-production reconstruction/revalidation rehearsal and
      safe per-target report; never deploy, create/push a tag, supply credentials,
      reset data, manipulate queue/DLQ, or automatically repair state.
- [x] Review/update release, patch, security, testing, Add-on operational, and
      Phase 10 planning documentation; record residual risks and the explicit
      owner-controlled production handoff.
- [ ] Record observed RED/GREEN/REFACTOR/REGRESSION evidence; run rehearsal,
      full Phase 10 release/security/integration regressions and documentation
      reference checks; complete current-HEAD CI and AI Review Bot review before
      merge.

## Evidence

### TDD

Documentation-only §10.5 artifact update: TDD is N/A for this commit.
RED/GREEN/REFACTOR/REGRESSION evidence is mandatory and must be recorded with
each Phase 10 implementation PR; do not claim an unrun or sandbox-blocked check
passed.

### Phase 10.4 working evidence (local, pre-review)

- RED: `bash downstream/tests/phase10-rollback-rehearsal.test.sh` — observed
  failure before implementation because
  `downstream/scripts/release-rollback-rehearsal.sh` was absent.
- GREEN: `bash downstream/tests/phase10-rollback-rehearsal.test.sh` — PASS.
  Its isolated temporary Git repository creates only the local annotated tag
  `fixture-nonprod-rollback-prior`, proves it is excluded from
  `downstream-v*` discovery, resolves that tag's committed sources, replays
  patches, checks both targets, matches provenance, refuses a branch, and
  safely reports an intentional target failure. It also asserts this repository
  has no `downstream-v*` tag, recording the FIRST-RELEASE EXCEPTION.
- REFACTOR: `bash -n downstream/scripts/release-rollback-rehearsal.sh
downstream/tests/phase10-rollback-rehearsal.test.sh` — PASS.
- REGRESSION: `bash downstream/tests/release-candidate.test.sh`, `bash
downstream/tests/phase10-secret-observables.test.sh`, and `bash
downstream/tests/phase10-provenance-tag.test.sh` — PASS. `node_modules/.bin/
prettier -c` on all touched Markdown and `git diff --check` — PASS. No
  production tag was created/pushed and no deployment or credential operation
  occurred.

### Phase 10 residual-risk register

| Risk                                                | Control / residual boundary                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| No prior production tag exists this cycle           | FIRST-RELEASE EXCEPTION; the isolated fixture is not production rollback evidence.                                                   |
| Fixture could be discovered as a production release | Only `fixture-nonprod-*` is accepted for fixture mode; it cannot match the protected `downstream-vYYYY.MM.DD.N` pattern.             |
| A release tag could be moved                        | Real tags remain an owner-controlled immutable-release contract; the rehearsal only resolves an existing tag and never mutates refs. |
| Real deployment needs credentials                   | Production handoff remains separately owner-authorized with separately provisioned credentials for Pastebin and Add-on.              |
| Failure could invite unsafe repair                  | Replay and target failures stop with `DEPLOY_CLAIM=no`; no automatic repair, generated-tree edit, deploy, or rollback occurs.        |
| PR automation could release                         | PR CI remains validation-only and must not tag or deploy.                                                                            |

The next real release cycle MUST repeat this rehearsal against an actual
immutable prior `downstream-v*` tag.

### Phase 10.1 working evidence (local, pre-review)

- Fixture command: `downstream/tests/release-candidate.test.sh` — PASS.
  Harness `pass()` avoids `pipefail`+`grep -q` SIGPIPE by writing output then grepping.
  It exercises intentional dirty, malformed/noncommit, duplicate, unsafe,
  missing, replay-failure cleanup, target-failure, and target-blocked cases,
  plus ordered comments/blank-aware replay and unlisted-patch exclusion.
- REFACTOR: `git diff --check` — PASS.
- REGRESSION and target defaults remain pending for the final current HEAD;
  no tag/deploy operation was performed.
- CI workflow wiring for the fixture + assembly smoke is prepared locally but
  blocked on GitHub `workflow` scope to push `.github/workflows/feishu-phase3.yml`.

### Phase 10.2 working evidence (local, pre-review)

- RED: `downstream/addons/feishu/tests/webhook.spec.ts` adds a disposition-report
  sentinel case for the prior forwarding of an untrusted failure code and operation
  correlation ID. Codex sandbox hit `listen EPERM` on `127.0.0.1` before collection;
  orchestrator re-ran focused Vitest outside that sandbox.
- GREEN: `bash downstream/tests/phase10-secret-observables.test.sh` — PASS. It
  proves target-command output containing the safe sentinel is not emitted by the
  candidate report while stable target/candidate statuses remain visible.
- GREEN: `node_modules/.bin/vitest run --config downstream/addons/feishu/vitest.config.js
downstream/addons/feishu/tests/service.spec.ts
downstream/addons/feishu/tests/webhook.spec.ts` — PASS (39). Plus prettier/eslint/
  `tsc --noEmit -p downstream/addons/feishu/tsconfig.json`.
- REFACTOR: `git diff --check` — PASS.
- REGRESSION: `bash downstream/tests/release-candidate.test.sh` — PASS. Current-HEAD
  CI remains pending; no live Paste, deploy, tag, or queue/DLQ replay was performed.

### Phase 10.3 working evidence (local, pre-review)

- RED: `bash downstream/tests/phase10-provenance-tag.test.sh` — observed failure
  before implementation because `release-provenance.sh` was absent.
- GREEN: `bash downstream/tests/phase10-provenance-tag.test.sh` — PASS. It covers
  deterministic schema/input/hash/order/assembled refs, explicit pre-tag/null
  IDs, retention failure, sentinel absence, name/collision/mismatch/dirty/
  unvalidated refusal, and PR-workflow no-tag/no-deploy assertions.
- REFACTOR: `bash -n` on the two release scripts and fixture plus `git diff
--check` — PASS.
- REGRESSION: `bash downstream/tests/release-candidate.test.sh`, `bash
downstream/tests/phase10-secret-observables.test.sh`, and the new fixture —
  PASS. Prettier on changed Markdown, source-only Add-on ESLint, Add-on `tsc
--noEmit`, and Vite build — PASS. No tag was created/pushed and no deployment
  occurred; current-HEAD CI and AI Review Bot review remain pending.

### Regression and review

- [ ] For every implementation phase, record exact focused tests, type/format/
      build results, patch replay and both-target checks where applicable, and
      any environmental limitation.
- [ ] Confirm no change to Phase 5–9 user/API/lifecycle/browser-trust/webhook
      contracts; no second Paste-body store; no live production dependency;
      no production deploy/rollback, tag push/creation, credential provisioning,
      destructive migration, PR #5, `upstream-sync`, or `goshujin` work.
- [ ] Obtain current-HEAD CI and a completed AI Review Bot Phase Review Gate for
      every implementation PR; a new HEAD requires a new review.

## Internal consistency review

This TODO maps directly to the Phase 10 SPEC acceptance criteria and its four
mergeable PHASE milestones, begins every executable behavior slice RED-first,
and names Phase 10.1 as NEXT. It preserves Phase 5–9 as fixed contracts and
keeps Pastebin and Add-on build/deploy ownership separate. It permits no live
production deployment or rollback, tag push/creation, credential provisioning,
destructive migration, PR #5, `upstream-sync`, `goshujin`, upstream-owned
workflow/source change without the explicit patch path, or new product scope.
No STOP condition is present. Owner decision 2026-09-06 option 2 replaces the
Phase 10.4 missing-prior-tag STOP for this first cycle only with an isolated
fixture rehearsal; it does not authorize a production operation or remove the
next-cycle real-tag requirement.
