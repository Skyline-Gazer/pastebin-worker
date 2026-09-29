# Narrow Project write guard PLAN

Status: **OWNER APPROVED 2026-09-29; DURABLY PERSISTED IN PR #190**.

Owner approval authorizes the remaining SPEC/PHASE/TODO artifacts and a
reviewed implementation PR. It does not authorize a Project or Issue mutation,
merge, reviewer-quorum override, production action, tag, deployment, release,
or publication.

## Objective

Extend `downstream/scripts/gh-write.sh` with one fail-closed GitHub Project
write route that can move only Issue #186's existing Project #3 item from its
current status to `Done`. Preserve the existing explicit repository allowlist
for ordinary repository writes and leave the actual Project update behind the
separate administrative execution gate.

## Context

`AGENTS.md` requires GitHub write automation to target
`Skyline-Gazer/pastebin-worker` explicitly through `gh-write.sh`. The audited
`downstream/main` baseline `e300500d0cba6dd486035d33ed304bb409448bd3`
contains that policy but does not track the wrapper. A historical local
untracked wrapper exists in another checkout; it validates `--repo` and then
passes all arguments to `gh`. It is user-owned untracked state, is not a release
input, and cannot be assumed to implement the approved Project restriction.

Installed `gh project item-edit` supports direct item, project, field, and
single-select option IDs. It does not accept `--repo`, so the guarded Project
route must treat `--repo` as wrapper authorization metadata and omit it from the
child `gh` invocation.

The current read-only identities are:

- repository: `Skyline-Gazer/pastebin-worker`;
- organization: `Skyline-Gazer`;
- Project #3: `PVT_kwDOEwGMMc4BkEoc`;
- Issue #186 item: `PVTI_lADOEwGMMc4BkEoczg86CUA`;
- Status field: `PVTSSF_lADOEwGMMc4BkEoczhi2l5A`;
- `Done` option: `98236657`;
- current item status: `Blocked` (`392f4536`).

The change is downstream governance/tooling. It does not modify upstream-owned
source or the exported patch series.

## Assumptions and verification

| Assumption | Verification |
| --- | --- |
| The baseline lacks a tracked wrapper. | `git cat-file -e e300500d:downstream/scripts/gh-write.sh` must fail. |
| The local untracked wrapper is not authoritative. | Confirm `git status --short -- downstream/scripts/gh-write.sh` reports `??` in the original checkout and no Git history owns the path. |
| Issue #186 has exactly one Project #3 item. | Read `gh project item-list 3 --owner Skyline-Gazer --format json` and match repository plus issue number. |
| The pinned field and option still mean `Status` and `Done`. | Read `gh project field-list 3 --owner Skyline-Gazer --format json`; do not write on mismatch. |
| Direct-ID `item-edit` is supported. | Inspect the installed `gh project item-edit --help`; exercise the final argv through a stub `gh`. |

## Non-goals

- No general `gh project` or GraphQL mutation passthrough.
- No arbitrary repository, organization, project, item, field, or option.
- No Issue closure, comment, Project mutation, or status read-back in this
  implementation PR.
- No modification of product behavior, production data, Cloudflare state,
  credentials, upstream source, patches, release tags, or release artifacts.
- No speculative wrapper framework, configuration file, or reusable policy
  engine.

## Risks and unknowns

- A permissive argument parser could turn the narrow route into a general
  Project mutation surface. The route must reject duplicates, aliases, extra
  flags, positional values, and unknown values before invoking `gh`.
- GitHub Project node IDs can change if the item or field is recreated. Pinned
  mismatches must fail closed and require a reviewed code change.
- Logging raw arguments could expose future caller data. The Project route must
  emit only a fixed sanitized audit record.
- The actual `Status -> Done` write and Issue closure may require separate owner
  authorization after the guard is reviewed and available; this PLAN grants
  neither.

## Proposed implementation approach

1. Track the existing repository allowlist wrapper at
   `downstream/scripts/gh-write.sh`.
2. Keep ordinary non-Project `gh` commands on the existing rule: require exact
   `--repo Skyline-Gazer/pastebin-worker`, print the resolved repository, and
   pass the command through unchanged.
3. Reject `gh api graphql` and every `gh project` command except the exact
   direct-ID `project item-edit` form approved here.
4. For that form, parse and validate one occurrence of each required flag,
   consume `--repo` as wrapper-only metadata, require the pinned IDs above, and
   invoke only `gh project item-edit` with the validated direct-ID arguments.
5. Print a sanitized audit record containing the fixed repository owner/name,
   action name, project number, Issue number, and pinned non-secret node IDs.
6. Add one shell fixture with a stub `gh` that proves the permitted argv and
   relevant fail-closed cases without contacting GitHub.

## Expected files/components

- `downstream/scripts/gh-write.sh` — candidate guarded wrapper implementation.
- `downstream/tests/gh-write.test.sh` — candidate stub-based contract test.
- `docs/planning/project-write-guard-{plan,spec,phases,todo}.md` — durable
  workflow artifacts.
- `docs/INDEX.md` and relevant governance/testing docs only if needed to make
  the new contract discoverable and accurate.

## Validation strategy

- Observe the new guard test fail before the wrapper implementation exists.
- Run the stub test for the one allowed Project invocation and rejection of
  wrong/missing repository, project, item, field, option, owner, duplicate or
  unknown flags, other Project commands, and GraphQL.
- Run `bash -n` on the wrapper and fixture.
- Run applicable downstream regression checks, formatting, and
  `git diff --check`.
- Require current-HEAD CI plus the exact-HEAD Phase Review Gate. Missing
  reviewer responses remain non-votes, and this governance change requires the
  normal quorum.

Status: PLAN APPROVED AND READY FOR DURABLE REVIEW.
Implementation has NOT started.
