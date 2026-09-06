# Testing and CI Requirements

## 1. Philosophy

Behavior changes follow RED -> GREEN -> REFACTOR -> REGRESSION where practical. Tests protect Feishu lifecycle semantics, patch isolation, and release reproducibility.

### 1.1 Mandatory TDD evidence

For behavioral changes, the development record / PR validation MUST include at least:

```text
RED:
- test/case name
- exact command
- expected failing reason
- observed failure confirming the missing behavior

GREEN:
- targeted command
- actual passing result

REFACTOR:
- relevant tests remained green

REGRESSION:
- broader relevant suite/checks
- actual result
```

Concise evidence is sufficient; do not commit giant raw logs. The coding agent MUST NOT claim RED/GREEN evidence that was not actually observed.

### 1.2 Test-first exceptions

For changes where a strict failing-test-first cycle is not meaningful — documentation-only edits, formatting-only changes, comments, purely mechanical metadata, or certain build/configuration changes that cannot be exercised through an existing test harness — record:

```text
TDD: N/A
Reason: <why RED is not applicable>
Alternative verification: <what was actually performed instead>
```

Configuration changes that affect behavior SHOULD still get executable validation whenever practical.

This is the canonical TDD-evidence specification. `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.9 references it rather than duplicating it.

Release rollback rehearsal coverage is local-only: it must select an existing
tag, use its committed inputs, replay cleanly, check both targets, compare safe
provenance, and report `DEPLOY_CLAIM=no`. The first-release fixture exception
and mandatory next-cycle real-tag rehearsal are documented in
[`BUILD_DEPLOY.md`](BUILD_DEPLOY.md#9-rollback).

## 2. Markdown tests

Required:

<!-- prettier-ignore -->
```markdown
- [ ] unchecked
- [x] checked
- [X] uppercase checked
```

Assert semantic checkbox DOM, not just text.

Also test nested tasks, GFM tables, links/emphasis, fenced code containing `- [ ]`, and HTML sanitization.

## 3. Visual/structure tests

Protect critical layout semantics rather than exact pixels:

- `进行中 / 归档` available;
- no required avatar/profile/sidebar UI;
- Batch control is compact and separate;
- light/dark behavior follows upstream-aligned tokens where implemented.

## 4. Single completion tests

- unchecked task opens action chooser before mutation;
- Cancel sends no mutation;
- permanent archive sends `archive_permanent`;
- expiring archive sends `archive_expiring`;
- delete requires destructive confirmation;
- delete success removes entry from Active and Archive;
- failure does not falsely show final state.

## 5. Archive/countdown tests

- permanent Archive entry has no countdown;
- timed Archive entry uses backend `expiresAt`;
- countdown never invents its own deadline;
- expired deadline produces reconciliation-safe UI;
- restore removes countdown only after backend success.

Use frozen/deterministic time.

## 6. Batch frontend tests

- entering Batch Mode reveals separate BatchSelectors;
- Markdown checkbox and BatchSelector are distinct controls;
- selecting an entry does not change Markdown task state;
- task completion interaction is suppressed/disabled in Batch Mode;
- select all/clear works on the defined visible set;
- action bar count matches selection;
- batch expiring confirmation occurs once;
- batch delete confirmation includes count;
- failed items remain retryable/selected.

## 7. Batch backend tests

For `archive_permanent`, `archive_expiring`, and `delete`, test:

- credentials loaded server-side;
- browser-supplied credential is not accepted as authority;
- correct upstream calls;
- mixed success response counts;
- failed item does not roll back unrelated success;
- sanitized failure codes;
- retry/idempotency behavior where implemented.

## 8. Password/security tests

- creation generates password server-side;
- upstream POST receives password;
- frontend response never contains password/manageUrl;
- logs redact secrets;
- PUT/DELETE are constructed server-side from stored credentials.

## 9. Lifecycle tests

Transitions:

```text
ACTIVE_PERMANENT -> ARCHIVED_PERMANENT
ACTIVE_PERMANENT -> ARCHIVED_EXPIRING
ACTIVE_PERMANENT -> DELETED
ARCHIVED_PERMANENT -> ACTIVE_PERMANENT
ARCHIVED_EXPIRING -> ACTIVE_PERMANENT
```

Delete has no Archive/tombstone state in v1.

## 10. Generic patch tests

- KV `never` create/update;
- R2 `never` create/update;
- permanent metadata;
- cleanup skips permanent;
- `never -> max`;
- `max/timed -> never`;
- ordinary duration expiration unchanged;
- legacy metadata readable;
- metadata API represents no expiration correctly.

## 11. Patch-series compatibility gate

Run:

```bash
downstream/scripts/check-patches.sh
```

The gate must:

- read the exact upstream SHA from `downstream/release.json` or explicit CLI argument;
- read patch order only from `downstream/patches/series`;
- create a clean temporary worktree from that upstream SHA;
- replay patches sequentially with `git am`;
- fail on the first conflict;
- never use automatic three-way conflict resolution;
- clean up the temporary worktree afterward.

Patch incompatibility blocks release/deployment.

## 12. Release/build tests

Required release checks:

- downstream checkout is clean;
- upstream SHA exists and is a commit;
- every series entry exists;
- no unlisted patch is auto-applied;
- complete series replays from the exact base;
- generated integration tree receives no manual changes;
- release provenance includes upstream SHA, downstream SHA/tag, ordered patch list, and patch hashes.

## 13. Integration tests

Mock/local upstream API to validate:

- create binding;
- repeated update on same Paste URL;
- archive actions;
- delete;
- batch mixed result;
- authoritative `expiresAt` capture;
- restore;
- upstream missing/expired reconciliation.

## 14. Webhook tests

- valid verification/event;
- invalid verification rejected;
- duplicate event does not duplicate Paste;
- mapping resolves correct binding;
- webhook path never exposes management credential.
