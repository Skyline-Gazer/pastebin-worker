# OAuth state single-use security SPEC

Status: **DRAFT — OWNER APPROVAL REQUIRED**. This document was prepared under
the PLAN's approval for SPEC preparation only. It does not authorize a phase,
implementation, production change, deployment, or release.

PLAN: [OAuth state single-use security PLAN](oauth-state-consumption-security-plan.md).

## 3.1 Problem statement

The messaging add-on stores OAuth callback state in D1. The current store reads
the state row and deletes it in separate awaited statements. Concurrent
callbacks can therefore both observe a valid row before either delete runs and
both continue toward authorization-code exchange and session creation.

This is a code-level race. Existing evidence does not establish that concurrent
callbacks occurred, that an exposed code was redeemed by another party, or
that a session was created from a historical callback. Those historical
outcomes remain **UNKNOWN**.

## 3.2 Goals

- Make consumption of one valid OAuth state row exclusive to at most one
  callback, including concurrent requests.
- Keep the existing provider selection, state expiry, callback route,
  authorization-code exchange, session lifetime, response, and error behavior.
- Prove the concurrent behavior with deterministic regression coverage and a
  local D1 Worker-runtime check before implementation is eligible to start.
- Keep state, authorization codes, tokens, session IDs, CSRF values, and cookie
  values out of test diagnostics and logs.

## 3.3 Non-goals

- No credential rotation, session invalidation, OAuth provider/protocol change,
  redirect-URI change, retention change, or historical log deletion.
- No inference that historical URL exposure caused unauthorized access or
  compromise; missing correlation evidence remains **UNKNOWN**.
- No production D1 query, production request, configuration change, or
  deployment in this item.
- No change to callback failure semantics beyond making state consumption
  single-use.
- No implementation until this SPEC and a separate PHASE/TODO are approved.

## 3.4 Current behavior

`BrowserTrustStore.consumeOAuthState` in
`downstream/addons/messaging/worker/browser-store.ts` performs a `SELECT` by
state, then a separate `DELETE`. It checks expiry after the delete and returns
the stored provider for a non-expired row. The `feishu_oauth_states` table has
`state` as its primary key and stores `expires_at` and `provider`; the provider
column was added by migration `0008_dual_provider_auth.sql` with a `feishu`
default for existing rows.

`createBrowserAuthHandler` in
`downstream/addons/messaging/worker/browser-auth.ts` consumes state before
code exchange and identity resolution, then inserts a browser session and
returns a redirect with an HttpOnly session cookie. Missing code/state or an
unavailable/expired/consumed state returns `OAUTH_DENIED` (401). Exchange or
identity failure returns `OAUTH_FAILED` (401). Unexpected store errors map to
`UNAVAILABLE` (503). A consumed state remains consumed if later exchange or
identity resolution fails.

Existing test setup in `downstream/addons/messaging/tests/browser-auth.spec.ts`
and `dual-provider-auth.spec.ts` uses the Cloudflare Workers Vitest pool and a
local D1 binding. Existing coverage verifies ordinary OAuth flows, but does not
force the SELECT/DELETE race or assert concurrent callback/session counts.

## 3.5 Desired behavior

1. A valid, unexpired state row can be consumed by at most one callback.
2. A concurrent loser, replay, missing state, or expired state cannot reach
   authorization-code exchange, identity resolution, or session insertion.
3. The winning callback uses the provider and expiry stored with its state row;
   a query-string provider value cannot override the stored provider.
4. An expired row remains consumed/removed as it is today, and expiry is
   evaluated using the callback's supplied current time.
5. A successful winner retains the existing redirect and session-cookie
   behavior. Existing status and error-code behavior is retained for failures.
6. If code exchange or identity resolution fails after state consumption, the
   state remains burned and no session is persisted, preserving current
   ordering.
7. Implementation strategy remains unselected until the D1 verification gate
   in §3.9 passes. Candidate mechanisms must not be described as production
   supported based only on SQLite behavior or a local emulator.

## 3.6 Callback flow

1. `GET /api/auth/callback` reads `state` and `code` from the callback request.
2. The state store performs one atomic consume operation. A missing or
   non-winning result returns `OAUTH_DENIED` (401).
3. The winner receives the stored provider and expiry values. Expired state
   returns `OAUTH_DENIED` (401); it does not proceed to exchange.
4. Only the winner proceeds to provider resolution, configured authorization
   code exchange, and identity lookup.
5. Existing exchange/identity failures return `OAUTH_FAILED` (401), with no
   session. The consumed state is not restored.
6. On success, exactly one session row is inserted and the current redirect
   plus session cookie response is returned.
7. A later replay of the same state returns `OAUTH_DENIED` (401) and creates no
   additional session.

## 3.7 Data and state model

The current durable state remains the existing `feishu_oauth_states` row:

| Field        | Meaning                                                |
| ------------ | ------------------------------------------------------ |
| `state`      | Primary-key callback state supplied by the provider    |
| `expires_at` | Existing state-expiry timestamp                        |
| `provider`   | Stored provider (`feishu` default for historical rows) |

Consumption is represented by the state row no longer being available to a
second caller. Existing browser-session rows remain unchanged. No new durable
session, event, or historical-callback table is in scope.

No migration is currently proposed. If candidate evaluation shows that a
schema migration is required, stop and return for PLAN/SPEC revision and Owner
approval before implementation.

## 3.8 Security and trust boundaries

- State and authorization code are untrusted callback inputs and are never
  included in logs, test failure messages, snapshots, or persisted evidence.
- Access and refresh tokens, session IDs, CSRF values, and cookie contents are
  never copied into reports or diagnostics.
- Tests use synthetic values and assert counts/statuses rather than printing
  secret-bearing values.
- Historical exploitation, unauthorized log access, token/session compromise,
  and callback-to-session correlation remain **UNKNOWN** unless safe existing
  evidence establishes otherwise.
- No production record, log, credential, session, or configuration is accessed
  or mutated by this SPEC work.

## 3.9 Compatibility, design gate, and failure behavior

### D1 atomicity verification gate

No production operation is selected in this SPEC. This review checked the
locked D1 runtime contract and the current official Cloudflare documentation
on 2026-09-29. Before implementation, a separately owner-approved PHASE/TODO
must require validation of the selected primitive against a Cloudflare-hosted
non-production D1 database as well as the local Worker test runtime. A local
SQLite or emulator result alone is insufficient. If the hosted check cannot
prove one winner under concurrent consumption, stop this workstream and return
the compatibility blocker to the Owner; do not implement a best-effort
fallback.

Evidence collected during PLAN review:

- Cloudflare's [D1 SQL statements documentation](https://developers.cloudflare.com/d1/sql-api/sql-statements/)
  says D1 is compatible with most SQLite SQL conventions; it does not
  explicitly enumerate `DELETE ... RETURNING` support. That distinction keeps
  support for the exact delete statement **UNKNOWN**; SQLite compatibility by
  itself is not proof of the hosted D1 contract.
- Cloudflare's [prepared-statement documentation](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
  documents `.first()` as returning the first row or `null`, and notes ordinary
  write statements return no result rows. It does not define the result behavior
  for `DELETE ... RETURNING`.
- Cloudflare's [D1 database documentation](https://developers.cloudflare.com/d1/worker-api/d1-database/)
  documents that statements in a `batch()` are executed sequentially and
  non-concurrently within one call, and that the batch is a SQL transaction
  which aborts or rolls back on a statement failure. This makes `batch()` a
  documented transaction boundary, but does not by itself establish that two
  concurrent batches cannot both observe the same row before consuming it.
- Cloudflare's [Workers learning material](https://labs.cloudflare.dev/workers/)
  includes a D1 Worker-binding example using `INSERT ... RETURNING` with
  `.first()`. It does not demonstrate `DELETE ... RETURNING`; applying that
  example to the specific DELETE statement would still be an inference.
- A transient local-only probe passed concurrent `DELETE ... RETURNING` and a
  transactional batch claim/read/delete candidate using the repository's
  Cloudflare Workers test pool configuration. Exactly one local caller received
  the row in each probe. The probe was removed and is not committed regression
  coverage; it does not establish hosted D1 concurrency or SQL behavior.

The future PHASE/TODO must:

1. Select a candidate only after reviewing the documented D1 contract and
   recording why it is atomic for competing consumers.
2. Validate the exact statement and its result behavior on an isolated,
   Cloudflare-hosted non-production D1 test database. Use synthetic state only;
   do not access production records or credentials.
3. Confirm the candidate in the local D1 Worker test runtime and add committed
   deterministic concurrency coverage before implementation is considered
   complete.
4. Stop without state-consumption code changes if hosted validation fails, is
   unavailable, or requires an unapproved migration or behavior change. Return
   the exact compatibility gap to the Owner for direction.

### Compatibility and failures

- Preserve the stored provider and expiry behavior for both configured
  providers and historical rows with the `feishu` default.
- Keep the callback route, TTLs, OAuth request sequence, response, status codes,
  and error codes unchanged.
- Missing, expired, or consumed state returns `OAUTH_DENIED` without exchange
  or session creation.
- A D1 consume error fails closed through the existing generic
  `UNAVAILABLE` (503) mapping; no exchange or session follows.
- If an adapter is unavailable or provider configuration fails after state
  consumption, retain the current consumed-state behavior and return the
  existing mapped error.
- If code exchange or identity lookup fails, return `OAUTH_FAILED` (401),
  persist no session, and do not restore state.
- If session insertion fails, return the existing generic `UNAVAILABLE` (503)
  mapping; do not issue a success redirect or cookie.
- A rollback to the current two-statement implementation is compatible with
  the current schema but reintroduces the documented race. It must be recorded
  as a rollback of the fix, not as a secure fallback.

## 3.10 Deterministic test and validation design

The regression suite must prove both the store operation and callback/session
outcomes:

1. Against the existing two-statement implementation, wrap the local D1 binding
   so both `SELECT` calls reach a barrier and both rows are read before either
   call is allowed to continue to `DELETE`. Assert that the baseline exposes
   the race; retain the RED evidence in the implementation PR.
2. After the approved implementation, run the same barrier-driven concurrent
   store test and assert exactly one non-null consume result.
3. Run the selected operation directly through local D1 with two simultaneous
   consumers and assert one row result, no remaining state row, and no raw
   values in failure output.
4. Run concurrent callback requests with deterministic exchange stubs. Assert
   exactly one success redirect, one `OAUTH_DENIED` response, one token
   exchange, one identity resolution, and exactly one persisted session.
5. Replay the winning callback state; assert `OAUTH_DENIED`, no additional
   exchange/identity resolution, and no increase in persisted session count.
6. Cover missing, expired, already-consumed state; expiry cleanup; both stored
   providers; exchange/identity failure; and session insertion failure.
7. Run existing browser-auth and dual-provider tests, focused package checks,
   required CI, and exact-HEAD review before any later merge decision.

## 3.11 Acceptance criteria

- Concurrent consumption of one valid state yields exactly one consumer.
- The losing callback and a later replay return `OAUTH_DENIED` (401) and do
  not exchange a code, resolve identity, or persist a session.
- For successful concurrent callbacks, exactly one session row is persisted
  and exactly one session-cookie success response is returned.
- Missing and expired state cannot reach exchange or create a session; expired
  rows are consumed/cleaned consistently with current behavior.
- Stored provider selection remains authoritative, and both Feishu and Lark
  behavior remains compatible.
- Exchange/identity failures burn the state and create no session, as today.
- No regression test output, log, or report includes a raw state, code, token,
  session ID, CSRF token, or cookie.
- The operation-selection gate in §3.9 is satisfied before implementation;
  local runtime evidence alone does not satisfy the hosted D1 contract check.
- No production D1 operation, production request, configuration mutation,
  credential/session mutation, log deletion, deployment, tag, or publication
  occurs under this SPEC.

## References

- [D1 SQL statements](https://developers.cloudflare.com/d1/sql-api/sql-statements/)
- [D1 prepared-statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [D1 database and batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Cloudflare Workers learning material — D1 binding `INSERT ... RETURNING` example](https://labs.cloudflare.dev/workers/)
- [SQLite RETURNING](https://www.sqlite.org/lang_returning.html)
- Current implementation: `downstream/addons/messaging/worker/browser-store.ts`
  and `downstream/addons/messaging/worker/browser-auth.ts`.

## Owner approval boundary

Owner approval of this SPEC would approve the behavior and acceptance criteria
for later PHASE/TODO preparation only. It would not approve implementation,
production access, configuration changes, credential/session actions,
deployment, or release. The D1 operation-selection gate must be resolved before
implementation starts.
