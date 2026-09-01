# Retention and Lifecycle

## 1. States

The Add-on lifecycle is entry-level:

```text
ACTIVE_PERMANENT
ARCHIVED_PERMANENT
ARCHIVED_EXPIRING
DELETED
```

`DELETED` is terminal and need not be persisted as a tombstone in v1.

## 2. Active

```text
visibility = active
retentionMode = permanent
expiresAt = null
```

Underlying Paste is non-expiring (`e=never`).

## 3. Permanent archive

Single or batch action `archive_permanent`:

```text
ACTIVE_PERMANENT
      |
      v
ARCHIVED_PERMANENT
```

Effects:

- managed task state becomes completed/checked when applicable;
- visibility becomes archived;
- Paste stays `never`;
- `expiresAt = null`;
- Archive shows `永久保留`.

## 4. Expiring archive

Action `archive_expiring`:

```text
ACTIVE_PERMANENT
      |
      v
ARCHIVED_EXPIRING
```

Effects:

- task becomes completed/checked when applicable;
- visibility becomes archived;
- upstream Paste switches to `e=max`;
- authoritative `expiresAt` is stored/read from upstream response/metadata;
- Archive shows countdown.

## 5. Delete

Action `delete`:

```text
ACTIVE_PERMANENT -> DELETED
```

or, if later allowed from Archive:

```text
ARCHIVED_* -> DELETED
```

Effects:

- require destructive confirmation;
- upstream DELETE using server-side password;
- remove binding after success;
- no Archive/Trash visibility in v1.

## 6. Restore

```text
ARCHIVED_PERMANENT -> ACTIVE_PERMANENT
ARCHIVED_EXPIRING  -> ACTIVE_PERMANENT
```

For `ARCHIVED_EXPIRING`, restore must first cancel upstream expiration using `e=never`/equivalent before reporting success.

Effects:

- visibility active;
- retention permanent;
- `expiresAt = null` after successful upstream transition;
- managed task returns to active/unchecked state.

## 7. Countdown

Countdown is display-only derived state:

```text
remaining = expiresAt - current_time
```

`expiresAt` is authoritative. Browser must not calculate the deadline from a duration.

When `remaining <= 0`, UI should treat the item as expired/stale and reconcile with backend/upstream instead of showing negative countdown forever.

## 8. Separation of concepts

These are distinct:

```text
Markdown task state
Add-on visibility
Paste retention
Batch selection
```

Do not infer one solely from another.

Examples:

- checked task does not automatically mean expiring;
- archived does not automatically mean timed;
- BatchSelector checked does not change Markdown;
- deleting is not archiving.

## 9. Failure ordering

For archive transitions:

1. resolve binding/credential;
2. compute deterministic source change if needed;
3. perform upstream mutation;
4. only after upstream success persist final Add-on lifecycle state;
5. return authoritative state.

If local persistence fails after upstream success, mark operation for reconciliation and do not expose secrets in errors.

## 10. Batch lifecycle

Each selected entry transitions independently. A batch is an orchestration container, not a global transaction.

A partial result is valid and must be represented explicitly.
