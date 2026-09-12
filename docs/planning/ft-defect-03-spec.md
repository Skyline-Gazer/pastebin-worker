# FT-DEFECT-03 SPEC — Simultaneous Feishu + Lark browser auth and ingestion

Status: SPEC READY FOR OWNER REVIEW

Parent: [ft-defect-03-plan.md](ft-defect-03-plan.md) — [#134](https://github.com/Skyline-Gazer/pastebin-worker/issues/134)

Implementation has NOT started. Function Test remains PAUSED. No production mutation. No P2P. No Paste deletion.

Later deploy: `pastebin-feishu-prod` (`https://pb.test.223.im`). Not `pastebin-prod`.

## 3.1 Problem statement

The Add-on can be Feishu **or** Lark, not both, because `PLATFORM` selects one credential set, one login, one webhook, and still prefixes principals as `feishu:v1:…`. The product target is one Web app where a user chooses Sign in with Feishu or Sign in with Lark, with isolated identity and data.

## 3.2 Goals

1. One origin `https://pb.test.223.im` exposes both provider logins.
2. Shared canonical callback `GET /api/auth/callback` for both providers; provider is taken from stored OAuth state, never from a caller-supplied query as authority.
3. Session persists provider. Existing Feishu sessions remain valid.
4. Identity namespaces stay separate; no linking/merge.
5. Both credential sets coexist with no fallback.
6. Simultaneous inbound webhooks with authoritative provider through queue → principal/scope → binding → listing.
7. Additive migration; no rewrite of existing Feishu rows.

## 3.3 Non-goals

- Account linking, IdP merge, or a unified inbox across Feishu and Lark.
- Changing the Feishu callback path to `/api/auth/callback/feishu`.
- Parent-domain cookies or a second cookie name.
- Pastebin upload/download semantics (DEFECT-01).
- Full Web IA (DEFECT-02). This SPEC only requires login routes and session fields DEFECT-02 will consume.
- Enabling Lark in production before owner-provisioned Lark secrets and console URLs exist.

## 3.4 Current behavior

- `PLATFORM=feishu|lark` is required. `resolveProviderConfig` selects one credential/host map. Missing selected credentials fail closed; the other provider’s secrets are ignored, not substituted — except that Lark `PLATFORM` still emits `feishu:v1:principal:` / `feishu:v1:scope:`.
- Browser login is only `GET /api/auth/login`. OAuth state table has `(state, expires_at)` only.
- Callback is `GET /api/auth/callback` (canonical production URI on `pb.test.223.im`).
- Sessions: `(id, principal_key, csrf_token, created_at, expires_at)`. Cookie: `HttpOnly; Secure; SameSite=Lax; Path=/`; no `Domain`.
- Webhook: `POST /api/feishu/events` only, credentials from `PLATFORM`.
- Queue: `schema: "feishu.message-create.v1"` without `provider`. Listing is by session principal → mapped scopes.

## 3.5 Desired behavior

### Config (chosen approach)

Typed internal registry of providers `feishu` and `lark`. Enablement:

```text
BROWSER_AUTH_PROVIDERS=feishu,lark
```

Rules:

- Exact tokens `feishu` and/or `lark`, comma-separated, whitespace-tolerant, order is display order.
- Unknown tokens fail closed at Worker boot/config resolve (`INVALID_BROWSER_AUTH_PROVIDERS`).
- Empty/unset `BROWSER_AUTH_PROVIDERS`: backward compatible single-provider mode using `PLATFORM` exactly as today (one login at `/api/auth/login`, existing webhook path). This lets production keep working before overlay is updated.
- When `BROWSER_AUTH_PROVIDERS` is set, **it** decides which login routes exist. `PLATFORM` MUST NOT pick the browser login provider. `PLATFORM` may remain in env for unrelated single-provider helpers only if a call site cannot yet be provider-explicit; those call sites must not be login, callback, or webhook.
- No credential fallback: resolving Feishu uses only `FEISHU_*`; Lark only `LARK_*`. Missing Lark secrets never read Feishu secrets.

Login buttons for a provider appear only when that provider is in `BROWSER_AUTH_PROVIDERS`. If listed but credentials missing, login fails closed (503 `UNAVAILABLE`), never silently switches brand.

### OAuth

```text
GET /api/auth/login/feishu  → Feishu authorize URL, state stored with provider=feishu
GET /api/auth/login/lark    → Lark authorize URL, state stored with provider=lark
GET /api/auth/callback      → both; consume state; use state.provider
```

`GET /api/auth/login` (no suffix): **Feishu alias** when Feishu is enabled (existing bookmarks). If Feishu is not enabled, 404/UNAVAILABLE. It must not start Lark OAuth.

Redirect URI for **both** consoles:

```text
https://pb.test.223.im/api/auth/callback
```

OAuth state row MUST bind random state, provider, expiry. `consumeOAuthState` returns the provider or fails. Expired/missing/consumed state → existing invalid-state failure. Query `?provider=` is ignored as authority (even if present and matching).

Callback then:

- `state.provider=feishu` → Feishu app/token/user-info endpoints and Feishu credentials
- `state.provider=lark` → Lark app/token/user-info endpoints and Lark credentials

### Session / principal

Logical namespaces:

```text
Feishu: feishu:v1:principal:*    feishu:v1:scope:*
Lark:   lark:v1:principal:*      lark:v1:scope:*
```

Feishu derivation MUST remain the current HMAC over `[feishuAppId, tenantKey, openId]` with prefix `feishu:v1:principal:`. Same for current Feishu scopes (`[feishuAppId, tenantKey, chatId]`). Do not rewrite existing keys.

Lark derivation uses Lark app id and prefix `lark:v1:…`. Same `tenant_key + open_id` under Feishu vs Lark → distinct principals.

Session MUST persist `provider`. Additive column `provider TEXT NOT NULL DEFAULT 'feishu'`. Existing rows are Feishu. Cookie remains one host-only session cookie on `pb.test.223.im` with HttpOnly, Secure, SameSite=Lax, Path=/. CSRF and allowed-origin checks unchanged (exact origin allowlist; no parent domain).

`GET /api/auth/session` authenticated JSON includes secret-free `brand` / provider (`Feishu` | `Lark`) from the **session**, not from global `PLATFORM`. Unauthenticated session may omit brand or return a listing of enabled brands without secrets; it must not leak which credentials exist beyond enabled providers.

Logout deletes the session as today.

### Webhooks

```text
POST /api/feishu/events   → Feishu verification token, encrypt key, app credentials, origin/host rules only
POST /api/lark/events     → Lark equivalents only
```

Each route ignores the other provider’s secrets. A Feishu signed body posted to `/api/lark/events` fails verification (and the reverse).

Normalized queue envelope MUST carry authoritative `provider`. Provider survives webhook → queue → principal/scope → binding → listing. Lark events create `lark:v1:scope:*` only. Feishu events continue to create `feishu:v1:scope:*` only.

Preferred additive queue shape:

- Historical `feishu.message-create.v1` without `provider` is consumed as **Feishu only**.
- New messages include `provider: "feishu" | "lark"`. Lark MUST use a payload that includes `provider: "lark"` (same schema with added field, or `addon.message-create.v2`). A Lark event must never be written as v1-without-provider.

Chosen default: keep `feishu.message-create.v1` for Feishu (optional `provider: "feishu"`). Lark uses the same schema **with required** `provider: "lark"`. Consumer: missing provider ⇒ Feishu iff schema is `feishu.message-create.v1`; `provider: "lark"` with Feishu-prefixed scopeId is poison (DLQ), not silently rewritten.

### Listing isolation

A Feishu session lists only Feishu-mapped scopes. A Lark session lists only Lark-mapped scopes. Same human, both logins, two inboxes.

## 3.6 User/API flows

### Login (Feishu)

1. `GET /api/auth/login/feishu`
2. If `feishu` not enabled → 404/UNAVAILABLE.
3. If Feishu credentials missing → 503, no Lark fallback.
4. Store `{state, provider: feishu, expiry}`; 302 to Feishu authorize with `redirect_uri=https://pb.test.223.im/api/auth/callback`.
5. Callback: consume state; exchange code with Feishu; create session `provider=feishu`, `principal_key=feishu:v1:principal:…`; Set-Cookie host-only; 302 to `/`.

### Login (Lark)

Same with Lark hosts/credentials and `lark:v1:principal:…`.

### Callback tamper

- Missing/expired state → fail closed, no session.
- Valid state + `?provider=lark` while stored provider is feishu → still Feishu (query ignored).
- Replayed state → fail closed.

### Webhook (Lark)

1. POST `/api/lark/events` with Lark signature/encrypt/token.
2. Verify with Lark secrets only.
3. Queue `{ …, provider: "lark", scopeId: "lark:v1:scope:…" }`.
4. Consumer creates binding in that scope.
5. Feishu listing does not see it.

## 3.7 Data/state model

### D1 (additive)

`feishu_oauth_states`: add `provider TEXT NOT NULL DEFAULT 'feishu'` with check `IN ('feishu','lark')` if D1 supports it; otherwise Worker validates.

`feishu_browser_sessions`: add `provider TEXT NOT NULL DEFAULT 'feishu'`. Existing sessions valid. Application also treats `principal_key` prefix as source of truth if column is `feishu` but key is `lark:v1:…` (fail closed / logout) — mismatch must not mix scopes.

`feishu_principal_scope_map`: **no rewrite**. Namespaced keys are sufficient. No extra provider column required.

Bindings already keyed by `scopeId`; Feishu rows stay. No backfill.

### Queue

Additive `provider` field as in 3.5. No destructive schema bump required if consumers accept both.

### Cookie

Unchanged name/flags/host.

## 3.8 Security and trust boundaries

- OAuth state is single-use, expiry-bound, server-stored.
- Authorization code, client secret, user access token, encrypt key, verification token: never in logs, cookies, or browser JSON.
- CSRF header + exact `Origin` for state-changing browser routes: unchanged.
- Webhook verification remains provider-local.
- Do not trust `X-Forwarded-*` or query `provider` for identity.
- Same tenant/open_id isolation is a security requirement, not a UX preference.

## 3.9 Compatibility

- Existing Feishu sessions: valid after deploy (DEFAULT + existing principal keys).
- Existing Feishu OAuth states in flight: DEFAULT provider `feishu` (TTL short).
- Existing queue messages: Feishu.
- Existing Feishu webhook URL `/api/feishu/events`: remains.
- Single-provider overlays that only set `PLATFORM` keep working until they set `BROWSER_AUTH_PROVIDERS`.
- Rollback: previous Worker version. New columns with DEFAULT do not break old INSERT/SELECT that omit `provider` if old SQL is column-explicit (verify). If old SQL is `SELECT *` mapped in code, add fields as optional in a compat read. SPEC requires old Worker to keep reading pre-migration sessions; after additive migration, old Worker must still authenticate Feishu sessions (column default). **Do not** deploy a Worker that REQUIRES `BROWSER_AUTH_PROVIDERS` without a same-release overlay update.

Prefer additive migration. Do not rewrite Feishu records.

## 3.10 Failure behavior

- Missing provider credentials: that provider’s login and webhook fail closed; the other provider continues.
- Invalid `BROWSER_AUTH_PROVIDERS`: Worker fail closed (no half-open login).
- Queue poison (provider/scope mismatch): DLQ, not cross-namespace create.
- Duplicate OAuth callback: no second session from consumed state.
- Logout: session row deleted; cookie cleared as today.

## 3.11 Acceptance criteria

1. Feishu login via `/api/auth/login/feishu` creates a Feishu session and `feishu:v1:principal:*`.
2. Lark login via `/api/auth/login/lark` creates a Lark session and `lark:v1:principal:*`.
3. Both use `GET /api/auth/callback`; provider comes from stored state.
4. Callback `provider` query cannot switch provider.
5. Missing Lark credentials do not use Feishu credentials (and reverse).
6. Same tenant_key + open_id across providers → two principals, two listings.
7. Existing Feishu session remains valid after migration/deploy.
8. Feishu listing sees only Feishu scopes; Lark listing only Lark scopes.
9. Feishu webhook cannot create Lark namespace (and reverse).
10. CSRF/origin/cookie flags unchanged; no parent-domain cookie.
11. Logout ends that session only.
12. No secret/token leakage in responses, logs, or HTML.
13. Canonical callback URI remains `https://pb.test.223.im/api/auth/callback`.

## 3.12 Test specification

Minimum:

- Feishu login; Lark login
- Same callback path; provider from stored state
- State/provider tamper resistance (query override, replay, expiry, missing)
- Missing provider credentials fail closed
- No cross-provider credential fallback
- Same tenant/open_id isolation
- Existing Feishu session valid after migration (insert pre-migration row shape)
- Feishu listing isolation; Lark listing isolation
- Feishu webhook cannot become Lark; Lark webhook cannot become Feishu
- CSRF/origin protections unchanged
- Logout/session behavior
- No secret/token leakage (authorization code, encrypt key, verification token, access token, client secret)

Wrangler/overlay contract: dual-provider vars documented; production origin/callback pins unchanged.

## 3.13 Open questions

None requiring owner product choice. Engineering defaults are recorded in 3.5–3.7.

Owner **operational** steps (not product forks) are listed in the umbrella return: Lark app credentials, Lark console callback + event URL, overlay `BROWSER_AUTH_PROVIDERS` and Lark secrets. Code may land with Lark fail-closed until those exist.

Status: SPEC READY FOR OWNER REVIEW
Implementation has NOT started.
