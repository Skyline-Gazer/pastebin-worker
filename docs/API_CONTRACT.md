# API Contract

This document defines semantics, not a mandatory exact URL naming scheme. Exact endpoints may change if equivalent contracts are preserved.

## 1. Browser -> Add-on only

The frontend must never directly call password-bearing upstream mutation URLs.

Allowed direction:

```text
Browser -> Feishu Add-on Worker -> Pastebin
```

## 2. Entry shape returned to frontend

Example public shape:

```json
{
  "id": "entry_123",
  "pasteName": "aGrT",
  "publicUrl": "https://paste.example/aGrT",
  "content": "- [ ] test",
  "visibility": "active",
  "retentionMode": "permanent",
  "expiresAt": null
}
```

Never include password/manageUrl.

## 3. Create

Conceptual endpoint:

```http
POST /api/entries
```

Backend:

- generates management password;
- creates Paste with `s=<password>` and `e=never`;
- persists binding;
- returns public state only.

## 4. Ordinary content update

Conceptual:

```http
PUT /api/entries/:id/content
```

Backend loads binding password and updates the same upstream Paste URL.

## 5. Single completion

Conceptual request:

```http
POST /api/entries/:id/complete
Content-Type: application/json
```

```json
{
  "action": "archive_permanent"
}
```

or:

```json
{ "action": "archive_expiring" }
```

or:

```json
{ "action": "delete" }
```

The backend owns any required Markdown source update for the managed task plus lifecycle/upstream mutation.

### Permanent response

```json
{
  "id": "entry_123",
  "visibility": "archived",
  "retentionMode": "permanent",
  "expiresAt": null
}
```

### Expiring response

```json
{
  "id": "entry_123",
  "visibility": "archived",
  "retentionMode": "timed",
  "expiresAt": "2026-11-30T06:00:00.000Z"
}
```

### Delete response

May be `204 No Content` or equivalent success payload. After success the entry must no longer appear in Active/Archive.

## 6. Restore

Conceptual:

```http
POST /api/entries/:id/restore
```

Backend:

- if timed, cancels expiration (`e=never`);
- restores managed task source state;
- sets Active/permanent;
- returns `expiresAt: null`.

## 7. Batch action

Conceptual:

```http
POST /api/batch
Content-Type: application/json
```

```json
{
  "ids": ["entry_a", "entry_b", "entry_c"],
  "action": "archive_expiring"
}
```

Allowed actions:

```text
archive_permanent
archive_expiring
delete
```

Frontend sends only Add-on entry IDs. It does not send management passwords or management URLs.

## 8. Batch response and partial success

Example:

```json
{
  "requested": 3,
  "succeeded": 2,
  "failed": 1,
  "results": [
    {
      "id": "entry_a",
      "status": "ok",
      "state": {
        "visibility": "archived",
        "retentionMode": "timed",
        "expiresAt": "2026-11-30T06:00:00.000Z"
      }
    },
    {
      "id": "entry_b",
      "status": "ok",
      "state": {
        "visibility": "archived",
        "retentionMode": "timed",
        "expiresAt": "2026-11-30T06:00:02.000Z"
      }
    },
    {
      "id": "entry_c",
      "status": "failed",
      "code": "UPSTREAM_UPDATE_FAILED",
      "retryable": true
    }
  ]
}
```

Do not return secret-bearing upstream error details.

HTTP status may remain 200/207-like for a processed batch with mixed outcomes; exact status policy must be documented and tested. The JSON result is authoritative for per-item outcome.

## 9. Batch idempotency

Because clients can retry, batch operations should be safe against accidental duplicate requests where practical.

Potential mechanisms:

- request id/idempotency key;
- recognizing an entry already in requested final state;
- treating already-deleted/missing content with a documented reconciliation rule.

Do not perform a second destructive delete just because the same UI request was retried.

## 10. Pagination/selection boundary

If Active/Archive lists become paginated, `全选` must be defined clearly as either:

- select visible/current-page entries only; or
- select all matching server-side entries via an explicit server-side selection contract.

v1 SHOULD use visible/current-loaded selection to keep behavior simple.

## 11. Upstream APIs

Add-on server-side client uses upstream POST/GET/PUT/DELETE and metadata endpoints.

Passwords must never cross into frontend response schemas.
