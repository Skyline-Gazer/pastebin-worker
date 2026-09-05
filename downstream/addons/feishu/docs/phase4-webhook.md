# Phase 4 webhook foundation

`POST /api/feishu/events` is the sole public Add-on route. It accepts URL verification
and encrypted, signed Feishu `im.message.receive_v1` human P2P text events. The adapter
authenticates the exact raw request bytes, decrypts and authorizes the callback, derives
stable hashed identities from the configured app/tenant/chat/message tuple, then awaits
`FEISHU_INGRESS_QUEUE.send()` before it responds with HTTP 200.

The Queue payload is transient and contains the normalized text plus stable identities and
a generated correlation ID. It has no Paste credential, Feishu secret, raw callback or
profile data. The Phase 3 D1 schema is unchanged and remains free of message bodies.

## Required configuration

Provision these Worker bindings/secrets outside source control:

- `FEISHU_ENCRYPT_KEY` and `FEISHU_VERIFICATION_TOKEN` as secrets;
- exact `FEISHU_APP_ID` and comma-separated, non-empty unique
  `FEISHU_ALLOWED_TENANT_KEYS` values;
- `FEISHU_INGRESS_QUEUE` producer binding;
- a consumer for that Queue with a configured dead-letter queue, represented at runtime by
  `FEISHU_INGRESS_DLQ_CONFIGURED=true` only after deployment configuration has been verified;
- the existing Phase 3 D1 binding (`FEISHU_BINDINGS_DB`), credential key ID/two distinct
  key secrets, and HTTPS Pastebin origin.

Missing, empty, malformed, duplicated tenant configuration or absent DLQ marker fails
closed. Production deployment must set the concrete Queue and DLQ names and retention limit
in its deployment record; this repository does not create either resource.

## Consumer recovery and DLQ runbook

Each Queue message is independently classified. Confirmed and known Phase 3 success is
acknowledged. Only `STORAGE_OR_CREDENTIAL_UNAVAILABLE` marked retryable is retried normally.
Malformed Queue payloads, permanent failures, and reconciliation-required outcomes are
retried until Cloudflare moves them to the configured DLQ unless a separately configured,
operator-visible durable disposition sink accepts sanitized evidence.

Phase 4 **does not auto-consume the DLQ**. An operator must inspect the DLQ payload and the
correlation/Phase 3 operation correlation, preserve the existing binding and operation claim,
verify the upstream outcome and quiescence, then use separately authorized recovery. Never
delete a reservation, generate a replacement identity, or issue a replacement Paste POST.
Console logging is not durable disposition evidence.
