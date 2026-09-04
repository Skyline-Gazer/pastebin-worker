# Phase 3 — Feishu Paste client and binding store PLAN

Status: OWNER APPROVED in the current owner conversation; persisted before SPEC.

## Authorization and baseline

The owner resumed the original objective with “按照原目标继续” and instructed continuation after reviewing this PLAN with “愣着干嘛”. This resumes planning; it does not pre-approve SPEC or implementation TODOs. The prior freeze remains a historical checkpoint, not a new implementation baseline.

- Downstream baseline: `4524922dd62a4eaa530cad764a3b40b3c392f8f6`.
- Pinned upstream: `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`.
- Patch 010 is promoted. Source PR #5 remains review-only, OPEN / UNMERGED.
- The Add-on has directory scaffolding, but no runtime implementation.
- Refresh and re-verify these refs before implementation; no source changes are authorized by this artifact alone.

## Objective and context

Build the original Phase 3 backend foundation: a Paste HTTP client, secure management credentials, persistent bindings, updates to the same Paste, and recoverable metadata reconciliation. Paste bodies remain authoritative in upstream KV/R2. Add-on storage contains mapping, credentials and lifecycle metadata, not a second authoritative content copy.

## Proposed approach

1. Centralize upstream creation, reads, updates and sanitized error mapping in a server-only HTTP client. Create Active entries using `e=never`; update the existing Paste using PUT.
2. Persist stable business keys, Paste identifiers, URLs, encrypted credentials and lifecycle state. Initial state is active/permanent with null expiry.
3. Generate passwords using a cryptographically secure source. Keep encryption keys in Worker secrets. Public data uses explicit allowlists; credentials and secret-bearing URLs never enter responses or logs.
4. Specify recovery for upstream success followed by storage failure, ambiguous network outcomes, repeated requests and concurrency. Do not assume cross-system transactions or report false success.
5. Select durable storage during SPEC review based on uniqueness, concurrency and recovery requirements.

## Assumptions and verification

- Patch 010 supplies permanent Paste behavior: verify the reviewed exported source and assembled API contract before coding the client.
- No Add-on runtime exists: inspect tracked files under `downstream/addons/feishu` before implementation.
- Downstream and upstream pins are current: fetch and compare remote refs before selecting the feature branch base.
- Public authentication is not yet specified: do not expose unprotected management routes; define the future adapter boundary in SPEC.

## Non-goals

No webhook, frontend, completion/archive/restore or batch implementation. No Patch 010 regeneration, series changes, upstream-sync changes or direct upstream-owned source/config changes. Never merge PR #5.

## Candidate components

Under `downstream/addons/feishu`: `worker/` for client/services/credentials; `shared/` for public types; `migrations/` for selected storage; `tests/` for security and integration tests; `docs/` and README for contracts, configuration and recovery. Add-on-specific tooling stays downstream-owned.

## Risks and unresolved choices

Storage selection, atomic uniqueness/concurrency, idempotency, orphaned Paste recovery, encryption configuration and future authorization require explicit SPEC treatment. No presumed global transaction and no plaintext credential fallback.

## Validation strategy

Use Node 22 / pnpm 10. Record genuine behavior-first RED then GREEN for permanent creation, same-Paste updates, safe public responses/logging, upstream/storage failure, retries and concurrency. Run applicable lint, typecheck, tests, build and downstream regression checks. Require independent current-HEAD AI review and CI on implementation PRs; old owner overrides do not apply.

## References

- `docs/IMPLEMENTATION_ORDER.md`, Phase 3.
- `docs/API_CONTRACT.md` and `docs/SECURITY.md`.
- `docs/CHANGE_CONTEXT_AND_REVIEW.md`, §10.
- `docs/DEVELOPMENT_FREEZE.md` (historical freeze).

Implementation has NOT started.
