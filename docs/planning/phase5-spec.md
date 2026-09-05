# Phase 5 — Frontend baseline SPEC

## Authorization and contract status

This SPEC is an in-scope artifact under **Owner Delegated Continuous Execution for roadmap Phases 5–10 (D-030)**. It is derived from the approved [Phase 5 PLAN](phase5-plan.md), and its durable location satisfies the planning-artifact checkpoint in `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.7. Continuous mode removes the routine owner pause for this in-scope artifact progression; it does not authorize work outside Phase 5, silent contract drift, deployment, migration, `upstream-sync`/`goshujin` work, or PR #5 work.

## 3.1 Problem statement

The Feishu Add-on has trusted Worker services and a verified Feishu webhook foundation, but no downstream-owned browser surface for viewing managed Paste content. The first frontend increment must make the intended content-first, Pastebin Worker-aligned presentation and safe GFM rendering testable without implying that a browser can read bindings, call upstream, access credentials, or choose an entry lifecycle action.

## 3.2 Goals

1. Establish an Add-on-local React, Vite, TypeScript, and Tailwind frontend baseline beneath `downstream/addons/feishu/frontend/`.
2. Present a minimal normal web page aligned with the upstream Pastebin Worker visual language required by D-005: centered content width, compact controls, restrained rounded surfaces, and compatible light/dark tokens.
3. Render typed local Active and Archive fixtures through explicit tabs, with no network request or claimed live state.
4. Render sanitized GFM by default, including semantic task UI for lowercase and uppercase checked markers; keep task-like fenced-code text literal.
5. Establish an accessible, visibly distinct `ManagedTaskCheckbox` baseline whose click cannot mutate Markdown, archive, delete, or select a retention action.
6. Keep browser data public-safe: no management password, management URL, upstream authorization, encrypted credential, webhook secret, or raw backend error appears in fixtures, component props, rendered DOM, or browser logs.

## 3.3 Non-goals

Phase 5 does not add a browser read/list API, polling, server-side rendering contract, authentication model, or transport schema. It does not expose Phase 3 `EntryService`, its store, or Phase 4 webhook to the browser.

It does not implement any Phase 6–10 behavior: completion chooser, permanent/timed archive mutation, destructive confirmation, deletion, lifecycle/content updates, live countdown, restore, missing-entry reconciliation, Batch Mode, batch selectors, batch API, partial-result UX, release hardening, deployment, migration, or upstream patch/release work. An Archive fixture may display a static retention label and, for a timed fixture, a display-only value derived from that fixture's authoritative `expiresAt`; it has no restore/action control and no browser-derived expiry deadline.

The page is not a Feishu client simulation, profile surface, enterprise dashboard, avatar panel, decorative sidebar, or second Paste/content database. Raw Markdown source is not a Phase 5 primary view. No upstream-owned source, root dependency manifest/lockfile, existing upstream workflow, patch series, or `upstream-sync` path is changed for this work.

## 3.4 Current behavior

- `downstream/addons/feishu/frontend/` contains only `.gitkeep`; there is no Add-on browser application.
- The Add-on configuration currently builds an internal Worker library from `worker/index.ts`; it does not configure a browser read/list endpoint.
- Phase 3 exposes trusted internal `EntryService` operations and a `PublicEntry` projection. Its current projection is Active/permanent only and has no browser adapter. It must not be treated as an implemented frontend transport model.
- Phase 4 exposes only `POST /api/feishu/events`, an encrypted callback-to-Queue boundary. It is not a browser content-management endpoint.
- `docs/API_CONTRACT.md` describes a future public-safe entry shape and future lifecycle endpoints semantically, but does not create an implemented Phase 5 API.

## 3.5 Desired behavior

### Local fixture model and tabs

Phase 5 uses a frontend-local, typed fixture/view model. It is development presentation data only, not persisted Add-on state, an API response guarantee, or an authoritative Paste-body copy. A fixture may contain only public-safe display fields:

```ts
type FixtureVisibility = "active" | "archived"
type FixtureRetention = "permanent" | "timed"

interface FixtureEntry {
  id: string
  pasteName: string
  publicUrl: string
  content: string
  visibility: FixtureVisibility
  retentionMode: FixtureRetention
  expiresAt: string | null
  managedTask: { state: "unchecked" | "checked" }
}
```

This is intentionally a local presentation model. Future API work must separately specify its route, authorization, schema, pagination, error behavior, and reconciliation before replacing fixtures. `content` is fixture text for rendering tests only and must not be written to an Add-on database.

The page has exactly two primary views: `进行中` (Active) and `归档` (Archive). Active initially shows only fixtures with `visibility: "active"`; Archive initially shows only fixtures with `visibility: "archived"`. Activating a tab changes only local selected-tab UI state and the displayed fixture subset. It performs no request and does not alter a fixture, Markdown, or retention state. Tabs use semantic tab/tablist/tab-panel behavior, expose the selected state, and retain an accessible name.

Archive fixtures have a permanent or timed label. A timed fixture requires a valid ISO `expiresAt`; the display may format that exact fixture value (or a remaining value calculated from it) but must never manufacture an expiry by adding `MAX_EXPIRATION` to browser time. Phase 5 has no timer requirement.

### Markdown and managed control rules

Each fixture body renders through one GFM-capable parser plus sanitization pipeline. The normal view renders GFM, not raw source. `- [ ]`, `- [x]`, and `- [X]`, including nested GFM tasks, render as semantic checkbox UI. Parser-recognized task list semantics—not regular-expression substitution—determine task rendering. Text in fenced code remains a code literal even when it resembles a task marker.

Generated HTML is sanitized before insertion into the DOM. Script-capable elements, event-handler attributes, unsafe URL schemes, and unsafe raw markup must not become executable/active DOM. Sanitization must not turn fenced code into a managed interaction.

`ManagedTaskCheckbox` represents the one entry-level lifecycle-managed top-level task described by `docs/DESIGN.md` §9. It has an explicit accessible label that distinguishes it from ordinary rendered Markdown tasks. Other GFM task boxes are content renderings unless and until a later mapped lifecycle contract says otherwise.

In Phase 5, clicking the managed control is deliberately inert: it may give a no-op accessible notice or be disabled with explanatory text, but it must leave the Markdown source/rendering, fixture record, tab, visibility, retention, and `expiresAt` unchanged. It must not open or preselect a completion/retention action, auto-check a task, call a Worker, send a network request, or act as a Batch selector. Phase 6 alone owns the completion dialog and its three explicit actions.

### Visual and accessibility baseline

The Add-on uses local equivalents of the upstream web UI's content-first layout and token language; it does not import or modify upstream frontend components/styles. It supports a compact, accessible light/dark presentation using local background, foreground, and default-control token families. Controls remain compact and legible at narrow widths.

All interactive controls have programmatic names. Tabs announce selection. The managed control is distinguishable from ordinary task checkboxes without color alone. Static Archive retention text includes words, not color-only meaning. Phase 5 creates no dialogs, so dialog focus behavior is deferred with Phase 6.

## 3.6 User/API flows

### Fixture viewing flow

1. A user opens the local frontend baseline.
2. The application loads bundled typed fixtures only; it makes no fetch/XHR/WebSocket call for entries.
3. Active is selected by default and renders Active fixtures as sanitized GFM.
4. The user selects `归档`; the application changes the selected tab and renders only Archive fixtures with static permanent/timed presentation.
5. Selecting `进行中` returns to the unchanged Active fixture view.

### Managed checkbox baseline flow

1. A user encounters the explicitly labelled managed checkbox.
2. The user clicks/activates it.
3. The component performs no lifecycle or Markdown mutation and no network operation; where feedback is implemented it says that completion actions are unavailable in this baseline.
4. The view remains unchanged.

There is no Phase 5 browser API route, request, response, authorization scheme, retry behavior, idempotency key, or partial-failure semantics. Future flows must use Browser → Add-on Worker → Pastebin only and must preserve the password boundary in `docs/API_CONTRACT.md` and `docs/SECURITY.md`.

## 3.7 Data/state model

The only mutable frontend state is selected tab and any strictly presentational theme state. Fixture records are immutable test/development inputs; clicking a managed control must not update them. The active/archived fixture subset is a derived render result, not lifecycle state.

`managedTask.state` is a fixture rendering cue only. It is not inferred from arbitrary Markdown, is not written back to `content`, and has no effect on `visibility`, `retentionMode`, or `expiresAt`. Permitted fixture combinations are Active/permanent/null expiry and Archived/permanent/null expiry or Archived/timed/non-null ISO expiry. The frontend does not persist full Paste bodies, bindings, credentials, or lifecycle metadata.

## 3.8 Security and trust boundaries

Fixtures, frontend types, test output, browser-visible state, DOM attributes, and console output must exclude management passwords, management URLs, upstream authorization, stored credentials, encryption material, webhook tokens/keys, raw webhook/event data, and unsanitized upstream error details. The frontend never calls upstream mutation URLs and no browser request is added in this phase.

Fixture Markdown is untrusted presentation input. It must pass through parser-aware GFM handling and sanitization before DOM insertion. Tests must cover malicious raw HTML/event-handler and unsafe-link payloads alongside task rendering and fenced-code literals.

## 3.9 Compatibility

The work is downstream-owned and must leave upstream frontend/Worker/shared files, upstream behavior, Patch 010, patch-series replay, and the pinned upstream release contract unchanged. It does not change Phase 3 internal types or Phase 4 webhook request handling. Existing Add-on Worker tests/build behavior remains supported.

The local fixture model is deliberately not promised to match the future public API byte-for-byte. It uses the documented public-safe concepts so a later approved adapter can replace fixtures without exposing secrets or creating a second source of truth. No data migration or compatibility fallback is needed because Phase 5 writes no stored data.

## 3.10 Failure behavior

No entry network request occurs in Phase 5, so network/upstream/retry/partial-mutation failures do not apply. If a fixture is malformed—especially a timed Archive fixture without a valid `expiresAt`—the development build/test path must fail clearly rather than silently invent a deadline. If parser/sanitizer initialization or rendering cannot safely produce sanitized output, the component must not insert unsafe HTML; implementation must surface a safe local rendering failure and retain no raw unsafe markup as active DOM.

Missing/expired/deleted live records, restore failures, duplicate requests, reconciliation, and batch partial success are deferred to their approved later phases rather than simulated as product behavior.

## 3.11 Acceptance criteria

1. The frontend baseline is entirely under `downstream/addons/feishu/frontend/` plus narrowly necessary Add-on-owned configuration/tests/docs; no upstream-owned or patch/release files change.
2. It uses React, Vite, TypeScript, and Tailwind, with a minimal D-005-aligned normal web layout and local light/dark tokens; no Feishu chrome, dashboard, sidebar, avatar, or profile surface appears.
3. Bundled typed fixtures, not a browser API, provide Active and Archive display data; no entry fetch/list route is introduced or requested at runtime.
4. Active and Archive tabs have accessible names and selected states, default to Active, filter fixture visibility correctly, and do not mutate fixtures.
5. Normal content rendering uses sanitized GFM; unchecked, lowercase checked, uppercase checked, and nested task markers produce semantic task UI.
6. Fenced-code task syntax remains literal; malicious raw HTML, event handlers, and unsafe links do not become active/executable DOM.
7. The managed control is visibly and programmatically distinct from ordinary Markdown task content, and activation leaves Markdown, fixture state, tabs, retention, expiry, and UI lifecycle state unchanged; it does not invoke a Worker or choose/open a lifecycle action.
8. Archive fixtures display permanent/timed state; a timed display uses only fixture `expiresAt` and offers no live restore/action path.
9. Browser-visible fixtures, types, DOM, and test assertions contain no credentials, passwords, management URLs, upstream authorization, webhook secrets, or raw secret-bearing errors.
10. Focused frontend tests, typecheck, formatting/lint, frontend production build, and existing Add-on Worker regression checks pass on the implementation PR's current HEAD, with TDD evidence recorded before review.

## 3.12 Test specification

| Behavior                   | Required evidence                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixture-only boundary      | Unit/component test spies on browser transport and proves initial render/tab changes make no request; static review confirms no browser route. |
| Tabs and fixture filtering | Testing Library tests for default Active, selected semantics, Archive switch, and no cross-view fixture leakage/mutation.                      |
| GFM tasks                  | Rendering tests for unchecked, `[x]`, `[X]`, nested tasks, and semantic checkbox output.                                                       |
| Safe Markdown              | Negative tests for fenced task text remaining code and malicious HTML/event-handler/unsafe-link payloads being absent or inert.                |
| Managed control            | Accessible-name/distinction test plus activation test proving no dialog/action, no fixture/Markdown/tab mutation, and no request.              |
| Archive display            | Tests for permanent label and timed label/value sourced from fixture `expiresAt`, with no restore/action control.                              |
| D-005/a11y baseline        | Focused DOM/class/token assertions for compact local light/dark baseline and accessible tab/control names; no dashboard/client chrome markers. |
| Regression                 | Add-on Worker suite, TypeScript, lint/format, and production frontend build after frontend configuration is added.                             |

Behavior implementation must record genuine RED, GREEN, REFACTOR, and REGRESSION evidence in `docs/planning/phase5-todo.md` under `docs/TESTING.md` §1.1. Planning-only work is TDD N/A.

## 3.13 Open questions

No owner decision is unresolved for the fixture-only Phase 5 baseline. If implementation requires a live browser read/list endpoint, a different data model/state transition, a dependency not already locked in the repository, a security/trust-boundary change, or mapping arbitrary nested Markdown tasks to lifecycle behavior, STOP for SPEC change control and owner direction.

## Internal consistency review

Reviewed against the approved PLAN, `AGENTS.md`, D-004 through D-008 and D-030, `IMPLEMENTATION_ORDER.md` Phase 5, `FRONTEND.md` §§4–5 and §12, `DESIGN.md` §§8–10, `API_CONTRACT.md` §§1–2, and `SECURITY.md` §§1–5. The contract preserves Add-on ownership, fixture-only/no-API scope, upstream-aligned visual constraints, GFM/sanitization rules, server-only secrets, and the explicit separation of managed completion from lifecycle and Batch actions. Phase 3/4 remain trusted server boundaries with no browser adapter. No unresolved ambiguity or continuous-mode STOP condition was found.

Status: CONTINUOUS-MODE SPEC READY AFTER INTERNAL CONSISTENCY REVIEW

Implementation has NOT started.
