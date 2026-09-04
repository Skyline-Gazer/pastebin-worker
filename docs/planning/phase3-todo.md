# Phase 3 execution TODO

Status: EXECUTION AUTHORIZED. Owner approved the SPEC and explicitly authorized immediate execution of a consistent TODO without another approval checkpoint.

## Delivery milestone

Goal: internal Paste services and durable D1 bindings. Scope and acceptance: [SPEC](phase3-spec.md), criteria 1–8. Dependency: merged Phase 2 at `4524922dd62a4eaa530cad764a3b40b3c392f8f6`. Inputs: pinned Patch 010 API, approved PLAN/SPEC. Deliverables: server-only client/crypto/store/services, additive migration, contract and failure tests, documentation and downstream-only CI. Branch: `codex/phase3-paste-bindings`, target `downstream/main`. No public handler or deployment. Main risks: uncertain cross-system writes and concurrency. Exit: criteria validated, current-HEAD CI/review passed, findings dispositioned and PR merged only with appropriate authority.

## Ordered work

- [x] Inspect branch, clean tracked state and refreshed integration baseline; create independent branch.
- [x] Persist approved SPEC and this authorized TODO before implementation.
- [x] Inspect reviewed Stage A POST/PUT/metadata contract and existing test discovery.
- [x] Write initial contract/security/storage tests before service implementation; record real RED (suite import failure, not an assertion failure).
- [x] Add non-destructive D1 schema with scope/record uniqueness, request identity and mutation claims.
- [x] Implement authenticated credential encryption and keyed input fingerprints.
- [x] Implement trusted-origin, redirect-rejecting Paste client and sanitized errors.
- [x] Implement internal create/read/update/reconcile services with public allowlists.
- [x] Validate concurrent claims, duplicate/conflicting requests and known-success retries.
- [x] Validate uncertain creation, interrupted dispatch, storage failures and reconciliation without blind writes.
- [x] Add independent Add-on typecheck/test/build CI without changing upstream-owned configuration.
- [ ] Update configuration/recovery docs; inspect complete scope/security diff.
- [ ] Commit with full review context, push and open implementation PR.
- [ ] Obtain authoritative GitHub CI and current-HEAD AI review; handle findings without self-override.

## Evidence

Initial inspection: only the existing untracked planning documents were present. Upstream POST uses multipart `c`, `s`, `e`; PUT addresses `/<name>:<password>`, forbids `n`; permanent response has `expireAt: null` and `expirationSeconds: null`; metadata uses `/m/<name>`. Root Vitest and TypeScript include only upstream directories, so Add-on needs explicit downstream-only validation.

RED: `fnm exec --using 22 node node_modules/vitest/vitest.mjs run --config downstream/addons/feishu/vitest.config.js` failed importing the not-yet-created `../worker/store` in `service.spec.ts`. This was a missing-module suite failure, not a behavioral assertion RED. Credential tests were already green at that point; no credential assertion RED is claimed. Earlier sandbox port and compatibility-date failures were infrastructure/configuration failures and are not RED evidence.

GREEN / refinement: the same command passed 3 files / 16 tests. `fnm exec --using 22 node node_modules/typescript/bin/tsc --noEmit -p downstream/addons/feishu/tsconfig.json`, `fnm exec --using 22 node node_modules/eslint/bin/eslint.js downstream/addons/feishu`, and `fnm exec --using 22 node node_modules/vite/bin/vite.js build --config downstream/addons/feishu/vite.config.js` passed using existing Node 22.23.2. pnpm 10.34.5 is available through fnm; no dependency installation was performed. Final current-HEAD GitHub regression/review evidence remains pending.

Implementation refinement: reconciliation observes matching content but never unlocks an uncertain write solely from a read. Unknown create identity remains operator-required as approved. No exactly-once remote execution guarantee is invented.

## Current-HEAD CI triage (initial implementation cf4cb647)

PR #9: <https://github.com/Skyline-Gazer/pastebin-worker/pull/9>. Initial implementation commit: `cf4cb6479a88d44c98a8d286b1b2e9f7750a58c8`.

Feishu run `33855782084`: installation, Prettier and ESLint passed. TypeScript failed with TS2307 for `../../dist/frontend/.vite/ssr-manifest.json` in `worker/handlers/handleRead.ts(11,22)`, `worker/pages/display.ts(8,22)`, `worker/pages/index.ts(5,22)` and `worker/pages/markdown.ts(7,22)`. Vitest/build were skipped, not passing.

Cause: Add-on tsconfig reuses `worker-configuration.d.ts`; its `Cloudflare.GlobalProps.mainModule` imports `./worker/index`, pulling upstream pages into the type graph. The ignored SSR manifest already existed locally but is absent in a clean checkout. This is a Phase-3 workflow prerequisite omission, not a D1 type/API error. Fix: run the existing `pnpm build:frontend` in the new downstream-only workflow before validation. No typechecking relaxation or upstream workflow modification. TDD: N/A for restoring a documented build prerequisite; authoritative validation is the new-HEAD CI run.

PR Tests run `33855781979`: `test` and `coverage-goshujin` passed. `report-coverage` failed at 08:59:11 UTC with `Artifact not found for name: coverage-goshujin`, while the producer completed at 09:00:59 UTC. Inherited `pr.yml` has `report-coverage.needs: test`, not both producer jobs; its content is unchanged by this PR. Classification: baseline workflow dependency race (B). A failed-job rerun after both artifacts exist is sufficient for this specific race; do not modify upstream-owned workflow here.

Kody initial current-HEAD review failed with an external `openai_compatible` execution error; validator parse failure likewise is not approval or an actionable finding. Request fresh review only after the corrected HEAD has suitable authoritative CI. No old-HEAD result approves the corrected commit. Phase 3 remains incomplete; PR #5 stays review-only and Phase 4 has not started.
