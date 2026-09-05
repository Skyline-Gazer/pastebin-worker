# Phase 6.0 browser trust boundary

The Worker exposes these browser routes:

- `GET /api/auth/login` starts Feishu authorization-code OAuth.
- `GET /api/auth/callback` consumes one server-stored state value, exchanges the code server-side, resolves `open_id` and `tenant_key`, and issues an opaque eight-hour Add-on session cookie.
- `GET /api/auth/session` returns the session-bound CSRF token and expiry for an authenticated session.
- `POST /api/auth/logout` deletes the server session.

Provision these secrets/configuration outside source control: `FEISHU_APP_SECRET`,
`FEISHU_OAUTH_REDIRECT_URI`, `FEISHU_ALLOWED_ORIGINS` (comma-separated exact origins), and
`FEISHU_PRINCIPAL_KEY`. `FEISHU_SESSION_COOKIE_NAME` is optional; the default is
`feishu_addon_session` because deployment topology cannot safely require `__Host-` yet.

Apply `migrations/0002_browser_trust.sql` after `0001_bindings.sql` when deploying. It only adds
opaque session/OAuth-state and keyed-principal-to-scope authorization metadata. Feishu OAuth tokens,
raw identity, management credentials, and Paste bodies are never persisted by this migration or
returned by these routes. Future browser mutations must call `authorizeBrowserMutation` before any
Phase 3 or Paste operation; it requires the session, exact Origin, CSRF header, and a server-side
principal-to-binding-scope join.
