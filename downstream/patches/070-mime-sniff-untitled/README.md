# 070 — MIME sniff, stored mimeType, Untitled default filename

Purpose: sniff extensionless binary uploads, persist optional `mimeType`,
serve that type as GET fallback, and default empty/whitespace filenames to
`Untitled`. Keep existing `DISALLOWED_MIME_FOR_PASTE` sanitization.

Patch ID: `070-mime-sniff-untitled`

Development branch: `patch/mime-sniff-untitled`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#103](https://github.com/Skyline-Gazer/pastebin-worker/pull/103)
(review-only, unmerged; do not merge into `upstream-sync`).

Issue: [#74](https://github.com/Skyline-Gazer/pastebin-worker/issues/74)

Accepted source HEAD (`PATCH_SOURCE_OWNER_ACCEPTED`):
`6be2013a58a9c2df3cb551d4f879e3857d7545d2`

Source gate: `OWNER_OVERRIDE: SOURCE_REVIEW_QUORUM`. Normal reviewer quorum was
not satisfied. Bugbot and Codex were `SKIPPED_QUOTA`. Not recorded as
`PATCH_SOURCE_VERIFIED`.

Reviewed source commits (PR #103 HEAD; source branch was not rewritten):

1. `53ef01fe7513e4ba029f76412c93656042766004`
2. `6be2013a58a9c2df3cb551d4f879e3857d7545d2`

Exported files, in replay order. The `.patch` `From` SHAs are replay-adapted
cherry-picks onto assembled `060` (`a6c7430dd2d92f1ec2c788e88acd02464ae3c243`)
so the ordered series applies with fail-closed `git am` and without `--3way`.
Git auto-merged most files. Manual conflict resolution was required in:

- `shared/constants.ts`: keep Patch `060` MPU header names and add
  `DEFAULT_EDIT_FILENAME` / `normalizePasteFilename`.
- `worker/handlers/handleWrite.ts`: keep Patch `010`/`050` expiration and
  named-claim create path (`parseExpirationSpec`, `retentionFromMPU`,
  `createNamedPasteObject` try/catch) while storing Untitled + sniffed
  `mimeType`.

#74 semantics were not changed. Source PR #103 HEAD remains `6be2013a...`.

1. `47a07d4f1ea5c6961e9807682c54fec4df287b01` → `0001-fix-mime-sniff-extensionless-binaries-and-default-em.patch`
2. `8dfdadfc48083f112234a01321e4215e0c1ae6c5` → `0002-fix-mime-keep-nonempty-filenames-when-defaulting-Unt.patch`

Generation command:

```text
downstream/scripts/export-patch.sh \
  0835cac4ab8f974035d31845f5c2b93b0c85b5c6 \
  patch/mime-sniff-untitled-export \
  070-mime-sniff-untitled \
  --start a6c7430dd2d92f1ec2c788e88acd02464ae3c243
```

`patch/mime-sniff-untitled-export` is a local replay-adaptation workspace only.
It is not the source-review branch and must not be merged into `upstream-sync`.

Provenance: C MIME ADOPT + Untitled ADOPT + D-API-001 / Issue #74. Not a
wholesale fork merge. Sniffer is a small in-tree magic table (PNG/JPEG/GIF/
WEBP/PDF/ZIP). License/IP: repository MIT; no additional NOTICE requirement.
Original implementation author: Ian
(`219239532+markd3ng@users.noreply.github.com`). Upstream status at adoption:
not present in pinned upstream `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`.
Adoption date: 2026-09-09.

Behavior:

- GET Content-Type order: `?mime=` → URL ext → stored filename → stored
  `mimeType` → `text/plain;charset=UTF-8`, then `DISALLOWED_MIME_FOR_PASTE`.
- Sniff only when filename does not already imply a MIME type.
- Encrypted ciphertext is not sniffed as plaintext.
- HTML is not sniffed.
- MPU may inspect the first 16 bytes of the completed R2 object.
- Empty or whitespace-only upload filename is stored as `Untitled`.
- Official editor/uploader default to `Untitled`.

Residual (documented, not claimed fixed):

- Legacy uploads without `mimeType` remain `text/plain` until re-uploaded.
- Encrypted extensionless ciphertext is not plaintext-sniffed.
- MPU sniff only uses the bounded completed-object prefix.
- No generalized MIME database.

Dependencies on other downstream patches: assembled after `010`–`060` because
Patch `010` changed write expiration/`handleWrite.ts` and Patch `050` changed
named-paste create; Patch `060` added MPU header constants in
`shared/constants.ts`.

Source validation: GitHub Actions PASS, Greptile PASS (5/5, “safe from a
code-review perspective”, 0 unresolved actionable findings on `6be2013a...`),
Cursor Bugbot SKIPPED_QUOTA, Codex SKIPPED_QUOTA / OWNER_CODEX_QUOTA_EXHAUSTED.
The earlier 4/5 whitespace-trim finding was fixed on that HEAD.
