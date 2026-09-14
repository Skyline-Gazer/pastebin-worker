# 150 — Upload result panel content kind

Purpose: classify the Pastebin upload result panel from user upload
intent (`sourceKind`), not from `pasteResponse.mimeType`. Unencrypted
File-tab uploads show Download `/<name>?a` as primary/QR even when
stored `mimeType` is omitted. `sourceKind` is captured at upload start
and snapshotted as `uploadedSourceKind` so later editor-tab changes do
not reclassify a completed or in-flight result.

Patch ID: `150-upload-result-content-kind`

Development branch: `patch/upload-result-content-kind`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#144](https://github.com/Skyline-Gazer/pastebin-worker/pull/144)
(`REVIEW ONLY — DO NOT MERGE INTO upstream-sync`).

Issue: [#143](https://github.com/Skyline-Gazer/pastebin-worker/issues/143)
(parent [#132](https://github.com/Skyline-Gazer/pastebin-worker/issues/132),
historical [#133](https://github.com/Skyline-Gazer/pastebin-worker/issues/133))

Reviewed exact source HEAD:
`62d12574ebb5bfda560bb5175a47991618efad14`

Source tree SHA:
`79fa136e6f6f39b7c7d35519f10e26db5787924a`

Source gate: `SOURCE_REVIEW_APPROVED_BY_OWNER_OVERRIDE`
(`OWNER_OVERRIDE: SOURCE_REVIEW_QUORUM` on PR #144 exact HEAD).
The source-review override does **not** waive this promotion PR's
reviewer gate.

Reviewed source commits (PR #144; source branch was not rewritten):

1. `5bcaf753dfceb0b8c4bc64fb8652e70e7956d30d`
2. `62d12574ebb5bfda560bb5175a47991618efad14`

Exported files, in replay order. The `.patch` `From` SHAs are the
reviewed source commits themselves, stacked on assembled `010`–`140`
(`6ac36888beddef4d39a81e14130cd76d2c2824aa`) so the ordered series
applies with fail-closed `git am` and without `--3way`.

No replay adaptation and no semantic rewrite were required. Export used
`git format-patch --base=<UPSTREAM_SHA>` which added only cosmetic
headers: `base-commit` and `prerequisite-patch-id` trailers. File diffs
match the reviewed source commits.

1. `5bcaf753dfceb0b8c4bc64fb8652e70e7956d30d` → `0001-feat-frontend-classify-upload-result-panel-from-cont.patch`
2. `62d12574ebb5bfda560bb5175a47991618efad14` → `0002-fix-frontend-snapshot-upload-sourceKind-for-result-p.patch`

Generation command:

```text
downstream/scripts/export-patch.sh \
  0835cac4ab8f974035d31845f5c2b93b0c85b5c6 \
  patch/upload-result-content-kind \
  150-upload-result-content-kind \
  --start 6ac36888beddef4d39a81e14130cd76d2c2824aa
```

Intended series position: after `140-upload-download-path`.

Provenance: downstream-identified Function Test defect FT-DEFECT-01
follow-up (#143). Current-repo fix only. Not an upstream PR adoption.
Origin repository: `Skyline-Gazer/pastebin-worker`. Original author: Ian
(`219239532+markd3ng@users.noreply.github.com`). Original commit SHA:
`62d12574ebb5bfda560bb5175a47991618efad14`. Upstream status at
adoption: not present in pinned upstream
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`. Adoption date: 2026-09-14.
License/IP: repository MIT; no additional NOTICE requirement. Local
changes after adoption: none (header-only format-patch `--base`
normalization).

Behavior:

- `sourceKind` is derived from `editorState.editKind` at upload start
  (`file` → `"file"`, else `"text"`).
- `uploadedSourceKind` is snapshotted with `pasteResponse` and
  `uploadedEncryptionKey`.
- `UploadedPanel` consumes `uploadedSourceKind`, not live editor tab
  state.
- Unencrypted File-tab uploads, including `notes.txt` and omitted
  mimeType, show Download `/<name>?a` as primary; QR encodes `?a`.
- Text-editor uploads stay Display-primary even with a `.txt` filename.
- Encrypted File-tab share remains `/d/<name>#<key>`; never `?key=`.
- Switching Edit/File after a completed or in-flight upload does not
  change the displayed result class.
- Known filename extensions may still omit stored mimeType. That
  remains legal server behavior (`storedMimeTypeForUpload()` unchanged).

Dependencies on other downstream patches: replay is stacked after
`010`–`140` because source review was developed on assembled
`review-base/150-upload-result-content-kind` (`6ac3688`). Share-URL
classes remain those of Patch `140`; this patch only changes how the
result panel chooses the class.

Source validation: GitHub Actions PASS on `62d12574`; Cursor Bugbot
`SKIPPED_QUOTA`; Greptile `SKIPPED_UNAVAILABLE`; Codex Final Verify
no PASS / no `CODEX_VERIFIED`. Owner source-review override on #144
does not convert those into PASS.

Removal condition: retire this patch when official upstream includes an
equivalent upload-intent result-panel classification with upload-time
`sourceKind` snapshot, and the downstream series validates without it.
