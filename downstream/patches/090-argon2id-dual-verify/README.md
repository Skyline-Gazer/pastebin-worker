# 090 — Argon2id BASIC_AUTH with bcrypt dual-verify

Purpose: generate new HTTP `BASIC_AUTH` hashes as Argon2id while existing
bcrypt hashes remain verifiable during migration. Unknown or malformed hash
prefixes fail closed. Paste-management passwords are unchanged.

Patch ID: `090-argon2id-dual-verify`

Development branch: `patch/argon2id-dual-verify`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#107](https://github.com/Skyline-Gazer/pastebin-worker/pull/107)
(review-only, unmerged; do not merge into `upstream-sync`).

Issue: [#85](https://github.com/Skyline-Gazer/pastebin-worker/issues/85)

Accepted source HEAD (`PATCH_SOURCE_OWNER_ACCEPTED`):
`7185565205eb31a33fca9277b660f0b503f11579`

Source gate: `OWNER_OVERRIDE: SOURCE_REVIEW_QUORUM`. Normal reviewer quorum was
not satisfied. Bugbot and Codex were `SKIPPED_QUOTA`. Not recorded as
`PATCH_SOURCE_VERIFIED`.

Reviewed source commits (PR #107 HEAD; source branch was not rewritten):

1. `7185565205eb31a33fca9277b660f0b503f11579`

Exported files, in replay order. The `.patch` `From` SHA is a replay-adapted
cherry-pick onto assembled `080` (`0d84752c7c583aa09f3b3666e549d28b4b172ef4`)
so the ordered series applies with fail-closed `git am` and without `--3way`.
Git auto-merged `README.md`, `package.json`, and `pnpm-lock.yaml`.
No manual conflict resolution was required.

#85 semantics were not changed. Source PR #107 HEAD remains `7185565...`.

1. `e9cac024659f6102d2297b0ff881a0b438a6748a` → `0001-feat-auth-hash-BASIC_AUTH-with-Argon2id-and-dual-ver.patch`

Generation command:

```text
downstream/scripts/export-patch.sh \
  0835cac4ab8f974035d31845f5c2b93b0c85b5c6 \
  patch/argon2id-dual-verify-export \
  090-argon2id-dual-verify \
  --start 0d84752c7c583aa09f3b3666e549d28b4b172ef4
```

`patch/argon2id-dual-verify-export` is a local replay-adaptation workspace only.
It is not the source-review branch and must not be merged into `upstream-sync`.

Provenance: C Argon2id ADOPT_WITH_REDESIGN / Issue #85. Not a wholesale fork
merge. Argon2id implementation is `@noble/hashes` 2.4.0 (`argon2id` only).
License/IP: `@noble/hashes` is MIT (Paul Miller); `bcrypt-ts` remains MIT
verify-only for `$2a$`/`$2b$`/`$2y$`; repository MIT; no additional NOTICE
requirement. Original implementation author: Ian
(`219239532+markd3ng@users.noreply.github.com`). Upstream status at adoption:
not present in pinned upstream `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`.
Adoption date: 2026-09-09.

Argon2id parameters (generated hashes):

- `m=19456` (KiB)
- `t=2`
- `p=1`
- `dkLen=32`
- PHC version `v=19`

Implementation: Worker-safe `@noble/hashes`. `hash-wasm` was not used:
workerd tests reject Wasm code generation (`Wasm code generation
disallowed by embedder`). Fork lockfile was not taken wholesale.

Behavior:

- New BASIC_AUTH hashes are Argon2id PHC strings from `./scripts/argon2id.js`.
- Existing `$2a$` / `$2b$` / `$2y$` bcrypt hashes still verify.
- Unknown prefixes and malformed PHC encodings fail closed.
- Parsed Argon2id `m`/`t`/`p` are bounded before hashing (`m` 8..65536 KiB,
  `t` 1..8, `p` must be 1, `v=19` only).
- Output comparison is `crypto.subtle.timingSafeEqual`.
- Successful login does not rewrite stored hashes.
- Paste-management passwords (`shared/verify.ts`) are unrelated and
  unchanged.

Residual (documented, not claimed fixed):

- Stored bcrypt hashes are not automatically converted to Argon2id.
- Operators must regenerate hashes with `./scripts/argon2id.js` if they
  want Argon2id stored values.
- `$argon2i$` / `$argon2d$` hashes are not accepted.
- Paste-management password hashing is out of scope.

Dependencies on other downstream patches: assembled after `010`–`080`
because Patch `080` already changed `README.md`, `package.json`, and
`pnpm-lock.yaml`.

Source validation: GitHub Actions PASS, Greptile PASS (5/5, 0 unresolved
actionable findings on `7185565...`), Cursor Bugbot SKIPPED_QUOTA, Codex
SKIPPED_QUOTA / OWNER_CODEX_QUOTA_EXHAUSTED.
