# Narrow Project write guard PHASES

Status: **PHASE ACTIVE — owner authorized the bounded implementation and fix pass**.

Parent PLAN: [`project-write-guard-plan.md`](project-write-guard-plan.md)

Parent SPEC: [`project-write-guard-spec.md`](project-write-guard-spec.md)

## GUARD-186.1 — Exact Project write route

Add one stub-tested, fail-closed route to the GitHub CLI write wrapper for the
pinned Issue #186 Project item `Status -> Done` operation. Track the wrapper,
retain authorized ordinary repository writes, and reject other Project and
GraphQL routes. Pin child calls to `github.com`, reject attached or alternate
repository/host selectors, and prove the actual child argv and environment in
the stub fixture.

- Dependencies: owner-approved PLAN and internally approved SPEC persisted in
  draft PR #190.
- Deliverables: wrapper, one shell contract test, durable RED/GREEN evidence,
  and accurate planning/test documentation.
- Exit criteria: the focused shell test, syntax checks, applicable downstream
  regression checks, current-HEAD CI, and exact-HEAD AI review settle under the
  normal governance quorum.
- Administrative boundary: this phase does not execute the live Project write,
  close Issue #186, merge the PR, or perform a release/production action.

```text
PHASE=GUARD-186.1
BRANCH=codex/project-write-guard
OWNER_GATE_REQUIRED=NO_FOR_IMPLEMENTATION
PROJECT_MUTATION=NO
PRODUCTION_MUTATION=NO
```

## Internal consistency review

- One coherent phase is sufficient for the two-file implementation: PASS.
- Deliverables and exit criteria cover every SPEC requirement: PASS.
- No dependent product or release phase is introduced: PASS.
- Administrative and production boundaries remain explicit: PASS.
