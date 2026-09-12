# M3 — PASTEBIN_SERVICE Request-object adapter

Status: OWNER AUTHORIZED (EXECUTE). Tracking: [#120](https://github.com/Skyline-Gazer/pastebin-worker/issues/120).
Branch: `fix/m3-pastebin-service-request`. Target: `downstream/main`.

Owner instruction dated 2026-09-12 is the authorizing PLAN, SPEC, PHASE, and TODO. This file persists that contract before implementation.

## PLAN

- **Objective:** Change only the `PASTEBIN_SERVICE` adapter so it constructs a `Request` and calls `service.fetch(request)`, and add secret-free adapter stage markers.
- **Context:** Persisted create-path telemetry for operation `f69cdab5-4fbe-4a8a-8db2-3a480e89c29b` reached `formdata_ready` and `transport_enter`, then threw `UPSTREAM_UNCERTAIN class=TypeError` before `transport_response`. No Service Binding child span and zero `pastebin-prod` invocations. Failure is at or immediately around the current `service.fetch(input, init)` adapter call. Do not claim a more specific root cause.
- **Assumptions:** Cloudflare's documented HTTP Service Binding pattern is `service.fetch(request)`. Existing unit tests run in workerd via `@cloudflare/vitest-pool-workers` and can assert call shape against a mock Fetcher. A real Miniflare Service Binding regression will be added only if the existing pool can host a stub Worker without new dependencies or production resource changes.
- **Non-goals:** No deploy, P2P, D1/DLQ mutation, `pastebin-prod` change, observability/config change, or revival of same-zone/global-fetch or detached-receiver hypotheses without new evidence.
- **Risks:** `new Request(input, init)` must preserve FormData, Authorization, redirect, and 15s AbortSignal. Unit mocks cannot by themselves prove production workerd Fetcher arity.
- **Approach:** Smallest adapter change in `createPasteClient`. Keep `PasteClient` ignorant of Service Bindings. Construct `new Request(input, { ...init, redirect: "manual" })` because workerd `Request` rejects `redirect: "error"`, then `service.fetch(request)`. Log only `PASTEBIN_SERVICE_STAGE=request_ready|fetch_enter|fetch_response`. Do not treat the local workerd redirect constraint as a proven production root cause.
- **Files:** `downstream/addons/feishu/worker/index.ts`, `downstream/addons/feishu/tests/production-entrypoint.spec.ts`, optional Miniflare stub via existing `vitest.config.js`, docs under `docs/` and `docs/planning/`.
- **Validation:** Feishu Vitest, typecheck, eslint, prettier; CI `feishu-phase3`; review gate. No production commands.

```text
Status: PLAN APPROVED BY OWNER
```

## SPEC

### 3.1 Problem statement

Create still fails after entering PasteClient transport. The live adapter forwards `(input, init)` into `PASTEBIN_SERVICE.fetch`. Documented Service Binding usage constructs a `Request` and calls `service.fetch(request)`.

### 3.2 Goals

- Adapter builds `new Request(input, init)` then `service.fetch(request)`.
- Distinguish request construction, fetch enter, and fetch Response with fixed markers.
- Preserve origin, binding, URL validation, auth, timeout, FormData, CRUD, `global_fetch_strictly_public`, `PASTE_CREATE_STAGE`, observability, secrets, D1, and queues.

### 3.3 Non-goals

No deploy, P2P, replay, D1/DLQ writes, `pastebin-prod` edits, D1 stage table, or broader transport redesign. Do not claim illegal-invocation or same-zone fetch as the proven cause.

### 3.4 Current behavior

```ts
const pastebinTransport: typeof fetch = (input, init) => service.fetch(input, init)
```

Runtime: `transport_enter` success, then TypeError / `UPSTREAM_UNCERTAIN`, no `transport_response`, no `pastebin-prod` invocation.

### 3.5 Desired behavior

```ts
const pastebinTransport: typeof fetch = async (input, init) => {
  const request = new Request(input, { ...init, redirect: "manual" })
  return service.fetch(request)
}
```

`redirect: "manual"` is required: workerd `Request` construction throws TypeError for `redirect: "error"` (`follow` or `manual` only). This preserves non-following redirect behavior. It is a local workerd constraint, not a claim that production's TypeError was specifically `redirect: "error"`.

Plus:

```text
PASTEBIN_SERVICE_STAGE=request_ready
PASTEBIN_SERVICE_STAGE=fetch_enter
PASTEBIN_SERVICE_STAGE=fetch_response
```

No URL, body, headers, credentials, exception messages, tenant/user/message identifiers, or secrets in those logs. Missing `PASTEBIN_SERVICE` still throws `MISSING_PASTEBIN_SERVICE`. Public URLs remain `https://pb.223.im/<name>`.

### 3.6 User/API flows

Unchanged webhook, queue, D1, and Paste HTTP product flows. Only the Service Binding call shape changes.

### 3.7 Data/state model

No D1/schema/queue change. Historical baseline remains 5 `reconciliation_required` creates and 5 DLQ messages.

### 3.8 Security and trust boundaries

Passwords, Authorization, URLs, and exception messages stay out of adapter logs. Ambient `fetch` remains unused. `PASTEBIN_ORIGIN` validation unchanged.

### 3.9 Compatibility

`PASTEBIN_SERVICE → pastebin-prod`, `PASTEBIN_ORIGIN=https://pb.223.im`, `global_fetch_strictly_public`, observability block, Feishu callback/OAuth/secrets unchanged.

### 3.10 Failure behavior

If `new Request` throws, `request_ready` is absent. If `service.fetch` throws, `fetch_enter` is present and `fetch_response` is absent. `PasteClient` still maps transport throws to `UPSTREAM_UNCERTAIN` and existing `PASTE_CREATE_STAGE` failure markers.

### 3.11 Acceptance criteria

- `PASTEBIN_SERVICE.fetch` receives one `Request` argument, not `(string, RequestInit)`.
- Create URL is `https://pb.223.im/`, method POST, FormData preserved, Authorization unchanged, timeout/signal represented on the Request.
- Ambient global `fetch` is not called.
- Returned public URL remains `https://pb.223.im/<name>`.
- Missing binding fails closed.
- Diagnostics contain only the three fixed markers (plus existing create-stage markers) and no secret-bearing values.

### 3.12 Test specification

Unit tests on `createPasteClient` cover the acceptance criteria. Existing `@cloudflare/vitest-pool-workers` hosts a `pastebin-stub` Worker via `serviceBindings` in `downstream/addons/feishu/vitest.config.js` so the Request-object path is exercised in workerd without new dependencies or production resource changes.

### 3.13 Open questions

None. Root cause remains bounded to the adapter call; this change tests the documented Request call shape.

```text
Status: SPEC APPROVED BY OWNER
```

## PHASE / TODO

Single implementation PR.

- Goal: Request-object Service Binding adapter + secret-free adapter stages.
- Scope: Feishu Add-on `createPasteClient` and tests/docs.
- Branch: `fix/m3-pastebin-service-request` → `downstream/main`.
- Tests: failing unit tests first; optional Miniflare Service Binding test.
- Exit: CI green; review settlement; STOP for owner override if quorum unavailable. No deploy. Issue #120 stays OPEN.

TODO:

1. RED: Request-object and diagnostic tests against current `(input, init)` adapter.
2. GREEN: Request construction + `service.fetch(request)` + three stage markers.
3. Existing-pool workerd Service Binding regression via `pastebin-stub`.
4. Docs in the same change.
5. PR, CI, review settlement. STOP.

```text
Status: PHASE/TODO APPROVED BY OWNER
Implementation may start.
```

## TDD evidence

```text
RED:
- production-entrypoint Request arity / PASTEBIN_SERVICE_STAGE tests
- pnpm exec vitest run --config downstream/addons/feishu/vitest.config.js downstream/addons/feishu/tests/production-entrypoint.spec.ts
- expected: fetch still received (string, init); no PASTEBIN_SERVICE_STAGE logs
- observed: call length 2; PASTEBIN_SERVICE_STAGE logs []

GREEN:
- same command after Request adapter
- 9 passed, including workerd redirect=error constraint and Request-object create/update/delete

REFACTOR:
- adapter uses redirect: "manual" because workerd Request rejects "error"
- production-entrypoint.spec.ts 9 passed

REGRESSION:
- pnpm exec vitest run --config downstream/addons/feishu/vitest.config.js → 14 files, 109 passed
- frontend vitest → 3 files, 42 passed
```
