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
Production serves both from Worker `pastebin-feishu-prod` (workers.dev, no custom Feishu hostname).

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

- perform Feishu/Lark OAuth code callback exchange and server-side identity resolution;
- create/revoke opaque Add-on sessions and enforce exact Origin plus session-bound CSRF for browser mutations;
- derive principals and maintain additive trusted principal-to-Phase-3-scope authorization metadata from authenticated Feishu-side events;
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

Production `PASTEBIN_ORIGIN` is `https://pb.223.im`. Public URL construction, response validation, and user-visible links stay on that origin (`https://pb.223.im/<name>`). Internal Paste create/update/delete uses the `PASTEBIN_SERVICE` Service Binding to `pastebin-prod`. The production adapter constructs a `Request` and calls `service.fetch(request)` rather than `service.fetch(input, init)`. workerd `Request` accepts only `follow` or `manual` for `redirect`; the adapter sets `manual` so redirects are not followed. `PasteClient` still sees `https://pb.223.im` request URLs and must not rewrite returned URLs to workers.dev or service-binding hosts. Keep `global_fetch_strictly_public` during this transport transition. Do not expose `PASTEBIN_SERVICE` to frontend code.

Create-only stage diagnostics already emit `console.log` markers `PASTE_CREATE_STAGE=formdata_ready|transport_enter|transport_response|response_parse|done`. The Service Binding adapter additionally emits `PASTEBIN_SERVICE_STAGE=request_ready|fetch_enter|fetch_response` with no URLs, bodies, headers, credentials, or exception messages. The Worker contract enables native Workers Logs, invocation logs, and traces at `head_sampling_rate = 1` so those markers persist from queue-handler invocations. Do not change the marker strings, Paste create/update/delete semantics, or public URL validation to make the diagnostics readable. After an authorized deploy, read stages from Cloudflare Workers Observability (dashboard) or live `wrangler tail`. The Wrangler OAuth token used by local CLI has `workers_tail` but not Workers Observability Read, so the telemetry Query API can return 403 even when logs are stored. That credential gap is not a reason to skip enabling native logs. A durable D1 stage-row fallback is not implemented: it would add create-path writes and a retention policy, and needs an explicit owner decision first.

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

A fully authenticated/authorized P2P event may additionally establish/update the server-side principal-to-scope authorization mapping used by browser mutations. This metadata is not a second Paste-body store or a webhook receipt/idempotency table, and browser input must never establish it.

## 7. Browser trust contract

The web page uses the Add-on session after OAuth; it does not retain a Feishu user token as an Add-on credential. Session/OAuth/CSRF secrets, raw Feishu identifiers where avoidable, scope IDs, Paste credentials, management URLs, and raw upstream errors never appear in public responses or routine logs. A user without a prior trusted P2P-derived mapping fails closed; one principal may have multiple scopes.

## 8. Web page identity

The Add-on is named Feishu because Feishu feeds/controls it, but the page itself should remain visually part of the Pastebin Worker web product.

Recommended header/breadcrumb style:

```text
Pastebin Worker / Feishu
```

Do not use a separate "Feishu enterprise app" visual shell unless explicitly requested later.

## 9. Feishu / Lark platform endpoints

Runtime `PLATFORM` is exactly `feishu` or `lark`. Production must set it explicitly; the tracked Worker contract defaults to `feishu`. Any other value, including missing, fails closed.

Selected-provider credentials are separated:

- `PLATFORM=feishu` → `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, `FEISHU_ENCRYPT_KEY`, `FEISHU_VERIFICATION_TOKEN`, `FEISHU_ALLOWED_TENANT_KEYS`, `FEISHU_OAUTH_REDIRECT_URI`, `FEISHU_ALLOWED_ORIGINS`
- `PLATFORM=lark` → the matching `LARK_*` names

Do not put Lark credentials in `FEISHU_*` variables. Product-owned bindings (`FEISHU_BINDINGS_DB`, `FEISHU_INGRESS_QUEUE`, `FEISHU_PRINCIPAL_KEY`) stay as they are.

Outbound OAuth/OpenAPI hosts come from a static map (`worker/platform.ts`). The inbound webhook path remains `/api/feishu/events` for both brands. Login copy is the only user-visible brand switch.
