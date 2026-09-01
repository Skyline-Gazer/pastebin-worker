# Change Context, Commit Messages, and AI Review

## 1. Purpose

The repository uses AI-assisted code review. Review quality depends on having enough business context, acceptance criteria, expected behavior, and constraints to decide whether a change is correct.

A task title alone is not sufficient review context.

## 2. Mandatory change context

For every behavioral, architectural, API, lifecycle, security, patch, or deployment change, establish:

1. **Context** — user/business/operational reason.
2. **Expected behavior** — observable rules and before/after behavior.
3. **Acceptance criteria** — testable completion conditions.
4. **Constraints / non-goals** — architecture, security, compatibility, upstream-sync, scope limits.
5. **Validation** — exact checks/tests and results.
6. **Docs** — documents updated or justified N/A.
7. **Refs** — issue/task/decision/patch ID when available.

For an upstream patch also record:

```text
Upstream base: <exact SHA>
Patch ID: <stable id>
Dependencies: <none or explicit prerequisite patch IDs>
```

## 3. Commit body contract

Use Conventional Commit subjects and structured bodies.

Example — Batch Mode:

```text
feat(feishu): add batch selection mode

Context:
- Completing many managed tasks one by one forces the user through the completion dialog repeatedly.
- Batch selection must not change the meaning of Markdown task checkboxes.

Expected behavior:
- Entering Batch Mode shows a separate transient selector beside each rendered task.
- Markdown task checkboxes do not act as batch selectors.
- Selected entries can be permanently archived, expiring-archived, or deleted in one action.
- Partial backend failures are reported per item and failed items remain retryable.

Acceptance criteria:
- [ ] Batch selectors are visually and semantically separate from Markdown checkboxes.
- [ ] Batch API accepts the three supported actions.
- [ ] Partial success returns per-item results.
- [ ] Management passwords never reach the browser.

Constraints:
- Feishu Add-on only; no upstream patch for Batch Mode.
- Keep the page aligned with the minimal upstream Pastebin Worker Web UI.
- No global transaction across multiple Pastebin mutations.

Validation:
- <exact frontend tests>
- <exact Worker tests>

Docs:
- docs/DESIGN.md
- docs/FRONTEND.md
- docs/API_CONTRACT.md
- docs/TESTING.md

Refs:
- <issue/task if available>
```

Example — generic upstream patch:

```text
feat(expiration): support non-expiring pastes

Context:
- Downstream clients need a generic way to keep a Paste without automatic expiry.

Expected behavior:
- Explicit permanent mode creates a Paste without an expiry deadline.
- `e=max` uses the deployment maximum expiration.
- Existing timed behavior remains compatible.

Acceptance criteria:
- [ ] Permanent KV Paste survives without expiration.
- [ ] Permanent R2 object is skipped by expiration cleanup.
- [ ] Timed expiration behavior remains unchanged.
- [ ] Complete exported patch series replays from the declared upstream SHA.

Constraints:
- Generic upstream capability only; no Feishu/archive/checkbox conditionals.
- Release replay fails closed on conflict.

Validation:
- <patch unit/regression tests>
- downstream/scripts/check-patches.sh

Docs:
- docs/PATCH_AND_UPSTREAM.md
- docs/RETENTION_LIFECYCLE.md

Refs:
- <issue/task if available>

Upstream base:
<exact SHA>

Patch ID:
010-non-expiring-paste

Dependencies:
none
```

## 4. Patch branch review vs release promotion

AI/human review happens on the isolated `patch/<id>` development branch.

After approval, export the reviewed commits using `git format-patch`. The exported files are committed to `downstream/main` and listed in `downstream/patches/series`.

A release PR must therefore make both facts reviewable:

- what the patch branch changed and why;
- which exported patch files/order will actually be replayed in releases.

Do not replace this with “merge patch branch X during build”. Moving branch heads are not a release contract.

## 5. Pull-request description contract

Before requesting review, the PR description must include:

- summary;
- business/user context;
- expected behavior/business rules;
- explicit acceptance criteria;
- constraints/non-goals;
- change boundary (Add-on / generic patch / patch promotion / build / upstream sync / docs);
- implementation notes;
- exact validation evidence;
- documentation updated;
- upstream baseline and patch replay result where applicable;
- risk/rollback notes where meaningful;
- issue/task/design references.

For patch-promotion PRs additionally include:

```text
Patch ID
Source patch branch/commit
Upstream base SHA
Dependencies
Exported patch files
Series position/order
Full-series replay result
```

For PRs that adopt an external (upstream/third-party) change, additionally include:

```text
Origin repository
Original PR URL / number
Original author and commit SHA(s)
Upstream PR status when adopted
Adoption date
Reason for carrying downstream
Local changes made after adoption, if any
License / IP compatibility
Attribution / NOTICE requirements
Known risks / limitations
Removal condition
```

Unknown provenance fields MUST be marked `unknown` / `not available`; do not fabricate them, including license status. Do not strip attribution. If license/IP compatibility cannot be established with sufficient confidence, adoption MUST STOP and be escalated to the owner; cross-repository copied/adapted code requires explicit license compatibility verification. Original Git authorship is preserved where possible. Do not submit a ready-for-review PR with meaningful sections empty or merely repeating the title.

## 6. Sparse task handling

If an issue contains only a title or lacks enough information to verify correctness:

1. read `AGENTS.md`, `DECISIONS.md`, and affected docs;
2. extract locked requirements;
3. identify unresolved product ambiguity;
4. do not invent missing rules;
5. obtain owner clarification before implementing ambiguous behavior;
6. record the resolved context in commit/PR text.

A reviewer should be able to answer:

```text
Why is this needed?
What exactly should happen?
How do we know it is complete?
What must not change?
How was it validated?
```

## 7. Atomic history

Prefer coherent commits:

```text
feat(feishu): add archive completion dialog
feat(feishu): add batch selection mode
fix(feishu): retain failed batch selections for retry
feat(expiration): support non-expiring pastes
build(downstream): replay patch series from pinned upstream
```

Avoid:

```text
update
fix
more fixes
changes
try again
```

Do not mix unrelated refactors into a business change.

## 8. Commit template

The package includes `.gitmessage`.

Optional setup:

```bash
git config commit.template .gitmessage
```

AI coding agents must follow the same structure even when the template is not configured locally.

## 9. Mandatory AI Review Bot Phase Review Gate

### 9.1 Scope

The Phase Review Gate applies to EVERY non-trivial change: product development, generic upstream patch development, patch promotion, build/release, security, and governance changes — not only product implementation PRs. Documentation-only typo/cosmetic changes MAY stay outside the full gate only when they are clearly trivial and do not affect governance or process semantics.

Lifecycle for every gate-qualified phase/PR:

```text
define scope + acceptance criteria
        ↓
create dedicated branch
        ↓
TDD / implementation / docs
        ↓
local validation
        ↓
structured commit(s)
        ↓
open PR
        ↓
AI Review Bot completes review of current PR HEAD
        ↓
classify findings
        ↓
actionable findings?
   yes ───────→ fix / test / commit / push
                    ↓
              AI Bot re-reviews new HEAD
                    ↓
              repeat until clean/dispositioned
        ↓
required CI/checks green on current HEAD
        ↓
merge authorization
        ↓
merge
        ↓
refresh target branch
        ↓
start dependent next phase
```

### 9.2 Latest-HEAD rule (mechanical)

Once the AI Review Bot has completed a review, ANY new commit that changes the PR branch HEAD SHA invalidates the previous AI Review Gate and a new completed review of the new HEAD is required. This rule is mechanical: it is based on the HEAD SHA, not on whether the change "looks small".

PR body/comment-only edits that do not change the HEAD SHA do NOT invalidate the code review.

### 9.3 Definition of "AI Review passed"

A PR passes the AI Review Gate only when ALL of the following are true:

1. The configured AI Review Bot actually completed a review.
2. The completed review corresponds to the current/latest PR HEAD SHA, or there is equivalent reliable evidence that the latest code was reviewed.
3. Every actionable finding has been either fixed in code/tests/docs and pushed, or explicitly dispositioned as false-positive / not-applicable / intentionally-deferred with evidence and rationale.
4. ANY commit that changes the PR HEAD SHA after the last completed bot review invalidates the previous gate and requires a new completed review of the new HEAD (mechanical rule, see §9.2).
5. Required CI/status checks for the current HEAD are green.
6. There are no unresolved blocking findings.
7. The PR acceptance criteria and validation evidence are current.

A stale bot review MUST NOT authorize merge. "The bot posted no comments" is NOT a definition of passed.

### 9.4 Finding disposition

Conceptual categories:

```text
fixed
false_positive
not_applicable
deferred_non_blocking
blocking_unresolved
```

Rules:

- A coding agent MUST NOT blindly implement every bot suggestion.
- Findings MUST be checked against `AGENTS.md`, `DECISIONS.md`, locked product docs, tests, and actual code behavior.
- If a bot suggestion conflicts with an approved architecture/product requirement, do not silently change the requirement to satisfy the bot; document the conflict and escalate to the owner when necessary.
- Merely marking a GitHub conversation "resolved" is not sufficient evidence.
- Blocking findings MUST be fixed or explicitly owner-overridden before merge.
- A blocking/critical finding MUST NOT be dispositioned as false-positive or not-applicable solely by a coding agent. If it will not be fixed, the owner/human must approve that disposition, and the approval MUST be recorded in the PR.
- Non-blocking findings MAY be deferred only with an explicit rationale.
- A coding agent MUST NOT grant itself an override for a blocking finding.
- Where practical, reference the bot finding/comment/review URL or identifier in the fix commit's `Refs:` section.

### 9.5 Fix → push → re-review loop

After actionable findings:

1. fix in the responsible branch;
2. run relevant tests/checks;
3. commit with full review context (§9.11);
4. push;
5. request/rely on the AI Review Bot re-review of the new HEAD;
6. repeat until clean or all findings are dispositioned.

### 9.6 Bot unavailable / failed / quota exhausted

The review gate fails closed. If the AI Review Bot fails to run, times out, has quota/credit exhaustion, loses permissions, returns an infrastructure/workflow error, or does not actually review the latest HEAD, the AI Review Gate is INCOMPLETE. "No bot comments" MUST NOT be interpreted as approval. Do not merge automatically.

### 9.7 Owner override

An owner may explicitly override the unavailable-bot gate (or a blocking finding), but the override MUST be recorded in the PR with at least:

```text
Review override:
Reason:
Approved by:
Reviewed HEAD SHA:
Alternative validation performed:
Known risk:
```

Only the owner/human authority may approve such an override. A coding agent MUST NOT self-authorize it.

### 9.8 Base branch movement and stale review

Before merge:

- required CI/checks MUST be valid for the current PR HEAD;
- if the target branch changed and repository policy requires the PR to be updated, update it safely;
- conflict resolution or any material diff change requires validation again;
- if the PR HEAD changes, AI Review Bot re-review is mandatory;
- if updating the base materially changes the effective diff even without a head change, rerun relevant validation and request re-review when necessary.

Where GitHub merge queue/rulesets are used, checks on the merge candidate remain authoritative for CI. Do not treat an old green run against an obsolete state as current evidence.

### 9.9 Large-phase splitting and concurrency

- Every phase MUST be review-gated before the phase is considered complete.
- A small/coherent phase MAY be implemented as one PR; a large phase SHOULD be split into multiple coherent PRs.
- Every constituent PR MUST independently pass the AI Review Gate before merge.
- A phase is complete only after all phase-scoped PRs are merged, phase acceptance criteria are satisfied, and required tests/integration checks pass.
- Dependent next-phase work MUST NOT start from unmerged phase branches.
- Independent work MAY proceed in parallel only when there is no dependency on an unmerged contract/schema/API, branches remain independent, and the parallel work does not require guessing behavior that is still under review.

### 9.10 Branch refresh after merge

For dependent phases, after the current phase/PR merges:

```text
switch to downstream/main
fetch/pull --ff-only
verify clean/current base
create next phase branch
```

The next dependent phase MUST start from the merged target branch, not from the previous feature branch. Do not stack normal Feishu feature branches merely to save time unless an explicit dependency/workflow exception is documented.

### 9.11 Review-fix commit requirements

Commits that primarily resolve AI Review Bot findings MUST:

- use a meaningful Conventional Commit subject describing the actual defect/change (e.g. `fix(feishu): preserve failed batch selections`), NOT vague subjects such as `fix review`, `bot fixes`, `review changes`, or `more fixes`;
- explain the finding in `Context`;
- explain corrected behavior in `Expected behavior`;
- include exact tests/checks actually run in `Validation`;
- reference the PR review finding/comment in `Refs` when possible.

Do not claim a bot finding was resolved unless the implementation/validation actually addresses it.

### 9.12 Merge history traceability

This document does not mandate one specific GitHub merge strategy. Whatever strategy is used, the resulting history MUST retain enough context to trace the merged change back to its reviewed PR and purpose:

- if squash merge is used, the squash subject SHOULD remain a meaningful Conventional Commit subject, the squash message SHOULD retain/refer to relevant PR/change context, and the PR number/reference MUST remain traceable;
- review context must not disappear into a generic merge message.

### 9.13 Review-only source patch PR

A generic upstream patch's source branch MUST NOT be merged into `upstream-sync`, and its review PR is a REVIEW-ONLY PR. Details: `docs/PATCH_AND_UPSTREAM.md` §14. The PR title/body MUST state `REVIEW ONLY — DO NOT MERGE INTO upstream-sync`.

### 9.14 Patch promotion PR

The exported patch promotion PR into `downstream/main` receives its own independent AI Review Gate (artifact, provenance, series order, replay result). Details: `docs/PATCH_AND_UPSTREAM.md` §14. The patch phase is not complete until the promotion PR is merged.

### 9.15 External/untrusted PR review security

AI-review/CI workflows MUST NOT execute untrusted external code with privileged repository secrets merely to review an external PR. Do not weaken GitHub/CI security boundaries to make the AI Review Bot run. If review automation requires elevated credentials, ensure the workflow does not expose them to untrusted PR code. This section documents the principle; CI implementation changes are out of scope here.

## 10. Development workflow artifacts (PLAN/SPEC/PHASE/TODO)

This section defines the mandatory planning and TDD workflow that precedes the Phase Review Gate (§9). §9 remains the merge gate; this section defines its required inputs.

### 10.1 Mandatory interaction sequence

For every non-trivial development request, the interaction order is fixed:

```text
STEP 1  Repository inspection → output PLAN → STOP for owner approval
STEP 2  After PLAN approval → output SPEC → STOP for owner approval
STEP 3  After SPEC approval → output PHASES + per-phase acceptance
        criteria + TODOs for Phase 1 → STOP for owner approval
STEP 4  After execution approval → implement Phase 1 using TDD → open PR
        → AI Review Bot Phase Review Gate → merge only after gate passes
STEP 5  Refresh downstream/main → TODOs for next Phase → implement using
        TDD → repeat the review gate
STEP N  Final integration/release validation → Final Report → STOP
```

Implementation MUST NOT start before the planning artifacts are produced and approved. Owner approval MUST be explicit: silence, timeout, or lack of objection MUST NOT be interpreted as approval.

### 10.2 PLAN requirements

The first substantive output for a new development request is an execution PLAN. Do NOT edit files, create branches, or write production code yet. The PLAN MUST contain:

- **Objective** — exactly what will be delivered.
- **Context** — why the change is needed; relevant existing behavior; which ownership boundary it belongs to.
- **Assumptions** — each assumption that can be verified from the repository MUST include a verification method; do not silently promote assumptions into facts.
- **Non-goals** — what will NOT be changed.
- **Risks / unknowns** — technical, migration, compatibility, security, upstream-sync risks; unresolved owner decisions.
- **Proposed implementation approach** — specific enough that the owner can reject a wrong design before code exists; no vague "implement feature / update tests" phrasing.
- **Expected files/components** — candidate locations, labeled as candidates; never force meaningless changes to match a file list.
- **Validation strategy** — which unit/integration/contract/regression/type/build/patch-replay/security checks will be required.

End with:

```text
Status: PLAN READY FOR OWNER REVIEW
Implementation has NOT started.
```

### 10.3 SPEC requirements

After the PLAN is approved, produce the SPEC as the behavioral contract. It MUST include:

- **3.1 Problem statement** — problem from the user/system perspective.
- **3.2 Goals** — concrete desired outcomes.
- **3.3 Non-goals** — scope boundaries.
- **3.4 Current behavior** — based on actual repository inspection.
- **3.5 Desired behavior** — externally observable behavior with explicit rules; precise state transitions where they exist.
- **3.6 User/API flows** — step-by-step; for APIs: route, method, request, response, validation, errors, authorization/security, idempotency, partial failure semantics.
- **3.7 Data/state model** — interfaces, fields, storage keys, enum/state transitions, retention/lifecycle; do not invent a second source of truth if architecture forbids it.
- **3.8 Security and trust boundaries** — secrets, browser/server boundary, authentication/authorization, logging restrictions, webhook/untrusted input, external code trust.
- **3.9 Compatibility** — backward/upstream compatibility, data migration, version assumptions, fallback behavior.
- **3.10 Failure behavior** — network/upstream/partial failure, retries, duplicate requests, inconsistent state, missing/expired/deleted records.
- **3.11 Acceptance criteria** — every requirement testable, expressed as checkable statements (never "code is good" / "UX is better").
- **3.12 Test specification** — map each behavior to unit/integration/regression/negative tests.
- **3.13 Open questions** — unresolved owner decisions stay explicit.

End with:

```text
Status: SPEC READY FOR OWNER REVIEW
Implementation has NOT started.
```

### 10.4 PHASE and TODO breakdown

After the SPEC is approved, break implementation into coherent Phases. A Phase is a reviewable delivery milestone — not artificially large, not so small that trivial helpers become their own PR. Each Phase MUST include: Goal, Scope, Dependencies, Inputs, Deliverables, Acceptance criteria, Tests required, Expected branch type (`feat/*`, `fix/*`, `patch/*`, `docs/*`, `build/*` etc.), Expected PR target, Risks, Exit criteria.

Phase dependency rule: a dependent Phase MUST NOT begin from an unmerged Phase branch. After the prior Phase merges: refresh target branch → verify clean/current state → create the new Phase branch. Independent phases MAY proceed in parallel only if they do not depend on an unmerged API/schema/contract/state model/shared component/architectural decision; do not guess against work still under review.

For each approved Phase, produce an implementation-sized, verifiable TODO list before coding (avoid vague "do backend" / "finish frontend" items).

### 10.5 SPEC change control

Once a SPEC is owner-approved, implementation MUST NOT silently change:

- externally observable behavior;
- API contracts;
- state/data model;
- security/trust boundaries;
- acceptance criteria;
- architectural ownership boundary.

If any of these must change:

```text
STOP
→ update SPEC
→ explain the change and reason
→ obtain owner re-approval
→ update affected PHASE/TODO artifacts
→ resume only after approval
```

Implementation-detail changes that remain fully within the approved SPEC MAY update TODOs without reopening the behavioral specification. A coding agent MUST NOT self-approve a changed SPEC.

### 10.6 TODO drift / change control

Implementation-detail TODOs MAY be added/reordered/refined without reopening the SPEC when they remain fully inside the approved behavior and acceptance criteria; such TODO changes MUST remain traceable and state the reason when meaningful.

If a TODO change would alter scope, externally observable behavior, API contract, state/data model, security/trust boundary, architecture ownership, or acceptance criteria, it is NOT merely a TODO update — it triggers the §10.5 SPEC change-control process (STOP → update SPEC → explain drift → owner re-approval → update Phase/TODO → resume). The coding agent cannot self-approve this change.

### 10.7 Artifact traceability

Approved PLAN, SPEC, Phase decomposition, and the active Phase TODO MUST NOT exist only in transient AI conversation context. They MUST have durable, reviewable references accessible to later commits, PRs, the owner, and the AI Review Bot. Permitted locations include:

- tracked repository documentation;
- GitHub Issue/task;
- PR body/checklist;
- another durable owner-approved project artifact.

Architecture/product/API/security specifications SHOULD use tracked repository docs when practical. Do not require unnecessary new files for genuinely trivial changes, but never rely only on ephemeral conversation context. Commit and PR `Refs:` MUST point to the applicable approved artifacts. Owner approval MUST be explicit.

**Durable-artifact persistence checkpoint.** Owner approval alone is not sufficient if the approved artifact remains only in transient conversation context. Before advancing to the next workflow stage, the approved artifact MUST be persisted to a durable, reviewable location (see the permitted locations above):

```text
PLAN approved
→ persist approved PLAN
→ SPEC

SPEC approved
→ persist approved SPEC
→ PHASE/TODO

PHASE/TODO approved
→ persist/update durable artifact
→ implementation
```

A PR body/checklist MAY serve as the durable source only when that PR/draft/planning artifact already existed before implementation. A normal implementation PR opened after coding MUST NOT retroactively serve as the sole proof that required pre-implementation planning existed.

Planning-artifact exemption is limited to: (a) genuinely trivial changes outside the non-trivial workflow, or (b) the explicitly documented one-time governance bootstrap exception. TDD/test-first exceptions apply only to TDD evidence and do NOT exempt planning artifacts.

### 10.8 Bootstrap exception

This governance change predates the newly enforced durable PLAN/SPEC/PHASE/TODO artifact workflow. Its owner-approved planning context is accepted as the bootstrap source. The new workflow applies prospectively after this policy PR merges. This exception is limited to this governance-bootstrap change and MUST NOT become a general bypass.

### 10.9 TDD evidence

RED→GREEN→REFACTOR→REGRESSION evidence requirements (including valid test-first exceptions) are specified in detail in `docs/TESTING.md`. This section does not duplicate them. Behavioral changes MUST record TDD evidence; valid exceptions MUST state why RED is not applicable plus the alternative verification performed.

### 10.10 Relationship to the Phase Review Gate

- The Phase Review Gate (§9) is the merge gate; this §10 defines its required planning inputs.
- The approved SPEC is the baseline for §9.3 condition 7 ("acceptance criteria and validation evidence are current").
- PR traceability (§9.12) SHOULD reference the planning artifacts named in §10.7.
