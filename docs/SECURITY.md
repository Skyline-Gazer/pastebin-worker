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

## 2. Browser boundary

Browser may request actions using Add-on entry IDs only. Browser never authenticates directly to upstream mutation APIs.

Single and batch mutations are server-side.

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
