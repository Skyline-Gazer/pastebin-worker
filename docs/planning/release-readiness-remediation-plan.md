# Release-readiness remediation PLAN

Status: **OWNER APPROVED 2026-09-29 — SPEC PREPARATION ONLY**.

Owner approval applies to this PLAN at exact commit
`6c9c926b390a9070c5a7b01fc9acae35e7277d58`. It authorizes SPEC preparation
only. SPEC approval is required before PHASE/TODO preparation; implementation,
production configuration changes, deployment, tags, publication, merge, and
cleanup remain unauthorized.

## Objective

Repair the downstream release gate, evidence path, and confirmed production-log
configuration gap so a candidate can be
validated from pinned inputs with the documented default commands, produce
durable provenance with a verifiable artifact identity, and rehearse rollback
against the existing immutable production tag. Keep deployment, tag creation,
release publication, destructive work, and cleanup outside this work.

## Audited baseline

- downstream candidate: `e300500d0cba6dd486035d33ed304bb409448bd3`;
- upstream pin: `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`;
- known production tag: `downstream-v2026.09.10.1` at `58bc7dda`;
- prior rollback tag: `downstream-v2026.09.07.1` at `0fc784c2`.

Owner-approved amendment on 2026-09-29: correct the upstream pin above from
`0835cac4ea0952b7d30ade1d80272421a3789b96` to
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`. The replacement resolves in the
official upstream repository; `goshujin` currently points to that exact
commit. The audited candidate and production tag manifests already record the
replacement. This amendment changes the PLAN's documented baseline only; it
does not change release inputs or broaden the original
`SPEC PREPARATION ONLY` approval scope.

The local file `/private/tmp/ft13-release-provenance-e300500.json` still
exists. It is 8,157 bytes and its verified SHA-256 is
`a9a90b685760a3fe996cd6f15693aea915ec8c46746b839e2f6cf1dcb6e0a307`.
It records both targets as passed but has null artifact/deployment IDs and does
not record that command overrides were used. It is diagnostic input, not
durably retained release evidence.

## Confirmed gaps

1. `release-candidate.sh` replays the ordered patches in an ephemeral worktree
   but uses dependencies from the downstream checkout rather than the assembled
   tree's exact lockfile.
2. The default Pastebin check omits the frontend build needed to generate the
   Worker SSR manifest before typecheck/build.
3. The default Add-on check runs from the Add-on directory even though its
   Vite/Vitest paths are repository-root-relative, and it omits frontend
   validation.
4. `.github/workflows/feishu-phase3.yml` replaces both target checks with
   `true`, proving replay while bypassing the documented default gate.
5. Failed target output is deleted with the temporary integration worktree,
   obscuring the failing stage.
6. `release-provenance.sh` cannot distinguish default validation from command
   overrides and reports its default no-op retention hook as `retained`.
7. No workflow retains candidate provenance/checksum, no artifact identity
   exists for `e300500d`, and no GitHub Release carries historical provenance.
8. Current rollback documentation incorrectly says no prior production tag
   exists. The dated Phase 10 statement was once true and must remain historical
   context rather than being rewritten as if it were current.
9. The existing production tag contains the older gate behavior, so real-tag
   rehearsal needs a deterministic compatibility path rather than silently
   applying current untagged code.
10. The 24-hour production audit found two OAuth callbacks whose raw `code` and
    `state` query values were retained in invocation URLs/messages. The live
    deployment reports `observability.redact_query_string=false`, contrary to
    the repository's authorization-code logging prohibition. Cloudflare's
    [current Worker settings contract](https://developers.cloudflare.com/api/resources/workers/subresources/beta/subresources/workers/methods/edit/)
    supports `redact_query_string=true` for logs and traces.

## Ownership

This is downstream release tooling and governance work:

- `downstream/scripts/*`;
- `downstream/tests/*`;
- downstream-only workflow(s) under `.github/workflows`;
- release, testing, and planning documentation.

No upstream-owned dependency manifest, upstream workflow, application source,
or exported patch should change.

## Proposed phases and PR split

### RELEASE-READY.1 — Default candidate gate

One PR will:

- install/use dependencies from the assembled Pastebin worktree's exact
  lockfile;
- generate the Pastebin frontend manifest before Worker checks;
- run complete Pastebin and Add-on Worker/frontend validation from the correct
  repository context;
- preserve exact upstream pin and ordered fail-closed patch replay;
- keep failure evidence visible without retaining the disposable integration
  tree;
- make validation overrides explicitly fixture-only and prevent them from
  certifying a release candidate or provenance record;
- remove `true` overrides from the downstream candidate workflow; and
- add failing-first fixtures and documentation for the default command path.

### RELEASE-READY.2 — Durable evidence and production-tag rollback

After RELEASE-READY.1 is reviewed and merged, a dependent PR will:

- stop treating a no-op retention hook as success;
- add a downstream-only, non-deploying workflow that runs the default gate on
  the exact candidate SHA, generates provenance plus SHA-256, and uploads both
  with fail-closed missing-file behavior and at least 30-day retention;
- expose verifiable workflow run and artifact identity alongside the candidate
  SHA and file hash;
- correct current rollback documentation while preserving dated history;
- add production-tag fixture coverage and the minimum deterministic
  compatibility path for the tag's own pinned source/dependencies;
- produce clearly labeled reconstruction evidence for
  `downstream-v2026.09.10.1`, never claim it is original release-time evidence;
  and
- require production-tag mode, both targets passed, provenance comparison
  passed, first-release exception disabled, and `DEPLOY_CLAIM=no`.

The second phase must branch from refreshed `downstream/main` only after the
first PR merges. The final release-candidate SHA will therefore differ from the
audited `e300500d` baseline.

### RELEASE-READY.3 — OAuth query redaction contract

An independent security PR will:

- set `redact_query_string=true` in the tracked Add-on observability contract;
- require production overlays to preserve query-string redaction;
- add failing-first Wrangler contract coverage and security/deploy docs; and
- stop before deployment. Production verification requires a separate owner
  deployment authorization and valid Cloudflare deployment credentials.

This is a newly evidenced mandatory release gap, not a reconstructed FT-14/15
test. It may be reviewed independently of RELEASE-READY.1/2 after this PLAN's
artifact approvals.

## Acceptance criteria

- The documented default candidate command runs without ad hoc target-command
  overrides and validates both complete build targets.
- Exact pinned upstream/downstream inputs and ordered patch replay remain
  authoritative and fail closed.
- A candidate cannot be called retained until the provenance/checksum artifact
  upload succeeds and its identity is recorded.
- The existing production tag is the rollback baseline; rehearsal is read-only
  and compares clearly labeled provenance.
- Tests record RED/GREEN evidence for each behavioral phase.
- Each PR passes current-HEAD CI, supported reviewer settlement, normal quorum,
  and has no unresolved actionable findings.
- The final release package distinguishes functional acceptance, candidate
  validation, release authorization, deployment, and publication.
- The tracked Add-on configuration requires query-string redaction in logs and
  traces; release readiness remains blocked until an authorized deployment and
  post-deploy read-only check confirm the live setting.

## Non-goals

- No production deployment or lifecycle mutation.
- No tag or GitHub Release creation.
- No merge or reviewer-quorum override.
- No cleanup of local, workflow, artifact, Queue, D1, or production state.
- No FT-14/15 production tests or invented historical requirements.
- No modification of generated integration trees or automatic three-way patch
  resolution.

## Risks and decisions deferred to SPEC

- Dependency installation must be pinned and cache-safe without coupling the
  release result to the caller's existing `node_modules`.
- Failure logs must be useful without exposing secrets or uploading unbounded
  build output.
- GitHub assigns artifact identity after upload; SPEC must define the durable
  manifest/summary relationship without claiming a pre-upload ID.
- Historical-tag compatibility must not rewrite the tag, substitute current
  code silently, or mislabel reconstructed evidence.
- The audit also observed Cloudflare-retained client IP/geolocation/user-agent
  metadata. Its retention/minimization policy needs an explicit owner decision;
  this PLAN does not invent one or conflate it with the concrete OAuth leak.
- Two authorized inventory entries lack historical expected hashes. The owner
  must supply provenance or explicitly exclude them from the retained-fixture
  set before historical integrity can be called complete.
- If the exact default checks require upstream-owned source/dependency changes,
  stop and route those changes through a dedicated upstream patch.

## Validation strategy

- Add fixture assertions before changing each script/workflow behavior.
- Exercise the full default gate with overrides unset on exact committed input.
- Verify both target logs/statuses, provenance bytes/hash, upload retention, and
  artifact identity.
- Rehearse rollback read-only against `downstream-v2026.09.10.1`.
- Run relevant shell fixtures, builds, typechecks, tests, workflow syntax, CI,
  and the exact-HEAD Phase Review Gate.

## Approval boundary

```text
PLAN_APPROVAL=APPROVED_BY_OWNER_2026-09-29
PLAN_APPROVAL_HEAD=6c9c926b390a9070c5a7b01fc9acae35e7277d58
APPROVAL_SCOPE=SPEC_PREPARATION_ONLY
PLAN_BASELINE_AMENDMENT=OWNER_APPROVED_2026-09-29
PLAN_BASELINE_AMENDMENT_SCOPE=DOCUMENTED_UPSTREAM_PIN_ONLY
SPEC_APPROVAL=REQUIRED_NOT_GRANTED
PHASE_TODO_PREPARATION=NOT_AUTHORIZED
IMPLEMENTATION=NOT_AUTHORIZED
PRODUCTION_CONFIGURATION_CHANGE=NOT_AUTHORIZED
DEPLOYMENT_TAG_PUBLICATION_MERGE_CLEANUP=NOT_AUTHORIZED
```
