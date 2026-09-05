# Security Model

## 1. Primary secret: Paste management password

The Add-on backend is the credential holder for Feishu-managed Pastes.

### Creation

- generate using cryptographically secure RNG server-side;
- explicitly supply to upstream create request;
- never generate/store it in frontend.

### Storage

- restrict access to Worker/backend code;
- prefer application-layer encryption;
- encryption key material belongs in Worker secrets, not source/database rows.

### Logging

Never log:

- password;
- full management URL;
- secret-bearing upstream request URL;
- decrypted stored credential.

## 2. Browser OAuth, session, and authorization boundary

Browser mutation uses official Feishu/Lark OAuth authorization-code only to establish an Add-on session: browser → Feishu OAuth → Worker callback → server-side code exchange and identity lookup → server-derived principal → opaque Add-on session. A Feishu user access token is never a browser-held long-lived Add-on API credential.

- derive principal server-side from `(app_id, tenant_key, open_id)` and persist/compare a keyed/hashed identifier where practical; do not trust browser-supplied app, tenant, open, chat, or scope identifiers;
- use server-side opaque random session state with absolute eight-hour TTL; regenerate on login and invalidate on logout/revocation;
- session cookie is `HttpOnly`, `Secure`, `SameSite=Lax` or stricter when compatible, `Path=/`, and `__Host-` where topology permits;
- mutations require authenticated session, exact configured `Origin`, and session-bound CSRF request header. SameSite alone is insufficient;
- authorize entry mutation by server-side principal → allowed scopes → binding/entry join. Only a trusted authenticated Feishu-side event establishes that mapping; no mapping, default/global scope, guessed entry ID, or browser-supplied scope authorizes mutation;
- browser supplies only Add-on entry IDs, actions, idempotency identities, and normal session/CSRF material. Single and batch mutations remain server-side.

Never expose/log raw OAuth tokens, session or CSRF secrets, raw tenant/chat/open IDs where avoidable, scope IDs, credential ciphertext, or raw upstream errors. Use safe correlation IDs and keyed/hashed identifiers.

## 3. Feishu webhook security

- verify selected Feishu signature/encryption/verification model;
- handle retries/idempotency;
- reject invalid/replayed events where applicable;
- resolve user-controlled identifiers to authorized bindings.

## 4. Markdown rendering security

- GFM parser + sanitization;
- no raw script/event handlers;
- task markers inside code fences remain inert source;
- test malicious HTML/links alongside checkbox rendering.

## 5. Destructive action safety

A checkbox click alone never deletes or schedules deletion.

- permanent archive requires explicit action selection;
- timed archive requires explicit action selection;
- delete requires destructive confirmation;
- batch delete requires one destructive confirmation including item count.

## 6. Batch security

Frontend sends IDs, not credentials.

For each ID backend must:

- load binding owned/allowed for current user/context;
- load secret password server-side;
- execute upstream mutation;
- return sanitized per-item result.

Never trust arbitrary paste names/passwords supplied by browser.

## 7. Error handling

Do not expose secret-bearing upstream errors. Return stable sanitized codes such as:

```text
UPSTREAM_UPDATE_FAILED
UPSTREAM_DELETE_FAILED
ENTRY_NOT_FOUND
ENTRY_ALREADY_EXPIRED
```

Use non-secret correlation/request IDs for logs.

## 8. Browser trust negative tests

Test no session and invalid/expired/revoked session as `401`; no-scope and cross-scope denial; browser-supplied scope and guessed IDs having no authority; invalid Origin and missing/invalid CSRF rejection before mutation; OAuth/session secret redaction from responses/logs; Phase 3 duplicate idempotency; and Phase 3/4 compatibility.
