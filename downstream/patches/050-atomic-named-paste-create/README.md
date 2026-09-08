# 050 — Atomic named paste create

Purpose: eliminate the `pasteNameAvailable` → `createPaste` TOCTOU race so
concurrent direct custom-name POST creates produce exactly one winner and
stable HTTP 409 losers.

Patch ID: `050-atomic-named-paste-create`

Development branch: `patch/atomic-named-paste-create`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#99](https://github.com/Skyline-Gazer/pastebin-worker/pull/99)
(review-only, unmerged; do not merge into `upstream-sync`).

Issue: [#78](https://github.com/Skyline-Gazer/pastebin-worker/issues/78)

Accepted source HEAD (`PATCH_SOURCE_OWNER_ACCEPTED`):
`a3482e05a7ddf808a48ffe2f9e0ebafc758f7e26`

Reviewed source commits (PR #99 HEAD lineage; source branch was not rewritten):

1. `8424a5fe0e09c85b97490103cdf91ab2117f9ff6`
2. `d7930363f9161f70d51da5a9c9b2d0cccc34cc48`
3. `0673611479b246233ed660830a6f9d279dc24159`
4. `a3482e05a7ddf808a48ffe2f9e0ebafc758f7e26`

Exported files, in replay order. The `.patch` `From` SHAs are replay-adapted
cherry-picks onto assembled `040` (`68f87b1766ca1c445f1e1a6e2bc532572c492081`)
so the ordered series applies with fail-closed `git am` and without `--3way`.
The only adaptation is preserving Patch `010` `retentionFromMPU` / permanent
expiration plumbing in `handleWrite.ts` beside the named-create claim path.

1. `84d10ce37cf2d8d1f0a43a8a2fd413d9e39da10c` → `0001-fix-storage-atomically-claim-custom-paste-names.patch`
2. `cfa7276786e38a3556d1bab0386422279c114588` → `0002-fix-storage-make-expired-name-reclaim-generation-saf.patch`
3. `3939fc78bf5fecda485d7894f90cc6db63d3388d` → `0003-fix-storage-expire-failed-named-claims-without-delet.patch`
4. `15b80c1fbf4e8800e888964055b01565cc56b0f2` → `0004-fix-storage-keep-original-metadata-error-if-claim-cl.patch`
5. `d12bd3ce296c3dd22fe148a08437b6f320f05fb2` → `0005-test-storage-assert-sanitized-500-when-named-claim-c.patch`
6. `85872d000c52c73773f5682b35d41f7de9106244` → `0006-fix-storage-fail-closed-reclaim-and-reservation-comp.patch`

Exported commit 0005 is an assembled-series test adaptation only: Patch 040 sanitizes uncaught 500 bodies, so the source-branch assertion that the client sees `kv unavailable` is replaced with the generic uncaught body plus a console.error check that the original KV error is still logged and the cleanup throw is not. Source PR #99 HEAD remains `a3482e05...`.

Exported commit 0006 is a promotion review-fix for PR #100 Greptile P1s: identical-body reservation is generation-safe expired if the body PUT misses/throws, and legacy R2 objects without custom expiry metadata are reclaimed only when KV metadata is present and expired (KV miss is fail-closed).

Generation command:

```text
downstream/scripts/export-patch.sh \
  0835cac4ab8f974035d31845f5c2b93b0c85b5c6 \
  patch/atomic-named-paste-create-export \
  050-atomic-named-paste-create \
  --start 68f87b1766ca1c445f1e1a6e2bc532572c492081 \
  --replace
```

`patch/atomic-named-paste-create-export` is a local replay-adaptation workspace
only. It is not the source-review branch and must not be merged into
`upstream-sync`.

Provenance: downstream-identified audit finding D-API-002 / Issue #78; not
external fork adoption. No third-party code was copied. License/IP: repository
MIT; no additional NOTICE requirement. Original implementation author: Ian
(`219239532+markd3ng@users.noreply.github.com`). Upstream status at adoption:
not present in pinned upstream `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`.
Adoption date: 2026-09-08.

Behavior:

- Direct custom-name creates claim the name with a strongly consistent R2
  conditional PUT (`If-None-Match: *`) of the authoritative body.
- Concurrent same-name creates have exactly one winner; losers receive the
  existing stable `409` body.
- Expired R2 names are reclaimed only with an ETag-qualified replacement,
  including identical-body reclaim.
- Legacy KV-backed names keep the existing availability guard.
- Ordinary KV metadata failure after a successful claim is compensated with a
  generation-safe R2 expire (`willExpireAtUnix: "0"` gated by `uploadedBefore`).
- Compensation cannot delete or overwrite a newer successful generation.
- If that compensation PUT throws, the original metadata error is preserved.

## OWNER_FINDING_DISPOSITION — accepted residual risk

Finding:
If R2 claim succeeds **and** KV metadata persistence fails **and** the
generation-safe compensating R2 mutation itself fails, the custom name may
remain temporarily unavailable: reads return 404 and retries may receive 409
until expiration or later scheduled cleanup.

Classification: VALID / OUT_OF_SCOPE for Issue #78.

Owner decision: `ACCEPTED_RESIDUAL_RISK`.

Reason: eliminating that double-failure window absolutely requires
cross-resource coordination (distributed transaction, Durable Object, lease /
reservation protocol, persistent reconciliation, or orphan sweeper) that frozen
Issue #78 does not authorize.

Current safety property: the residual is fail-closed. It cannot create two
successful concurrent owners, and compensation cannot remove a newer
generation. This is a known fail-closed residual under simultaneous storage
failures, not a secretly fixed bug.

Source-gate wording: `PATCH_SOURCE_OWNER_ACCEPTED` at
`a3482e05a7ddf808a48ffe2f9e0ebafc758f7e26` with
`OWNER_OVERRIDE: SOURCE_REVIEW_QUORUM_AND_SCOPE_DISPOSITION`. This is not
`PATCH_SOURCE_VERIFIED` and does not imply normal 2-of-3 reviewer quorum.
Greptile on the accepted source HEAD remained 4/5; the remaining finding is
this owner-dispositioned residual. Bugbot and Codex were `SKIPPED_QUOTA`.

Replay dependency: file overlap with `010-non-expiring-paste` in
`worker/handlers/handleWrite.ts` (permanent/`retentionFromMPU` plumbing). No
semantic lock, transaction, or reservation dependency.

Removal condition: retire this patch when official upstream includes an
equivalent atomic named-create guarantee, and the downstream series validates
without it.

Canonical replay: `bash downstream/scripts/check-patches.sh 0835cac4ab8f974035d31845f5c2b93b0c85b5c6` PASS.
Assembled HEAD: `03cceb9ad5d2a2a9db50490578819a8f7635cbbe`.
Assembled tree: `8391d9538acc4aca19f5cdbab559ceea6425437e`.
Assembled validation (Node v22.23.2, pnpm 10.28.0): `pnpm exec vitest run` 23 files / 187 tests PASS; Prettier, ESLint, `tsc --noEmit`, `pnpm build:frontend`, `wrangler deploy --dry-run` PASS.
