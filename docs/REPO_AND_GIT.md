# Repository and Git Workflow

## 1. Design goal

The repository is a downstream fork that must remain easy to update from `SharzyL/pastebin-worker` while carrying a curated patch stack and an independent Feishu Add-on. It is actively maintained by the downstream, not passively dependent on upstream merge activity. Upstream acceptance timing MUST NOT gate downstream releases.

The Git model separates **development branches** from **release inputs**:

- branches are where changes are developed and reviewed;
- exported patch files plus pinned commit SHAs are what releases consume.

Do not make production reproducibility depend on the current head of a moving patch branch.

## 2. Long-lived branches

### `upstream-sync`

Clean mirror of upstream `goshujin`. It MUST contain only commits that exist in official upstream; it may temporarily lag behind the newest upstream commit between syncs. Updates MUST fast-forward to an official upstream commit only.

Rules:

- no Feishu code;
- no locally adopted PRs;
- no dependency updates not merged upstream;
- no downstream customization;
- no exported patches applied as committed source;
- used as the trusted source of upstream baseline SHAs.

Any change not present in official upstream is downstream-owned and MUST NOT be committed to `upstream-sync`.

### `downstream/main`

Long-lived downstream control branch.

It contains:

- `downstream/addons/feishu`;
- reviewed patch files under `downstream/patches`;
- `downstream/patches/series`;
- release/build scripts and manifest;
- downstream docs, `AGENTS.md`, CI/review metadata.

Upstream-owned application files should remain identical to the selected upstream baseline. Downstream behavior belongs in Add-on code or exported patches. Upstream runtime modifications MUST NOT be hidden directly in `downstream/main`; they must be represented as explicit downstream patches.

There is intentionally **no long-lived `deploy` branch**.

## 3. Patch topic branches

Every independent upstream patch is developed on its own branch:

```text
patch/non-expiring-paste
patch/<other-generic-capability>
patch/adopt-pr-123-multipart-fix
```

Default creation:

```bash
git fetch upstream
git switch upstream-sync
git switch -c patch/non-expiring-paste <UPSTREAM_SHA>
```

Adopted external changes use the same model, branched from the exact pinned upstream SHA.

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
2. fast-forward `upstream-sync` ONLY to the new upstream commit, after verifying the target exists in official upstream history; no arbitrary ref movement, no rewinds, no force updates;
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

If a historical release requires an older official-upstream commit, pin that older SHA in the release manifest for that release; do NOT rewind `upstream-sync`.

## 7. Curated adoption of external changes

Upstream synchronizations above handle changes already merged upstream. Independently adopted changes follow this path:

```text
exact pinned upstream SHA
        ↓
patch/<feature-or-adopted-change>
        ↓
development
        ↓
tests
        ↓
review
        ↓
git format-patch / stable patch artifact
        ↓
ordered downstream patch series
```

Rules:

- Candidates MAY include open upstream PRs, closed-but-unmerged PRs, abandoned PRs, third-party fixes, and upstream Dependabot PRs. Upstream PR status is not quality evidence.
- Do NOT directly merge arbitrary upstream/external PR branches into `downstream/main`. They must be re-developed or cherry-picked onto a dedicated `patch/<id>` branch from the pinned upstream base, reviewed, tested, and exported.
- Dependency updates to upstream-owned files (`package.json`, `pnpm-lock.yaml`, upstream `frontend/*`, `worker/*`, `shared/*`) and modifications to workflows that already exist upstream (e.g. `.github/workflows/*`) that are not merged upstream MUST be carried as patches, never committed directly into `downstream/main`. New downstream-only workflows (downstream CI covering `downstream/` or `docs/`) belong directly to `downstream/main`.
- Dependencies belonging only to downstream-owned code (`downstream/addons/feishu/`, downstream tooling) MAY merge into `downstream/main` through normal PRs.
- Every adopted change MUST preserve provenance (origin, PR URL/number, original author and commit SHA(s), upstream status at adoption, adoption date) and record validation; unknown fields are marked `unknown` / `not available`.
- Once adopted, the downstream owns maintenance. When official upstream later includes an equivalent change, retire the carried patch (see the lifecycle in `PATCH_AND_UPSTREAM.md` §3).

Independent patches SHOULD originate from the same pinned upstream base when they have no real dependency. Do not create artificial branch dependency chains only to express ordering.

## 8. Release refs

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

because those refs can move. The same applies to adopted PR refs: never build from `origin/pr/<n>` or a contributor's fork head.

## 9. Conventional Commits and review context

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

Adopted external patch commits SHOULD additionally reference the origin PR/commit in `Refs` or provenance metadata so review can verify provenance.

The AI reviewer must be able to understand why the change exists and how to verify it without reconstructing product intent from a one-line title.

## 10. Generated integration trees

Temporary integration worktrees are build artifacts.

Rules:

- never commit product fixes there;
- never use them as the next feature branch base;
- never make them a permanent deployment branch;
- delete/regenerate them after a failed replay or release build.

If integration fails, fix the source: either the responsible patch branch or `downstream/main` Add-on code.

## 11. Phase review gates and branch hygiene

Review-process details live in `docs/CHANGE_CONTEXT_AND_REVIEW.md` §9; this section covers the branch-level rules.

- Dependent phases branch from the refreshed merged `downstream/main` (`switch downstream/main` → `fetch/pull --ff-only` → verify clean/current base → create the next phase branch). Do NOT chain normal feature branches on unmerged phase branches; document an explicit dependency/workflow exception if stacking is truly required.
- A generic upstream patch source PR is REVIEW-ONLY (`REVIEW ONLY — DO NOT MERGE INTO upstream-sync`) and is never merged into `upstream-sync`; see `docs/PATCH_AND_UPSTREAM.md` §14.
- `upstream-sync` is fast-forward-only official-upstream history (§6); it is never used as a normal patch merge target and never receives downstream-owned commits.
- Desired `downstream/main` branch protection/ruleset (where GitHub repository settings support it), documented intent only — do not change GitHub settings from this process:
  - changes through PRs, not direct feature pushes;
  - required status checks;
  - no force pushes;
  - no branch deletion;
  - review conversations resolved where applicable;
  - branch up-to-date / merge queue policy where appropriate;
  - AI Review Bot status/check as required ONLY when the bot exposes a reliable status check; if the bot is comment/review-only, maintain the documented manual gate rather than inventing a fake status.
- Current review status/CI checks MUST correspond to the latest PR HEAD; any commit changing the HEAD SHA invalidates the previous AI-review gate (§9.2, §9.8).
- Whatever merge strategy is used, the resulting history MUST retain traceability to the reviewed PR and purpose (§9.12); the release contract (pinned upstream SHA + ordered patch series + Add-on source) is unchanged by this section.
