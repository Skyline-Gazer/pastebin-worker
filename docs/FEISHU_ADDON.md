# Feishu Add-on

## 1. Add-on is one complete downstream unit

```text
downstream/addons/feishu/
|- frontend/
|- worker/
|- shared/
|- tests/
|- docs/
|- migrations/
|- README.md
`- wrangler.toml
```

Frontend and webhook/backend are part of the same product unit even if built separately.

## 2. Frontend responsibilities

- render Active and Archive views;
- visually follow Pastebin Worker web UI rather than Feishu client UI;
- render Markdown/GFM by default;
- provide interactive managed task checkbox;
- present single completion choices: permanent archive / expiring archive / delete;
- present destructive confirmation for delete;
- display authoritative countdown in Archive;
- restore archived entries;
- provide Batch Mode with separate BatchSelectors;
- display batch summary, per-item failures, retry state.

Frontend MUST NOT hold management credentials.

## 3. Worker responsibilities

- verify/process Feishu webhook events;
- normalize Bot actions;
- expose frontend API;
- generate and protect management passwords;
- create/update/delete upstream Pastes;
- maintain bindings;
- apply archive/retention transitions;
- batch-orchestrate upstream operations;
- return public/non-secret state only;
- reconcile expired/missing upstream Pastes.

## 4. Paste client

Implement a dedicated server-side Paste client abstraction rather than scattering raw fetch calls.

Conceptual methods:

```ts
createPaste(...)
getPaste(...)
getMetadata(...)
updatePaste(...)
deletePaste(...)
setPermanent(...)
setMaxExpiration(...)
```

Exact method names may differ.

The client is responsible for URL construction/redaction and must never leak management URLs into logs.

## 5. Binding service

The binding service maps a Feishu-managed entry to:

```text
pasteName
public/raw URL
managementPassword
visibility
retentionMode
expiresAt
```

Password access should be constrained to server-side mutation paths.

## 6. Feishu webhook behavior

Webhook handling should be idempotent because Feishu can retry events.

Avoid duplicate Paste creation for the same logical event. Use a stable event/record key and persist idempotency state where needed.

## 7. Web page identity

The Add-on is named Feishu because Feishu feeds/controls it, but the page itself should remain visually part of the Pastebin Worker web product.

Recommended header/breadcrumb style:

```text
Pastebin Worker / Feishu
```

Do not use a separate "Feishu enterprise app" visual shell unless explicitly requested later.
