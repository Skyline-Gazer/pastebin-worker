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

- [ ] Add the PATH-stubbed shell contract test without contacting GitHub.
- [ ] RED: run the focused test before the tracked wrapper exists and record
      the command and observed contract failure here.
- [ ] Implement the minimal exact-vector Project route and ordinary repository
      allowlist behavior in `downstream/scripts/gh-write.sh`.
- [ ] GREEN: rerun the focused test and record the result here.
- [ ] REFACTOR: remove duplication only if it makes the security contract
      smaller; rerun the focused test.

## Validation

- [ ] Run `bash -n` on the wrapper and shell test.
- [ ] Run applicable downstream shell regression tests.
- [ ] Run repository formatting checks available in the isolated checkout.
- [ ] Run `git diff --check`.
- [ ] Confirm the test stub made no network or live GitHub mutation.

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
