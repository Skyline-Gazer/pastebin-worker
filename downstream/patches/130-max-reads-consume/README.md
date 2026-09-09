# 130 — Max-reads / burn-after-read with consume-before-response

Purpose: optional race-safe max-reads. A Durable Object serializes
consume **before** the body is returned. After the last allowed content
GET the paste is deleted. Unlimited pastes never touch the DO.

Patch ID: `130-max-reads-consume`

Development branch: `patch/max-reads-consume`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#115](https://github.com/Skyline-Gazer/pastebin-worker/pull/115)
(review-only, unmerged; do not merge into `upstream-sync`).

Issue: [#84](https://github.com/Skyline-Gazer/pastebin-worker/issues/84)

Accepted source HEAD (`PATCH_SOURCE_OWNER_ACCEPTED`):
`7540a3cad785404463cab71a071deebad50081b7`

Source gate: `OWNER_OVERRIDE: SOURCE_REVIEW_QUORUM`.
`SOURCE_REVIEWER_PASS_COUNT: 0`. Normal reviewer quorum was not satisfied.
Greptile, Bugbot, and Codex were `SKIPPED_QUOTA`. Not recorded as
`PATCH_SOURCE_VERIFIED`.

Reviewed source commit (PR #115; source branch was not rewritten):

1. `7540a3cad785404463cab71a071deebad50081b7`

Exported files, in replay order. The `.patch` `From` SHAs are
replay-adapted commits onto assembled `120`
(`2efa54a856029aa770033564b170a240f7801698`) so the ordered series
applies with fail-closed `git am` and without `--3way`.
Source PR #115 remains at `7540a3c...` and is not rewritten.

Raw `git cherry-pick` of the reviewed source commit onto assembled
`010`–`120` conflicted in `README.md`, `shared/constants.ts`,
`shared/verify.ts`, `worker/handlers/handleRead.ts`,
`worker/handlers/handleWrite.ts`, and `worker/storage/storage.ts`.
Manual resolution:

- `README.md`: keep Patch `110` encrypted-Display-download bullet and
  Patch `120` ZIP bullet; add Patch `130` max-reads bullet.
- `shared/constants.ts`: keep Patch `060` MPU headers and Patch `070`
  `DEFAULT_EDIT_FILENAME`; add `MAX_READS_CAP`.
- `shared/verify.ts`: keep Patch `010` `parseExpirationSpec` and Patch
  `030` `isLegalRedirectUrl`; add `parseMaxReads`.
- `worker/handlers/handleWrite.ts`: keep Patch `010` expiration spec,
  Patch `050` named create, and Patch `070` filename/MIME helper; add
  form field `r`. A follow-up commit keeps `maxReads` on `createPaste`
  rather than `storedMimeTypeForUpload`.
- `worker/handlers/handleRead.ts`: keep Patch `110` Range helpers.
  `pasteAllowsByteRange` already returns false when `maxReads` is set.
- `worker/storage/storage.ts`: keep schemaVersion `2`, nullable
  expiration, and `mimeType`; add `maxReads` / `readStateVersion`.
- `worker/test/maxReads.spec.ts`: add assembled `/u/` consume and
  Range-off coverage.

1. `8adbfcb72f293fd8331c2344bbcbf302401d2806` → `0001-feat-paste-consume-max-reads-before-returning-the-bo.patch`
2. `2823460f23d0a6db8cca1365ad18770b8f045c8c` → `0002-fix-write-keep-maxReads-on-createPaste-after-MIME-he.patch`

Generation command:

```text
downstream/scripts/export-patch.sh \
  0835cac4ab8f974035d31845f5c2b93b0c85b5c6 \
  patch/max-reads-consume-export \
  130-max-reads-consume \
  --start 2efa54a856029aa770033564b170a240f7801698
```

`patch/max-reads-consume-export` is a local replay-adaptation
workspace only. It is not the source-review branch and must not be merged
into `upstream-sync`.

Provenance: C Max reads `ADOPT_WITH_REDESIGN` / Issue #84. Current-repo
redesign only. Not a wholesale fork merge. No P2P/WebRTC/TURN. No
`ace172f` cherry-pick. No restoring #71 `accessCounter` body rewrite.
No Feishu burn-after-read. No Issue #86. License/IP: repository MIT; no
additional NOTICE requirement. Original implementation author: Ian
(`219239532+markd3ng@users.noreply.github.com`). Upstream status at
adoption: not present in pinned upstream
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`. Adoption date: 2026-09-09.

Behavior:

- Optional form field `r` (positive integer, 1–1000) stores `maxReads`
  plus a new `readStateVersion`.
- Content GET (raw / `/a/` / `/u/`): load paste → Durable Object
  consume → exhausted 404 with no body; else return body with
  `Cache-Control: no-store`; last consume `waitUntil(deletePaste)`.
- HEAD, `/m/`, and `/d/` do not consume. `/d/` skips SSR
  (`__PASTE_DATA__`) when `maxReads` is set.
- Unlimited (no `r`) never touches `PasteReadCounter`.
- PUT with omitted `r` clears max-reads. PUT with `r` rotates
  `readStateVersion`.
- MPU complete accepts the same `r` field.
- Patch `110` Range remains off when `maxReads` is set
  (`pasteAllowsByteRange`).

Residual (documented, not claimed eliminated):

- A losing concurrent request may load paste bytes into the Worker
  isolate before the Durable Object rejects the consume. Those bytes
  are not returned.

Dependencies on other downstream patches: product semantics are
independent of Feishu. Replay is stacked after `010`–`120` because those
patches already changed the conflicted files. Range-off for max-reads
relies on Patch `110` `pasteAllowsByteRange`.

Source validation: GitHub Actions PASS, Greptile SKIPPED_QUOTA, Cursor
Bugbot SKIPPED_QUOTA, Codex SKIPPED_QUOTA / OWNER_CODEX_QUOTA_EXHAUSTED.

Removal condition: retire this patch when official upstream includes an
equivalent race-safe max-reads consume-before-response, and the
downstream series validates without it.
