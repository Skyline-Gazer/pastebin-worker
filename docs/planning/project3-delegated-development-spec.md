# Project #3 delegated development governance SPEC

Status: **SPEC READY — internal consistency review PASS**

Parent PLAN: [`project3-delegated-development-plan.md`](project3-delegated-development-plan.md)

## 3.1 Problem statement

Project #3 must be a truthful dynamic work queue for this repository. The
current governance contract only permits routine-pause-free execution inside
historical roadmap Phases 5–10, so it does not define how later queue items
are selected, planned, reviewed, merged, settled, or blocked.

## 3.2 Goals

1. Define `PROJECT_DRIVEN_DELEGATED_EXECUTION` as an explicit owner-authorized
   operating mode.
2. Keep NORMAL OWNER-GATED MODE as a valid alternative.
3. Make Project #3 the dynamic queue, Issues the concrete work units, `/docs`
   the durable contract layer, PRs the delivery units, Actions deterministic
   validation, and evidence docs the durable settlement record.
4. Continue automatically across independent Ready items after a different
   item reaches a hard owner gate.

## 3.3 Non-goals

- Changing product behavior, APIs, data models, architecture, trust
  boundaries, release inputs, or upstream source.
- Granting standing authorization for production, provider-console,
  Cloudflare-control-plane, credential, destructive, or irreversible actions.
- Weakening PLAN/SPEC/PHASE/TODO, TDD, branch, CI, AI review, quorum, finding,
  security, or release requirements.

## 3.4 Current behavior

Normal governance requires PLAN → owner approval → SPEC → owner approval →
PHASE/TODO → owner approval → implementation. A historical delegated exception
exists only for Phases 5–10, which are complete. Project #3 had only default
Status values and one completed FT-10 item before this migration.

## 3.5 Desired behavior

When the owner explicitly activates Project-driven delegated mode, the agent
may progress through the following for queue work without routine owner pauses:

```text
Project audit
→ select executable item
→ repository inspection
→ PLAN + internal consistency review
→ SPEC + internal consistency review
→ PHASE/TODO + internal consistency review
→ TDD implementation
→ PR
→ exact-HEAD CI
→ exact-HEAD reviewer settlement/quorum
→ finding fixes and re-review
→ merge
→ durable evidence/docs
→ Issue closure
→ Project item Done
→ refreshed queue audit and next selection
```

Every stage remains fail-closed at its existing technical gate. The mode
changes routine approval ownership, not correctness standards.

## 3.6 Queue and status flow

Project #3 is canonical for dynamic status, phase, type, and priority. Existing
Status values are retained and mapped as follows: Todo = READY/BACKLOG,
In Progress = IN_PROGRESS, In Review = IN_REVIEW, Blocked = BLOCKED, Done =
DONE. Phase is a text field; Work Type is the Type equivalent because GitHub
rejects the reserved custom field name `Type`; Priority is P0–P3.

Selection order is:

1. existing In Progress item with no blocker;
2. Ready item with highest explicit Priority;
3. item unblocking the greatest explicit dependency set;
4. smallest coherent deliverable with clearest acceptance criteria.

Blocked items are never selected. Closed historical work is not recreated.
Project items remain linked to their canonical Issue; duplicate cards are not
created for PRs unless the existing Project convention explicitly requires it.

## 3.7 User/API flows

This governance change has no product user or runtime API flow. The workflow
flow is the queue transition above. A selected Issue enters In Progress; its PR
enters In Review; after merged acceptance and Issue closure its item enters
Done. If a hard owner gate occurs, the item enters Blocked and records the
exact decision required before any gated action.

## 3.8 Data/state model

The canonical state is split by responsibility:

| Surface        | Authority                                            |
| -------------- | ---------------------------------------------------- |
| Project #3     | dynamic queue/status/phase/type/priority             |
| GitHub Issue   | concrete scope, acceptance, blocker, closure         |
| `/docs`        | durable product/technical/governance contracts       |
| Pull request   | reviewable delivery and exact-head evidence          |
| GitHub Actions | deterministic CI result                              |
| Evidence docs  | durable implementation/functional/release settlement |

No new application storage or data migration is introduced.

## 3.9 Security and trust boundaries

Project-driven mode never grants access to credentials or secrets. Production
deployments, lifecycle/D1/queue mutations, Cloudflare or provider-console
changes, credential provisioning/rotation, destructive cleanup, irreversible
migrations, and trust-boundary changes remain hard owner gates. Review/CI must
not execute untrusted PR code with privileged secrets. Kody remains retired;
only Cursor Bugbot, Greptile, and Codex Final Verify participate in the
reviewer pool.

## 3.10 Compatibility

The normal owner-gated mode remains valid. Historical Phase 1–10 descriptions
remain in `docs/IMPLEMENTATION_ORDER.md` for traceability, but they are no
longer the active queue. Existing Project Status values are preserved; only
the explicitly authorized missing options/fields are added. Existing product,
release, and upstream-sync contracts are unchanged.

## 3.11 Failure behavior

- Project read/write unavailable: stop with `PROJECT_WRITE_ACCESS=BLOCKED` if
  queue truth cannot be maintained.
- Ambiguous, blocked, or unavailable production action: mark the item Blocked,
  record `OWNER_GATE_REQUIRED=<exact decision>`, and do not act.
- CI failure: fix within approved scope, push, and rerun current-head checks.
- Reviewer findings within approved SPEC: fix, push, and restart exact-head CI/
  review settlement.
- CRITICAL/BLOCKING finding requiring semantic, architecture, security, or
  owner disposition: Block the item; do not self-override.
- No Ready item: refine only from existing backlog/approved docs; do not invent
  product requirements. Stop only when the queue is empty or globally blocked.

## 3.12 Acceptance criteria

- Both operating modes and explicit owner authorization are documented.
- Project #3 queue responsibilities and status/selection rules are documented.
- Hard owner gates and independent-item continuation are documented.
- Review, CI, TDD, planning persistence, branch isolation, and SPEC change
  control remain mandatory.
- Governance Issue #177, its Project item, and the final PR are traceable.

## 3.13 Test specification

This is a documentation/governance change, so strict RED/GREEN is not
applicable. Validation is structural and operational:

- `git diff --check`;
- `rg` audit proving no active Phases 5–10-only contradiction remains in the
  relevant governance text;
- exact Project #3 field/item read-back;
- required PR CI checks and exact-head reviewer settlement;
- post-merge Issue/Project/main read-back.

## 3.14 Open questions

None for this migration. Future product/API/architecture/security decisions
remain hard owner gates under this SPEC.

```text
PROJECT_DRIVEN_DELEGATED_EXECUTION=OWNER_AUTHORIZED
GOVERNANCE_ISSUE=177
GOVERNANCE_BASE=48b0b0a571a02091b22e849a8cbe20eb49f183aa
IMPLEMENTATION_STARTED=NO
OWNER_GATE_REQUIRED=NO
```
