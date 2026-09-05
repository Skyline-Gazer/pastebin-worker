# Documentation Index

- [`../AGENTS.md`](../AGENTS.md) — mandatory AI-agent constraints and branch/patch/release rules.
- [`../DECISIONS.md`](../DECISIONS.md) — locked project decisions.
- [`DESIGN.md`](DESIGN.md) — product UX, single completion, Archive, Batch Mode.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — runtime/data boundaries.
- [`FEISHU_ADDON.md`](FEISHU_ADDON.md) — complete Add-on responsibilities.
- [`FRONTEND.md`](FRONTEND.md) — React/Tailwind implementation and upstream-style UI rules.
- [`RETENTION_LIFECYCLE.md`](RETENTION_LIFECYCLE.md) — Active/Archive/Delete transitions and countdown.
- [`API_CONTRACT.md`](API_CONTRACT.md) — browser/Add-on/upstream single and batch contracts.
- [`PATCH_AND_UPSTREAM.md`](PATCH_AND_UPSTREAM.md) — curated adoption of external changes, dedicated patch branches, export, ordered series, upstream synchronization.
- [`SECURITY.md`](SECURITY.md) — secrets and browser/webhook trust boundaries.
- [`TESTING.md`](TESTING.md) — test matrix, TDD evidence record, patch replay, and CI gates.
- [`BUILD_DEPLOY.md`](BUILD_DEPLOY.md) — pinned release inputs, ephemeral assembly, build/deploy model.
- [`REPO_AND_GIT.md`](REPO_AND_GIT.md) — branch roles, patch promotion, release refs, commit/PR workflow.
- [`CHANGE_CONTEXT_AND_REVIEW.md`](CHANGE_CONTEXT_AND_REVIEW.md) — business context, acceptance criteria, commit-body and AI-review requirements; canonical home of the mandatory Phase Review Gate and the PLAN/SPEC/PHASE/TODO development workflow.
- [`IMPLEMENTATION_ORDER.md`](IMPLEMENTATION_ORDER.md) — TDD-oriented implementation order.
- [`DEVELOPMENT_FREEZE.md`](DEVELOPMENT_FREEZE.md) — current frozen project state and resume rules.

## Operational scaffold

- [`job-transfer/README.md`](job-transfer/README.md) — chronological execution and recovery checkpoint archive.

- `downstream/release.example.json` — release manifest template; copy to `downstream/release.json` and pin an exact upstream SHA.
- `downstream/patches/series` — authoritative patch replay order.
- `downstream/scripts/export-patch.sh` — export a reviewed `patch/<id>` branch with `git format-patch`.
- `downstream/scripts/check-patches.sh` — replay the complete series from a clean pinned upstream worktree.
- `downstream/scripts/build-downstream.sh` — assemble a disposable patched-upstream worktree and release provenance.

## Documentation policy

Any code change that alters product behavior, architecture, UI semantics, lifecycle, API behavior, security, patch semantics, Git/release workflow, or deployment MUST update the corresponding docs in the same PR.
