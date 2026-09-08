# 060 — Move MPU password/uploadId/key off query strings

Purpose: stop new official MPU clients from placing paste management password,
R2 object `key`, or multipart `uploadId` in URL query strings. Those values
move to request headers. Legacy query fallback is retained; header wins.

Patch ID: `060-mpu-query-secrets`

Development branch: `patch/mpu-query-secrets`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#101](https://github.com/Skyline-Gazer/pastebin-worker/pull/101)
(review-only, unmerged; do not merge into `upstream-sync`).

Issue: [#76](https://github.com/Skyline-Gazer/pastebin-worker/issues/76)

Accepted source HEAD (`PATCH_SOURCE_OWNER_ACCEPTED`):
`3d833fed4d135b9f42d669c4742fc6382ae2bc9e`

Source gate: `OWNER_OVERRIDE: SOURCE_REVIEW_QUORUM`. Normal reviewer quorum was
not satisfied. Bugbot and Codex were `SKIPPED_QUOTA`. Not recorded as
`PATCH_SOURCE_VERIFIED`.

Reviewed source commit (PR #101 HEAD; source branch was not rewritten):

1. `3d833fed4d135b9f42d669c4742fc6382ae2bc9e`

Exported files, in replay order. The `.patch` `From` SHA is a replay-adapted
cherry-pick onto assembled `050` (`03cceb9ad5d2a2a9db50490578819a8f7635cbbe`)
so the ordered series applies with fail-closed `git am` and without `--3way`.
Git auto-merged Patch `010` MPU expiration plumbing in `handleMPU.ts`, the
`verifyExpiration` tests in `shared/test/uploadPaste.spec.ts`, and the existing
MPU retention subsection in `doc/api.md`. No manual conflict resolution was
required. Source PR #101 HEAD remains `3d833fed...`.

1. `b6e4a74552c9b77a1993a09ba6eab443ec25f5ed` → `0001-fix-mpu-keep-password-uploadId-and-key-out-of-query-.patch`

Generation command:

```text
downstream/scripts/export-patch.sh \
  0835cac4ab8f974035d31845f5c2b93b0c85b5c6 \
  patch/mpu-query-secrets-export \
  060-mpu-query-secrets \
  --start 03cceb9ad5d2a2a9db50490578819a8f7635cbbe
```

`patch/mpu-query-secrets-export` is a local replay-adaptation workspace only.
It is not the source-review branch and must not be merged into `upstream-sync`.

Provenance: downstream-identified audit finding D-SEC-003 / Issue #76; not
external fork adoption. No third-party code was copied. License/IP: repository
MIT; no additional NOTICE requirement. Original implementation author: Ian
(`219239532+markd3ng@users.noreply.github.com`). Upstream status at adoption:
not present in pinned upstream `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`.
Adoption date: 2026-09-08.

Behavior:

- Official `uploadMPU` create-update sends `X-PB-Password` and does not put
  `password` in the query.
- Official resume/complete/abort send `X-PB-MPU-Key` and `X-PB-MPU-Upload-Id`
  and do not put `key` or `uploadId` in the query.
- `partNumber` and public paste `name` may remain in the query.
- Worker reads those secrets from the matching header first, then the existing
  query parameter. If both are present, the header wins.
- Worker warning logs on the touched MPU paths do not interpolate raw
  password, key, or uploadId.

Residual threat (documented, not claimed fixed):

- Old clients using query fallback can still expose those values in URLs.
- Operator-enabled verbose HTTP/header dumps can still expose headers.
- MPU session authorization remains knowledge of `(key, uploadId)`.
- Compensating abort remains fire-and-forget.

Dependencies on other downstream patches: assembled after `010`–`050` because
Patch `010` already changed `handleMPU.ts` expiration metadata and MPU docs.

Source validation: GitHub Actions PASS, Greptile PASS (5/5, no actionable
defect, 0 review threads on `3d833fed...`), Cursor Bugbot SKIPPED_QUOTA, Codex
SKIPPED_QUOTA / OWNER_CODEX_QUOTA_EXHAUSTED. Local Node 22 source suite passed
21 files / 159 tests plus Prettier, ESLint, TypeScript, and frontend build.
