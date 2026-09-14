# SPEC: Provider-neutral messaging add-on architecture

Status: **OWNER AUTHORIZED FOR IMPLEMENTATION**

Tracking: [#146](https://github.com/Skyline-Gazer/pastebin-worker/issues/146)

## Architectural rule

A symbol may contain a provider brand name (Feishu, Lark, Slack, WeCom, DingTalk) **only** when the implementation is genuinely specific to that provider. Generic business/runtime concepts must not.

Adapters must not require fake Feishu-shaped credential fields. Credential parsing lives inside each adapter.

## Provider interface

Semantics:

- `ProviderId` — persisted/wire identifier (`feishu`, `lark`, later others)
- `ProviderAdapter` — provider-specific behavior
- `ProviderRegistry` — registered adapters
- `ProviderReadiness` — independent webhook vs OAuth flags

Each adapter owns:

- `id`, `brand`
- webhook path (`/api/feishu/events`, `/api/lark/events`)
- `webhookReadiness(env)`
- `oauthReadiness(env)`
- authorize URL construction
- token exchange
- identity resolution
- challenge verification
- webhook request verification
- inbound event normalization

## Readiness

### Webhook-ready (Open Platform Feishu/Lark)

Requires only configuration needed for URL challenge, request verification, and inbound event verification/normalization:

- encrypt key
- verification token
- app id
- allowed tenant keys

Does **not** require OAuth client secret, redirect URI, or allowed browser origins.

### OAuth-ready

Requires:

- app id
- app secret
- OAuth callback URL
- allowed browser origins

Webhook-ready does not imply OAuth-ready, and the reverse is also false.

## Routes

Always structurally mounted:

- `POST /api/feishu/events`
- `POST /api/lark/events`
- `GET /api/auth/login/feishu`
- `GET /api/auth/login/lark`
- `GET /api/auth/callback`
- `GET /api/auth/session`
- `POST /api/auth/logout`

Incomplete webhook config → provider-local `503 UNAVAILABLE`. Incomplete OAuth config on a named login route → `503 UNAVAILABLE`, not `404`.

`/api/lark/events` must never fall through into the Feishu handler.

`GET /api/auth/login` remains a legacy default-provider alias. Unset or invalid `PLATFORM` defaults that alias to Feishu. `PLATFORM` is not provider enablement.

## PLATFORM

Retained as legacy/default-provider compatibility input for `GET /api/auth/login`. Provider-specific routes ignore it.

## BROWSER_AUTH_PROVIDERS

Optional emergency allowlist / kill-switch for OAuth login and `session.providers`.

- Absence MUST NOT imply “only PLATFORM exists”.
- Presence filters OAuth-ready providers; it does not create providers.
- Invalid tokens fail closed.
- Webhook routes remain independent of this variable.

Deprecation path: readiness derives from provider config; remove the variable once production overlays no longer need a kill-switch.

## Identity / security invariants

- Feishu principal: `feishu:v1:*`
- Lark principal: `lark:v1:*`
- No account linking
- No cross-provider scope sharing
- OAuth callback provider comes from consumed server-side OAuth state
- `?provider=` must never select callback provider
- Session provider/principal mismatch fails closed
- No `LARK_*` → `FEISHU_*` or reverse credential fallback

## Wire / persistence

Internal TypeScript names may change. Persisted/wire identifiers stay compatible:

- Queue schema literal remains `feishu.message-create.v1`
- D1 tables remain `feishu_*`
- Cookie name may remain `feishu_addon_session`
- Cloudflare Worker/D1/queue/binding names unchanged

## Naming

Rename generic symbols (examples, not exact required strings):

- `FeishuWebhookEnvironment` → `MessagingWebhookEnvironment`
- `FeishuProductionEnvironment` → `MessagingProductionEnvironment`
- `FeishuMessageCreateV1` → `InboundMessageV1` (wire `schema` field unchanged)
- `AuthorizedFeishuEvent` → `AuthorizedInboundEvent`
- `consumeFeishuMessages` → `consumeInboundMessages`
- `Phase4Environment` → `MessagingRuntimeEnvironment`
- `createPhase4Worker` → `createMessagingRuntime`

Retain provider-specific names only where genuine (`FeishuAdapter`, `LarkAdapter`, `verifyFeishuSignature` if Feishu-only).

## Tests

See owner Section 17. Dual-provider tests are migrated, not dropped. Migration 0008 behavior is preserved.
