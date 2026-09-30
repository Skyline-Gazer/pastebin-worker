# Guarded Planning Publication

Status: **OWNER AUTHORIZED — implementation scope approved 2026-09-30**.

Parent planning approval: Final Release Readiness PHASE/TODO at exact commit
`d2fd1b4c438ffcf8cb71e04914bbe8a6cb9e2a32`.

## Context and expected behavior

The approved Release Readiness SPECs and PHASE/TODO exist locally and need a
separate reviewable PR. The current `gh-write.sh` rejects PR creation and has
no guarded branch-push route. Extend it only for publishing a clean `codex/*`
topic branch to the authorized `origin` repository and creating a PR targeting
`downstream/main`. Pushes must be non-forced, create-only, and include the
current remote `downstream/main` as an ancestor. PR creation must bind its head
to the current local branch and exact remote head. Keep existing write routes
and their fixed repository/host checks intact.

## Acceptance criteria

- Only the exact `Skyline-Gazer/pastebin-worker` target is accepted.
- Branch publication rejects dirty/detached/non-`codex/*` worktrees, an
  unexpected origin URL, stale base ancestry, existing remote branch names,
  tags, deletion refspecs, force options, and extra arguments.
- PR creation accepts only `downstream/main` as base and the current pushed
  `codex/*` branch as head; target repository and required title/body are
  explicit. It does not expose generic `gh api` or `gh` passthrough.
- Stub-based tests prove approved child argv and fail-closed rejection without
  network access; existing guard fixtures stay green.
- Before planning publication, verify the exact approved commit SHAs, both
  SPEC ancestors, the nine-commit ancestry from `c0a2f9c26533685cc782c0d86b076dd6f73cf89f`,
  and the live base SHA. Do not rewrite or reuse PR #191's branch.

## Constraints and non-goals

This is downstream governance tooling. No GitHub write occurs during tests.
The authorized publication flow is limited to the approved planning history
and the guard-extension review PR. Do not enable general Git pushes, tag
writes, repository/API passthrough, force-push, GitHub UI publication, project
or issue mutations, production actions, deployment, release, or tag ruleset
changes. A changed PHASE/TODO requires renewed owner review and approval.

## Phase and TODO

Branch type: `build/*`; PR target: `downstream/main`.

1. Add failing stub cases for branch-push and PR-create authorization.
2. Add the smallest strict routes to `downstream/scripts/gh-write.sh`.
3. Run the guard contract test, shell syntax checks, and `git diff --check`.
4. Commit with full review context; open the guard review PR through the new
   route, then publish the approved planning branch and open its separate PR.
5. Stop before implementation, merge, production changes, and tag/ruleset work.

Tests required: `bash downstream/tests/gh-write.test.sh` and `bash -n` for the
wrapper and its shell fixture.

## Validation and documentation

RED: `bash downstream/tests/gh-write.test.sh` exited `1` at the first allowed
branch-push case because the existing wrapper rejected `git push`; no network
call occurred.

GREEN: `bash downstream/tests/gh-write.test.sh` — PASS using local `git` and
`gh` stubs. `bash -n downstream/scripts/gh-write.sh
downstream/tests/gh-write.test.sh` — PASS. `git diff --check` — PASS. Local
`gh` 2.101.0 help confirmed the PR list/create flags; ShellCheck is unavailable.

The guard contract and this plan are the affected documentation. Required
exact-HEAD CI and Phase Review Gate settlement remain pending after PR
creation.

## Owner-authorized existing-branch update addendum (2026-09-30)

The Owner separately authorized a minimum guarded update route for publishing
only the new PR #192 HEAD and the authorized formatter-only PR #193 HEAD. The
original create-only route and its checks remain unchanged.

The update route requires the caller to provide the expected current remote
HEAD for the same-name `codex/*` branch. It verifies the authorized HTTPS
origin, clean worktree, exact current remote SHA, fetched remote commit,
fast-forward ancestry, and live `downstream/main` ancestry, then rechecks the
remote SHA immediately before a non-forced push of the reviewed local commit to
that fixed branch ref. It rejects configured proxies, alternate transport
routes, mirror mode, stale or moved remote heads, no-op/non-fast-forward
updates, and all extra push options/refspecs. It never pushes tags.

Validation:

- RED: `bash downstream/tests/gh-write.test.sh` exited 1 at the new allowed
  existing-branch update case while the create-only guard was still in place.
- GREEN: `bash downstream/tests/gh-write.test.sh` — PASS, including positive
  fast-forward publication and negative repository, expected-HEAD, remote
  movement, ancestry, proxy, mirror, transport, force, tag, and extra-refspec
  fixtures. All GitHub/Git push calls use local stubs.
- `bash -n downstream/scripts/gh-write.sh downstream/tests/gh-write.test.sh` —
  PASS.
- `git diff --check` — PASS.

The published update is limited to PR #192 and PR #193 under the 2026-09-30
Owner decision. It does not authorize a merge, unrelated branch update,
implementation, production action, or release.
