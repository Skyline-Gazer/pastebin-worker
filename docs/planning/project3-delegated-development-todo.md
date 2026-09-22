# Project #3 delegated development governance TODO

Status: **TODO READY — internal consistency review PASS — implementation authorized**

Parent PLAN: [`project3-delegated-development-plan.md`](project3-delegated-development-plan.md)

Parent SPEC: [`project3-delegated-development-spec.md`](project3-delegated-development-spec.md)

Phase: [`project3-delegated-development-phases.md`](project3-delegated-development-phases.md) (`GOV-01`)

## Pre-implementation checks

- [x] Read dirty primary worktree without modifying it.
- [x] Audit Project #3 title, ID, URL, fields, status values, and items.
- [x] Confirm FT-10 item remains Done and canonical.
- [x] Confirm open Issues #146, #153, #159 and open PR #152.
- [x] Create canonical governance Issue #177 and add it to Project #3.
- [x] Set #177 Status=In Progress, Phase=GOV-01, Priority=P0,
      Work Type=Governance.
- [x] Add only missing schema fields/options authorized by the Master Prompt.

## Documentation implementation

- [ ] Update `docs/CHANGE_CONTEXT_AND_REVIEW.md` with the new delegated mode,
      hard gates, queue selection, blocked continuation, and Project #3 roles.
- [ ] Update `docs/IMPLEMENTATION_ORDER.md` to identify historical Phases 1–10
      and Project #3 as the active queue.
- [ ] Append the corresponding locked decision to `DECISIONS.md`.
- [ ] Align `AGENTS.md` §18 with the new mode and preserve the normal mode.
- [ ] Link governance PLAN/SPEC/PHASE/TODO from `docs/INDEX.md`.
- [ ] Run contradiction scan, `git diff --check`, and secret scan.

## PR/review/settlement

- [ ] Commit with full review context.
- [ ] Push `docs/project3-delegated-development`.
- [ ] Open governance PR against `downstream/main` referencing Issue #177 and
      all durable artifacts.
- [ ] Set Project #177 to In Review after PR creation (using the existing
      Status option).
- [ ] Run exact-head CI and required checks.
- [ ] Request Cursor Bugbot, Greptile, and Codex Final Verify.
- [ ] Do not use the FT-10 evidence-only reviewer-quorum fallback; if quorum
      cannot be reached, mark #177 Blocked and stop this item.
- [ ] Merge only after normal quorum and zero unresolved actionable findings.
- [ ] Refresh and verify `downstream/main`.
- [ ] Append closure evidence, close Issue #177 as completed, and set its
      Project item Done.
- [ ] Re-audit Project #3 and activate the next queue selection only after
      this governance PR is merged.

## TDD/validation record

```text
TDD=N/A
REASON=documentation/governance change; no runtime behavior is introduced
ALTERNATIVE_VERIFICATION=internal consistency review + diff/secret scan + PR CI + exact-head review
```

## Stop conditions

Stop GOV-01 without merge if governance wording creates unresolved semantic,
security, architecture, legal, or reviewer-quorum owner decisions. Do not
continue to backlog implementation until governance is merged and Project #3
is reconciled from the resulting `downstream/main`.
