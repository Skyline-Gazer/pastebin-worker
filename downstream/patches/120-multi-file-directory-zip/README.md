# 120 — Multi-file / directory / ZIP upload UX

Purpose: on the current PasteBin File tab, multiple files or a directory
selection become **one** paste: a client-built STORE ZIP that reuses the
existing `uploadPaste` / AES-GCM / MPU pipeline.

Patch ID: `120-multi-file-directory-zip`

Development branch: `patch/multi-file-directory-zip`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#113](https://github.com/Skyline-Gazer/pastebin-worker/pull/113)
(review-only, unmerged; do not merge into `upstream-sync`).

Issue: [#83](https://github.com/Skyline-Gazer/pastebin-worker/issues/83)

Accepted source HEAD (`PATCH_SOURCE_OWNER_ACCEPTED`):
`3942ec7503cdeb146d1c4d855c49f9450ad06cbc`

Source gate: `OWNER_OVERRIDE: SOURCE_REVIEW_QUORUM`.
`SOURCE_REVIEWER_PASS_COUNT: 0`. Normal reviewer quorum was not satisfied.
Greptile, Bugbot, and Codex were `SKIPPED_QUOTA`. Not recorded as
`PATCH_SOURCE_VERIFIED`.

Reviewed source commit (PR #113; source branch was not rewritten):

1. `3942ec7503cdeb146d1c4d855c49f9450ad06cbc`

Exported files, in replay order. The `.patch` `From` SHA is a replay-adapted
commit onto assembled `110` (`d024fb6ad7a06926b611aa9d47548de2b3093753`) so
the ordered series applies with fail-closed `git am` and without `--3way`.
Source PR #113 remains at `3942ec7...` and is not rewritten.

Raw `git am` of the reviewed source patch onto assembled `010`–`110` failed
in `README.md`, `frontend/pages/PasteBin.tsx`, and
`frontend/utils/uploader.ts`. Cherry-pick onto assembled `110` auto-merged
`PasteBin.tsx` / `PasteInputPanel.tsx` / `index.spec.tsx`. Manual resolution:

- `README.md`: keep Patch `110` encrypted-Display-download feature bullet
  and add the Patch `120` ZIP bullet.
- `frontend/utils/uploader.ts`: keep Patch `070` `DEFAULT_EDIT_FILENAME`
  for empty edit filenames, and keep Patch `120` `prepareUploadContent`
  ZIP path. Do not restore the pre-120 inner `constructContent`.

1. `dc88d36950e241753823963a1c920d976b62b299` → `0001-feat-frontend-zip-multi-file-and-directory-uploads.patch`

Generation command:

```text
downstream/scripts/export-patch.sh \
  0835cac4ab8f974035d31845f5c2b93b0c85b5c6 \
  patch/multi-file-directory-zip-export \
  120-multi-file-directory-zip \
  --start d024fb6ad7a06926b611aa9d47548de2b3093753 \
  --replace
```

`patch/multi-file-directory-zip-export` is a local replay-adaptation
workspace only. It is not the source-review branch and must not be merged
into `upstream-sync`.

Provenance: C Drag/paste directory + Multi-file clipboard / ZIP
ADOPT_WITH_REDESIGN / Issue #83. Current-repo redesign only. Not a
wholesale fork merge. No P2P/WebRTC/TURN. No server-side filesystem, D1
manifest, or multi-object API. No extra ZIP library. No Issue #84
max-read consume. License/IP: repository MIT; no additional NOTICE
requirement. Original implementation author: Ian
(`219239532+markd3ng@users.noreply.github.com`). Upstream status at
adoption: not present in pinned upstream
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`. Adoption date: 2026-09-09.

Behavior:

- Two or more File-tab files become one STORE ZIP named `archive.zip`.
- Directory picker (`webkitdirectory`) always ZIPs, even for one file,
  preserving sanitized nested `webkitRelativePath`. Archive name is
  `{directory}.zip` when the first path segment exists.
- Path sanitizer rejects `..`, absolute paths, drive letters, and NUL.
  Remaining files are archived; if none remain, prepare fails closed.
- Basename collisions inside the archive get a deterministic `-2`, `-3`
  suffix.
- A single ordinary File-tab file (not from the directory picker) is
  uploaded unchanged (not ZIP-wrapped).
- ZIP bytes flow through existing `uploadPaste`: AES-GCM when encryption
  is on; MPU above 5 MiB.
- Empty edit filenames still default to Patch `070` `Untitled`.
- Patch `110` Display download / OPFS / Range is unchanged (one paste
  object). Patch `100` history still records one paste.

Residual (documented, not claimed eliminated):

- STORE ZIP is uncompressed and built in browser memory from
  `File.arrayBuffer()`. Not a streaming encoder. MPU still chunks the
  resulting blob.

Dependencies on other downstream patches: product semantics are
independent. Replay is stacked after `010`–`110` because those patches
already changed `README.md`, `PasteBin.tsx`, and `uploader.ts`.

Source validation: GitHub Actions PASS, Greptile SKIPPED_QUOTA, Cursor
Bugbot SKIPPED_QUOTA, Codex SKIPPED_QUOTA / OWNER_CODEX_QUOTA_EXHAUSTED.

Removal condition: retire this patch when official upstream includes an
equivalent multi-file/directory ZIP upload on the current PasteBin UI,
and the downstream series validates without it.
