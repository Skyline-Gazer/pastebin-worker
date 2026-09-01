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
