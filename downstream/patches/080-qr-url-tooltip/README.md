# 080 — QR tooltip for paste Display URL

Purpose: add a small self-contained QR control on the official upload-result
Display URL. Encode the same public share URL (including `#key` when encrypted).
Do not QR the secret Manage URL. If QR generation throws, omit the control
and keep the successful upload result visible.

Patch ID: `080-qr-url-tooltip`

Development branch: `patch/qr-url-tooltip`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#105](https://github.com/Skyline-Gazer/pastebin-worker/pull/105)
(review-only, unmerged; do not merge into `upstream-sync`).

Issue: [#73](https://github.com/Skyline-Gazer/pastebin-worker/issues/73)

Accepted source HEAD (`PATCH_SOURCE_OWNER_ACCEPTED`):
`52ae6303f09f5ff3c123dcfd286c92d59ba66f49`

Source gate: `OWNER_OVERRIDE: SOURCE_REVIEW_QUORUM`. Normal reviewer quorum was
not satisfied. Bugbot and Codex were `SKIPPED_QUOTA`. Not recorded as
`PATCH_SOURCE_VERIFIED`.

Reviewed source commits (PR #105 HEAD; source branch was not rewritten):

1. `e60da0d903186ab69516867076b8333c822ea0fa`
2. `52ae6303f09f5ff3c123dcfd286c92d59ba66f49`

Exported files, in replay order. The `.patch` `From` SHAs are replay-adapted
cherry-picks onto assembled `070` (`d1faa8a1f290023baa64bc950019a8c933151d9e`)
so the ordered series applies with fail-closed `git am` and without `--3way`.
Git auto-merged `README.md`, `frontend/components/UploadedPanel.tsx`,
`frontend/components/icons.tsx`, `package.json`, and `pnpm-lock.yaml`.
Manual conflict resolution was required in:

- `frontend/test/index.spec.tsx`: keep Patch `010` permanent-expiration
  `"Never"` coverage and add the Display URL QR tests.

#73 semantics were not changed. Source PR #105 HEAD remains `52ae6303...`.

1. `4ded1065c13a519b699fbe6898fb350f3206b608` → `0001-feat-frontend-add-QR-tooltip-for-paste-Display-URL.patch`
2. `03ca08c9d6b1b9d97b89d233ba9dbb9a49af1b85` → `0002-fix-frontend-keep-upload-results-when-Display-URL-ex.patch`

Generation command:

```text
downstream/scripts/export-patch.sh \
  0835cac4ab8f974035d31845f5c2b93b0c85b5c6 \
  patch/qr-url-tooltip-export \
  080-qr-url-tooltip \
  --start d1faa8a1f290023baa64bc950019a8c933151d9e
```

`patch/qr-url-tooltip-export` is a local replay-adaptation workspace only.
It is not the source-review branch and must not be merged into `upstream-sync`.

Provenance: C QR ADOPT / Issue #73. Not a wholesale fork merge. QR library is
`lean-qr` 2.7.4 (`generate` + `toSvgDataURL` only). License/IP: `lean-qr` is
MIT (David Evans); repository MIT; no additional NOTICE requirement. Original
implementation author: Ian (`219239532+markd3ng@users.noreply.github.com`).
Upstream status at adoption: not present in pinned upstream
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`. Adoption date: 2026-09-09.

Behavior:

- After upload, Display URL has exactly one QR control.
- Hover/focus shows an SVG data-URL QR of that Display URL.
- Encrypted Display URL QR includes the client-side `#key` fragment.
- Manage URL is not QR-encoded. Raw URL has no QR.
- If `generate()` / SVG conversion throws (oversized URL), omit the QR
  control; Display URL and the rest of the result panel still render.

Residual (documented, not claimed fixed):

- Raw URL, Markdown URL, and other secondary URLs have no QR.
- QR is omitted when encoding fails; there is no alternative barcode.
- Encrypted fragment key is share-URL material in the QR, not a Manage URL.

Dependencies on other downstream patches: assembled after `010`–`070`
because Patch `010` added frontend `"Never"` expiration coverage in
`frontend/test/index.spec.tsx`.

Source validation: GitHub Actions PASS, Greptile PASS (5/5, previously
reported oversized-URL render failure contained, 0 unresolved actionable
findings on `52ae6303...`), Cursor Bugbot SKIPPED_QUOTA, Codex SKIPPED_QUOTA /
OWNER_CODEX_QUOTA_EXHAUSTED. The earlier 4/5 P1 was fixed on that HEAD.
