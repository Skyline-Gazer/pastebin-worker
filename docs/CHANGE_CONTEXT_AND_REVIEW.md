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

Do not submit a ready-for-review PR with meaningful sections empty or merely repeating the title.

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
