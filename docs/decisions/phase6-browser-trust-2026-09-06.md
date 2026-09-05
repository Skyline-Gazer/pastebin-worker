# OWNER DECISION — Phase 6 browser trust boundary (2026-09-06)

Use this design and continue automatically. Do not ask owner to redesign unless implementation evidence shows a concrete security contradiction.

## 1. Authentication

Official Feishu/Lark browser OAuth authorization-code. Browser MUST NOT use Feishu user access token as app long-lived API credential.

Flow: browser → Feishu OAuth → Add-on Worker callback → Worker verifies/exchanges authorization result server-side → resolve authenticated Feishu principal → create Add-on session → browser uses only Add-on session thereafter.

Before implementation, verify exact current Feishu OAuth protocol and identity fields against official documentation. If official protocol materially contradicts this design, STOP rather than guessing.

## 2. Principal identity

Server-derived from verified Feishu identity. Stable tenant-scoped identity conceptually: (app_id, tenant_key, open_id). Do not accept tenant_key/open_id/app_id as trusted browser input. Persist/compare keyed derived principal identifier where practical; avoid exposing raw identifiers in public APIs/logs.

## 3. Principal → scope binding

Authorize browser mutations via server-side principal-to-scope mapping. Phase 4 already authenticates Feishu P2P human messages and sees trusted: configured app, tenant, sender identity, P2P chat identity, resulting Phase 4 scopeId. Extend Add-on so fully authenticated/authorized Phase 4 event can establish/update: authenticated Feishu principal → authorized Phase 3 scopeId. Authorization metadata only — NOT second Paste body store, NOT webhook receipt/idempotency table, NOT browser-controlled state. Additive D1 table/index authorized if required. No destructive migration. Existing Phase 3 binding/operation semantics remain authoritative.

## 4. Completion authorization

POST /api/entries/:id/complete — browser sends only: entry id, action, idempotency identity, normal CSRF/session material. MUST NOT send: scopeId, tenant id as authority, chat id as authority, Feishu access token as business API credential, Paste password, management URL, Paste body, retention deadline. Worker authenticates Add-on session, resolves principal server-side, authorizes entry by joining principal → allowed scope(s) → binding/entry. Do NOT derive trusted scope solely from entry ID. Cross-scope access fails before any Phase 3 or upstream Paste mutation.

## 5. Session contract

Server-controlled session; prefer opaque random session id backed by server-side state. Cookie: HttpOnly, Secure, SameSite=Lax or stricter where compatible with verified OAuth flow, Path=/, __Host- prefix where deployment topology permits. Absolute TTL 8 hours (v1). Regenerate session on successful login. Logout/revocation deletes/invalidates server-side session. Do not store Feishu OAuth/user access tokens in browser-accessible storage. If Feishu token retained server-side, encrypt and retain only what is required.

## 6. CSRF / origin policy

Mutations require: (1) authenticated session (2) exact allowed Origin validation (3) CSRF protection. Server-generated CSRF token bound to session; require via request header for state-changing browser requests. SameSite alone is not sole CSRF control. Reject missing/mismatched Origin/CSRF before Phase 3/upstream activity.

## 7. Principal-scope lifecycle

Association created only from trusted fully-authenticated Feishu-side event or equivalently authenticated server-side Feishu source. Never from browser-submitted tenant/chat/scope identifiers. No established scope → fail closed sanitized auth/linkage error. No default/global scope. v1 OK: user must first have authenticated P2P Bot interaction before browser mutations. One principal may map to multiple authorized scopes; authorization checks entry against principal's allowed scopes.

## 8. Privacy / logging

Public responses and normal logs must not expose: raw Feishu OAuth tokens, session secrets, CSRF secrets, raw tenant/chat/open_id where avoidable, scopeId, Paste password, credential ciphertext, management URL, raw upstream errors. Use safe correlation IDs and keyed/hashed identifiers.

## 9. Required negative tests

no session → 401; invalid/expired/revoked session → 401; principal without scope → forbidden; principal scope A cannot mutate scope B entry; browser-supplied scope cannot affect authorization; guessed entry ID cannot grant scope; invalid Origin → rejected; missing/invalid CSRF → rejected; OAuth/session secrets never reach browser-visible responses/logs; duplicate completion retains Phase 3 idempotency; existing Phase 3/4 behavior remains compatible.

## 10. Change-control

This message explicitly approves this boundary for Phase 6. Update Phase 6 SPEC, PHASE, TODO, relevant SECURITY/API/design docs, migration plan if additive principal/session mapping required. Authorizes those in-scope artifact updates. Do NOT stop for another routine PLAN/SPEC/TODO approval. After updating and internally validating artifacts: continue Phase 6 implementation under D-030. Normal TDD, CI, Bugbot, Codex final verification, automatic merge, then next roadmap phase. Only STOP if official Feishu protocol/runtime evidence shows this approved trust design cannot be implemented safely without materially different security architecture.
