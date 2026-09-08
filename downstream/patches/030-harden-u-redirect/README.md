# 030 — Harden `/u/` redirects

Purpose: restrict the generic Pastebin `/u/` redirect role to canonical,
credential-free HTTP(S) URLs.

Patch ID:

```text
030-harden-u-redirect
```

Development branch:

```text
patch/harden-u-redirect
```

Pinned upstream base:

```text
0835cac4ab8f974035d31845f5c2b93b0c85b5c6
```

Patch Source PR: [#95](https://github.com/Skyline-Gazer/pastebin-worker/pull/95)
(review-only, unmerged).

Reviewed source HEAD:

```text
40fc3b6e591d2324a081a7f4b816d7f3693cf4d2
```

Source commits and exported files, in replay order:

1. `968faede398fbd1a56e1681ed1a869e12dc6db31` →
   `0001-fix-redirect-restrict-URL-redirects-to-credential-fr.patch`
2. `40fc3b6e591d2324a081a7f4b816d7f3693cf4d2` →
   `0002-fix-redirect-reject-empty-URL-userinfo.patch`

Provenance: downstream-identified security fix for Issue
[#79](https://github.com/Skyline-Gazer/pastebin-worker/issues/79); not external
fork adoption. No third-party code was copied. Repository license and existing
attribution are unchanged; no additional NOTICE requirement applies.

Behavior: `/u/` accepts canonical `http://` and `https://` URLs without
userinfo. It rejects other schemes, malformed or non-canonical slash forms, and
HTTP(S) authorities containing empty or non-empty credentials. Existing path,
query, overlong-input, and ordinary redirect behavior remains covered.

Dependencies:

```text
none
```

Validation: source PR CI PASS, Greptile PASS, Cursor Bugbot SKIPPED_QUOTA,
Codex source review PASS, and zero unresolved findings at the reviewed source
HEAD. The complete ordered series replayed from the pinned base without
three-way conflict handling. The assembled source passed all 21 test files / 177
tests, Prettier, ESLint, TypeScript, frontend build, Worker dry-run build, and
`git diff --check` under Node 22. Assembled HEAD:
`949340282e6b05858dd5d3889bb98f63a155c5f4`; assembled tree:
`77f555a17a4d7eb2bf39eefc077ebcc30ccc23ee`.

Removal condition: retire this patch when official upstream contains an
equivalent credential-free HTTP(S) redirect allowlist and the downstream series
replays and tests cleanly without it.
