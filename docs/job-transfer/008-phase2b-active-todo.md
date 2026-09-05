# Phase 2B Active TODO — Patch 010 Promotion

Status: **OWNER APPROVAL REQUIRED — PLANNING CHECKPOINT ONLY**

This TODO is derived from the OWNER APPROVED Issue #3/#4 semantics and the Phase 2B procedures in `docs/PATCH_AND_UPSTREAM.md §14.2`, `docs/CHANGE_CONTEXT_AND_REVIEW.md §9.14`, and `docs/TESTING.md §11`. No Phase 2B execution has started.

## Durable inputs

- Spec: [Issue #3](https://github.com/Skyline-Gazer/pastebin-worker/issues/3)
- Phase/TODO: [Issue #4](https://github.com/Skyline-Gazer/pastebin-worker/issues/4)
- Reviewed Stage A source HEAD: `e10e06fffacdcec43f2a2e271e63dbd075d757ed`
- Pinned upstream base: `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`
- Stage A PR #5: OPEN / UNMERGED (review-only; never merge into `upstream-sync`)
- Patch ID: `010-non-expiring-paste`

## Active Phase 2B TODO

The following steps are ordered and must be checked off only with real evidence:

- [ ] Refresh `downstream/main` from its configured remote using fast-forward-only semantics; verify it remains the intended downstream integration branch.
- [ ] Create the Phase 2B promotion branch from the refreshed `downstream/main`.
- [ ] Before export, verify PR #5 is OPEN / UNMERGED, base is `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`, and source HEAD is exactly `e10e06fffacdcec43f2a2e271e63dbd075d757ed`.
- [ ] Enumerate the reviewed range with `git rev-list --reverse 0835cac4ab8f974035d31845f5c2b93b0c85b5c6..e10e06fffacdcec43f2a2e271e63dbd075d757ed`; expected order is `adb0fa71b2c4dfc7fc05c7debadb146282341ab3`, `f579eea03f6d1e1717eae35870f485f8a2e0332e`, `e10e06fffacdcec43f2a2e271e63dbd075d757ed`. STOP if it differs.
- [ ] Export the complete reviewed commit range with the repository-approved `git format-patch` mechanism; preserve boundaries/messages, do not squash, rewrite, collapse review fixes, or export a working-tree diff.
- [ ] Create or update `downstream/patches/010-non-expiring-paste/`.
- [ ] Add a provenance README recording Patch ID, pinned base, reviewed HEAD, ordered source SHAs, exported filenames/order, generation command, PR #5, Issues #3/#4, ownership, license/IP disposition, dependencies `none`, replay result, and tree correspondence.
- [ ] Record license/IP provenance: self-authored upstream-owned change; no third-party or Feishu-specific material; mark N/A where a separate provenance item does not apply.
- [ ] Add exactly one repository-relative patch-file entry per exported `.patch` under `downstream/patches/010-non-expiring-paste/` to `downstream/patches/series` (normally three entries for the three commits).
- [ ] Verify every participating exported file is listed exactly once, in source order, with no unrelated or implicit entries.
- [ ] In a disposable clean upstream worktree created from pinned SHA `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`, apply patches strictly in `series` order with sequential `git am`; no `--3way`, automatic repair, or manual edits. STOP on conflict.
- [ ] Run `downstream/scripts/check-patches.sh` and retain its real output.
- [ ] Retain check-patches evidence: pinned SHA, ordered patch list, assembled HEAD/tree, and PASS/FAIL output.
- [ ] When patched-source validation is required, create a separate disposable clean worktree from the pinned SHA, replay the same series with sequential `git am` and no edits, then run `pnpm install --frozen-lockfile`, `pnpm prettier -c .`, `pnpm lint`, `pnpm typecheck`, `pnpm exec vitest run`, and `pnpm build`; delete it afterward.
- [ ] Verify Patch 010 correspondence: assembled `HEAD^{tree}` equals reviewed source `e10e06fffacdcec43f2a2e271e63dbd075d757ed^{tree}`; investigate and STOP on any mismatch.
- [ ] Open a promotion PR targeting `downstream/main`, with review context linking Issue #3/#4 and the patch provenance README.
- [ ] Obtain an independent latest-HEAD configured AI Review Gate on the promotion PR.
- [ ] Fix or explicitly disposition every actionable finding; do not self-override blocking findings.
- [ ] Require all configured CI/status checks to execute on the promotion PR and finish green.
- [ ] Merge the promotion PR only after owner-approved Phase 2B execution and all review/CI gates pass.
- [ ] Mark Phase 2 complete only after the Stage B promotion PR has actually merged into `downstream/main`.

## Explicit guardrails

- Stage A PR #5 remains OPEN / UNMERGED. It must never be merged into `upstream-sync`.
- Until owner approval is received, do not run `git format-patch`, `export-patch.sh`, replay, or `downstream/scripts/check-patches.sh`.
- Until owner approval is received, do not modify `downstream/main`, `downstream/patches/series`, or create a promotion branch/PR.
- Do not begin Phase 2B execution, alter Issue #3/#4 semantics, or introduce Feishu-specific logic.

## Exit condition

Phase 2B is complete only when the promotion PR has passed its independent current-HEAD AI Review Gate, all required CI is green, all findings are resolved or validly dispositioned, and the promotion PR has merged into `downstream/main` with owner approval.

## JOB-TRANSFER RETURN

```
JOB-TRANSFER RETURN
===================
phase:              phase-2b-planning
active_todo_ref:    Issue #4 Active Phase 2B TODO / this artifact §Active Phase 2B TODO
durable_refs:       https://github.com/Skyline-Gazer/pastebin-worker/issues/3 ; https://github.com/Skyline-Gazer/pastebin-worker/issues/4
environment:        node v22.23.2 / pnpm 10.34.5 (Stage A evidence)
branch:             patch/non-expiring-paste (Stage A; no promotion branch created)
local_head_sha:     e10e06fffacdcec43f2a2e271e63dbd075d757ed
origin_head_sha:    e10e06fffacdcec43f2a2e271e63dbd075d757ed
PR:                 #5 https://github.com/Skyline-Gazer/pastebin-worker/pull/5 ; current HEAD e10e06fffacdcec43f2a2e271e63dbd075d757ed
pr_base_sha:        0835cac4ab8f974035d31845f5c2b93b0c85b5c6
pr_state:           OPEN / UNMERGED
worktree_clean:     yes (tracked; this TODO is local excluded bookkeeping)
BLOCKER:            owner approval required before any Phase 2B execution
TDD/RED evidence:   Stage A evidence complete; no Phase 2B RED manufactured
baseline evidence:  Stage A timed/default compatibility green
GREEN/REG evidence: Stage A clean-worktree prettier/lint/typecheck/Vitest 21 files/161 tests/build PASS; Actions run 33627395555 all required jobs SUCCESS
refactor scope:     none in Phase 2B planning checkpoint
source_commits:     adb0fa71b2c4dfc7fc05c7debadb146282341ab3; f579eea03f6d1e1717eae35870f485f8a2e0332e; e10e06fffacdcec43f2a2e271e63dbd075d757ed
diff_files:         Phase 2B export not yet created
no_feishu_guard:    Stage A guard passed; rerun on exported artifact before promotion PR
CI:                 Stage A run 33627395555 SUCCESS; Phase 2B CI not started
ai_review:          Stage A current HEAD Kody Code Review COMPLETED / SUCCESS; independent Stage B review pending
docs_updated:       this local TODO artifact only; no upstream/downstream files changed
spec_drift:         no
stage_a_exit:       satisfied; Phase 2B not started
overall_phase_status:
    awaiting-owner-approval | phase-2b-planning
ALL_CONSTRAINTS_MET: yes — no format-patch, export, replay, series change, promotion branch, promotion PR, merge, or Stage B execution
NEXT_ACTION:        Obtain owner approval for this Phase 2B TODO, then begin with downstream/main ff-only refresh.
```
