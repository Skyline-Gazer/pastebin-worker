# Project #3 delegated development governance PHASES

Status: **PHASE DECOMPOSITION READY — internal consistency review PASS**

Parent PLAN: [`project3-delegated-development-plan.md`](project3-delegated-development-plan.md)

Parent SPEC: [`project3-delegated-development-spec.md`](project3-delegated-development-spec.md)

This governance migration is one docs-only delivery phase. Splitting it into
multiple implementation PRs would add process without reducing risk.

## GOV-01 — Adopt Project #3 delegated development workflow

- **Goal:** make Project #3 the active, accurately constrained dynamic queue.
- **Scope:** governance docs, locked decision, root agent workflow alignment,
  durable PLAN/SPEC/PHASE/TODO links.
- **Dependencies:** Project #3 audit; current `downstream/main` at
  `48b0b0a571a02091b22e849a8cbe20eb49f183aa`.
- **Inputs:** Issue #177, Master Execution Authorization, current AGENTS /
  DECISIONS / CHANGE_CONTEXT_AND_REVIEW / IMPLEMENTATION_ORDER / REPO_AND_GIT /
  TESTING / INDEX.
- **Deliverables:** governance text updates and durable planning artifacts.
- **Acceptance criteria:** both modes, queue loop, hard gates, blocked
  continuation, status/selection semantics, and unchanged review/security
  gates are explicit and non-contradictory.
- **Tests required:** `git diff --check`; governance contradiction scan;
  Project/Issue/PR read-back; required PR CI and exact-head review settlement.
- **Expected branch:** `docs/project3-delegated-development`.
- **Expected PR target:** `downstream/main`.
- **Risks:** wording could accidentally broaden production or semantic
  authority; mitigated by explicit hard gates and SPEC change control.
- **Exit criteria:** PR merged, Issue #177 closed as completed, Project item
  Done, resulting `downstream/main` read back, and mode activation recorded.

## Internal consistency review

The phase is consistent with the SPEC: no product behavior, runtime API,
security boundary, data model, migration, deployment, or release input is in
scope. The phase does not depend on an unmerged implementation contract.

```text
PHASE=GOV-01
PHASE_BRANCH=docs/project3-delegated-development
PHASE_PR_TARGET=downstream/main
TDD= N/A (documentation/governance change)
OWNER_GATE_REQUIRED=NO
```
