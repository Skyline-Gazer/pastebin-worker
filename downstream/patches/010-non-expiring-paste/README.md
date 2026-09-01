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

No `.patch` file is included in this documentation scaffold because the real patch must be developed and reviewed against the exact upstream baseline selected by the fork, then exported with `git format-patch`.

After export, add every generated patch file to `../series` in explicit replay order.
