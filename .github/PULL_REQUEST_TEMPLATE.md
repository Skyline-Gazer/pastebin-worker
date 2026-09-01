## Summary

<!-- What changed? Keep this concrete. -->

## Business / user context

<!-- Explain why the change exists. A task title alone is not sufficient review context. -->

## Expected behavior / business rules

<!-- Describe observable behavior. Include before -> after where useful. -->

## Acceptance criteria

- [ ] Criterion 1 is observable/testable.
- [ ] Criterion 2 is observable/testable.

## Constraints and non-goals

<!-- Architecture, security, upstream-sync, compatibility, scope limits. -->

## Change boundary

- [ ] Feishu Add-on
- [ ] Generic upstream patch development
- [ ] Patch promotion/export
- [ ] Build/release infrastructure
- [ ] Upstream sync
- [ ] Documentation only

## Planning traceability

- Plan ref: `<path / issue / PR body / N/A>`
- Spec ref: `<path / issue / N/A>`
- Phase: `<phase identifier / N/A>`
- Phase acceptance criteria ref: `<path / issue / N/A>`

<!-- Required for non-trivial changes (see docs/CHANGE_CONTEXT_AND_REVIEW.md §10.7);
may be N/A only when the change is genuinely trivial or does not require the
full planning workflow. Use durable references, never only chat context. -->

## Patch metadata (if applicable)

- Patch ID: `<id or N/A>`
- Source patch branch/ref: `<ref or N/A>`
- Upstream base SHA: `<exact SHA or N/A>`
- Dependencies: `<none / patch IDs / N/A>`
- Exported patch files: `<paths or N/A>`
- Position in `downstream/patches/series`: `<order or N/A>`
- License / IP compatibility: `<verified / unknown - do not fabricate / N/A>`
- Attribution / NOTICE requirements: `<recorded or N/A>`

## Implementation notes

<!-- Important design choices, migrations, compatibility notes, or edge cases. -->

## Validation / evidence

```text
<exact commands and results>
```

For patch/release changes include full ordered-series replay result:

```text
downstream/scripts/check-patches.sh
<pass / N/A>
```

## Documentation

<!-- List documents updated. If none, explain why. -->

## Release reproducibility impact

- `downstream/release.json` changed: `<yes/no/N/A>`
- Pinned upstream SHA changed: `<yes/no/N/A>`
- Patch series changed: `<yes/no/N/A>`
- Add-on release input changed: `<yes/no/N/A>`

## Risk / rollback

<!-- What could fail and how would this release/change be reverted? -->

## AI Review Gate

- Reviewed HEAD SHA: `<sha / pending>`
- AI Review Bot: `<pending / completed / unavailable / owner override>`
- [ ] AI Review Bot reviewed the current/latest HEAD.
- [ ] All actionable findings are fixed or explicitly dispositioned.
- [ ] Any HEAD change after the previous bot review was re-reviewed.
- [ ] Required CI/status checks pass for the current HEAD.
- [ ] No unresolved blocking findings remain.
- [ ] Acceptance criteria and validation evidence are current.

### Review finding disposition

<!-- Link/summarize findings that were not fixed and explain false-positive,
not-applicable, or deferred-non-blocking rationale. Blocking/critical findings
MUST NOT be dispositioned as false-positive / not-applicable by a coding agent
alone; owner approval of that disposition must be recorded here. -->

### Review override (only if explicitly approved by owner)

```text
Review override:
Reason:
Approved by:
Reviewed HEAD SHA:
Alternative validation:
Known risk:
```

For generic upstream patch source PRs, the title/body MUST state:

```text
REVIEW ONLY — DO NOT MERGE INTO upstream-sync
```

## References

<!-- Issue/task/design links or identifiers, if available. -->
