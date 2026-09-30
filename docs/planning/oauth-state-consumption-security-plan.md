# OAuth state single-use security PLAN

Status: **OWNER-APPROVED FOR SPEC PREPARATION ONLY** under Owner Decision C
(2026-09-29). Implementation has **NOT** started.

## Objective

Make OAuth state consumption single-use even when two callback requests arrive
concurrently, while preserving the existing provider, expiry, authorization
code exchange, session, and response behavior.

## Context and evidence

`downstream/addons/messaging/worker/browser-store.ts` currently performs an
awaited `SELECT` for a state row, then a separate awaited `DELETE`. Two
concurrent calls may both read the row before either delete completes. The
callback calls this method before exchanging the authorization code or
creating a session. This is a code-level race concern, not evidence that it
was exploited.

Historical Cloudflare invocation records previously exposed OAuth callback
query values. That establishes historical logging exposure only. Unauthorized
log access, code redemption by another party, token/session compromise, and
which callbacks created sessions remain **UNKNOWN**. No raw OAuth value is
part of this PLAN.

The existing Worker tests use `@cloudflare/vitest-pool-workers` and a local D1
binding. A transient, local-only probe through that test runtime confirmed
that `DELETE ... RETURNING` returned one row for concurrent attempts and that
a sequential transactional `D1Database.batch()` claim/read/delete candidate
also produced one winner. The probe used the repository's Vitest 4.1.11 and
Cloudflare pool 0.22.0 dependency tree from another local worktree because a
frozen install in this worktree stopped on the existing pnpm lockfile/override
mismatch. The transient test was removed after the probe. These results are
local-runtime evidence only, not proof of production D1 service semantics.

Current Cloudflare D1 documentation describes compatibility with **most**
SQLite SQL conventions, documents prepared-statement `.first()` results, and
documents `batch()` as ordered transactional execution. The reviewed D1 docs
do not explicitly name the `RETURNING` clause. The exact production D1 contract
therefore remains **UNKNOWN** pending the gate defined in the SPEC.

## Assumptions to verify

- A D1 operation can atomically claim one state row and yield its provider and
  expiry values to only one callback. Official D1 documentation and the exact
  local test runtime must support the selected operation. If neither a
  supported single-statement result nor a proven D1 batch alternative can be
  established, stop before implementation and return for Owner direction; do
  not treat two separately awaited statements as atomic.
- Existing state TTL, provider selection, error codes, callback route, session
  TTL, and callback ordering are intentional and remain unchanged.
- No schema migration is needed unless evidence during SPEC preparation proves
  otherwise. A required migration is a scope/design change that returns to the
  Owner before implementation.

## Risks / unknowns

1. **Unverified D1 atomic-operation semantics.** D1 documentation says it
   supports most SQLite SQL conventions, but does not explicitly guarantee
   `DELETE ... RETURNING`. Local-runtime support is evidence, not a production
   service guarantee. The SPEC must keep operation selection gated and define
   fallback evaluation.
2. **Possible concurrent state consumption.** Two callback requests may both
   read the current row before either delete completes. This establishes a
   possible code race only; it does not establish that concurrent callbacks
   occurred or that either was exploited.
3. **Deterministic concurrency-test requirements.** Ordinary scheduling may
   fail to expose the existing interleaving. Tests need a barrier that makes
   both legacy reads complete before either delete, plus a real local-D1 test
   of the selected atomic operation.
4. **Persisted session outcomes.** Safe historical evidence has not established
   which callbacks, if any, persisted sessions. Keep that outcome **UNKNOWN**.
   Regression acceptance must assert one successful callback, one denied
   duplicate, one authorization-code exchange/identity lookup, and exactly one
   persisted session for a valid concurrent pair.
5. **Historical exploitation.** Unauthorized log access, use of an exposed
   code, token compromise, session compromise, and historical callback/session
   correlation remain **UNKNOWN**. This item authorizes no credential rotation
   or session invalidation.
6. **Migration and deployment compatibility.** The current state row already
   stores `state`, `expires_at`, and `provider`; no migration is assumed. Any
   candidate needing schema changes or changing treatment of in-flight states
   must be returned for Owner review. Production deployment remains separately
   gated by normal review and authorization.
7. **Failure and rollback behavior.** State is consumed before code exchange;
   a failed exchange currently burns the state and creates no session. Preserve
   that behavior unless a separately approved SPEC change says otherwise. A
   rollback to the old two-statement operation would reintroduce the race and
   must not be reported as retaining the fix.

## Proposed implementation approach

1. Compare the installed callback/store code, migrations, existing browser-auth
   tests, and the Cloudflare D1 Worker API contract. Keep historical callback
   outcomes **UNKNOWN**; do not inspect or query production records.
2. In SPEC preparation, compare the smallest plausible D1 candidates without
   committing to one: a conditional single-statement consume that returns the
   provider/expiry row, and a transactional `D1Database.batch()` claim/read/
   cleanup sequence. Document the exact contract evidence and reject any
   candidate whose atomicity or result visibility is only assumed.
3. Specify a behavior-first test that deterministically releases both legacy
   SELECT reads before either delete. The corrected behavior must yield one
   consumer. Add local D1 tests for valid, missing, expired, consumed/replayed,
   provider, callback, and persisted-session outcomes.
4. Do not implement until the Owner approves the SPEC and a PHASE/TODO pair.
   If no candidate is proven without scope change, stop and ask the Owner
   rather than shipping a two-statement fallback.

## Acceptance criteria

- At most one concurrent callback can consume a given valid state.
- Missing, expired, and previously consumed state cannot create a session.
- For a valid concurrent callback pair, at most one callback reaches code
  exchange/identity lookup and at most one session is persisted; a replay is
  denied without increasing either count.
- Existing successful OAuth and error response behavior remains compatible.
- Tests and diagnostics contain no raw state, authorization code, token, or
  cookie.
- No live D1 query, production request, credential rotation, session
  invalidation, historical-log access/deletion, configuration change, or
  deployment occurs in this item.

## Non-goals and boundaries

- Do not infer token or session compromise from URL exposure alone.
- Do not rotate credentials, revoke sessions, change retention, or redact/delete
  historical records as part of this item.
- Do not add this work to PR #191 or broaden its approved release scope.
- Do not change provider OAuth protocol, redirect URI, session lifetime, or
  production behavior beyond atomic one-time state consumption.
- Do not implement, deploy, change production configuration, or inspect/query
  production OAuth records in this planning item.

## Candidate files and validation

- Candidate implementation: `downstream/addons/messaging/worker/browser-store.ts`.
- Candidate tests: `downstream/addons/messaging/tests/browser-auth.spec.ts`,
  `downstream/addons/messaging/tests/dual-provider-auth.spec.ts`, and the local
  D1 Worker test runtime.
- Candidate docs: this PLAN, a separate OAuth state-consumption SPEC, and any
  relevant security/testing documentation identified by the SPEC.
- Validation: deterministic RED/GREEN concurrent-consume regression; missing,
  expired and replay tests; callback exchange/session-count assertions; focused
  browser-auth tests; repository required CI; exact-HEAD review gate.
- Planning evidence: official [D1 SQL statements](https://developers.cloudflare.com/d1/sql-api/sql-statements/),
  [D1 prepared-statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/),
  [D1 database and batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/),
  and [SQLite RETURNING](https://www.sqlite.org/lang_returning.html).

## Owner approval record

Owner Decision C required this distinct seven-item **Risks / unknowns** section
and authorized conditional approval if the correction added no material scope
or design assumptions. This revision only records those risks, the verified
repository behavior, the local probe limits, and existing approval boundaries;
it does not change the security objective or select a production design.

**Condition satisfied.** The PLAN is approved for SPEC preparation only.
Implementation still requires a separately approved SPEC and PHASE/TODO.
