# Feishu Add-on

This directory is the complete Feishu integration unit.

```text
frontend/   React + Vite + TypeScript + Tailwind web UI
worker/     Cloudflare Worker: webhook, API, Paste client, lifecycle, batch
shared/     cross-runtime public types/schemas
tests/      integration/cross-module tests
docs/       Add-on-local implementation notes
migrations/ Add-on state-store migrations when required
```

Key rules:

- Pastebin remains content source of truth;
- management passwords stay server-side;
- web UI follows upstream Pastebin Worker style, not Feishu client style;
- Markdown/GFM is rendered by default;
- normal completion offers permanent archive / expiring archive / delete;
- Archive shows permanent or countdown state and supports restore;
- Batch Mode uses a separate selector and one backend batch API;
- batch partial failures remain visible/retryable;
- delete is real deletion and not Archive/Trash in v1.

## Phase 3 internal services

The backend library now provides `EntryService`, `BindingStore`, `Credentials` and `PasteClient`.
It intentionally exports no HTTP handler. See [configuration and recovery](docs/phase3-services.md)
and the [approved contract](../../../docs/planning/phase3-spec.md).

From the repository root, after installing the existing locked dependencies under Node 22 / pnpm 10:

```sh
pnpm build:frontend
pnpm exec tsc --noEmit -p downstream/addons/feishu/tsconfig.json
pnpm exec eslint downstream/addons/feishu
pnpm exec vitest run --config downstream/addons/feishu/vitest.config.js
pnpm exec vite build --config downstream/addons/feishu/vite.config.js
```

For the frontend-local checks, invoke the installed binaries from the repository root:

```sh
node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts
node_modules/.bin/tsc --noEmit -p downstream/addons/feishu/frontend/tsconfig.json
node_modules/.bin/vite build --config downstream/addons/feishu/frontend/vite.config.ts
```

The downstream-only `Feishu internal services` workflow runs these checks independently
of upstream PR Tests. The build produces an internal ES module, not a deployed management endpoint.
The frontend build is a typecheck prerequisite: the reused root Cloudflare declarations import
upstream Worker page modules that depend on the generated SSR manifest. A pre-existing local
`dist/` must not be mistaken for a clean-checkout prerequisite being satisfied in CI.

## Phase 5 fixture baseline

The browser baseline uses typed, public-safe local fixtures only; it makes no browser request or
live-state claim. Its Active/Archive tabs and sanitized GFM rendering are presentation-only. The
visibly distinct managed task checkbox is deliberately inert in Phase 5: a click does not change
Markdown or fixture state, open the Phase 6 chooser, select a retention action, or contact a Worker.

## Phase 4 webhook foundation

The Worker now exposes only `POST /api/feishu/events` through the explicit Phase 4 adapter.
It is an encrypted Feishu callback-to-Queue boundary, not a public Paste management API. See
the [webhook configuration and DLQ recovery runbook](docs/phase4-webhook.md).

## Phase 6.0 browser trust boundary

OAuth, opaque sessions, CSRF/Origin validation, and trusted principal-to-scope metadata are now
available for future browser mutations. The Phase 6.0 routes/configuration and migration order are
documented in [browser trust boundary](docs/phase6-browser-trust.md). No completion endpoint or UI
is included in this phase.
