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

## Patch metadata (if applicable)

- Patch ID: `<id or N/A>`
- Source patch branch/ref: `<ref or N/A>`
- Upstream base SHA: `<exact SHA or N/A>`
- Dependencies: `<none / patch IDs / N/A>`
- Exported patch files: `<paths or N/A>`
- Position in `downstream/patches/series`: `<order or N/A>`

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

## References

<!-- Issue/task/design links or identifiers, if available. -->
