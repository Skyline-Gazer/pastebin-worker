# Phase 5 — Frontend baseline PLAN

Status: CONTINUOUS-MODE PLAN READY AFTER INTERNAL CONSISTENCY REVIEW

Implementation has NOT started.

## Authorization and baseline

This PLAN proceeds under **Owner Delegated Continuous Execution for Phases 5–10 (D-030)** and follows `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.1.1.  That delegation replaces the routine owner pause for this in-scope PLAN → SPEC → PHASE/TODO progression only.  It does not authorize implementation from this PLAN, work outside roadmap Phase 5, deployment, migration, a change to an approved contract, work involving PR #5, or any change to `upstream-sync`/`goshujin`.

- Branch baseline inspected: `codex/phase5-frontend-baseline` from `downstream/main` at `ecdbe064cb7c7c0f37f3a79d58faef18e1b8922a` (abbreviated `ecdbe06`).
- Phase 3 provides server-internal `EntryService` and a `PublicEntry` projection; it has no browser HTTP adapter or entry-list operation.
- Phase 4 exposes only `POST /api/feishu/events`; it is a verified Feishu callback-to-Queue boundary, not a browser content-management API.
- `downstream/addons/feishu/frontend/` contains only `.gitkeep` today.  The upstream `frontend/` provides the visual and tooling references to inspect, but is upstream-owned and is not a Phase 5 edit target.

## Objective

Create the Phase 5 planning contract for a downstream-owned React, Vite, TypeScript, and Tailwind Feishu Add-on frontend baseline.  The later implementation will establish a minimal Pastebin Worker-aligned web page with Active/Archive tabs, sanitized GFM display, and a recognizable managed-task-checkbox rendering baseline, using non-secret fixture data until a separately specified browser-safe read/list contract exists.

## Context

The downstream Add-on needs a content-first web surface for viewing Feishu-managed Paste content without becoming a second Pastebin, a Feishu-client clone, or an enterprise dashboard.  Locked decisions require React/Vite/TypeScript/Tailwind (D-004), upstream Pastebin Worker visual alignment without profile/dashboard/client chrome (D-005), and rendered GFM by default (D-006).  Paste bodies remain authoritative upstream (D-008), while management passwords remain backend-only (D-007).

This belongs exclusively to the downstream Add-on ownership boundary: `downstream/addons/feishu/frontend/`, supported by downstream Add-on tests/docs/configuration only as needed.  It must not modify upstream `frontend/`, `worker/`, `shared/`, package/dependency files, or patch-series artifacts on `downstream/main`.

## Assumptions and verification

| Assumption | Verification method / current result |
| --- | --- |
| Phase 5 is limited to the frontend baseline. | Read `docs/IMPLEMENTATION_ORDER.md` Phase 5; it names scaffold, visual alignment, tabs, GFM sanitization, and managed task checkbox only. |
| The chosen frontend stack can use repository-locked tooling. | Inspect `package.json`: React, Vite, TypeScript, Tailwind, Testing Library, `marked`, and `xss` are already available. Verify concrete imports and build configuration during SPEC/TODO work. |
| No browser-safe list/read API exists at this baseline. | Inspect `downstream/addons/feishu/worker/index.ts`, `service.ts`, and Phase 3/4 docs. `readEntry` is an internal trusted-adapter service; the only public route is the Phase 4 webhook. |
| Public entry data is secret-free only when projected by the backend. | Inspect `shared/entries.ts`, `docs/API_CONTRACT.md` §1–2, and `docs/SECURITY.md` §1–2; neither passwords nor management URLs appear in `PublicEntry`/browser responses. |
| Visual alignment can be implemented locally without fragile upstream imports. | Inspect upstream `frontend/style.css`, display page, and UI components. Adopt matching local tokens/layout patterns where practical; do not import or alter upstream source. |
| Markdown task syntax in fenced code must remain literal. | `docs/FRONTEND.md` §4 and `docs/SECURITY.md` §4 require a GFM-capable parser, sanitization, and inert code fences. Create behavior tests before implementation. |

## Scope and expected behavior

Phase 5 implementation is limited to the following baseline:

1. Scaffold an Add-on-local React/Vite/TypeScript/Tailwind frontend beneath `downstream/addons/feishu/frontend/`, with Add-on-local test support/configuration only if the existing configuration cannot run frontend tests coherently.
2. Build a minimal normal web page styled as a natural Pastebin Worker surface: content-width layout, compact header/controls, upstream-aligned light/dark tokens, restrained rounded content surfaces, and no Feishu client simulation.
3. Provide `进行中` (Active) and `归档` (Archive) tabs and render fixture entries appropriate to each view.  Phase 5 does not claim those fixtures are live lifecycle state.
4. Render entry content as GFM and sanitize generated markup.  GFM task markers (`- [ ]`, `- [x]`, `- [X]`) display as semantic checkbox UI; task-like text in fenced code remains literal code.  Sanitization must prevent executable/raw unsafe markup from becoming active DOM.
5. Establish a visibly and semantically distinct **managed** task-checkbox rendering/control baseline for the lifecycle-managed entry task.  It is a UI/rendering baseline only: Phase 5 does not persist a task change, choose a retention action, invoke a Worker mutation, or optimistically alter an entry lifecycle state.  The precise normal-mode completion flow begins in Phase 6.
6. Keep source-of-truth and secret boundaries explicit in frontend types and fixtures: content is illustrative UI data only, browser state contains no password, management URL, upstream authorization, or decrypted credential.

## Data and API boundary decision

**Decision for Phase 5: use typed local fixtures/mocks; do not add a read/list HTTP API.**

The smallest coherent baseline is a renderable, testable frontend shell driven by local fixture data shaped only from the documented public-entry concepts (`id`, `pasteName`, `publicUrl`, `content`, `visibility`, `retentionMode`, `expiresAt`).  This lets Phase 5 validate layout, tab behavior, GFM parsing/sanitization, and managed-control semantics without treating the Phase 3 internal service as a public API or expanding Phase 4's webhook trust boundary.

No fetch to upstream Pastebin is allowed from the browser.  No browser endpoint is invented in this phase, including list/read, content update, completion, restore, or batch routes.  A later phase needing live data must define and review an authenticated/authorized Add-on read contract, its scope resolution, sanitised error policy, pagination/list semantics, and loading/failure behavior before replacing fixtures.  This PLAN does not choose that API design.

## Non-goals

- Phase 6: no single-item completion action chooser, permanent/timed archive mutation, delete mutation, destructive confirmation, or Archive lifecycle list backed by mutations.
- Phase 7: no authoritative expiry capture/countdown, restore, expiration cancellation, or missing/expired reconciliation.
- Phase 8: no Batch Mode UI, selectors, select-all/clear, action bar, or Batch Mode interaction lock.
- Phase 9: no batch backend/API, credential resolution, partial-success handling, retry/idempotency, or batch failure UX.
- Phase 10: no release hardening, end-to-end/release integration work, deployment, production migration, release tag, or release provenance work.
- No change to Phase 3 service behavior, Phase 4 webhook/Queue behavior, D1 schema, Feishu authorization, or upstream generic expiration patch.
- No upstream-owned source/configuration edits, no `upstream-sync` operation, no `goshujin` rewrite, no PR #5 action, and no dependency upgrade unless a later reviewed artifact establishes it as necessary.
- No raw-Markdown-first default view, second authoritative Paste-body database, secret storage in browser fixtures/state, profile/account UI, avatars, dashboard/sidebar chrome, or Feishu-client chrome.

## Risks, unknowns, and STOP conditions

- A real browser list/read API has not been designed.  Fixtures avoid guessing its route, authentication, scope authorization, response/error schema, pagination, or caching.  If live data is required to make the baseline coherent, STOP for a SPEC/owner decision rather than expose `EntryService` or invent a route.
- The precise mapping between arbitrary Markdown tasks and the one entry-level managed lifecycle task must honor `docs/DESIGN.md` §9.  Phase 5 may render non-managed GFM tasks as content, but must not infer that any nested task controls entry lifecycle.  If the UI baseline requires a new mapping model beyond the locked simplest v1 shape, STOP for an owner decision.
- Parser/sanitizer integration must preserve GFM task semantics while resisting unsafe HTML/URLs and keeping code fences inert.  If the repository-locked packages cannot meet that contract without a dependency/security decision, STOP rather than silently add one.
- A local visual approximation can drift from upstream.  Inspect and reuse the upstream style language only through Add-on-local equivalents; do not create coupling that changes upstream ownership or deployment boundaries.
- There is no migration, production deployment, external API change, PR #5 work, `upstream-sync` work, blocking-review disposition, or bot override proposed by this PLAN.  Therefore no continuous-mode STOP condition is currently triggered.

## Proposed implementation approach

1. Define the frontend entry/view-model boundary locally.  Fixture records will be explicitly marked as development data and contain only public-safe fields; they will not emulate a final transport protocol.
2. Add the Add-on-local Vite React entry point, Tailwind stylesheet, and minimal test environment.  Reuse current locked root tooling where it supports isolation; avoid changing upstream package/config files.
3. Implement a small page composition such as `FeishuPage`, header/theme control, `ViewTabs`, entry list/row, `RenderedMarkdown`, and `ManagedTaskCheckbox`.  Names are candidates, not a commitment to a component-per-file architecture.
4. Mirror upstream visual primitives locally: the centered content width, typography, `background`/`foreground`/`default-*` token family, compact tabs, and restrained rounded surfaces.  Verify light/dark behavior without importing upstream components across the ownership boundary.
5. Use a GFM-capable parser and sanitizer as a single rendering pipeline.  Convert task-list output into accessible controls only through parser-aware DOM/renderer handling, never regex replacement.  Explicitly identify the managed task control instead of treating every GFM checkbox as an entry-level lifecycle action.
6. Keep Phase 5 controls non-mutating.  The managed checkbox may demonstrate the rendered/accessible control state, but Phase 6 owns opening the chooser and making any lifecycle/content mutation.
7. Write behavior-first frontend tests before the corresponding scaffold/rendering behavior, then run the Add-on/frontend type, lint, unit, and production-build checks selected in the later TODO.

## Candidate files and components

All paths below are candidates, not authorization to create implementation code from this PLAN:

- `downstream/addons/feishu/frontend/` — Vite entry HTML, React application entry, local stylesheet, fixture/view-model module, and page/components.
- `downstream/addons/feishu/frontend/components/RenderedMarkdown.tsx` and `ManagedTaskCheckbox.tsx` — parser-aware sanitized GFM rendering and managed-control presentation.
- `downstream/addons/feishu/frontend/components/ViewTabs.tsx` and entry list/row components — Active/Archive baseline UI.
- `downstream/addons/feishu/frontend/*.spec.tsx` or `downstream/addons/feishu/tests/frontend/*.spec.tsx` — Testing Library behavior/security rendering tests, depending on the test configuration chosen in SPEC/TODO.
- `downstream/addons/feishu/vite.config.js`, `vitest.config.js`, and `tsconfig.json` — only if narrowly extending Add-on-owned configuration is necessary for the separate frontend build/test target.
- `downstream/addons/feishu/README.md` and/or `downstream/addons/feishu/docs/phase5-frontend.md` — only if implementation introduces durable run/build or visual/rendering documentation that is not already captured in the planning artifacts.

## Validation strategy

The later SPEC/TODO must map each requirement to test-first evidence and exact commands.  Required validation categories are:

- frontend rendering tests for Active/Archive tab selection and fixture isolation from any network/upstream mutation;
- GFM tests for unchecked, lowercase checked, uppercase checked, and nested task rendering;
- negative rendering tests proving fenced-code task syntax stays literal and malicious/raw HTML or event-handler payloads are sanitized/inert;
- accessibility tests for tab labels/selection and an accessible managed checkbox distinguishable from ordinary rendered task content;
- visual/token tests or focused DOM/class assertions for the minimal upstream-aligned light/dark baseline, without asserting a Feishu-client/dashboard layout;
- TypeScript typecheck, relevant lint/format check, frontend production build, and the existing Add-on Worker regression tests to ensure frontend configuration does not regress Phases 3–4;
- clean-worktree/diff review confirming no upstream-owned paths, patch-series artifacts, migrations, or secret-bearing browser data changed.

No patch replay is required for a frontend-only downstream change unless a later change actually touches the patch/release contract.  The implementation PR will still require current CI and a completed AI Review Bot review of its current HEAD before merge.

## Internal consistency review

Reviewed this PLAN against the delegated roadmap and locked contracts:

- **D-004:** specifies React, Vite, TypeScript, and Tailwind, using existing repository tooling where suitable.
- **D-005:** requires an upstream Pastebin Worker-aligned, minimal web page and forbids Feishu client, profile, dashboard, sidebar, avatar, and decorative chrome.
- **D-006:** makes sanitized GFM the normal rendering path and preserves semantic task rendering; no regex task-list implementation is proposed.
- **Ownership:** all proposed implementation is under `downstream/addons/feishu`; upstream `frontend/` is inspection-only and no upstream-owned path on `downstream/main` is in scope.
- **Phase boundaries:** the PLAN limits itself to `IMPLEMENTATION_ORDER.md` Phase 5 and explicitly defers Phase 6 through Phase 10 work.  It preserves the Phase 3/4 server/trust boundaries and the API/secret rules in `API_CONTRACT.md` and `SECURITY.md`.
- **Lifecycle consistency:** it does not make a rendered check imply archive, deletion, retention, or Batch selection; those concepts remain distinct under `RETENTION_LIFECYCLE.md` and `DESIGN.md`.
- **Continuous-mode STOP review:** no unresolved product ambiguity requiring a decision was found for a fixture-only UI baseline; no new API/security/trust boundary, destructive migration, deployment, PR #5, `upstream-sync`, `goshujin` rewrite, bot override, or out-of-roadmap work is proposed.  No STOP condition is triggered.

## References

- `DECISIONS.md` — D-004, D-005, D-006, D-007, D-008, D-017, D-030.
- `docs/IMPLEMENTATION_ORDER.md` — Phase 5.
- `docs/FRONTEND.md`, `docs/DESIGN.md`, `docs/API_CONTRACT.md`, `docs/SECURITY.md`, and `docs/RETENTION_LIFECYCLE.md`.
- `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.1.1, §10.2, and §10.7.
- `docs/planning/phase3-spec.md`, `docs/planning/phase4-spec.md`, `downstream/addons/feishu/docs/phase3-services.md`, and `downstream/addons/feishu/docs/phase4-webhook.md`.

Status: CONTINUOUS-MODE PLAN READY AFTER INTERNAL CONSISTENCY REVIEW

Implementation has NOT started.
