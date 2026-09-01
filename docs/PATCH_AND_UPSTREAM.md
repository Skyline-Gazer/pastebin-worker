# Patch and Upstream Maintenance

## 1. Purpose

The downstream fork should behave like:

```text
release N = exact upstream SHA + reviewed ordered generic patch series
```

The Feishu Add-on remains a separate downstream component and is not encoded as one giant upstream patch.

This minimizes merge conflict surface and makes upstream upgrades auditable.

## 2. Clean upstream mirror

`upstream-sync` mirrors upstream `SharzyL/pastebin-worker:goshujin` and contains no downstream product behavior.

Never use `upstream-sync` as a place to “temporarily” fix downstream behavior.

## 3. What belongs in a patch

A patch is justified only when the Add-on cannot provide the required capability through existing upstream APIs.

Initial generic requirement:

```text
e=never -> non-expiring Paste
e=max   -> deployment MAX_EXPIRATION
```

The patch may need to update upstream expiration metadata, KV behavior, R2 metadata/cleanup, validation, and tests.

The patch must not know about:

- Feishu;
- checkbox state;
- Active/Archive pages;
- Batch Mode;
- Feishu bindings;
- Feishu management workflow.

## 4. One patch, one development branch

Each logically independent patch is developed on its own `patch/<id>` branch from the exact upstream base it targets.

Example:

```text
upstream SHA abc123
├─ patch/non-expiring-paste
├─ patch/generic-capability-b
└─ patch/generic-capability-c
```

This isolates review and makes upstream upgrade failures attributable.

Do not stack independent patch branches merely because the release replay order is A then B then C.

## 5. True dependencies

Patch dependency and patch ordering are not the same thing.

If B truly requires API/schema behavior introduced by A:

- document `requires: A` in B's README;
- keep the dependency visible in review;
- ensure `series` lists A before B;
- ensure the entire series replays from the pinned upstream base.

Do not rely on hidden branch ancestry as the only expression of dependency.

## 6. Export reviewed branches, do not merge them into release

After a patch branch passes review and tests, switch to a `downstream/main` checkout/worktree and export the reviewed branch into the downstream patch directory. For an independent patch:

```bash
downstream/scripts/export-patch.sh \
  <UPSTREAM_SHA> \
  patch/<name> \
  <NNN-patch-id>
```

For a truly dependent patch, pass `--start <PREREQUISITE_STACK_TIP>` so only the dependent commits are exported while `--base` metadata still records the original upstream base. The dependency must also be documented explicitly.

Why `format-patch`/`git am` rather than a raw working-tree diff:

- preserves commit boundaries;
- preserves commit messages and AI-review context;
- supports multi-commit patch series;
- gives a deterministic ordered replay model;
- keeps the release independent of moving branch heads.

## 7. Ordered series

`downstream/patches/series` is the only release patch-order authority.

Example:

```text
# Generic expiration capability
010-non-expiring-paste/0001-expiration-support-non-expiring-pastes.patch
010-non-expiring-paste/0002-expiration-skip-permanent-r2-cleanup.patch

# Later generic capability
020-example/0001-example.patch
```

Rules:

- replay exactly top to bottom;
- never automatically apply every `.patch` found in the tree;
- never rely on lexical directory sort as the contract;
- fail when a listed file is missing;
- ignore unlisted patch files during release assembly.

## 8. Validation

Patch validation must replay the series sequentially in a clean temporary worktree created from the pinned upstream commit.

Preferred validation mechanism:

```text
git worktree add --detach <tmp> <UPSTREAM_SHA>
git am patch-1
git am patch-2
...
```

Do not validate a dependent series by running `git apply --check` on all patch files against the same untouched base; later patches may legitimately depend on earlier patches in the series.

## 9. Fail closed

Release automation must not use automatic three-way merge guessing:

```text
NO: git am --3way
NO: git apply --3way
```

A failed replay means the patch must be consciously adapted and reviewed.

The correct repair path is:

```text
new upstream SHA
      ↓
series replay fails at patch X
      ↓
return to patch/X development branch
      ↓
adapt + tests + review
      ↓
export replacement patch
      ↓
replay whole series from scratch
```

## 10. Patch metadata

Each patch directory should document:

- stable patch ID/name;
- purpose;
- generic behavior;
- upstream base used during latest development;
- source development branch;
- dependencies, if any;
- test coverage;
- compatibility notes.

The patch directory README is explanatory metadata; the `.patch` files and `series` order are the executable release representation.

## 11. Release provenance

A release should record:

- upstream SHA;
- downstream release SHA/tag;
- ordered patch filenames;
- patch file hashes;
- test/build status.

That allows a historical release to be reconstructed without requiring old patch branch heads to still exist.
