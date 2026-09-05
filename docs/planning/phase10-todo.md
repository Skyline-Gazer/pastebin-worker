# Phase 10 — Release hardening TODO

Status: CONTINUOUS-MODE TODO READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started. Active checklist for the [Phase 10 SPEC](phase10-spec.md)
and [PHASE decomposition](phase10-phases.md). Do not start a dependent phase
from an unmerged predecessor.

## NEXT — Phase 10.1: Pinned release assembly and independent target gate

- [ ] After this artifact-update PR merges, refresh and verify clean/current
      `downstream/main`; inspect actual release manifest, series, scripts,
      workflows, and target commands before creating `build/phase10-release-gate`.
- [ ] Write RED fixture tests for dirty checkout, malformed/noncommit manifest
      pin, comments/blanks, unsafe/duplicate/missing entries, unlisted patch
      ignored, exact sequential replay, first-failure cleanup, and absence of
      any `--3way` release path.
- [ ] Write RED candidate tests proving a failed or blocked patched-Pastebin or
      Add-on check prevents candidate success, tag eligibility, and deploy claim.
- [ ] Implement the smallest downstream-only exact-pin, clean-worktree,
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
- [ ] Write RED local/mock integration tests for create/repeated update on one
      Paste, archive/delete, mixed batch, backend `expiresAt`, Restore, and
      missing/expired reconciliation without a live Paste or second body store.
- [ ] Write RED raw webhook tests for valid delivery, invalid rejection before
      effects, same-event duplicate/concurrent delivery, and uncertain queue/
      storage/upstream handling that retains the existing retry/DLQ boundary.
- [ ] Write RED sentinel-absence tests for responses, stable errors, logs/
      telemetry, webhook/queue records, reports, annotations, artifacts, and
      provenance; use only safe test sentinels.
- [ ] Add the smallest deterministic harnesses/tests necessary; preserve Phase
      5–9 APIs, lifecycle, browser trust, server-only secrets, and no automatic
      DLQ replay. Record actual TDD evidence and focused/Phase 5–9 regressions,
      then complete current-HEAD CI and AI Review Bot review before merge.

## 3. Phase 10.3 — Versioned provenance and protected release-tag eligibility

- [ ] Only after 10.2 merges, refresh `downstream/main`; inspect the merged
      candidate outcome and sentinel seams before creating
      `build/phase10-provenance-tag`.
- [ ] Write RED deterministic provenance tests for schema version, exact input
      SHAs, explicit tag state, ordered patch SHA-256s, assembled refs,
      per-target statuses, explicit unavailable IDs, retention failure, and
      sentinel/raw-error absence.
- [ ] Write RED protected-tag tests for naming, clean validated commit matching,
      collision/mismatch/dirty/unvalidated rejection, and proof that PR CI
      cannot create/push tags or deploy.
- [ ] Implement the smallest versioned artifact, retention contract, guarded
      eligibility validation, and least-privilege downstream-only CI wiring;
      do not create/push a tag, deploy, provision credentials, or make
      provenance an authorization source.
- [ ] Record observed RED/GREEN/REFACTOR/REGRESSION evidence; run provenance,
      tag, release/security, type/format/build checks, current-HEAD CI, and the
      AI Review Bot Phase Review Gate before merge.

## 4. Phase 10.4 — Non-production rollback rehearsal and release-documentation closure

- [ ] Only after 10.3 merges, refresh `downstream/main`; verify an existing
      immutable prior downstream tag is available in the controlled rehearsal
      environment before creating `build/phase10-rollback-docs`. If not, STOP
      and request owner direction.
- [ ] Write RED fixture tests for prior-tag-only selection, resolved committed
      manifest/series/Add-on inputs, clean replay, dual-target outcomes,
      provenance match, and failed-stage/no-success reporting.
- [ ] Implement only a non-production reconstruction/revalidation rehearsal and
      safe per-target report; never deploy, create/push a tag, supply credentials,
      reset data, manipulate queue/DLQ, or automatically repair state.
- [ ] Review/update release, patch, security, testing, Add-on operational, and
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
No STOP condition is present; lack of a prior immutable tag becomes a STOP in
Phase 10.4 rather than an invented release input.
