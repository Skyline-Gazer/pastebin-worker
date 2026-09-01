# Build and Deploy

## 1. Build model

There are two separate build targets:

```text
A. Patched Pastebin
   exact upstream SHA + ordered generic patch series

B. Feishu Add-on
   downstream/addons/feishu at exact downstream release SHA/tag
```

They belong to one downstream product release but should not be forced into one source tree or one Cloudflare Worker artifact.

## 2. Immutable release inputs

A release build must use:

- exact upstream commit SHA from `downstream/release.json`;
- exact downstream checkout commit/tag;
- exact `downstream/patches/series` from that checkout;
- exact patch files listed by `series`.

Never release from moving branch heads as implicit dependencies.

## 3. Clean release checkout

Production release automation must reject a dirty checkout.

The downstream release commit/tag pins:

- Feishu Add-on source;
- patch files;
- series order;
- build scripts;
- docs/configuration committed for that release.

## 4. Patched upstream assembly

The build script creates a clean ephemeral Git worktree at the pinned upstream SHA and replays the patch series sequentially with `git am`.

Conceptually:

```text
release.json
   |
   `-- upstream.commit = abc123
              |
              v
       temporary worktree
              |
       git am series[0]
              |
       git am series[1]
              |
             ...
              |
        tests / build
```

The temporary worktree is generated; it is not a development branch and must not receive manual fixes.

## 5. Fail-closed behavior

If any patch fails:

- stop immediately;
- abort `git am`;
- report the first failing patch;
- do not build/deploy the partially patched source;
- do not use automatic three-way conflict resolution;
- fix/review/re-export the responsible patch, then rebuild from scratch.

## 6. Feishu Add-on build

The Add-on is built from:

```text
downstream/addons/feishu
```

at the same exact downstream release commit/tag.

Do not copy the Add-on into upstream `/frontend` or `/worker` just to create a single package.

The Add-on may have independent Cloudflare build/deploy commands while sharing the same release version/provenance metadata.

## 7. Recommended CI stages

```text
checkout exact downstream release revision
      |
verify clean checkout
      |
parse release.json
      |
verify pinned upstream commit exists/fetch it
      |
validate series file
      |
replay complete patch series in temp worktree
      |
patched upstream tests/typecheck/build
      |
Feishu Add-on tests/typecheck/build
      |
integration/API contract tests
      |
generate release provenance
      |
deploy patched Pastebin and Add-on separately
```

CI may split the two build targets into parallel jobs after common manifest/patch validation.

## 8. Release provenance

Generate a machine-readable record containing at least:

```text
upstream commit
 downstream commit/tag
 ordered patch paths
 patch hashes
 patched upstream test/build result
 Feishu Add-on test/build result
 deployment identifiers if available
```

Do not call a release reproducible if these inputs are not recorded.

## 9. Rollback

Rollback should select a previous downstream release tag/commit and rebuild/redeploy from its pinned manifest.

Do not roll back by manually editing the generated integration tree or trying to reverse individual patch commits in production.

## 10. Cloudflare-specific note

Keep Pastebin and Feishu Add-on deployment configuration independent. They may share environment documentation, but a failure in one deployment should not require mixing their source ownership boundaries.
