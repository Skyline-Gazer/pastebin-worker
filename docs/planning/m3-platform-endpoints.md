# M3 — Feishu / Lark platform endpoint selection

Status: OWNER AUTHORIZED (CONTINUE M3). Tracking: [#120](https://github.com/Skyline-Gazer/pastebin-worker/issues/120).

## Context

The Add-on OAuth client hard-coded Feishu China hosts. The same Worker should run against a Lark international app without duplicating the Add-on.

## Expected behavior

- Runtime `PLATFORM` is exactly `feishu` or `lark`. Any other value, including missing/empty, fails closed (`UNAVAILABLE`).
- Production must set `PLATFORM` explicitly. The tracked Worker contract defaults to `feishu`. Overlays may set `lark`.
- Provider credentials are separated: `FEISHU_*` for Feishu, `LARK_*` for Lark. No cross-provider fallback.
- `resolveProviderConfig(env)` is the only place that maps `PLATFORM` onto credentials and OAuth hosts.
- User authorization-code exchange uses `/open-apis/authen/v2/oauth/token` on the selected open API origin.
- Inbound webhook path stays `/api/feishu/events` for both platforms.
- Login copy is the only user-visible brand switch: Feishu vs Lark.

## Acceptance criteria

- `PLATFORM=feishu` uses `FEISHU_*` variables and `accounts.feishu.cn` / `open.feishu.cn`.
- `PLATFORM=lark` uses `LARK_*` variables and `accounts.larksuite.com` / `open.larksuite.com`.
- `PLATFORM=lark` plus only `FEISHU_*` credentials fails closed.
- Invalid `PLATFORM` does not redirect to either brand.
- Unauthenticated `GET /api/auth/session` returns secret-free `{ code, brand }`.

## Constraints

- Do not rename `downstream/addons/feishu`, D1/queue/bindings, or historical `FEISHU_*` product bindings.
- Do not fork webhook handlers.
- Do not log client_secret, authorization code, or tokens.
- Do not commit App ID/Secret/token/key values.
- Do not switch production runtime to Lark in this change.
