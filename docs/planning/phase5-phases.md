# Phase 5 — Frontend baseline PHASE decomposition

## Authorization

This decomposition implements only the approved [Phase 5 SPEC](phase5-spec.md) under D-030 Owner Delegated Continuous Execution. It is a set of reviewable increments within roadmap Phase 5, not authorization for Phase 6–10 behavior. Each implementation PR remains subject to current-HEAD CI and the AI Review Bot Phase Review Gate before merge. A later increment starts only from refreshed `downstream/main` after its dependency merges.

## 5A — Local scaffold and visual shell

- **Goal:** Create a buildable/testable Add-on-local React/Vite/TypeScript/Tailwind shell with the minimal D-005 visual baseline.
- **Scope:** Frontend entry/configuration as narrowly necessary, local token stylesheet/theme baseline, compact content-first page shell, and test harness. No entry API, fixtures beyond a minimal harmless shell input, GFM rendering, or lifecycle control behavior.
- **Dependencies:** Merged Phase 4 (`downstream/main`) and approved Phase 5 planning artifacts.
- **Inputs:** Phase 5 SPEC §§3.2, 3.8–3.9; existing Add-on `tsconfig`, Vite/Vitest configuration; locked repository dependencies.
- **Deliverables:** Add-on-local frontend scaffold, local visual primitives, test/build configuration, and documentation only if durable run/build behavior requires it.
- **Acceptance criteria:** React/Vite/TypeScript/Tailwind build locally; visual structure is compact/content-first with local light/dark tokens; no upstream source or root manifest/lockfile changes; no browser transport or secrets.
- **Tests required:** Initial rendering/a11y shell test, focused style/token assertions, typecheck, formatting/lint, production frontend build, and current Add-on Worker regression suite.
- **Expected branch type:** `feat/feishu-frontend-scaffold`.
- **Expected PR target:** `downstream/main`.
- **Risks:** Existing Worker-focused Vite/TS configuration may not support a separate browser target cleanly; resolve only in Add-on-owned configuration. A required root manifest/dependency change is outside this increment and triggers STOP.
- **Exit criteria:** Current-HEAD tests/build/CI pass, review gate passes, and the PR merges. Refresh `downstream/main` before 5B.

## 5B — Fixture tabs, safe GFM, and managed-control baseline

- **Goal:** Render the approved fixture-only Active/Archive experience with sanitized GFM and inert managed checkbox semantics.
- **Scope:** Typed local fixture model, tab filtering, rendered Markdown pipeline, Archive display-only labels, and `ManagedTaskCheckbox`. No live read/list API, mutation, chooser, delete, countdown timer, restore, or Batch Mode.
- **Dependencies:** Merged 5A.
- **Inputs:** Phase 5 SPEC §§3.5–3.8; locked parser/sanitizer packages; local frontend shell from 5A.
- **Deliverables:** Fixture/view-model module, tab/list/rendering components, sanitized GFM behavior, managed-control baseline, and behavior-first tests.
- **Acceptance criteria:** SPEC §3.11 criteria 3–9 pass; code fences remain literal; unsafe markup is inert; managed-control activation has no lifecycle/UI mutation or request; timed Archive display uses fixture `expiresAt` only.
- **Tests required:** Fixture/no-network, tab semantics/filtering, GFM tasks/nesting, fenced-code and malicious-markup negatives, managed-control no-op, Archive display, and accessibility tests; complete relevant regression/build checks.
- **Expected branch type:** `feat/feishu-frontend-rendering`.
- **Expected PR target:** `downstream/main`.
- **Risks:** Parser output may make the managed control indistinguishable from ordinary tasks, or sanitizer behavior may conflict with semantic GFM output. Do not replace parser-aware handling with regex; STOP if locked tooling cannot satisfy both safety and semantics.
- **Exit criteria:** All specified tests and current-HEAD CI pass, review gate passes, and the PR merges. Refresh `downstream/main` before 5C.

## 5C — Baseline hardening and Phase 5 closeout

- **Goal:** Close Phase 5 with focused boundary/security regression coverage and implementation documentation.
- **Scope:** Complete missing negative/a11y/style assertions, validate no secret-bearing fixture/browser data, document frontend-local build/run constraints if introduced, and run the complete Phase 5 verification matrix. No product feature expansion.
- **Dependencies:** Merged 5B.
- **Inputs:** Phase 5 SPEC §§3.8–3.12; implementation and test evidence from 5A/5B.
- **Deliverables:** Hardened tests, concise Add-on-local documentation if needed, completed TDD/regression evidence, and final scope/diff review.
- **Acceptance criteria:** All Phase 5 SPEC acceptance criteria are demonstrably covered; no secrets/API/mutation behavior leaked; no upstream/patch/migration diff; frontend and Worker regressions remain green.
- **Tests required:** Full frontend and Add-on suites, TypeScript, lint/format, production build, and final diff review. Visual/manual review is recorded where automated assertions cannot prove D-005 aesthetics.
- **Expected branch type:** `fix/feishu-frontend-baseline` or `docs/feishu-frontend-baseline` when no code changes are needed.
- **Expected PR target:** `downstream/main`.
- **Risks:** Hardening could expose a requirement that needs Phase 6 behavior. Preserve Phase 5 inertness; STOP rather than adding a lifecycle API/control.
- **Exit criteria:** Phase 5 SPEC criteria are satisfied, TDD evidence is complete, current-HEAD CI and review gate pass, and the PR merges. Only then may Phase 6 planning/implementation begin from refreshed `downstream/main`.

## Internal consistency review

The increments are coherent and ordered: 5B needs the local shell from 5A, and 5C verifies the completed 5A/5B baseline without adding product scope. They honor the no-unmerged-branch dependency rule, remain solely downstream-owned, and defer all Phase 6–10 lifecycle, countdown, batch, and release behavior. No STOP condition is triggered.

Status: CONTINUOUS-MODE PHASE DECOMPOSITION READY AFTER INTERNAL CONSISTENCY REVIEW

Implementation has NOT started.
