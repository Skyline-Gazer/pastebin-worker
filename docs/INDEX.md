# Documentation Index

- [`../AGENTS.md`](../AGENTS.md) — mandatory AI-agent constraints and branch/patch/release rules.
- [`../DECISIONS.md`](../DECISIONS.md) — locked project decisions.
- [`DESIGN.md`](DESIGN.md) — product UX, single completion, Archive, Batch Mode.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — runtime/data boundaries.
- [`MESSAGING_ADDON.md`](MESSAGING_ADDON.md) — complete messaging add-on responsibilities (Feishu/Lark providers).
- [`FRONTEND.md`](FRONTEND.md) — React/Tailwind implementation and upstream-style UI rules.
- [`RETENTION_LIFECYCLE.md`](RETENTION_LIFECYCLE.md) — Active/Archive/Delete transitions and countdown.
- [`API_CONTRACT.md`](API_CONTRACT.md) — browser/Add-on/upstream single and batch contracts.
- [`PATCH_AND_UPSTREAM.md`](PATCH_AND_UPSTREAM.md) — curated adoption of external changes, dedicated patch branches, export, ordered series, upstream synchronization.
- [`SECURITY.md`](SECURITY.md) — secrets and browser/webhook trust boundaries.
- [`TESTING.md`](TESTING.md) — test matrix, TDD evidence record, patch replay, and CI gates.
- [`BUILD_DEPLOY.md`](BUILD_DEPLOY.md) — pinned release inputs, ephemeral assembly, tip vs assembled Worker (`e=never`/`e=max`), and `deploy.yml` `goshujin` trigger.
- [`REPO_AND_GIT.md`](REPO_AND_GIT.md) — branch roles, patch promotion, release refs, commit/PR workflow.
- [`CHANGE_CONTEXT_AND_REVIEW.md`](CHANGE_CONTEXT_AND_REVIEW.md) — business context, acceptance criteria, commit-body and AI-review requirements; canonical home of the mandatory Phase Review Gate and the PLAN/SPEC/PHASE/TODO development workflow.
- [`IMPLEMENTATION_ORDER.md`](IMPLEMENTATION_ORDER.md) — TDD-oriented implementation order.
- [`planning/m3-feishu-production.md`](planning/m3-feishu-production.md) — M3 Feishu production wiring PLAN/SPEC.
- [`planning/m3-platform-endpoints.md`](planning/m3-platform-endpoints.md) — Feishu/Lark `PLATFORM` endpoint selection (historical single-provider design).
- [`planning/ft-defect-remediation.md`](planning/ft-defect-remediation.md) — Umbrella: FT remediation before lifecycle function testing ([#132](https://github.com/Skyline-Gazer/pastebin-worker/issues/132)).
- [`planning/ft-defect-01-plan.md`](planning/ft-defect-01-plan.md) / [`ft-defect-01-spec.md`](planning/ft-defect-01-spec.md) — FT-DEFECT-01 Pastebin upload/download path ([#133](https://github.com/Skyline-Gazer/pastebin-worker/issues/133)).
- [`planning/ft-defect-03-plan.md`](planning/ft-defect-03-plan.md) / [`ft-defect-03-spec.md`](planning/ft-defect-03-spec.md) — FT-DEFECT-03 simultaneous Feishu + Lark identity/auth ([#134](https://github.com/Skyline-Gazer/pastebin-worker/issues/134)).
- [`planning/provider-neutral-messaging-plan.md`](planning/provider-neutral-messaging-plan.md) / [`provider-neutral-messaging-spec.md`](planning/provider-neutral-messaging-spec.md) / [`provider-neutral-messaging-todo.md`](planning/provider-neutral-messaging-todo.md) — provider-neutral messaging architecture ([#146](https://github.com/Skyline-Gazer/pastebin-worker/issues/146)).
- [`planning/ft-04-plan.md`](planning/ft-04-plan.md) / [`ft-04-spec.md`](planning/ft-04-spec.md) — FT-04 PLAN/SPEC: new Feishu P2P create ([#149](https://github.com/Skyline-Gazer/pastebin-worker/issues/149)).
- [`planning/ft-07-plan.md`](planning/ft-07-plan.md) / [`ft-07-spec.md`](planning/ft-07-spec.md) — FT-07 PLAN/SPEC: restore permanent archive ([#162](https://github.com/Skyline-Gazer/pastebin-worker/issues/162)).
- [`planning/evidence/ft-07-restore-pass.md`](planning/evidence/ft-07-restore-pass.md) — FT-07 functional PASS evidence + FT-08 handoff baseline.
- [`planning/restore-ordering-telemetry-plan.md`](planning/restore-ordering-telemetry-plan.md) / [`restore-ordering-telemetry-spec.md`](planning/restore-ordering-telemetry-spec.md) — post-deploy `RESTORE_STAGE` observability debt (does **not** re-verify historical FT-07 ordering).
- [`planning/ft04-markdown-inbound-plan.md`](planning/ft04-markdown-inbound-plan.md) — #151 PLAN: Markdown-first inbound (native code block + webhook disposition).
- [`planning/ft-08-plan.md`](planning/ft-08-plan.md) / [`ft-08-spec.md`](planning/ft-08-spec.md) / [`ft-08-todo.md`](planning/ft-08-todo.md) — FT-08 PLAN/SPEC/TODO: timed archive + countdown (approved; `FT08_FUNCTIONAL_RESULT=PASS`).
- [`planning/evidence/ft-08-timed-archive-pass.md`](planning/evidence/ft-08-timed-archive-pass.md) — FT-08 functional PASS evidence + FT-09 handoff baseline.
- [`planning/ft-09-plan.md`](planning/ft-09-plan.md) / [`ft-09-spec.md`](planning/ft-09-spec.md) / [`ft-09-todo.md`](planning/ft-09-todo.md) — FT-09 PLAN/SPEC/TODO: restore timed archive / cancel expiry ([#168](https://github.com/Skyline-Gazer/pastebin-worker/issues/168); planning only).

## Operational scaffold

- `downstream/release.example.json` — release manifest template; copy to `downstream/release.json` and pin an exact upstream SHA.
- `downstream/patches/series` — authoritative patch replay order.
- `downstream/scripts/export-patch.sh` — export a reviewed `patch/<id>` branch with `git format-patch`.
- `downstream/scripts/check-patches.sh` — replay the complete series from a clean pinned upstream worktree.
- `downstream/scripts/build-downstream.sh` — assemble a disposable patched-upstream worktree and release provenance.

## Documentation policy

Any code change that alters product behavior, architecture, UI semantics, lifecycle, API behavior, security, patch semantics, Git/release workflow, or deployment MUST update the corresponding docs in the same PR.
