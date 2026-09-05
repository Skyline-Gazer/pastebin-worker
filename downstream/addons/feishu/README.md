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

The downstream-only `Feishu internal services` workflow runs these checks independently
of upstream PR Tests. The build produces an internal ES module, not a deployed management endpoint.
The frontend build is a typecheck prerequisite: the reused root Cloudflare declarations import
upstream Worker page modules that depend on the generated SSR manifest. A pre-existing local
`dist/` must not be mistaken for a clean-checkout prerequisite being satisfied in CI.

## Phase 4 webhook foundation

The Worker now exposes only `POST /api/feishu/events` through the explicit Phase 4 adapter.
It is an encrypted Feishu callback-to-Queue boundary, not a public Paste management API. See
the [webhook configuration and DLQ recovery runbook](docs/phase4-webhook.md).
