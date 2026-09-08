# 040 — Sanitize uncaught 500 responses

Purpose: prevent uncaught exception details from being returned by the generic
Pastebin Worker HTTP boundary while preserving server-side diagnostics.

Patch ID: `040-sanitize-uncaught-500`

Development branch: `patch/sanitize-uncaught-500`

Pinned upstream base:
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Patch Source PR: [#97](https://github.com/Skyline-Gazer/pastebin-worker/pull/97)
(review-only, unmerged).

Reviewed source HEAD:
`8aebf56f4a9a41b7ec1d669c1767a13755a011e9`

Exported patch:
`0001-fix-errors-sanitize-uncaught-500-responses.patch`

Provenance: downstream-identified security fix for Issue
[#80](https://github.com/Skyline-Gazer/pastebin-worker/issues/80); not external
fork adoption. No third-party code was copied, the repository license is
unchanged, and no additional NOTICE requirement applies.

Behavior: an uncaught exception returns HTTP 500 with the stable body
`Error 500: Internal Server Error\n`. Its raw message, stack, cause, and other
exception-derived details are not returned to clients. Existing server-side
stack logging and structured `ParseError` / `WorkerError` behavior are
unchanged.

Dependencies on other downstream patches: none.

Source validation: GitHub Actions PASS, Greptile PASS, Cursor Bugbot
SKIPPED_QUOTA, Codex source review PASS, zero unresolved findings; local Node 22
suite passed 22 files / 157 tests plus Prettier, ESLint, TypeScript, frontend
build, Worker dry-run build, and `git diff --check`. The complete ordered stack
replayed cleanly and its assembled source passed 22 files / 178 tests plus the
same static/build checks under Node 22. Assembled HEAD:
`68f87b1766ca1c445f1e1a6e2bc532572c492081`; assembled tree:
`ec4491d480e67535ca254b689ca02689f42d1209`.

Removal condition: retire this patch when official upstream returns an
equivalent stable generic body for uncaught 500 responses without disclosing
exception details, and the downstream series validates without it.
