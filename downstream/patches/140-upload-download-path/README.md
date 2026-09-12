# 140 — Upload/download path classification

Purpose: classify TEXT / UNENCRYPTED FILE / ENCRYPTED FILE share URLs
so upload results and Display download match the stored bytes. Unencrypted
files use `/<name>?a` as the primary/download URL. Encrypted files keep
`/d/<name>#<key>` and never a server-visible `?key=`. Display download is
one accessible control (no nested `<Button><a>`). Missing MIME + failed
UTF-8 classification stores `application/octet-stream`. Magic-table
expansion is not included.

Patch ID: `140-upload-download-path`

Development branch: `patch/upload-download-path`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#138](https://github.com/Skyline-Gazer/pastebin-worker/pull/138)
(`REVIEW ONLY — DO NOT MERGE INTO upstream-sync`).

Issue: [#133](https://github.com/Skyline-Gazer/pastebin-worker/issues/133)

Reviewed exact source HEAD:
`6ac36888beddef4d39a81e14130cd76d2c2824aa`

Source gate: `SOURCE_REVIEW_APPROVED_BY_OWNER_OVERRIDE`
(`OWNER_OVERRIDE: SOURCE_REVIEW_QUORUM` on PR #138 exact HEAD).
The source-review override does **not** waive this promotion PR's
reviewer gate.

Reviewed source commit (PR #138; source branch was not rewritten):

1. `6ac36888beddef4d39a81e14130cd76d2c2824aa`

Exported files, in replay order. The `.patch` `From` SHA is the reviewed
source commit itself, stacked on assembled `010`–`130`
(`b63d5b10520b1979ac76a79a6c4d65b511a8c36f`) so the ordered series
applies with fail-closed `git am` and without `--3way`.

No replay adaptation and no semantic rewrite were required. Export used
`git format-patch --base=<UPSTREAM_SHA>` which added only cosmetic
headers: `base-commit` and `prerequisite-patch-id` trailers. File diffs
match the reviewed source commit.

1. `6ac36888beddef4d39a81e14130cd76d2c2824aa` → `0001-feat-frontend-classify-paste-share-URLs-and-fix-file.patch`

Generation command:

```text
downstream/scripts/export-patch.sh \
  0835cac4ab8f974035d31845f5c2b93b0c85b5c6 \
  patch/upload-download-path \
  140-upload-download-path \
  --start b63d5b10520b1979ac76a79a6c4d65b511a8c36f
```

Intended series position: after `130-max-reads-consume`.

Provenance: downstream-identified Function Test defect FT-DEFECT-01
(#133). Current-repo fix only. Not an upstream PR adoption. Origin
repository: `Skyline-Gazer/pastebin-worker`. Original author: Ian
(`219239532+markd3ng@users.noreply.github.com`). Original commit SHA:
`6ac36888beddef4d39a81e14130cd76d2c2824aa`. Upstream status at
adoption: not present in pinned upstream
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`. Adoption date: 2026-09-13.
License/IP: repository MIT; no additional NOTICE requirement. Local
changes after adoption: none (header-only format-patch `--base`
normalization).

Behavior:

- TEXT: primary/share `/d/<name>`; QR follows Display.
- UNENCRYPTED FILE: primary/download `/<name>?a`; Display remains
  viewer/info; QR encodes `?a`.
- ENCRYPTED FILE: primary/share `/d/<name>#<key>`; never `?key=`.
- Display download is a single accessible control. Unencrypted files
  resolve to `/<name>?a`. Encrypted plaintext download stays client-side
  decrypt/blob (Patch `110`).
- Missing MIME + failed UTF-8: store `application/octet-stream`.

Dependencies on other downstream patches: replay is stacked after
`010`–`130` because source review was developed on assembled
`review-base/140-upload-download-path` (`b63d5b1`). QR share-target
changes Patch `080` Display-URL default per paste class. Encrypted
download continues to use Patch `110`. MIME fallback is additive on
Patch `070` and does not expand the magic table.

Source validation: GitHub Actions PASS on `6ac3688`; Cursor Bugbot
`SKIPPED_QUOTA`; Greptile `SKIPPED_UNAVAILABLE`; Codex Final Verify
no PASS / no `CODEX_VERIFIED`. Owner source-review override on #138
does not convert those into PASS.

Removal condition: retire this patch when official upstream includes an
equivalent TEXT / UNENCRYPTED FILE / ENCRYPTED FILE share-URL and
download-control classification, and the downstream series validates
without it.
