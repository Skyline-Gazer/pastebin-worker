# Narrow Project write guard SPEC

Status: **OWNER AUTHORIZED IMPLEMENTATION; EXACT-HEAD VALIDATION PENDING**.

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
--repo github.com/Skyline-Gazer/pastebin-worker
```

The logical allowlist remains exactly `Skyline-Gazer/pastebin-worker`. The
canonical full selector binds ordinary `gh` operations to public GitHub.
Missing, duplicate, empty, attached (`-R<repo>` or `-R=<repo>`), joined
(`--repo=...`), malformed `--repo*`, hostless, alternate-host, or different
repository selectors fail with exit status `2` before `gh` runs, including
when a valid selector is also present.

### Host resolution

Every child process receives `GH_HOST=github.com`. The wrapper unsets
`GH_REPO`, `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_COMMON_DIR`, then runs from
`/` to prevent the caller's environment or Git remote from choosing a host.
It rejects `-h`, `--hostname*`, and `--host*` selectors.

GitHub's CLI contract says `GH_HOST` is used when a host is not provided or
cannot be inferred from local Git context, and `GH_REPO` supplies an implicit
`[HOST/]OWNER/REPO` target. The wrapper does not assume `GH_HOST` overrides a
repository remote. See <https://cli.github.com/manual/gh_help_environment>.

### Ordinary repository route

Commands whose first argument is neither `project`, `api`, nor `repo` retain
their original argument vector, including the authorized `--repo` pair, when
passed to `gh`. The wrapper rejects the generic `api` and `repo` command
families because their positional target can bypass repository metadata. A
caller argument containing a URL scheme is rejected because URL targets can
override repository metadata or hide in case/host aliases. Callers use numeric
Issue/PR targets and body files instead. Host selectors and root options that
could alter command routing are rejected before dispatch.

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

### API and GraphQL

Every generic `api` route is rejected with exit status `2` before `gh` runs.
This prevents GraphQL endpoint spelling/ordering bypasses and REST endpoints
whose target is independent of `--repo`. A future API write requires its own
pinned, reviewed route.

## Failure behavior

- Authorization or grammar failure: fixed diagnostic on stderr, exit `2`, no
  `gh` call.
- Child failure: sanitized failure audit, child exit status propagated.
- No fallback from a rejected Project or GraphQL route to ordinary passthrough.
- No live preflight or read-back is added; the pinned direct-ID mutation stays
  one CLI call and GitHub remains authoritative for target existence.

## Test contract

`downstream/tests/gh-write.test.sh` prepends a temporary stub named `gh` to
`PATH`. It calls the wrapper from a temporary Git repository with a foreign
remote and hostile `GH_HOST`, `GH_REPO`, and Git-context environment, then
records actual child arguments, environment, and working directory without
network access.

It must prove:

1. the exact Project caller vector succeeds and the child receives fixed argv
   without wrapper-only `--repo`, with pinned `GH_HOST`, cleared ambient
   repository context, and working directory `/`;
2. an ordinary repository write succeeds with its exact canonical full-repo
   argv and the same child environment;
3. missing, wrong, duplicate, attached, joined, malformed, or alternate-host
   repository selectors fail without calling the stub;
4. wrong project, item, field, or option IDs and extra/reordered arguments fail
   without calling the stub;
5. other Project operations, name-based Project selectors, generic `api` and
   `repo` commands, hostname flags, and foreign positional repository URLs
   fail without calling the stub;
6. Project child failure is reported without a success record and its exit
   status is propagated; and
7. sanitized audit output contains fixed identifiers and never caller data.

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

Status: OWNER AUTHORIZED IMPLEMENTATION; exact-HEAD gate pending.
