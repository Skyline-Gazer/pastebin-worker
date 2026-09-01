# Repository and Git Workflow

## 1. Design goal

The repository is a downstream fork that must remain easy to update from `SharzyL/pastebin-worker` while carrying a small generic patch stack and an independent Feishu Add-on.

The Git model separates **development branches** from **release inputs**:

- branches are where changes are developed and reviewed;
- exported patch files plus pinned commit SHAs are what releases consume.

Do not make production reproducibility depend on the current head of a moving patch branch.

## 2. Long-lived branches

### `upstream-sync`

Clean mirror of upstream `goshujin`.

Rules:

- no Feishu code;
- no downstream customization;
- no exported patches applied as committed source;
- used as the trusted source of upstream baseline SHAs.

### `downstream/main`

Long-lived downstream control branch.

It contains:

- `downstream/addons/feishu`;
- reviewed patch files under `downstream/patches`;
- `downstream/patches/series`;
- release/build scripts and manifest;
- downstream docs, `AGENTS.md`, CI/review metadata.

Upstream-owned application files should remain identical to the selected upstream baseline. Downstream behavior belongs in Add-on code or exported patches.

There is intentionally **no long-lived `deploy` branch**.

## 3. Patch topic branches

Every independent upstream patch is developed on its own branch:

```text
patch/non-expiring-paste
patch/<other-generic-capability>
```

Default creation:

```bash
git fetch upstream
git switch upstream-sync
git switch -c patch/non-expiring-paste <UPSTREAM_SHA>
```

Patch branches must remain narrowly scoped. A branch named `patch/non-expiring-paste` must not also contain Feishu frontend changes or unrelated upstream refactoring.

### Why direct upstream bases are preferred

Independent patches should branch from the same upstream baseline rather than forming an accidental chain:

```text
preferred

                 patch/A
                /
upstream SHA ---+--- patch/B
                \
                 patch/C
```

Avoid this unless the dependency is real:

```text
upstream -> patch/A -> patch/B -> patch/C
```

Hidden ancestry dependencies make rebasing to a new upstream release harder and obscure which patch caused a conflict.

### True dependencies

If patch B genuinely requires patch A, state the dependency explicitly in its README and patch-series documentation. An ephemeral stacked development workspace may be used, but the final exported ordered series must replay cleanly from the pinned upstream SHA.

## 4. Feishu feature branches

Feishu work branches from `downstream/main`:

```text
feat/feishu-upstream-style-ui
feat/feishu-batch-mode
feat/feishu-archive-actions
fix/feishu-batch-partial-failure
fix/feishu-webhook-signature
```

Merge reviewed Feishu work back into `downstream/main`.

The Add-on frontend/backend/shared/tests/docs remain one cohesive downstream unit even when they deploy separately.

## 5. Patch promotion workflow

A patch is not a stable downstream patch merely because a branch exists.

Promotion steps:

1. Develop on `patch/<id>` from a pinned upstream SHA.
2. Write tests and review-ready commits.
3. Review the isolated patch branch.
4. Export the approved commits with `git format-patch`.
5. Commit exported `.patch` files into `downstream/main`.
6. Add the files to `downstream/patches/series` in explicit order.
7. Replay the complete series from the pinned upstream SHA using `check-patches.sh`.
8. Merge only after replay and tests pass.

Example export:

```bash
downstream/scripts/export-patch.sh \
  <UPSTREAM_SHA> \
  patch/non-expiring-paste \
  010-non-expiring-paste
```

The exported patch preserves the reviewed commit message, including business context and acceptance criteria.

## 6. Upstream synchronization

When upstream advances:

1. fetch upstream;
2. move/update `upstream-sync` to the desired new upstream commit;
3. merge that clean upstream update into `downstream/main` (normally through a `chore(upstream)` PR) without adding downstream edits to upstream-owned paths;
4. update the pinned upstream SHA in the release manifest for a candidate build;
5. replay the existing complete patch series from the new base;
6. if a patch fails, stop and identify the first failing patch;
7. adapt only that patch in its `patch/<id>` development branch against the new upstream base;
8. re-test/re-review/re-export it;
9. repeat until the complete series replays;
10. run patched upstream and Add-on integration tests;
11. create a downstream release commit/tag only after all gates pass.

Do not fix a conflict in a generated build tree and then continue. Such a fix is not durable.

## 7. Release refs

Production/release builds must use immutable inputs:

```text
upstream commit SHA
+
downstream release commit/tag
+
ordered patch series from that downstream revision
```

Recommended release tag pattern:

```text
downstream-v2026.09.01.1
```

A release must not depend on:

```text
patch/non-expiring-paste@latest
addon/feishu@latest
upstream-sync@latest
```

because those refs can move.

## 8. Conventional Commits and review context

Subjects use Conventional Commits:

```text
feat(feishu): add batch selection mode
feat(expiration): support non-expiring pastes
fix(feishu): keep failed batch items selected
build(downstream): replay ordered patch series
chore(upstream): sync goshujin to <sha>
docs(git): define patch promotion workflow
```

Non-trivial commit bodies must contain:

```text
Context:
Expected behavior:
Acceptance criteria:
Constraints:
Validation:
Docs:
Refs:
```

Upstream patch commits additionally include:

```text
Upstream base:
Patch ID:
Dependencies:
```

The AI reviewer must be able to understand why the change exists and how to verify it without reconstructing product intent from a one-line title.

## 9. Generated integration trees

Temporary integration worktrees are build artifacts.

Rules:

- never commit product fixes there;
- never use them as the next feature branch base;
- never make them a permanent deployment branch;
- delete/regenerate them after a failed replay or release build.

If integration fails, fix the source: either the responsible patch branch or `downstream/main` Add-on code.
