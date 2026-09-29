# Narrow Project write guard SPEC

Status: **INTERNALLY REVIEWED; DURABLE PERSISTENCE PENDING**.

PLAN: [`project-write-guard-plan.md`](project-write-guard-plan.md)

## Scope

Track `downstream/scripts/gh-write.sh` as the single GitHub CLI write wrapper.
Keep its repository allowlist behavior for ordinary repository commands and add
one exact Project write route for moving Issue #186's existing Project #3 item
to `Done`.

## Fixed authorization values

```text
owner                 Skyline-Gazer
repository            Skyline-Gazer/pastebin-worker
project number        3
project ID            PVT_kwDOEwGMMc4BkEoc
issue number          186
item ID               PVTI_lADOEwGMMc4BkEoczg86CUA
Status field ID       PVTSSF_lADOEwGMMc4BkEoczhi2l5A
Done option ID        98236657
```

These values are code constants, not environment variables or caller
configuration. Changing any value requires a reviewed source change.

## Command contract

### Common repository authorization

Every invocation must contain exactly one two-argument repository selector:

```text
--repo Skyline-Gazer/pastebin-worker
```

Missing, duplicate, empty, aliased (`-R`), joined (`--repo=...`), or different
repository selectors fail with exit status `2` before `gh` runs.

### Ordinary repository route

Commands whose first argument is neither `project` nor the `api graphql`
command pair retain their original argument vector, including the authorized
`--repo` pair, when passed to `gh`.

The wrapper rejects an empty command. It emits only a fixed audit header with
the authorized owner, repository, and `repository_write` action; it does not
echo caller arguments.

### Project route

The only accepted Project caller vector is exactly:

```bash
project item-edit \
  --repo Skyline-Gazer/pastebin-worker \
  --id PVTI_lADOEwGMMc4BkEoczg86CUA \
  --field-id PVTSSF_lADOEwGMMc4BkEoczhi2l5A \
  --project-id PVT_kwDOEwGMMc4BkEoc \
  --single-select-option-id 98236657
```

Order is part of the contract. Exact-vector matching rejects extra arguments,
duplicates, alternate selectors, alternate ordering, other Project commands,
and wrong IDs without a general-purpose argument parser.

For this route, the wrapper consumes the `--repo` pair and invokes exactly:

```bash
gh project item-edit \
  --id PVTI_lADOEwGMMc4BkEoczg86CUA \
  --field-id PVTSSF_lADOEwGMMc4BkEoczhi2l5A \
  --project-id PVT_kwDOEwGMMc4BkEoc \
  --single-select-option-id 98236657
```

The wrapper emits fixed, non-secret audit fields for owner, repository, action,
project number/ID, issue number/item ID, field ID, and option ID. After `gh`
returns, it emits `RESULT=success` or `RESULT=failure` plus the numeric child
exit status and returns that same status.

### GraphQL

The command pair `api graphql` is always rejected with exit status `2` before
`gh` runs. No GraphQL query or mutation text is inspected or forwarded.

## Failure behavior

- Authorization or grammar failure: fixed diagnostic on stderr, exit `2`, no
  `gh` call.
- Child failure: sanitized failure audit, child exit status propagated.
- No fallback from a rejected Project or GraphQL route to ordinary passthrough.
- No live preflight or read-back is added; the pinned direct-ID mutation stays
  one CLI call and GitHub remains authoritative for target existence.

## Test contract

`downstream/tests/gh-write.test.sh` prepends a temporary stub named `gh` to
`PATH`. The test records child arguments and controls the child exit status
without network access.

It must prove:

1. the exact Project caller vector succeeds and the child receives the fixed
   vector without `--repo`;
2. missing, wrong, duplicate, aliased, or joined repository selectors fail
   without calling the stub;
3. wrong project, item, field, or option IDs and extra/reordered arguments fail
   without calling the stub;
4. other Project operations, name-based Project selectors, and `api graphql`
   fail without calling the stub;
5. an ordinary repository command keeps its original arguments;
6. Project child failure is reported without a success record and its exit
   status is propagated; and
7. Project audit output contains only the fixed identifiers and result fields.

## Documentation and review

- Record RED and GREEN commands/output in the TODO artifact.
- Keep PR #190 in draft until the tests, implementation, validation, and docs
  are complete.
- Require current-HEAD CI and the exact-HEAD Phase Review Gate before merge.
- Do not perform the Project mutation or close Issue #186 in this PR.

## Internal consistency review

- Matches the owner-approved PLAN and pinned read-only GitHub identities: PASS.
- Uses the installed CLI's direct-ID `item-edit` route: PASS.
- Avoids a general Project/GraphQL passthrough and mutable configuration: PASS.
- Preserves the existing ordinary repository command purpose: PASS.
- Keeps administrative execution and all release/production actions out of
  scope: PASS.

Status: SPEC INTERNALLY APPROVED AND READY FOR DURABLE REVIEW.
