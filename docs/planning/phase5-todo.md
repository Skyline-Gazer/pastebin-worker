# Phase 5 — Frontend baseline TODO

## Authorization and active increment

Owner Delegated Continuous Execution under D-030 authorizes the in-scope Phase 5 progression represented by the approved PLAN, [SPEC](phase5-spec.md), and [PHASE decomposition](phase5-phases.md). This TODO is the durable active implementation checklist for **5B — Fixture tabs, safe GFM, and managed-control baseline**. Phase 5A merged through PR #14; this increment begins from refreshed `downstream/main` at `09d7d4478a3f78e1391429389f99871bc02e5301` on `feat/feishu-frontend-rendering`. It does not authorize a live API, mutation/lifecycle behavior, Phase 6–10 work, deployment, migration, PR #5, or `upstream-sync`/`goshujin` work.

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
- [x] Obtain current-HEAD CI and completed AI Review Bot review; fix/disposition findings under the gate rules and re-review every changed HEAD.
- [x] Merge only with authorized human process; then refresh `downstream/main` before beginning 5B (PR #14, baseline `09d7d4478a3f78e1391429389f99871bc02e5301`).

## 5B ordered work

### 0. Preflight

- [x] Reconfirm merged 5A and refreshed `downstream/main` baseline; create this 5B feature branch.
- [x] Confirm locked `marked` and `xss` packages are available without a root manifest/lockfile change; STOP if they cannot provide parser-aware GFM plus sanitization.

### 1. TDD RED — fixture rendering contract

- [x] Add failing tests for typed fixture-only rendering/no network, semantic Chinese Active/Archive tabs and filtering, GFM tasks (including nesting and `[X]`), literal fenced-code task text, malicious markup/URLs inertness, Archive labels from fixture `expiresAt`, and managed-control no-op.
- [x] Record the exact failing command/output and why it demonstrates each missing behavior in **Evidence → 5B RED** before GREEN implementation.

### 2. Smallest GREEN — safe presentation only

- [x] Add public-safe typed local fixtures and no transport client.
- [x] Add parser-aware GFM rendering through `marked` followed by `xss` sanitization; preserve parser-recognized semantic checkboxes without regex task replacement.
- [x] Add semantic tabs and static Archive labels; a timed label must format the fixture's exact `expiresAt` only and must not use a timer or manufacture a deadline.
- [x] Add a programmatically distinct `ManagedTaskCheckbox`; clicking it is intentionally a documented no-op and must not open Phase 6 UI or mutate anything.

### 3. Refactor and regression

- [x] Format/refactor only after GREEN while retaining fixture-only, inert behavior.
- [x] Run frontend Vitest/TypeScript/Vite, Worker Vitest, and ESLint/Prettier for touched paths.
- [x] Inspect final diff for only `downstream/addons/feishu` and `docs/planning`, with no root dependency/lockfile, workflow, API, mutation, secret, or upstream-source change.
- [x] Record exact commands/results in **Evidence → 5B GREEN/REFACTOR/REGRESSION**.

### 4. 5B review gate

- [ ] Commit with required structured Conventional Commit body and Phase 5B/D-030/planning references.
- [ ] Obtain current-HEAD CI and completed AI Review Bot review; fix/disposition findings under the gate rules and re-review every changed HEAD.
- [ ] Do not open or merge a PR in this increment; hand off the committed branch for authorized review.

## 5C closeout preview (not active until 5B merges)

- [ ] Reconfirm merged 5B and refresh `downstream/main`; branch anew for 5C.
- [ ] Close remaining secret-boundary, a11y, token/layout, full-suite, build, and scope-diff evidence without adding Phase 6 behavior.
- [ ] Complete Phase 5 documentation/TDD evidence and independent review gate.

### CI workflow note

Extending `.github/workflows/feishu-phase3.yml` with frontend vitest/tsc/vite steps is prepared and validated locally, but pushing workflow-file changes requires a GitHub token with the `workflow` scope. Until that is available, keep frontend validation local via the README `node_modules/.bin` commands; do not treat missing CI frontend steps as a SPEC failure for this increment.

## Evidence

### RED

`PATH="/home/box/.local/bin:/home/box/.local/node-v22/bin:$PATH" node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts` exited 1 before shell implementation. Vitest reported `Failed to resolve import "./App" from "downstream/addons/feishu/frontend/App.spec.tsx". Does the file exist?`; `App.spec.tsx` contained the required named-shell, compact-region, no-transport, and theme-control assertions. This proves the required frontend shell was absent. (An initial harness invocation also exposed root-relative Vitest resolution; the local config was corrected before this recorded RED run.)

### 5B RED

`PATH="/home/box/.local/bin:/home/box/.local/node-v22/bin:$PATH" node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts` exited 1 before 5B implementation: 1 file, 6 tests failed. The existing shell had no `进行中`/`归档` tab roles, no fixture content, no Markdown checkbox controls, no fenced-code rendering, no Archive labels, and no managed task control. The first failures reported missing `进行中`/`归档` tabs and missing `Markdown task` / `Managed entry task (Phase 5 no-op)` checkboxes. These failures prove the fixture-only tabs, parser-aware rendering/sanitization, Archive presentation, and inert managed-control behavior were absent.

### 5B GREEN

`PATH="/home/box/.local/bin:/home/box/.local/node-v22/bin:$PATH" node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts` exited 0: 1 file, 6 tests passed. The tests prove local fixture filtering without `fetch`, semantic tabs, GFM unchecked/checked/uppercase/nested task output, literal fenced task source, stripped unsafe markup/URLs, fixture-`expiresAt` Archive labels, and a distinct managed checkbox whose click is an intentional no-op (no request, dialog, tab, or checked-state change).

### 5B REFACTOR

After GREEN, Prettier formatted the new fixture, rendering, managed-control, and page modules. The renderer remains a single parser-aware pipeline: `marked` parses GFM, `xss` allowlists safe output, then a parsed DOM adds accessible names only to parser-produced checkbox elements. No regex task replacement or lifecycle behavior was introduced.

### 5B REGRESSION

All commands used `PATH="/home/box/.local/bin:/home/box/.local/node-v22/bin:$PATH"` and exited 0:

- `node_modules/.bin/vitest run --config downstream/addons/feishu/frontend/vitest.config.ts` — 1 file, 6 tests passed.
- `node_modules/.bin/tsc --noEmit --project downstream/addons/feishu/frontend/tsconfig.json` — passed.
- `node_modules/.bin/eslint downstream/addons/feishu/frontend` — passed.
- `node_modules/.bin/prettier --check downstream/addons/feishu/frontend docs/planning/phase5-todo.md` — passed.
- `node_modules/.bin/vite build --config downstream/addons/feishu/frontend/vite.config.ts` — passed.
- `node_modules/.bin/vitest run --config downstream/addons/feishu/vitest.config.js` — 4 files, 27 Worker tests passed (with approved loopback access for the Cloudflare test pool).

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

### Bugbot follow-up

PR #14 Bugbot Medium finding: frontend Vite and Vitest configuration roots now use `fileURLToPath(new URL(".", import.meta.url))`, so filesystem paths with percent-encoded characters resolve correctly. `emptyOutDir: true` remains safe because `outDir` is still the explicit sibling `../dist/frontend` path. Focused frontend test/typecheck/build and Worker config-suite regression commands were rerun for the amended HEAD.

### Planning validation

- Read and reconciled the approved `docs/planning/phase5-plan.md`, `AGENTS.md`, `DECISIONS.md` (including D-030), `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10, `docs/IMPLEMENTATION_ORDER.md` Phase 5, `docs/FRONTEND.md`, `docs/DESIGN.md`, `docs/API_CONTRACT.md`, `docs/SECURITY.md`, Phase 3/4 SPECs/contracts, and existing Add-on configuration.
- Verified the repository baseline has no Add-on browser application, Phase 3 has no browser adapter/list API, and Phase 4's only public route is the Feishu webhook.

## Internal consistency review

The active TODO is implementation-sized for the scaffold increment and explicitly keeps rendering/tabs/managed behavior for the dependent 5B increment. It preserves fixture-only/no-network and secret boundaries, requires test-first evidence before code, and requires a fresh branch after each merge. It does not introduce a STOP condition; implementation may begin in the next turn under D-030 once the preflight checks pass.

Status: CONTINUOUS-MODE TODO READY AFTER INTERNAL CONSISTENCY REVIEW

Implementation has NOT started.
