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

- `GET /api/auth/login` starts Feishu authorization-code OAuth.
- `GET /api/auth/callback` consumes one server-stored state value, exchanges the code server-side, resolves `open_id` and `tenant_key`, and issues an opaque eight-hour Add-on session cookie.
- `GET /api/auth/session` returns the session-bound CSRF token and expiry for an authenticated session.
- `POST /api/auth/logout` deletes the server session.

Provision these secrets/configuration outside source control: `FEISHU_APP_SECRET`,
`FEISHU_OAUTH_REDIRECT_URI`, `FEISHU_ALLOWED_ORIGINS` (comma-separated exact origins), and
`FEISHU_PRINCIPAL_KEY`. `FEISHU_SESSION_COOKIE_NAME` is optional; the default is
`feishu_addon_session` because deployment topology cannot safely require `__Host-` yet.

Apply migrations `0002_browser_trust.sql`, `0003_lifecycle_completion.sql`, and
`0004_permanent_restore.sql` after `0001_bindings.sql` when deploying. The latter migrations
preserve existing binding rows while widening lifecycle and operation-kind checks.
Migration 0002 only adds
opaque session/OAuth-state and keyed-principal-to-scope authorization metadata. Feishu OAuth tokens,
raw identity, management credentials, and Paste bodies are never persisted by this migration or
returned by these routes. Future browser mutations must call `authorizeBrowserMutation` before any
Phase 3 or Paste operation; it requires the session, exact Origin, CSRF header, and a server-side
principal-to-binding-scope join.
