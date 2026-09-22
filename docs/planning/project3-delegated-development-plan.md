# Project #3 delegated development governance PLAN

Status: **PLAN READY — internal consistency review PASS**

This PLAN is the durable planning artifact for governance Issue #177 and the
docs-only migration PR. The owner Master Execution Authorization explicitly
authorizes `PROJECT_DRIVEN_DELEGATED_EXECUTION`; no routine approval pause is
required inside this bounded governance change.

## Context and current state

GitHub Project #3 (`PVT_kwDOEwGMMc4BkEoc`) is the selected repository queue
(`@markd3ng's untitled project`). Before this migration it contained only the
completed FT-10 Issue #174 item. Its default Status field contained Todo, In
Progress, and Done; it had no Phase, Type, or Priority field. The audit found
open Issues #146, #153, and #159, plus open PR #152.

The repository still describes the old delegated exception as limited to
historical roadmap Phases 5–10. Those phases are complete. Without an explicit
Project-driven mode, the queue, durable planning artifacts, review gates, and
Issue/Project settlement have no single documented execution contract.

## Objective

Define a constrained Project-driven delegated mode that makes Project #3 the
dynamic queue while preserving the normal owner-gated mode, durable planning,
TDD, branch isolation, exact-HEAD CI/review, security boundaries, release
rules, and hard owner gates.

## Scope

- Update `docs/CHANGE_CONTEXT_AND_REVIEW.md` with the two modes, queue loop,
  hard gates, blocked-item continuation, and review invariants.
- Update `docs/IMPLEMENTATION_ORDER.md` so Phases 1–10 remain historical and
  Project #3 is the active queue.
- Append the corresponding locked decision to `DECISIONS.md` and align the
  mandatory workflow in `AGENTS.md`.
- Add durable governance SPEC, PHASE, and TODO artifacts and link them from
  `docs/INDEX.md`.
- Preserve the open Issue/PR history; no product implementation is included.

## Non-goals

- No production deployment, lifecycle/data mutation, provider console change,
  credential operation, destructive cleanup, or migration.
- No product/API/architecture/security behavior change.
- No automatic implementation of #146, #153, or #159 in this PR.
- No renaming of Project #3 and no duplicate FT-10 item.

## Ownership boundaries

This is downstream governance documentation under `/docs`, `AGENTS.md`, and
`DECISIONS.md`. It does not modify upstream-owned application files,
`upstream-sync`, bindings, Worker code, Add-on code, or release inputs.

## Project schema decision

The audit reused the existing Status field and added only the missing minimum
fields authorized by the Master Prompt: Phase (text) and Priority (P0–P3).
GitHub rejected the reserved custom field name `Type`; the equivalent Work Type
single-select field was created with the authorized Governance/Epic/Feature/
Defect/Functional Test/Test Hardening/Release/Documentation options. The
existing Status field was extended, preserving Todo/In Progress/Done and adding
the authorized In Review and Blocked options.

## Dependencies and risks

- The migration must not contradict `AGENTS.md`, `DECISIONS.md`, or the Phase
  Review Gate in `docs/CHANGE_CONTEXT_AND_REVIEW.md` §9.
- A governance wording error could authorize silent semantic drift; the new
  mode therefore lists explicit hard gates and keeps SPEC change control.
- Project write access must remain available for accurate queue settlement.

## Validation strategy

- Inspect all changed governance text for contradictory Phases 5–10-only
  language.
- Run `git diff --check` and repository documentation/format checks available
  for docs-only changes.
- Run the required PR CI checks (`test`, `feishu-validation`,
  `coverage-goshujin`, `report-coverage`).
- Complete exact-HEAD reviewer settlement and quorum; no governance-specific
  reviewer-quorum override is pre-authorized.
- Read back Project #3, Issue #177, PR merge state, and resulting
  `downstream/main` before closure.

## Acceptance criteria

- Both normal and Project-driven delegated modes are explicit and non-
  contradictory.
- Project #3 is the active queue; `/docs` remains the durable contract layer.
- Queue selection, hard owner gates, blocked continuation, review standards,
  post-merge evidence, Issue closure, and Project Done settlement are explicit.
- Durable PLAN/SPEC/PHASE/TODO artifacts are committed before implementation
  changes advance.
- The governance PR is merged only after current-head CI and normal review
  gate pass; Issue #177 then closes and its Project item becomes Done.

## Expected PR decomposition

One docs/governance PR targeting `downstream/main` is sufficient. It includes
this PLAN, the SPEC, PHASE/TODO artifacts, the governance text changes, and
the documentation index link. No implementation PR is required.

## Internal consistency review

Reviewed against `AGENTS.md`, `DECISIONS.md`, `docs/CHANGE_CONTEXT_AND_REVIEW.md`
§9–§10, `docs/IMPLEMENTATION_ORDER.md`, `docs/REPO_AND_GIT.md`, and
`docs/TESTING.md`. No unresolved product, API, architecture, security, legal,
or production decision is introduced by this governance PLAN.

```text
PROJECT_DRIVEN_DELEGATED_EXECUTION=OWNER_AUTHORIZED
GOVERNANCE_ISSUE=177
GOVERNANCE_BASE=48b0b0a571a02091b22e849a8cbe20eb49f183aa
IMPLEMENTATION_STARTED=NO
OWNER_GATE_REQUIRED=NO
```
