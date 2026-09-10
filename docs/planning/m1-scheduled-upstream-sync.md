# M1 — Scheduled fast-forward-only upstream-sync

Status: OWNER AUTHORIZED (EXECUTE M1). Maintenance Issue: [#118](https://github.com/Skyline-Gazer/pastebin-worker/issues/118).

## Context

Post-launch maintenance. Official `SharzyL/pastebin-worker:goshujin` must be mirrored onto `upstream-sync` without merging, rebasing, force-pushing, releasing, or deploying.

## Expected behavior

- Triggers: `workflow_dispatch` and daily `17 3 * * *`.
- Identity: `GITHUB_REPOSITORY=Skyline-Gazer/pastebin-worker`; writable ref `refs/heads/upstream-sync` only.
- Official remote is fetch-only (`no_push://disabled-by-policy`).
- Classification: EQUAL→NOOP; ancestor→fast-forward push; local-ahead/diverged→fail closed.
- Patch replay against the official SHA is evidence only. Replay failure does not rewind `upstream-sync` or change `release.json`.

## Non-goals

No automatic `downstream/main`, patch, tag, Cloudflare, or production change. No child Issues. Archival `handoff/grok-bot-2026-09-05` and the dirty Desktop worktree are out of scope.

## Validation

`downstream/tests/upstream-sync.test.sh` plus existing downstream fixture tests for changed CI wiring.
