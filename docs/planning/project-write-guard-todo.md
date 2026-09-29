# Narrow Project write guard TODO

Status: **TODO READY — internal consistency review PASS**.

Parent PLAN: [`project-write-guard-plan.md`](project-write-guard-plan.md)

Parent SPEC: [`project-write-guard-spec.md`](project-write-guard-spec.md)

Phase: [`project-write-guard-phases.md`](project-write-guard-phases.md)
(`GUARD-186.1`)

## Preparation

- [x] Read repository governance, decisions, testing, and review contracts.
- [x] Confirm isolated worktree at baseline
      `e300500d0cba6dd486035d33ed304bb409448bd3`.
- [x] Verify the local historical wrapper is untracked and not authoritative.
- [x] Read the installed `gh project item-edit` command contract.
- [x] Verify the pinned Project/item/field/option identities read-only.
- [x] Persist the owner-approved PLAN in draft PR #190.
- [x] Internally review and persist the SPEC in draft PR #190.
- [x] Internally review this one-phase decomposition and TODO.

## TDD / implementation

- [x] Add the PATH-stubbed shell contract test without contacting GitHub.
- [x] RED: `bash downstream/tests/gh-write.test.sh` exited `1` before the
      tracked wrapper existed with `Expected executable wrapper:
.../downstream/scripts/gh-write.sh`. The test stopped before creating or
      invoking its stub and made no network request.
- [x] Implement the minimal exact-vector Project route and ordinary repository
      allowlist behavior in `downstream/scripts/gh-write.sh`.
- [x] GREEN: `bash downstream/tests/gh-write.test.sh` — PASS (`gh write guard
fixtures passed`).
- [x] REFACTOR: retained direct exact-vector comparison instead of adding a
      general parser; rejected the generic `api`/`repo` families and foreign
      positional repository URLs, then reran the focused test — PASS.

## Validation

- [x] Run `bash -n` on the wrapper and shell test — PASS.
- [x] Run applicable downstream shell regression tests. The focused guard,
      browser-origin, Issue #86, secret-observable, and upstream-sync fixtures
      passed. Three unrelated release fixtures assume `git init` creates
      `master`; rerunning with that fixture setting made provenance and rollback
      pass, while release-candidate then reached its pre-existing GNU/BSD `sed
-i` incompatibility on macOS. No failure involved the new wrapper.
- [x] Run repository formatting checks available in the isolated checkout —
      cached Prettier 3.5.3 check PASS; ShellCheck unavailable; shell syntax
      PASS.
- [x] Run `git diff --check` — PASS.
- [x] Confirm the PATH stub made no network or live GitHub mutation.

## Pre-bot implementation review

- [x] Fix P1 foreign positional URL bypass by rejecting URL-bearing arguments
      and all generic `repo` commands; add lower/upper/`www` host fixtures.
- [x] Fix P1 GraphQL normalization bypass by rejecting the generic `api`
      command family; add spelling/order/URL and REST fixtures.
- [x] Fix P2 missing durable write policy by adding the owner-approved GitHub
      write boundary to tracked `AGENTS.md` and correcting the PLAN baseline
      description.
- [x] Rerun focused test, shell syntax, and `git diff --check` — PASS.

## Delivery

- [ ] Update PR #190 with exact validation evidence and documentation impact.
- [ ] Mark PR #190 ready only after implementation validation passes.
- [ ] Complete current-HEAD CI and exact-HEAD supported reviewer settlement.
- [ ] Require normal reviewer quorum and zero unresolved actionable findings.
- [ ] Do not merge, mutate Project #3, or close Issue #186 in this phase.

## Stop conditions

Stop and return to SPEC review if implementation requires a mutable target,
general Project/GraphQL passthrough, a different identity, a different status,
or any live mutation during testing. Stop for owner direction if an exact-HEAD
blocking finding cannot be fixed.

```text
TDD=REQUIRED
OWNER_GATE_REQUIRED=NO_FOR_IMPLEMENTATION
PROJECT_MUTATION=NO
PRODUCTION_MUTATION=NO
```
