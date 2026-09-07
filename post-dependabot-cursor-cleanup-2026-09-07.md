# Post-Dependabot cursor branch cleanup — 2026-09-07

Verification report after deleting four already-merged `cursor/adopt-*` remote
heads from `Skyline-Gazer/pastebin-worker`. Deletions were performed one at a
time with `git push origin --delete`. No tags were modified. Protected heads
were not deleted.

## 1. Deletion results

| Branch | Pre-delete SHA | Result |
| --- | --- | --- |
| `cursor/adopt-npm-minor-6307` | `07db94705c5ea5520e96492f14a8738368d170f7` | deleted |
| `cursor/adopt-bcrypt-ts-major-e1dc` | `1446a96f7b7d77784df09f7885a532a24c9abcdb` | deleted |
| `cursor/adopt-toml-major-39d8` | `6c620a00ec2f3ff452686d4481cf939a05c17e79` | deleted |
| `cursor/adopt-jest-dom-major-b2ed` | `6e0bfb3fcfa7fecd838b7e2a0a158a6b92e4aead` | deleted |

No `422` / already-gone responses; all four existed and were deleted on the
first attempt.

`git fetch --prune` afterward also dropped stale *local* tracking refs for
already-absent remotes `cursor/chore-ci-bump-actions-pins-c95f` and
`cursor/dependabot-target-downstream-main-8d97`. Those remotes were **not**
deleted in this operation; they were already gone on the origin.

## 2. Remaining remote heads (`git ls-remote --heads origin`)

```text
4c400cfa5e9ae5cdadb6a3afbcb8a59580d5e930	refs/heads/downstream/main
0835cac4ab8f974035d31845f5c2b93b0c85b5c6	refs/heads/goshujin
5bbc43c5441c700024ae39befb7282ceddf59ec3	refs/heads/handoff/grok-bot-2026-09-05
e10e06fffacdcec43f2a2e271e63dbd075d757ed	refs/heads/patch/non-expiring-paste
0835cac4ab8f974035d31845f5c2b93b0c85b5c6	refs/heads/upstream-sync
```

Protected heads still present (not deleted):

- `downstream/main`
- `upstream-sync`
- `goshujin`
- `handoff/grok-bot-2026-09-05`
- `patch/non-expiring-paste`

The four deleted `cursor/adopt-*` heads are absent from `git ls-remote --heads origin`.

## 3. `downstream/main` tip

- Expected: `4c400cfa5e9ae5cdadb6a3afbcb8a59580d5e930`
- Observed: `4c400cfa5e9ae5cdadb6a3afbcb8a59580d5e930`
- Subject: `Merge pull request #57 from Skyline-Gazer/cursor/adopt-jest-dom-major-b2ed`
- **Unchanged.** Deletions did not move the control branch.

## 4. Tag peel (tags were not touched)

`git ls-remote --tags origin`:

```text
c2a36242ab8aedb4d5032c0739a89b12e924e4d0	refs/tags/downstream-v2026.09.07.1
0fc784c2a4cf2951de060cae37b8e89dfb054820	refs/tags/downstream-v2026.09.07.1^{}
```

- Annotated tag object: `c2a36242ab8aedb4d5032c0739a89b12e924e4d0`
- Peeled commit: `0fc784c2a4cf2951de060cae37b8e89dfb054820`
- Expected peel: `0fc784c2a4cf2951de060cae37b8e89dfb054820`
- **Match.** Only this one tag exists on origin. No tags were created, moved, or deleted.

## 5. `dependabot/*` remotes

`git ls-remote --heads origin 'refs/heads/dependabot/*'` returned **empty**.

**No `dependabot/*` remote heads remain.**

## 6. `dependabot.yml` `target-branch` lines (tip of `downstream/main`)

Source: `git show origin/downstream/main:.github/dependabot.yml`

```text
5:    target-branch: "downstream/main"
14:    target-branch: "downstream/main"
```

Both configured ecosystems (`github-actions` at `/` and `npm` at `/`) target
`downstream/main`. No other `target-branch` lines exist in that file.

## 7. Classify `goshujin`

| Fact | Value |
| --- | --- |
| SHA | `0835cac4ab8f974035d31845f5c2b93b0c85b5c6` |
| `upstream-sync` SHA | `0835cac4ab8f974035d31845f5c2b93b0c85b5c6` |
| Identical to `upstream-sync`? | **YES** (same commit) |
| Unique commits `upstream-sync..goshujin` | **none** |
| Unique commits `goshujin..upstream-sync` | **none** |
| Diffstat vs `upstream-sync` | empty |

`goshujin` references on tip of `downstream/main` (`.github/workflows`):

```text
origin/downstream/main:.github/workflows/deploy.yml:5:      - goshujin
origin/downstream/main:.github/workflows/pr.yml:9:  coverage-goshujin:
origin/downstream/main:.github/workflows/pr.yml:17:          ref: goshujin
origin/downstream/main:.github/workflows/pr.yml:39:          name: coverage-goshujin
origin/downstream/main:.github/workflows/pr.yml:103:      - name: "Download goshujin coverage artifacts"
origin/downstream/main:.github/workflows/pr.yml:106:          name: coverage-goshujin
origin/downstream/main:.github/workflows/pr.yml:107:          path: coverage-goshujin
origin/downstream/main:.github/workflows/pr.yml:112:          json-summary-compare-path: coverage-goshujin/coverage-summary.json
```

Classification: **NOT SAFE_DELETE**.

Reason: even though the SHA is identical to `upstream-sync`, tip workflows
still use the branch *name* `goshujin` as the deploy push trigger
(`deploy.yml`) and as the coverage-baseline checkout ref (`pr.yml`
`ref: goshujin`). Deleting the name would break those jobs. The fork also
treats `goshujin` as the official-upstream branch name that `upstream-sync`
mirrors.

## 8. Classify `handoff/grok-bot-2026-09-05`

| Fact | Value |
| --- | --- |
| Tip SHA | `5bbc43c5441c700024ae39befb7282ceddf59ec3` |
| Tip subject | `docs(handoff): freeze Phase 4 for Grok Bot transfer` |
| Merge-base with `downstream/main` | `09148c96cad01af4a5938e5d74f3b3a33823e348` |
| Ancestor of `downstream/main`? | **no** |
| Commits not in `downstream/main` | **2** |

Commits not reachable from `downstream/main`:

1. `64eb1a98598388485272180cff9147a4789f8548` — `docs(feishu): define Phase 4 webhook contract`
2. `5bbc43c5441c700024ae39befb7282ceddf59ec3` — `docs(handoff): freeze Phase 4 for Grok Bot transfer`

Durable-content supersession:

- `docs/planning/phase4-plan.md` on the handoff tip is **byte-identical** to
  `downstream/main`.
- `docs/planning/phase4-spec.md` differs by 8 lines (handoff still said
  `SPEC READY FOR OWNER REVIEW`; `downstream/main` records
  `SPEC APPROVED` plus PHASE/TODO authorization wording). Downstream later
  also added `phase4-phases.md`, `phase4-todo.md`, and merged Phase 4
  implementation (PR #12 at `a9121788e0c653ef592331ba823afa63915553a6`).
  Phase 4 planning/execution state on this handoff is **superseded**.
- Unique file **not** present on `downstream/main`:
  `docs/handoffs/2026-09-05-grok-bot-freeze.md` (159 lines). That freeze
  snapshot itself was never merged.

Classification: **KEEP**.

Not `SAFE_DELETE_AFTER_SUPERSEDED` yet: the unique freeze document is not on
`downstream/main`. Phase 4 *planning/execution* content is superseded, but
the unmerged handoff file remains the only copy of that 2026-09-05 freeze
record. Retain until that file is archived onto a durable branch or the
owner explicitly declares the snapshot disposable.

## 9. Non-goals / what was not done

- Did not delete `downstream/main`, `upstream-sync`, `goshujin`,
  `handoff/grok-bot-2026-09-05`, or `patch/non-expiring-paste`.
- Did not create, move, or delete any tags.
- Did not rewrite history or move `downstream/main`.
- Did not change Dependabot configuration.
- Did not merge or fast-forward any remaining heads.

## 10. Command evidence

```text
# deletions (one at a time; all succeeded)
git push origin --delete cursor/adopt-npm-minor-6307
git push origin --delete cursor/adopt-bcrypt-ts-major-e1dc
git push origin --delete cursor/adopt-toml-major-39d8
git push origin --delete cursor/adopt-jest-dom-major-b2ed

# post-delete verification
git fetch --prune
git ls-remote --heads origin
git ls-remote origin refs/heads/downstream/main
git ls-remote --tags origin
git ls-remote --heads origin 'refs/heads/dependabot/*'
git show origin/downstream/main:.github/dependabot.yml
git rev-parse origin/goshujin origin/upstream-sync
git log --oneline origin/upstream-sync..origin/goshujin
git grep -n goshujin origin/downstream/main -- '.github/workflows/*'
git log --oneline origin/downstream/main..origin/handoff/grok-bot-2026-09-05
```
