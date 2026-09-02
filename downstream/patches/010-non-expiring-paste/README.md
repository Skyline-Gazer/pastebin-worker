# 010 — Non-expiring Paste capability

Purpose: provide generic upstream retention controls required by downstream clients without adding Feishu-specific logic.

Stable Patch ID:

```text
010-non-expiring-paste
```

Development branch:

```text
patch/non-expiring-paste
```

Target semantics:

```text
e=never -> no automatic expiry
e=max   -> deployment MAX_EXPIRATION
```

Required coverage:

- KV permanent create/update;
- R2 permanent create/update;
- metadata representation;
- expiration cleanup skips permanent objects;
- `never -> timed/max` transition;
- `timed/max -> never` transition;
- backward compatibility for existing timed Paste behavior.

Dependencies:

```text
none initially
```

Pinned upstream base:

```text
0835cac4ab8f974035d31845f5c2b93b0c85b5c6
```

Reviewed Stage A source HEAD:

```text
e10e06fffacdcec43f2a2e271e63dbd075d757ed
```

Source commits and exported files, in replay order:

1. `adb0fa71b2c4dfc7fc05c7debadb146282341ab3` → `0001-feat-expiration-support-non-expiring-pastes.patch`
2. `f579eea03f6d1e1717eae35870f485f8a2e0332e` → `0002-test-r2-use-deterministic-cleanup-payload.patch`
3. `e10e06fffacdcec43f2a2e271e63dbd075d757ed` → `0003-style-apply-required-prettier-formatting.patch`

Generation command:

```text
downstream/scripts/export-patch.sh 0835cac4ab8f974035d31845f5c2b93b0c85b5c6 patch/non-expiring-paste 010-non-expiring-paste
```

Source PR: [#5](https://github.com/Skyline-Gazer/pastebin-worker/pull/5) (Stage A review-only, OPEN / UNMERGED).
Spec: [Issue #3](https://github.com/Skyline-Gazer/pastebin-worker/issues/3).
Phase/TODO: [Issue #4](https://github.com/Skyline-Gazer/pastebin-worker/issues/4).

Ownership/provenance: downstream-authored generic upstream-source change, self-authored; no third-party provenance or Feishu-specific material applies. License/IP disposition: N/A beyond the repository license; dependencies: none.

Canonical replay result: PASS via `$(brew --prefix bash)/bin/bash downstream/scripts/check-patches.sh 0835cac4ab8f974035d31845f5c2b93b0c85b5c6`, applying the three series entries sequentially with `git am`.

Assembled HEAD: `e10e06fffacdcec43f2a2e271e63dbd075d757ed`.
Reviewed source tree: `f9f6aad4245b79bf9d4a8e79831ae9fd87ffdc25`.
Assembled replay tree: `f9f6aad4245b79bf9d4a8e79831ae9fd87ffdc25`.
Tree correspondence: PASS (exact identity).

Independent disposable assembled-source validation: `pnpm install --frozen-lockfile`, `pnpm build:frontend` (required SSR manifest prerequisite), `pnpm prettier -c .`, `pnpm lint`, `pnpm typecheck`, `pnpm exec vitest run` (21 files / 161 tests), and `pnpm build` — all PASS under Node 22 / pnpm 10.
