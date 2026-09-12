# Phase 6.0 browser trust boundary

## Phase 6.1 completion boundary

`POST /api/entries/:id/complete` accepts only `action` and an `Idempotency-Key`, alongside the
opaque session cookie, exact Origin, and session CSRF header. It resolves the binding by entry ID,
then authorizes its stored scope through the authenticated principal's server-side mappings before
calling the lifecycle service. The response never exposes the binding credential, scope, source,
or upstream management data. Archived responses expose allowlisted public entry state; delete is
`204`.

The lifecycle service uses the Phase 3 durable-operation claim. It changes exactly one unambiguous
top-level unchecked managed task, sends `e=never` or `e=max`, stores only upstream-returned ISO
expiry, and retains ambiguous or uncertain outcomes for reconciliation rather than reporting success.

## Phase 7.2 permanent restore boundary

`POST /api/entries/:id/restore` accepts an empty body and an `Idempotency-Key`, alongside the
same opaque session cookie, exact Origin, and session CSRF header. It resolves the binding by ID,
authorizes its stored scope through the server-side principal mapping, and calls the lifecycle
service with only that stored scope and request identity. Browser-supplied scope, expiry,
credential, Paste body, and management data are rejected or ignored as authority.

Only an archived permanent binding is eligible. The Worker reads and changes exactly one
unambiguous checked top-level managed task to unchecked, confirms its password-backed upstream
`e=never` update, then atomically persists and returns `active/permanent/null`. Timed restore is
not available in Phase 7.2. Concurrent, conflicting, or uncertain operations remain fail-closed;
the public response contains only a stable code or allowlisted entry state.

The Worker exposes these browser routes:

- `GET /api/auth/login` starts single-provider OAuth when `BROWSER_AUTH_PROVIDERS` is unset (`PLATFORM=feishu` or `PLATFORM=lark`). When `BROWSER_AUTH_PROVIDERS=feishu,lark`, it is a Feishu alias only.
- `GET /api/auth/login/feishu` and `GET /api/auth/login/lark` start that provider's OAuth when dual-provider mode is enabled. Provider is stored on the OAuth state row.
- `GET /api/auth/callback` is shared. The provider comes from stored OAuth state, never from a caller `provider` query.
- `GET /api/auth/session` returns the session-bound CSRF token and expiry for an authenticated session, plus a secret-free `brand` (`Feishu` or `Lark`) from the **session**. Unauthenticated responses include `{ code, brand }` so the login link can match the platform.
- `POST /api/auth/logout` deletes the server session.
- `GET /api/entries` lists at most 50 ready bindings for the session principal's server-mapped scopes and returns public entry state plus Paste content. Caller query parameters are ignored. The response never includes credential, password, tenant, open_id, principal, OAuth, or fingerprint fields.

Provision these secrets/configuration outside source control: `PLATFORM` (`feishu` or `lark`; required, fail-closed), optional `BROWSER_AUTH_PROVIDERS` (`feishu`, `lark`, or `feishu,lark`), the selected provider's `FEISHU_*` or `LARK_*` app credentials, `FEISHU_OAUTH_REDIRECT_URI` / `LARK_OAUTH_REDIRECT_URI`, `FEISHU_ALLOWED_ORIGINS` / `LARK_ALLOWED_ORIGINS`, and
`FEISHU_PRINCIPAL_KEY`. Production Feishu values are `FEISHU_OAUTH_REDIRECT_URI=https://pb.test.223.im/api/auth/callback` and `FEISHU_ALLOWED_ORIGINS=https://pb.test.223.im`. Leave `BROWSER_AUTH_PROVIDERS` unset in production until Lark secrets and console URLs are provisioned. `FEISHU_SESSION_COOKIE_NAME` is optional; the default is
`feishu_addon_session` because deployment topology cannot safely require `__Host-` yet. Do not add a cookie `Domain` attribute.

Apply migrations `0002_browser_trust.sql`, `0003_lifecycle_completion.sql`,
`0004_permanent_restore.sql`, `0005_timed_restore.sql`,
`0006_batch_operations.sql`, `0007_batch_completed_results.sql`, and
`0008_dual_provider_auth.sql` after `0001_bindings.sql` when deploying. Migration 0008 adds
`provider` (default `feishu`) on OAuth state and browser session rows. Do not rewrite existing
Feishu principal or scope keys. Dual inbound events use `POST /api/feishu/events` and
`POST /api/lark/events` with no credential fallback.

Future browser mutations must call `authorizeBrowserMutation` before any
Phase 3 or Paste operation; it requires the session, exact Origin, CSRF header, and a server-side
principal-to-binding-scope join.

Migration 0006 adds batch-operation and per-item evidence only. It stores no
Paste body, plaintext management password, or browser-supplied scope; the
existing per-entry operation remains the lifecycle/reconciliation authority.
