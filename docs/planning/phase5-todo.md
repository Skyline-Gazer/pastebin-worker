# Phase 5 — Frontend baseline TODO

## Authorization and active increment

Owner Delegated Continuous Execution under D-030 authorizes the in-scope Phase 5 progression represented by the approved PLAN, [SPEC](phase5-spec.md), and [PHASE decomposition](phase5-phases.md). This TODO is the durable active implementation checklist for **5A — Local scaffold and visual shell**. It does not authorize a live API, mutation/lifecycle behavior, Phase 6–10 work, deployment, migration, PR #5, or `upstream-sync`/`goshujin` work.

Implementation has NOT started. Before coding in a later turn, refresh `downstream/main`, verify a clean current base, create the 5A branch, and preserve this TODO as the applicable execution record.

## 5A ordered work

### 0. Preflight

- [x] Confirm this TODO, SPEC, and phases remain the current D-030 in-scope contract; STOP on requested behavior/API/security drift.
- [x] Refresh `downstream/main` with the approved non-destructive workflow; verify a clean checkout and that Phase 4 remains merged.
- [x] Create `feat/feishu-frontend-scaffold` (or equivalent) from refreshed `downstream/main`; do not work from this planning branch.
- [x] Inspect existing Add-on Vite/Vitest/TS configuration and locked installed dependencies; STOP if a root manifest/lockfile change or a new dependency is required.

### 1. TDD RED — local frontend shell

- [x] Add failing frontend tests for a minimal named page/shell, compact content region, accessible light/dark presentation control/state if one is implemented, and no browser transport on initial render.
- [x] Record the exact failing command/output and why it proves the expected shell is absent in **Evidence → RED** before implementation.

### 2. Smallest GREEN — scaffold and local tokens

- [x] Add only the Add-on-local React/Vite/TypeScript/Tailwind entry/configuration needed for an isolated browser build/test target.
- [x] Add a minimal content-first shell with local upstream-inspired background/foreground/default-control tokens and compact responsive layout; do not import/modify upstream frontend source.
- [x] Keep all browser-visible fixtures/props secret-free and do not add an entry route, Worker call, or network client.
- [x] Turn the shell tests GREEN without adding tabs, GFM, managed checkbox, Archive behavior, or lifecycle affordances.

### 3. Refactor and regression

- [x] Format/refactor only after GREEN while retaining the same observed behavior.
- [x] Run focused frontend tests, Add-on TypeScript, applicable lint/format, frontend production build, and existing Add-on Worker regression suite.
- [x] Inspect the final diff for upstream-owned paths, root dependency/config changes, migrations, patch-series changes, secrets, and accidental API exposure.
- [x] Record exact commands/results in **Evidence → GREEN/REFACTOR/REGRESSION**.

### 4. 5A review gate

- [x] Update Add-on-local documentation with the frontend-local test/typecheck/build commands.
- [x] Commit with the required structured Conventional Commit body and planning references.
- [ ] Obtain current-HEAD CI and completed AI Review Bot review; fix/disposition findings under the gate rules and re-review every changed HEAD.
- [ ] Merge only with authorized human process; then refresh `downstream/main` before beginning 5B.

## Next increment preview — 5B (not active until 5A merges)

- [ ] Reconfirm merged 5A and refresh `downstream/main`; branch anew for 5B.
- [ ] TDD RED for typed fixture-only data/no network, semantic Active/Archive tabs, sanitized GFM task forms/nesting, literal fenced-code task text, malicious-markup sanitization, Archive display-only labels, and managed-control no-op.
- [ ] Implement the smallest parser-aware/sanitized rendering and explicit managed-control distinction; do not use regex task replacement or add lifecycle/API behavior.
- [ ] Record RED/GREEN/REFACTOR/REGRESSION evidence and complete the independent review gate.

## 5C closeout preview (not active until 5B merges)

- [ ] Reconfirm merged 5B and refresh `downstream/main`; branch anew for 5C.
- [ ] Close remaining secret-boundary, a11y, token/layout, full-suite, build, and scope-diff evidence without adding Phase 6 behavior.
- [ ] Complete Phase 5 documentation/TDD evidence and independent review gate.

## Evidence

### RED

`PATH="/home/box/.local/bin:/home/box/.local/node-v22/bin:$PATH" node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts` exited 1 before shell implementation. Vitest reported `Failed to resolve import "./App" from "downstream/addons/feishu/frontend/App.spec.tsx". Does the file exist?`; `App.spec.tsx` contained the required named-shell, compact-region, no-transport, and theme-control assertions. This proves the required frontend shell was absent. (An initial harness invocation also exposed root-relative Vitest resolution; the local config was corrected before this recorded RED run.)

### GREEN

`PATH="/home/box/.local/bin:/home/box/.local/node-v22/bin:$PATH" node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts` exited 0: 1 file, 2 tests passed. The tests confirm the named compact shell, no initial `fetch`, and the accessible light/dark control updates only local theme state.

### REFACTOR

No behavior refactor was needed after GREEN. Test cleanup was added to the frontend-local setup so each shell test has an isolated DOM. `node_modules/.bin/prettier --check downstream/addons/feishu/frontend docs/planning/phase5-todo.md` exited 0.

### REGRESSION

All commands used `PATH="/home/box/.local/bin:/home/box/.local/node-v22/bin:$PATH"` and exited 0:

- `node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts` — 1 file, 2 tests passed.
- `node_modules/.bin/tsc --noEmit --project downstream/addons/feishu/frontend/tsconfig.json` — passed.
- `node_modules/.bin/eslint downstream/addons/feishu/frontend` — passed.
- `node_modules/.bin/prettier --check downstream/addons/feishu/frontend docs/planning/phase5-todo.md` — passed.
- `node_modules/.bin/vite build --config downstream/addons/feishu/frontend/vite.config.ts` — passed; emitted the isolated Add-on frontend build.
- `node_modules/.bin/vitest run --config downstream/addons/feishu/vitest.config.js` — 4 files, 27 Worker tests passed (run with approved loopback access required by the Cloudflare pool).

Final scope review found only `downstream/addons/feishu/frontend/` plus this TODO evidence changed. No upstream-owned source, root manifest/lockfile, migration, patch-series, network client, API route, fixture data, or secret-bearing browser state was added.

### Planning validation

- Read and reconciled the approved `docs/planning/phase5-plan.md`, `AGENTS.md`, `DECISIONS.md` (including D-030), `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10, `docs/IMPLEMENTATION_ORDER.md` Phase 5, `docs/FRONTEND.md`, `docs/DESIGN.md`, `docs/API_CONTRACT.md`, `docs/SECURITY.md`, Phase 3/4 SPECs/contracts, and existing Add-on configuration.
- Verified the repository baseline has no Add-on browser application, Phase 3 has no browser adapter/list API, and Phase 4's only public route is the Feishu webhook.

## Internal consistency review

The active TODO is implementation-sized for the scaffold increment and explicitly keeps rendering/tabs/managed behavior for the dependent 5B increment. It preserves fixture-only/no-network and secret boundaries, requires test-first evidence before code, and requires a fresh branch after each merge. It does not introduce a STOP condition; implementation may begin in the next turn under D-030 once the preflight checks pass.

Status: CONTINUOUS-MODE TODO READY AFTER INTERNAL CONSISTENCY REVIEW

Implementation has NOT started.
