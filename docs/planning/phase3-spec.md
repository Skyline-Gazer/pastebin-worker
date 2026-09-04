# Phase 3 — Feishu Paste client and binding store SPEC

Status: SPEC APPROVED

Parent: [approved PLAN](phase3-plan.md). The owner explicitly approved this SPEC and execution of its consistent TODO in the attached “PHASE 3 SPEC APPROVED — CONTINUE EXECUTION” instruction. D1, internal-only services and fail-closed uncertain-create handling are approved. Proposal wording below is retained as the approved contract, not an outstanding approval request.

## 3.1 Problem statement

The Add-on currently cannot securely create or manage a Paste. Subsequent Feishu integration needs durable bindings and safe recovery without copying authoritative Paste bodies into another database.

## 3.2 Goals

Provide server-only creation, read, content update and metadata reconciliation services; durable unique bindings; encrypted management credentials; explicit partial-failure outcomes; and executable security/contract tests.

## 3.3 Non-goals

No public HTTP management routes, user authentication implementation, webhook, frontend, archive/restore/delete product flow or batch API in this delivery. No changes to upstream source, Patch 010 or series. Future adapters must authenticate and authorize callers before invoking these internal services.

## 3.4 Current behavior

The Add-on contains scaffolding only. Patch 010 was promoted to downstream/main and implements permanent Paste support. Its source PR #5 must remain unmerged. Exact source request/response behavior must be checked against the reviewed patch, not inferred from unpatched downstream source.

## 3.5 Desired behavior

- Create one binding for a stable, trusted `(scopeId, recordKey)` pair.
- Generate credentials on the server, create with `e=never`, and confirm authoritative permanent metadata before reporting ready.
- A ready binding is active/permanent with `expiresAt: null`.
- Content updates target the bound Paste with the stored credential and retain permanent retention. They never create a replacement Paste automatically.
- Reads obtain content from upstream on demand. No durable body copy is stored by this service.
- Missing, inconsistent or ambiguous upstream state becomes an explicit reconciliation outcome, never fabricated success or automatic destructive repair.

## 3.6 Service flows

This phase exposes internal TypeScript services, not HTTP routes. HTTP routes/methods and browser authentication are N/A until the adapter phase.

Proposed operations:

- `createEntry(context, { recordKey, requestId, content })`.
- `readEntry(context, { entryId })`.
- `updateContent(context, { entryId, requestId, expectedVersion, content })`.
- `reconcileEntry(context, { entryId })`.

`context.scopeId` comes from a trusted server adapter, never an unauthenticated request field. Entry lookups are scope-qualified. Reject malformed/empty identifiers, missing content, conflicting request IDs and stale versions before upstream mutation. An empty content string is distinct from a missing content field; upstream size/content restrictions must be preserved rather than silently bypassed.

Results are discriminated success/error values with sanitized codes, correlation IDs and retryability. Public projections contain entry ID, Paste name, safe public URL, lifecycle state, expiry and version only; a read may additionally return transient content. Internal credentials, operation records and upstream raw errors are excluded.

For creation, reserve the unique binding and persist encrypted credentials before sending the upstream request. Persist the returned Paste identity and confirmed metadata before ready success. Duplicate requests must not dispatch a second creation while the first is pending or ambiguous. A ready duplicate with matching fingerprint returns existing state; the same request ID with different input conflicts.

For update, acquire a per-entry mutation claim and check expectedVersion before dispatch. Update the same Paste, then persist authoritative metadata and increment version. Competing operations conflict rather than issue overlapping upstream writes. A confirmed duplicate returns the recorded result. An ambiguous operation blocks new mutation pending reconciliation.

## 3.7 Data/state model

Proposed store: a downstream-owned D1 database, subject to owner approval and implementation-time verification of the required conditional-write semantics. Do not introduce a separate always-on server.

Binding fields: `id`, `scopeId`, `recordKey`, nullable `pasteName` during creation, safe URL, encrypted credential envelope with key ID, `visibility`, `retentionMode`, nullable `expiresAt`, `version`, operation status, created/updated timestamps. Unique key: `(scopeId, recordKey)`.

Operation fields: scope-qualified request ID, entry ID, operation kind, keyed input fingerprint, expected version, status, sanitized outcome, timestamps and non-secret correlation ID. No full content or plaintext password. Fingerprints use a server-held key so low-entropy content is not stored as an easily enumerable plain hash.

Operation states: `reserved -> dispatched -> succeeded`; definite pre-dispatch failure may become `failed`; any uncertain post-dispatch outcome becomes `reconciliation_required`. Binding readiness is separate from product visibility. Pending/failed bindings are not returned as ready Active entries. Mutation claims are not automatically stolen merely because a timeout elapsed.

## 3.8 Security and trust boundaries

Generate at least 256 random bits for management credentials. Encrypt at rest using authenticated encryption with a fresh nonce and binding identity as authenticated context; encryption and fingerprint keys live in Worker secrets, never database rows or source. Missing/invalid key configuration fails closed. No plaintext fallback.

Use only a configured trusted upstream origin. Reject redirects for credential-bearing requests. Do not accept arbitrary destination URLs, passwords or scope identities from public callers. Never log request bodies, decrypted credentials, secret-bearing URLs or raw upstream errors. Public objects must be constructed by allowlist, not by removing one known secret field from an internal object.

## 3.9 Compatibility

Target the pinned upstream plus reviewed Patch 010. Verify nullable expiry and real request encoding against that source. Unsupported permanent capability fails explicitly; do not silently fall back to a timed Paste. Initial storage migration creates Add-on-owned tables only. Node 22 / pnpm 10 applies to validation; runtime remains Cloudflare Workers.

## 3.10 Failure behavior

- Storage reservation failure: no upstream request.
- Definite upstream rejection: sanitized failure; no ready binding.
- Creation response lost or returned identity not durably saved: retain reservation and credentials, mark reconciliation required where possible; no blind POST retry. Recovery may require operator action because upstream create idempotency is not assumed.
- PUT timeout: do not assume failure or success; reconcile using upstream content fingerprint/metadata before allowing another mutation.
- Metadata/storage failure after upstream success: report partial/uncertain result, never successful atomic completion.
- Upstream missing Paste: report missing state without automatic recreation or deletion of evidence.
- Upstream unavailable: reads/reconciliation return retryable errors; retries do not silently dispatch new mutations.
- A process crash after dispatch leaves a persisted non-ready operation that subsequent callers treat as uncertain, not permission to retry creation.

## 3.11 Acceptance criteria

1. Creation sends `e=never` and a server-generated credential; ready response requires persisted binding and permanent metadata.
2. Updates address exactly the original Paste; repeated and concurrent requests do not create another Paste.
3. Cross-scope access performs no upstream mutation and reveals no binding data.
4. No password, management URL or raw upstream error appears in public output or captured logs.
5. Stored credentials are authenticated ciphertext; stored records contain no full body.
6. Conflict, timeout, storage failure and process-interruption paths have explicit outcomes and preserve recovery evidence.
7. Missing Paste does not trigger automatic replacement; ambiguous create is not retried blindly.
8. All code/config remains downstream-owned; previous patch artifacts and PR #5 are untouched.

## 3.12 Test specification

Map criteria 1–2 to mocked HTTP contract and persistent-store integration tests; include duplicate request IDs, conflicting fingerprints and simultaneous mutation claims. Map 3–5 to negative security tests for scope isolation, public projections, logs, ciphertext tampering, absent keys and redirect rejection. Map 6–7 to fault injection before dispatch, after dispatch, during metadata fetch and during final persistence, including restart recovery. Check criterion 8 by final tracked diff inspection.

Record actual RED/GREEN evidence for new behavior. Run Add-on tests, typecheck, lint/build and applicable downstream regressions under Node 22 / pnpm 10. Test upstream contract against the reviewed patched source; any disposable replay must follow canonical series order without three-way fallback or manual edits. All implementation PRs require current-HEAD CI and independent AI review or a new explicit owner override.

## 3.13 Proposed choices requiring approval

- D1 for binding/operation persistence, with explicit mutation claims and version checks.
- Internal services only in Phase 3; public authentication/routes deferred to their adapter phase.
- Fail-closed operator reconciliation for ambiguous creates whose Paste identity cannot be recovered; no promise of unsupported upstream exactly-once creation.

If implementation verification disproves any proposed storage or recovery assumption, stop and revise this SPEC instead of silently changing the contract.

Status: SPEC APPROVED

Implementation has NOT started.
