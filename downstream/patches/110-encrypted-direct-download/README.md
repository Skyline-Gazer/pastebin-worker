# 110 — Encrypted/large direct download + OPFS staging (+ optional Range)

Purpose: encrypted Display URLs with `#key` download usable AES-GCM
plaintext for oversized/non-renderable pastes without forcing the body
through SSR `__PASTE_DATA__`. Stage via unique OPFS names when
available, otherwise a Blob object URL. Optional simple byte Range is
honored only where it stays compatible with whole-body consume-on-GET.

Patch ID: `110-encrypted-direct-download`

Development branch: `patch/encrypted-direct-download`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#111](https://github.com/Skyline-Gazer/pastebin-worker/pull/111)
(review-only, unmerged; do not merge into `upstream-sync`).

Issue: [#82](https://github.com/Skyline-Gazer/pastebin-worker/issues/82)

Accepted source HEAD (`PATCH_SOURCE_OWNER_ACCEPTED`):
`a02ea9ab46e97fa3375d2f2cc10b65ff7606a7a2`

Source gate: `OWNER_OVERRIDE: SOURCE_REVIEW_QUORUM`. Normal reviewer quorum was
not satisfied. Bugbot and Codex were `SKIPPED_QUOTA`. Not recorded as
`PATCH_SOURCE_VERIFIED`.

Reviewed source commits (PR #111 HEAD lineage; source branch was not rewritten):

1. `7f8d93f4bc8d6fe320bb0c23a801451244922fe3`
2. `e28dfaa9dd1f13e3fbeeca365a8306a488037d6c`
3. `972bc5e2f5946388262b10c77d2945209210bf46`
4. `617350508f3c476b0d5df99b4fae75a2ee56679a`
5. `a02ea9ab46e97fa3375d2f2cc10b65ff7606a7a2`

Exported files, in replay order. The `.patch` `From` SHAs are replay-adapted
commits onto assembled `100` (`403153756561d493bb665d93f82d91b18f02be04`) so
the ordered series applies with fail-closed `git am` and without `--3way`.
Source PR #111 remains at `a02ea9a...` and is not rewritten.

Git `am` of the five reviewed source patches onto assembled `010`–`100`
succeeded without conflict. Assembled `pnpm typecheck` then failed because
Patch `010` types `PasteMetadata.schemaVersion` as `2` while the Range
fixture still used `1`. No other files were adapted.

1. `ea7ba6bab1819099a02eabb605c25b2befc50049` → `0001-feat-frontend-decrypt-large-encrypted-Display-downlo.patch`
2. `8d783b73391364a67b8ec195ff5cb45280fe9704` → `0002-fix-read-range-R2-objects-and-drop-OPFS-plaintext.patch`
3. `3adb8d4681cbdf6a6962cfb362b2b679e409ae1d` → `0003-fix-frontend-wipe-OPFS-staging-if-removeEntry-fails.patch`
4. `eece31ddd67e3700dd637d08f9702b2c5738a2f4` → `0004-fix-frontend-always-wipe-OPFS-after-staging-attempts.patch`
5. `14be28b871d042080f43a7c4d6e7461276f1dcdf` → `0005-fix-frontend-isolate-OPFS-staging-with-unique-names.patch`
6. `d024fb6ad7a06926b611aa9d47548de2b3093753` → `0006-fix-test-use-schemaVersion-2-in-Range-metadata-fixtu.patch`

Generation command:

```text
downstream/scripts/export-patch.sh \
  0835cac4ab8f974035d31845f5c2b93b0c85b5c6 \
  patch/encrypted-direct-download-export \
  110-encrypted-direct-download \
  --start 403153756561d493bb665d93f82d91b18f02be04
```

`patch/encrypted-direct-download-export` is a local replay-adaptation workspace
only. It is not the source-review branch and must not be merged into
`upstream-sync`.

Provenance: C Encrypted/large direct download ADOPT_WITH_REDESIGN /
Issue #82. Not a wholesale fork merge. No P2P/WebRTC/TURN. No
AES-GCM-CHUNKED-only migration. No Issue #83 ZIP/multi-file UX. No
Issue #84 max-read consume. No new third-party library. License/IP:
repository MIT; no additional NOTICE requirement. Original
implementation author: Ian (`219239532+markd3ng@users.noreply.github.com`).
Upstream status at adoption: not present in pinned upstream
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`. Adoption date: 2026-09-09.

Behavior:

- Encrypted Display URL with a valid `#key` downloads AES-GCM plaintext.
  Filename drops `.encrypted`. Without `#key`, ciphertext/raw download
  remains. No password/key prompt is invented.
- `#key` stays in the URL fragment. It is not logged, stored in
  localStorage, placed in OPFS names, or sent to the server.
- Encrypted and oversized bodies skip SSR `__PASTE_DATA__`. Existing
  small-paste SSR is unchanged.
- OPFS staging uses unique `pb-dl-<uuid>` names. Wipe (empty overwrite)
  and `removeEntry` run in `finally` on success and failure. First
  `removeEntry` failure is retried; a later microtask cleanup is queued
  if retries exhaust. Concurrent downloads do not share staging names.
- Blob object URL fallback when OPFS is unavailable. Display download
  revokes the object URL after 60s.
- Unencrypted GET honors simple `Range: bytes=start-end` as `206` with
  `Content-Range`. R2 uses `R2.get(..., { range })` rather than buffering
  the whole object. Unsatisfiable ranges return `416` with exposed
  `Content-Range`. Encrypted pastes ignore Range (full `200`). A future
  `maxReads` metadata field also disables Range; max-read consume itself
  is Issue #84 and is not implemented.

Residual threat model (documented, not claimed eliminated):

- Decryption happens in the browser; plaintext exists in memory for the
  download. Object URLs are revoked on a timer, not instantly.
- If OPFS wipe and `removeEntry` both fail after retries, an isolated
  `pb-dl-*` staging file may remain until later origin cleanup. Unique
  names prevent concurrent clobber. `#key` is never in that filename.
- Range on KV still slices an already-loaded ArrayBuffer (KV bodies are
  below the R2 threshold). Encrypted Range remains whole-body by design
  so a later consume-on-GET policy can stay consistent.

Dependencies on other downstream patches: product semantics are independent.
Replay is stacked after `010`–`100`. Exported `0006` only adjusts the Range
test fixture to Patch `010` `schemaVersion: 2`.

Source validation: GitHub Actions PASS, Greptile PASS (5/5, 0 unresolved
actionable findings on `a02ea9a...`), Cursor Bugbot SKIPPED_QUOTA, Codex
SKIPPED_QUOTA / OWNER_CODEX_QUOTA_EXHAUSTED.

Removal condition: retire this patch when official upstream includes an
equivalent decrypted Display download, OPFS/Blob staging, and compatible
optional Range behavior, and the downstream series validates without it.
