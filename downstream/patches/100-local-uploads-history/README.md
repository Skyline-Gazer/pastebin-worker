# 100 — Local uploads / Manage URL browser history

Purpose: after a successful upload or update, record a compact
browser-local Manage URL history on the official PasteBin UI. List
labels use the public paste name only. Selecting an entry restores the
existing Manage URL field. Successful delete removes the matching local
entry. Encryption keys are not stored.

Patch ID: `100-local-uploads-history`

Development branch: `patch/local-uploads-history`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#109](https://github.com/Skyline-Gazer/pastebin-worker/pull/109)
(review-only, unmerged; do not merge into `upstream-sync`).

Issue: [#81](https://github.com/Skyline-Gazer/pastebin-worker/issues/81)

Accepted source HEAD (`PATCH_SOURCE_OWNER_ACCEPTED`):
`9317899b48ece3d18ed5fe1eec4a84daa05d8bf1`

Source gate: `OWNER_OVERRIDE: SOURCE_REVIEW_QUORUM`. Normal reviewer quorum was
not satisfied. Bugbot and Codex were `SKIPPED_QUOTA`. Not recorded as
`PATCH_SOURCE_VERIFIED`.

Reviewed source commits (PR #109 HEAD; source branch was not rewritten):

1. `9317899b48ece3d18ed5fe1eec4a84daa05d8bf1`

Exported files, in replay order. The `.patch` `From` SHA is a replay-adapted
cherry-pick onto assembled `090` (`8a6b30b12f24c7855051efb0ebac85aa79f696c0`)
so the ordered series applies with fail-closed `git am` and without `--3way`.

Git auto-merged `frontend/pages/PasteBin.tsx` and
`frontend/test/index.spec.tsx` (Patch `010` `"Never"` coverage, Patch `070`
Untitled filename, and Patch `080` Display URL QR tests remain).

Manual conflict resolution was required in:

- `README.md`: keep the Patch `080` QR-code feature bullet and add the
  Patch `100` recent-uploads feature bullet. Patch `090` Auth/Argon2id
  wording was already present on HEAD and was not rewritten.

#81 semantics were not changed. Source PR #109 HEAD remains `9317899...`.

1. `bc623333873216f7847ef423f33f300bb3795659` → `0001-feat-frontend-persist-local-Manage-URL-history.patch`
2. `03ed80a1fc7892e1930d3f0a0fec5631f94fd635` → `0002-fix-frontend-fail-closed-if-localStorage-access-thro.patch`

Generation command:

```text
downstream/scripts/export-patch.sh \
  0835cac4ab8f974035d31845f5c2b93b0c85b5c6 \
  patch/local-uploads-history-export \
  100-local-uploads-history \
  --start 8a6b30b12f24c7855051efb0ebac85aa79f696c0
```

`patch/local-uploads-history-export` is a local replay-adaptation workspace only.
It is not the source-review branch and must not be merged into `upstream-sync`.

Provenance: C Local uploads sidebar ADOPT_WITH_REDESIGN / Issue #81. Not a
wholesale fork merge. History is `window.localStorage` only
(`pb.localUploads`, max 50). No new third-party library. License/IP:
repository MIT; no additional NOTICE requirement. Original implementation
author: Ian (`219239532+markd3ng@users.noreply.github.com`). Upstream
status at adoption: not present in pinned upstream
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`. Adoption date: 2026-09-09.

Behavior:

- After successful upload or update, record `{ url, manageUrl }` in
  this browser's `localStorage`.
- Newest-first ordering. Duplicate Manage URLs refresh in place rather
  than creating uncontrolled duplicates.
- Maximum 50 entries.
- Compact Recent uploads list on the current index UI (not dashboard
  sidebar chrome). The panel is omitted when history is empty.
- List labels use the public paste name only (`pasteLabel` from the
  public URL path). Password-bearing Manage URL text, password
  segments, and encryption keys are not rendered as labels.
- Selecting an entry fills the existing Manage URL field / manage flow.
- Successful delete removes the matching local entry. Failed delete
  does not remove it.
- Encryption `#keys` are not stored.

Privacy:

- History is device/browser-local and is not synced.
- Anyone with access to this browser profile/origin context may be able
  to manage those pastes via the stored capability-bearing Manage URLs.
- localStorage is not claimed encrypted or isolated from other code in
  the same origin/browser profile.

Robustness:

- Unavailable, quota-limited, malformed, or unexpected localStorage
  values fail closed (empty history / skip persist). Core upload, read,
  update, and delete continue to work.
- Accessing `window.localStorage` in a restricted browser context is
  caught by `canUseLocalStorage` (Promotion PR #110 Greptile P1;
  exported `0002`). Source PR #109 was not rewritten.

Residual (documented, not claimed fixed):

- Manage URLs are capabilities stored in localStorage and are accessible
  to the same browser profile/origin context.
- No cloud sync, server-side history, user accounts, cross-device
  history, browser extension, analytics, encrypted local vault, or
  credential-management platform.

Dependencies on other downstream patches: assembled after `010`–`090`
because Patches `010`, `070`, `080`, and `090` already changed
`README.md`, `frontend/pages/PasteBin.tsx`, and
`frontend/test/index.spec.tsx`.

Source validation: GitHub Actions PASS, Greptile PASS (5/5, 0 unresolved
actionable findings on `9317899...`), Cursor Bugbot SKIPPED_QUOTA, Codex
SKIPPED_QUOTA / OWNER_CODEX_QUOTA_EXHAUSTED.
