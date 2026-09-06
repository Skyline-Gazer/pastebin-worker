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

### Candidate gate

`downstream/scripts/release-candidate.sh` is the downstream-only, non-deploy
candidate gate. It rejects a dirty checkout; schema-validates the exact
manifest pin; reads only nonblank, noncomment series entries; rejects unsafe,
duplicate, or missing paths; and creates a fresh detached worktree for ordered
`git am` replay. It removes that worktree on every exit, including the first
replay failure.

The command runs separately named `PASTEBIN` and `ADDON` checks. Its default
checks use the repository-local tool binaries; CI may provide equivalent
commands through `PASTEBIN_CHECK_COMMAND` and `ADDON_CHECK_COMMAND`. A failed
or blocked target prints `CANDIDATE_STATUS=failed`, `TAG_ELIGIBLE=no`, and
`DEPLOY_CLAIM=no`. Only both passing checks print `CANDIDATE_STATUS=passed`.
The command has no tag-creation or deploy operation.

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

### Candidate provenance and protected tag eligibility

`downstream/scripts/release-provenance.sh --output <safe-path>` runs the
non-deploy candidate gate and retains a schema-versioned JSON evidence record
only after both targets pass. Version 1 records the exact upstream/downstream
commits, `downstreamTag: null` plus `tagState: "not-created"` for a candidate,
the ordered patch paths and SHA-256 values, assembled HEAD/tree, per-target
check statuses, and explicit `null` artifact/deployment identifiers when none
are available. It does not copy target command output into provenance.

Candidate provenance is evidence, never authorization. CI must retain candidate
artifacts for at least 30 days. The final provenance for an approved immutable
release tag must be retained with that tagged release record for the life of
the release. If publication/retention fails, the candidate fails closed and
cannot be described as reproducible or eligible.

`downstream/scripts/release-tag-eligibility.sh --tag downstream-vYYYY.MM.DD.N
--provenance <safe-path>` is validation only. It refuses malformed names, a
dirty checkout, an existing tag collision, provenance that does not match the
current commit/assembled result, or a candidate that does not independently
pass again. It never creates, pushes, retargets, or deletes a tag, and it does
not deploy. An authorized release actor remains responsible for any later,
separately approved annotated tag mutation.

Pull-request workflows use read-only validation and must not run tag mutation
or deployment commands. This repository keeps that assertion executable in
`downstream/tests/phase10-provenance-tag.test.sh`; no existing workflow is
modified by this downstream phase.

## 9. Rollback

Use the non-production reconstruction/revalidation rehearsal before an
owner-controlled production handoff:

```bash
downstream/scripts/release-rollback-rehearsal.sh \
  --tag fixture-nonprod-rollback-prior --provenance <retained-provenance.json>
```

The command accepts only an existing tag, resolves it to a commit, checks out
that revision in a disposable worktree, and runs that revision's candidate gate.
It therefore reads the tagged manifest, patch series, Add-on, and scripts—not
the caller's dirty checkout—and reports the clean ordered replay, both target
results, provenance comparison, selected SHA, and `DEPLOY_CLAIM=no`. It never
deploys, provisions credentials, or mutates a tag.

For this first downstream release cycle, owner decision 2026-09-06 option 2
authorizes the local-only tag prefix `fixture-nonprod-rollback-prior` (more
generally `fixture-nonprod-*`). That prefix cannot match the protected
production discovery pattern `downstream-vYYYY.MM.DD.N`; this is a
**FIRST-RELEASE EXCEPTION**, not evidence that a production rollback was
performed. There is no genuine prior production release tag in this cycle.

The next real release cycle MUST rerun the rehearsal with an actual immutable
prior `downstream-v*` tag. Production rollback/deploy remains a separate,
owner-authorized handoff using separately provisioned Pastebin and Add-on
credentials. A failed rehearsal or deployment receives no automatic repair,
rollback, generated-tree edit, or success claim.

Do not roll back by manually editing the generated integration tree or trying to reverse individual patch commits in production.

## 10. Cloudflare-specific note

Keep Pastebin and Feishu Add-on deployment configuration independent. They may share environment documentation, but a failure in one deployment should not require mixing their source ownership boundaries.
