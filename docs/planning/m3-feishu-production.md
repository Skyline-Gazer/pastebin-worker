# M3 — Feishu Add-on production wiring and deployment

Status: OWNER AUTHORIZED (EXECUTE M3). Maintenance Issue: [#120](https://github.com/Skyline-Gazer/pastebin-worker/issues/120).
Branch: `maint/feishu-production`.

## Context

Pastebin production is live at https://pb.223.im. The Feishu Add-on source implements webhook, OAuth, lifecycle, batch, and a Vite frontend, but production cannot ship: `App` defaults to `fixtureEntries`, there is no `GET /api/entries`, and there is no Feishu Worker deploy descriptor.

## Expected behavior

- Production UI never renders fixture entries. Fixtures remain test/dev-only when `initialEntries` is passed explicitly.
- Boot states: `UNAUTHENTICATED`, `LOADING`, `READY`, `EMPTY`, `ERROR`.
- Unauthenticated users see a Feishu login action to `GET /api/auth/login`.
- Authenticated listing uses only server-side principal-to-scope mappings.
- `GET /api/entries` is session-authenticated, bounded, reads Paste bodies via `PasteClient`, and never leaks credential/password/tenant/open_id/principal/OAuth/fingerprint fields.
- One Worker origin serves `/api/*` and static frontend assets (`run_worker_first`). No Pages site. No custom Feishu hostname.
- Worker name: `pastebin-feishu-prod`. Public origin is the discovered workers.dev URL.
- D1 binding `FEISHU_BINDINGS_DB`; migrations 0001–0007 in order. Dedicated ingress queue + DLQ. `FEISHU_INGRESS_DLQ_CONFIGURED=true` only after consumer DLQ is verified.
- `PASTEBIN_ORIGIN=https://pb.223.im`. Do not set `PASTEBIN_AUTHORIZATION` unless live Pastebin requires it.
- Keep `compatibility_flags = ["global_fetch_strictly_public"]`. Internal Paste HTTP uses Service Binding `PASTEBIN_SERVICE` → `pastebin-prod`; the adapter constructs a `Request` and calls `service.fetch(request)`. workerd `Request` does not accept `redirect: "error"`; the adapter uses `manual` so redirects are not followed. Public URL validation stays on `https://pb.223.im`. Do not replay the exhausted DLQ creates.
- Enable native Workers Logs, invocation logs, and traces at `head_sampling_rate = 1` before another owner P2P. Existing `PASTE_CREATE_STAGE` markers stay `formdata_ready`, `transport_enter`, `transport_response`, `response_parse`, `done`. The Service Binding adapter also emits `PASTEBIN_SERVICE_STAGE=request_ready|fetch_enter|fetch_response` with no secret-bearing values.
- After an authorized observability deploy, read stages from the Cloudflare dashboard Observability view (or live `wrangler tail`). Wrangler OAuth can still 403 the telemetry Query API because that token has `workers_tail` and not Workers Observability Read. Do not implement a D1 stage-row fallback until the owner accepts the extra create-path write and retention policy.
- Persisted create-path evidence for operation `f69cdab5-4fbe-4a8a-8db2-3a480e89c29b` reached `transport_enter`, then `UPSTREAM_UNCERTAIN class=TypeError`, with no `transport_response` and no `pastebin-prod` invocation. Historical baseline remains 5 `reconciliation_required` D1 creates and 5 DLQ messages. Do not deploy or P2P from this source PR.

## PHASE / TODO

1. Source wiring + tests (this PR).
2. Review gate on `maint/feishu-production` → merge to `downstream/main`.
3. After merge and Feishu-owned credentials: provision D1/Queue/DLQ, deploy, discover origin, configure Feishu console, smoke.

## Constraints

- Downstream Add-on only. No Patch Source PR. No `upstream-sync` writes.
- Do not modify `pastebin-prod`, `pb.223.im`, KV, R2, DO, or release tags.
- Do not persist Paste bodies in D1.
- Do not deploy from unmerged source.
- Do not claim production success if Feishu-owned credentials or console callback/OAuth are missing.

## Refs

- Owner M3 authorization 2026-09-10
- Production Pastebin: https://pb.223.im
