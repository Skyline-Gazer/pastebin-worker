# pastebin-worker Feishu Add-on — Downstream Documentation Pack

This package is the engineering specification/scaffold for a downstream fork of `SharzyL/pastebin-worker` with an isolated Feishu Add-on.

The upstream application remains a Pastebin. Feishu is an independent Add-on/client that uses upstream HTTP APIs and the password-based update model. The Add-on Web page follows the upstream Pastebin Worker visual language rather than imitating the Feishu client.

The maintenance/release model is:

```text
patch development: dedicated patch/<id> branches
        ↓
review + tests
        ↓
git format-patch export
        ↓
ordered downstream/patches/series
        ↓
release: exact upstream SHA + exported patch series
```

The Feishu Add-on is built separately from the exact downstream release commit/tag. There is no manually maintained long-lived deploy/integration branch.

## Read order

1. `AGENTS.md` — mandatory AI coding-agent rules.
2. `DECISIONS.md` — locked decisions.
3. `docs/INDEX.md` — documentation map and operational scaffold.
4. `docs/DESIGN.md` — product interaction, Archive and Batch Mode behavior.
5. `docs/ARCHITECTURE.md` — upstream/downstream/runtime boundaries.
6. `docs/FEISHU_ADDON.md` — Add-on responsibilities.
7. `docs/FRONTEND.md` — React UI implementation and upstream-style constraints.
8. `docs/RETENTION_LIFECYCLE.md` — Active/Archive/Delete state machine.
9. `docs/API_CONTRACT.md` — single and batch API contracts.
10. `docs/PATCH_AND_UPSTREAM.md` — patch development, export, ordered series, upstream sync.
11. `docs/SECURITY.md` — password and trust-boundary rules.
12. `docs/TESTING.md` — mandatory tests and release gates.
13. `docs/BUILD_DEPLOY.md` — pinned release assembly and deployment.
14. `docs/REPO_AND_GIT.md` — branch, commit, patch-promotion and release workflow.
15. `docs/CHANGE_CONTEXT_AND_REVIEW.md` — mandatory business context, acceptance criteria, commit log/body and AI-review requirements.
16. `docs/IMPLEMENTATION_ORDER.md` — recommended TDD implementation order.

## Included maintenance helpers

- `.gitmessage` — structured commit-body template.
- `.github/PULL_REQUEST_TEMPLATE.md` — review-ready PR template.
- `downstream/release.example.json` — exact-upstream release manifest template.
- `downstream/patches/series` — explicit patch replay order.
- `downstream/scripts/export-patch.sh` — export reviewed patch branch commits.
- `downstream/scripts/check-patches.sh` — clean sequential replay validation.
- `downstream/scripts/build-downstream.sh` — create disposable patched-upstream assembly plus provenance.

The `downstream/` tree is a scaffold/policy layout, not a completed Feishu implementation or a pre-generated upstream patch.
