# Phase 3 internal services

## Integration boundary

`worker/index.ts` exports an internal library. There is no HTTP router, public management endpoint,
webhook or deployment in Phase 3. A future adapter must authenticate and authorize callers before
constructing `EntryContext`. Do not forward browser-supplied scope IDs as trusted context.

Construct `BindingStore` with an Add-on-owned D1 binding. Apply `migrations/0001_bindings.sql`
once using the deployment's migration mechanism; this is an additive initial migration, not a reset.
No production database or migration has been created/applied by this change. Tests apply the real
SQL to an isolated local D1 binding. Never run the test reset statements against deployment data.

Construct `Credentials` with a key ID and two distinct 32-byte keys encoded as 64 hexadecimal
characters. Provision these through Worker secrets: one AES-GCM key and one HMAC-SHA-256 key.
Generate keys outside source control. Missing/invalid configuration fails closed. The envelope
authenticates the binding ID, uses a fresh 96-bit nonce and includes the key ID. Current Phase 3
configuration supports one key ID; do not replace keys while encrypted rows or request fingerprints
still depend on them. Rotation requires a separately reviewed migration, not silent key replacement.

Construct `PasteClient` with the configured HTTPS upstream origin and, if required, a server-held
Authorization header. It rejects origin paths, userinfo and credential-bearing redirects. It constructs
public URLs from validated Paste identifiers and never uses response `manageUrl` as authority.
Creation requests the upstream long random name (`p`) without changing retention semantics.
Public URLs are not access-control tokens; this does not add read authorization to Pastebin.

## State and request identity

`feishu_bindings` has a unique `(scope_id, record_key)` and encrypted credential. Version zero means
not yet ready. Product state is active/permanent/null expiry; operational readiness is separate.
The database stores no content body. `feishu_operations` records the scope-qualified request ID,
keyed fingerprints, expected version, status and the allowlisted successful response snapshot.

D1 batch transactions reserve binding and operation together. A partial unique index allows only
one outstanding mutation for an entry. Conditional insertion checks expected version in the same
SQL statement. Only the reservation owner may dispatch. Claims have no automatic timeout takeover.

Reusing a successful request ID with identical inputs returns its original response snapshot without
another write, even if the entry has since changed. Fetch current state separately. Reusing an ID with
different inputs fails. Different create request IDs cannot allocate a second binding for the same
record key. Clients must retain request IDs across retries; do not reinterpret a conflict as permission
to invent a new record key.

## Failure and reconciliation

All errors are sanitized discriminated results. No raw error, body, decrypted secret or management URL
is logged by these services. Correlation IDs may be logged by adapters without adding secret payloads.

- Before reservation: storage or credential failure sends no upstream request.
- After reservation: dispatch must be durably claimed before network mutation.
- After dispatch: any uncertainty keeps `dispatched` or `reconciliation_required`; never retry POST blindly.
- Successful create: save Paste identity before metadata verification; success requires committed local outcome.
- Missing Paste: return `ENTRY_NOT_FOUND`; never automatically recreate it.
- Pending operations are not exposed as ready Active entries. Public reads check operation/version races.

`reconcileEntry` is non-mutating. With a known Paste identity it checks permanent metadata and the
keyed content fingerprint. Matching content yields `OUTCOME_OBSERVED_OPERATOR_CONFIRMATION_REQUIRED`,
not success and not an unlocked mutation claim: a timed-out remote writer may still be running.
With no known identity, it returns `OPERATOR_RECONCILIATION_REQUIRED` without creating another Paste.

Operator escalation must retain the binding/operation IDs, database state and non-secret evidence.
Do not delete reservations, reset request IDs, steal claims or issue a replacement POST as a recovery
shortcut. An unknown creation identity cannot be discovered reliably through the pinned public API.
No automatic exactly-once recovery is claimed. Operator recovery requires verified upstream outcome
and quiescence plus a separately authorized repair; this library deliberately provides no bypass route.

## Validation and limitations

Tests exercise real local D1 SQL, duplicate/concurrent mutation claims, encryption, scoped access,
same-Paste updates, interrupted dispatch and identity-persistence failure. HTTP contract fixtures are
derived from Stage A source `e10e06fffacdcec43f2a2e271e63dbd075d757ed` (`handleWrite.ts`, `doc/api.md`).
These are mocked HTTP contracts, not a claim of live deployment integration or a new patch replay.
Patch 010 is unchanged. Authoritative validation is current-HEAD GitHub Actions plus the review gate.

The D1 batch/conditional-write design follows the [D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/).
