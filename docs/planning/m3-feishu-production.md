# M3 — Feishu Add-on production wiring and deployment

Status: **COMPLETE**. Maintenance Issue [#120](https://github.com/Skyline-Gazer/pastebin-worker/issues/120) is CLOSED after production PASS (`M3_REQUEST_ADAPTER_SMOKE: PASS`).

This file is the historical M3 execution contract plus the shipped production outcome. It is not an active implementation queue and does not authorize another M3 deploy or P2P.

## Production outcome

- Worker: `pastebin-feishu-prod`, live version `2538a5fe-42b5-4479-900e-6eb8732c0a84` at the accepted smoke.
- Callback: `https://pb.test.223.im/api/feishu/events` (custom hostname on zone `223.im`; workers.dev remains available).
- Pastebin origin: `https://pb.223.im`. Internal Paste HTTP uses Service Binding `PASTEBIN_SERVICE` → `pastebin-prod` with `service.fetch(request)`.
- Accepted smoke operation: `f1790b7f-3268-4c88-be8a-3899e2dd0088` (`succeeded`).
- Accepted smoke Paste: `https://pb.223.im/DRsrmX5eRifhY2dAidEA6PW5`.
- Historical pre-fix creates (5 D1 `reconciliation_required` + 5 DLQ messages) are closed forensic history on [#128](https://github.com/Skyline-Gazer/pastebin-worker/issues/128): proven no remote side effect, terminalized as `failed`, DLQ disposed without replay.

## Context

Pastebin production is live at https://pb.223.im. Before M3, the Feishu Add-on source implemented webhook, OAuth, lifecycle, batch, and a Vite frontend, but production could not ship: `App` defaulted to `fixtureEntries`, there was no `GET /api/entries`, and there was no Feishu Worker deploy descriptor. Those gaps were closed by the M3 source PRs and the production deploy tracked by #120.

## Expected behavior

- Production UI never renders fixture entries. Fixtures remain test/dev-only when `initialEntries` is passed explicitly.
- Boot states: `UNAUTHENTICATED`, `LOADING`, `READY`, `EMPTY`, `ERROR`.
- Unauthenticated users see a Feishu login action to `GET /api/auth/login`.
- Authenticated listing uses only server-side principal-to-scope mappings.
- `GET /api/entries` is session-authenticated, bounded, reads Paste bodies via `PasteClient`, and never leaks credential/password/tenant/open_id/principal/OAuth/fingerprint fields.
- One Worker origin serves `/api/*` and static frontend assets (`run_worker_first`). No Pages site.
- Worker name: `pastebin-feishu-prod`. Public origin is `https://pb.test.223.im` (plus the discovered workers.dev URL).
- D1 binding `FEISHU_BINDINGS_DB`; migrations 0001–0007 in order. Dedicated ingress queue + DLQ. `FEISHU_INGRESS_DLQ_CONFIGURED=true` only after consumer DLQ is verified.
- `PASTEBIN_ORIGIN=https://pb.223.im`. Do not set `PASTEBIN_AUTHORIZATION` unless live Pastebin requires it.
- Keep `compatibility_flags = ["global_fetch_strictly_public"]`. Internal Paste HTTP uses Service Binding `PASTEBIN_SERVICE` → `pastebin-prod`; the adapter constructs a `Request` and calls `service.fetch(request)`. workerd `Request` does not accept `redirect: "error"`; the adapter uses `manual` so redirects are not followed. Public URL validation stays on `https://pb.223.im`.
- Native Workers Logs, invocation logs, and traces remain at `head_sampling_rate = 1`. Existing `PASTE_CREATE_STAGE` markers stay `formdata_ready`, `transport_enter`, `transport_response`, `response_parse`, `done`. The Service Binding adapter also emits `PASTEBIN_SERVICE_STAGE=request_ready|fetch_enter|fetch_response` with no secret-bearing values.
- Wrangler OAuth can still 403 the telemetry Query API because that token has `workers_tail` and not Workers Observability Read. A durable D1 stage-row fallback is not implemented.

## PHASE / TODO (completed)

1. Source wiring + tests — done.
2. Review gate → merge to `downstream/main` — done.
3. Provision D1/Queue/DLQ, deploy, configure Feishu console, production smoke — done (`M3_REQUEST_ADAPTER_SMOKE: PASS` on #120).

## Constraints

- Downstream Add-on only. No Patch Source PR. No `upstream-sync` writes.
- Do not modify `pastebin-prod`, `pb.223.im`, KV, R2, DO, or release tags.
- Do not persist Paste bodies in D1.
- Do not deploy from unmerged source.

## Refs

- Owner M3 authorization 2026-09-10
- Production Pastebin: https://pb.223.im
- [#120](https://github.com/Skyline-Gazer/pastebin-worker/issues/120) CLOSED
- [#128](https://github.com/Skyline-Gazer/pastebin-worker/issues/128) CLOSED (historical 5/5)
