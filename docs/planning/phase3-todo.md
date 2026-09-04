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
