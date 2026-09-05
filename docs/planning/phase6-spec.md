# Phase 6 — Single completion actions SPEC

Status: CONTINUOUS-MODE STOP — OWNER DIRECTION REQUIRED FOR BROWSER AUTHORIZATION / SCOPE RESOLUTION

Implementation has NOT started.

Parent: [approved Phase 6 PLAN](phase6-plan.md). This is an in-scope D-030 continuous-execution SPEC. It does not authorize implementation because the required trusted browser authorization boundary is absent at the inspected baseline.

## 3.1 Problem statement

Phase 5 renders a managed, unchecked top-level task but deliberately makes its control inert. A user needs to complete that one managed entry task through an explicit retention decision, without exposing a Paste management password, making a checkbox click silently destructive, or allowing one browser caller to mutate another scope's Paste.

## 3.2 Goals

1. Offer a compact chooser with exactly `archive_permanent`, `archive_expiring`, and `delete` before a managed task mutation.
2. Move successful archive results from Active to an authoritative-result-backed Archive list; permanent rows show `永久保留`, timed rows retain the exact server-returned `expiresAt`.
3. Define the semantic completion path: browser `POST /api/entries/:id/complete` → Add-on Worker → Phase 3 services → Pastebin.
4. Preserve server-only credentials, upstream Paste-body authority, scoped operation claims/idempotency, and fail-closed reconciliation.
5. Stop rather than invent a browser session, accept browser `scopeId`, or use a global/default scope.

## 3.3 Non-goals

No browser authentication implementation, login/session scheme, Feishu SDK trust assertion, or authorization policy is selected by this SPEC. No restore, countdown loop, list/pagination/read API, reconciliation UI, Batch Mode, production deployment/migration, upstream patch/root dependency/workflow work, or changes to `upstream-sync` or PR #5 are in scope.

## 3.4 Current behavior

At `downstream/main` baseline `72046dc`, Phase 5 has a fixture-only frontend: the distinct managed checkbox opens no dialog, changes no state, and sends no request. Archive data is static fixture presentation.

Phase 3 has internal scoped services only. `EntryContext.scopeId` is expressly for a trusted authenticated adapter; bindings and operations are scope-qualified, credentials are encrypted server-side, and mutations use a per-entry claim, request fingerprint, version, success replay, and uncertain-outcome blocking. Its current schema/projection supports Active/permanent/null only. It has no completion operation, archived/timed/delete persistence, expiry capture, or browser HTTP route.

Phase 4's sole public route is `POST /api/feishu/events`. It verifies an encrypted Feishu callback and derives a scope from configured application, allowed tenant, and P2P chat for create-message ingestion. It neither authenticates a browser request nor resolves a browser principal to an allowed scope. Reusing it as one would be a new trust model, not an approved boundary.

## 3.5 Desired behavior

For one lifecycle-managed, unchecked top-level task in normal Active view:

1. Clicking it opens a compact chooser; no content, binding, Paste, or UI state is mutated yet. Cancel closes it unchanged.
2. `archive_permanent` changes only the managed source task to checked, keeps upstream retention `e=never`, then persists/returns `archived/permanent/null` after upstream success.
3. `archive_expiring` changes that managed source task to checked, changes upstream retention to `e=max`, obtains a validated non-null ISO `expiresAt` from upstream response/metadata, then persists/returns `archived/timed/<expiresAt>`. The browser never derives a deadline from a duration or `MAX_EXPIRATION`.
4. `delete` needs a distinct destructive confirmation after chooser selection. Confirmed server-side upstream DELETE precedes binding removal. Success removes the entry from Active and Archive; v1 stores no tombstone.
5. Only a successful authoritative Worker result moves frontend state. Duplicate submission is disabled while pending. Other Markdown checkboxes remain content and cannot archive/delete an entry.

Transitions are `ACTIVE_PERMANENT → ARCHIVED_PERMANENT`, `ACTIVE_PERMANENT → ARCHIVED_EXPIRING`, and `ACTIVE_PERMANENT → DELETED`. Persistence happens only after confirmed upstream success; a post-dispatch unknown result remains reconciliation-required, never reported as completed.

## 3.6 User/API flows

### Browser flow

The managed control opens the chooser. Choosing archive requires one normal confirmation; choosing delete opens/uses an explicit destructive final confirmation. Cancel at either point is a no-op. On a successful response the client removes the Active row and inserts the returned archive state, except delete, which removes it. Errors retain the prior displayed state and show only a sanitized retry/status message.

### Completion adapter contract — blocked precondition

The semantic route is:

```http
POST /api/entries/:id/complete
Content-Type: application/json
Idempotency-Key: <bounded opaque request identity>

{ "action": "archive_permanent" | "archive_expiring" | "delete" }
```

`id`, method, JSON media type/body size, action enum, and idempotency identity must be validated before any service/upstream activity. The adapter must derive `EntryContext` from an already authenticated and authorized browser principal; the browser must never submit `scopeId`, Paste name, password, management URL, retention date, or source body. Scope lookup must be server-side and deny an entry outside the resolved scope before upstream activity.

On success archive returns only the allowlisted public entry state (`id`, safe public URL/name where already permitted, `visibility`, `retentionMode`, exact `expiresAt`, `version`); delete returns `204` or an equivalent secret-free success result. Invalid input, unauthenticated, forbidden, missing, stale/conflicting, and reconciliation-required outcomes use stable sanitized codes; no raw upstream error/body is returned. A repeated identical completed request replays its recorded result; same identity with different inputs conflicts; pending/ambiguous claims block a new mutation. There is no partial-success semantic for this single-entry endpoint.

This route cannot be implemented until the authorization precondition below is resolved. Its wording locks semantics, not a permission to expose the route.

## 3.7 Data/state model

Paste content remains authoritative upstream. The service may read it transiently to make a deterministic managed-top-level-task source transition, but D1 must not store a second full body.

The eventual additive binding projection must represent:

```ts
visibility: "active" | "archived"
retentionMode: "permanent" | "timed"
expiresAt: string | null
version: number
```

Existing ready bindings remain `active/permanent/null`. Timed state requires a validated upstream ISO timestamp; permanent and active state require null. The operation record must extend the existing scoped claim model with a completion kind/action and fingerprint including scope, entry, action, expected version, and server-held request identity. It must retain only safe result snapshots, never plaintext credential/full body. Any migration is additive and cannot reset existing bindings.

## 3.8 Security and trust boundaries

The Paste password, credential envelope, encryption/fingerprint keys, credential-bearing URLs, raw upstream errors, and trusted scope identifiers remain backend-only. Logs and public responses are allowlisted and secret-free. Browser input is untrusted and may contain entry IDs/action/idempotency identity only after syntactic validation.

**Resolved inspection result / STOP:** no already approved Add-on browser authentication and principal-to-scope resolver exists. The Phase 4 webhook boundary is callback-only and cannot authorize a browser mutation. Therefore the following are forbidden: unauthenticated completion, a global/default scope, scope inferred solely from an entry ID, browser-supplied `scopeId`, or repurposing Feishu webhook headers/payload as browser credentials.

Owner direction is required to select and approve an existing/approved Add-on browser boundary (including its credential verification, principal identity, scope-resolution rule, authorization rule, CSRF/origin policy where relevant, expiry/revocation, error policy, and testable deployment configuration). That choice changes the trust boundary and is outside this delegated SPEC. Once approved, this SPEC, PHASE/TODO, and implementation plan must be updated under §10.5 before code begins.

## 3.9 Compatibility

The work remains Add-on-local and uses generic upstream `e=never`/`e=max` capabilities without Feishu logic upstream. Existing Active/permanent bindings must remain readable and require no destructive reset. Phase 5 fixture behavior is replaced only after a trusted adapter exists; until then it stays fixture-only and inert. Older clients receive no new mutation endpoint absent the approved authentication boundary.

## 3.10 Failure behavior

Validation/authentication/authorization failure performs no Phase 3 or upstream action. Definite upstream failure leaves displayed/local lifecycle state unchanged. Dispatch timeout, failed metadata verification, or local persistence failure after upstream success is reconciliation-required: preserve evidence and claim, do not blind-retry, fabricate expiry, delete a binding, or report success. Upstream missing returns sanitized `ENTRY_NOT_FOUND` and has no automatic replacement/deletion-of-evidence behavior. Source ambiguity for the required managed top-level task is a fail-closed error, not permission to choose another checkbox.

## 3.11 Acceptance criteria

Implementation is blocked; after owner-approved trust design, it must prove:

1. The exact chooser actions, Cancel no-op, and delete final confirmation.
2. Permanent/timed/delete transitions and only-after-upstream-success binding persistence/removal.
3. Timed Archive state uses the exact validated returned `expiresAt`.
4. Browser sends no management secret, scope, Paste identity beyond entry ID, source content, or calculated expiry; public results/logs expose none.
5. A server-derived authorized scope denies cross-scope access before upstream activity; no global/default or unauthenticated mutation path exists.
6. Duplicate, conflict, ambiguous, missing, and source-ambiguity outcomes are fail-closed and sanitized.
7. Existing active/permanent bindings remain compatible and upstream-owned paths/patch artifacts are unchanged.

## 3.12 Test specification

Required RED/GREEN evidence after unblocking includes frontend chooser/cancel/pending/delete-confirm/result-state tests; service/store/client tests for transition ordering, managed-source precision, expiry metadata validation, claims/replay/conflicts and reconciliation; adapter tests for method/body/action/idempotency validation, authenticated server-derived context, cross-scope denial before upstream calls, and response/log redaction; migration compatibility tests; and Worker/frontend type/lint/build/regression suites. The new authorization boundary needs negative credential/origin/CSRF/revocation tests matching the owner-approved design.

## 3.13 Open questions / owner STOP

Which already approved browser authentication and server-side principal-to-scope resolution boundary authorizes `POST /api/entries/:id/complete`? No such boundary is documented or implemented. The owner must decide it; this agent must not select or create one under D-030. Implementation may not begin until that decision is recorded and the affected SPEC/PHASE/TODO artifacts pass change control.

## Internal consistency review

Reviewed against the Phase 6 PLAN, API Contract §5, Design §§3/9, Frontend §§5/11–12, Retention Lifecycle §§3–5/9, Security §§1–2/5–7, Phase 3 SPEC §§3.4/3.8, Phase 3 services documentation, Phase 5 artifacts, and CHANGE_CONTEXT §10.1.1/10.3/10.4. The product behavior, source-of-truth, secret, lifecycle, and generic-upstream boundaries are consistent. Inspection shows the only approved authenticated boundary is the callback-only Phase 4 webhook; treating it as browser authorization would invent a trust boundary. The STOP is therefore required by §10.1.1.

Status: CONTINUOUS-MODE STOP — OWNER DIRECTION REQUIRED FOR BROWSER AUTHORIZATION / SCOPE RESOLUTION

Implementation has NOT started.
