# Architecture

## 1. Product boundary

### Upstream-derived Pastebin

Responsibilities:

- create/read/update/delete Paste objects;
- store small Paste content/metadata in Workers KV;
- store large Paste/file content in R2;
- expose upstream HTTP API;
- preserve upstream website and rendering behavior;
- implement generic expiration semantics.

### Feishu Add-on

Responsibilities:

- Feishu webhook/Bot handling;
- independent web frontend aligned visually with upstream Pastebin Worker;
- Feishu-to-Paste bindings;
- server-side Paste management credentials;
- upstream Paste API client;
- rendered Markdown UX;
- Active/Archive state;
- permanent/timed retention decisions;
- batch selection/mutation orchestration;
- countdown display metadata and restore.

## 2. Runtime layout

Recommended separation:

```text
paste.example.com
      |
      v
Patched pastebin-worker Worker
      |- KV
      `- R2

feishu.paste.example.com
      |
      v
Feishu Add-on Worker + static web assets
      |- webhook/API
      |- binding/state persistence
      |- batch orchestration
      `- server-side Paste API client
```

Path-based routing is possible, but independent deployment is preferred unless there is an operational reason to combine them.

## 3. Data ownership

### Upstream owns

- Paste body;
- Paste content metadata;
- Paste expiration deadline;
- storage location;
- raw/public representation.

### Add-on owns

- stable Feishu record key;
- binding to `pasteName`;
- management password;
- `active` vs `archived` visibility;
- `permanent` vs `timed` retention intent;
- authoritative/cached `expiresAt` used for UI;
- batch selection is frontend-only transient state and is NOT persisted.

The Add-on MUST NOT become a shadow content database.

## 4. Creation flow

```text
Feishu event / Add-on frontend
        |
        v
Add-on Worker
        |- generate management password
        |- POST Paste
        |    |- c=<content>
        |    |- s=<password>
        |    `- e=never
        |- persist binding
        `- return non-secret public state
```

## 5. Ordinary update flow

```text
Frontend / Feishu event
        |
        v
Add-on Worker
        |- load binding
        |- retrieve current body if needed
        |- update source
        `- PUT /<name>:<password>
```

Browser never receives password.

## 6. Single completion flow

```text
Normal task checkbox click
        |
        v
Completion action chooser
   |         |          |
   v         v          v
Permanent  Expiring   Delete
archive    archive
   |         |          |
 PUT+never PUT+max    DELETE
   |         |          |
 archive   archive    binding removed
```

## 7. Batch flow

```text
Frontend Batch Mode
       |
       |- selected entry IDs only
       v
POST Add-on /api/batch
       |
       |- load each binding + password
       |- execute per-Paste upstream mutation
       |- update each local lifecycle state after upstream success
       `- return per-item outcomes + summary
```

Do not assume a global transaction across upstream HTTP mutations.

## 8. Archive reconciliation

For expiring entries, upstream may eventually delete the Paste. Add-on should reconcile stale bindings by one or more of:

- checking `expiresAt` and treating elapsed entries as expired;
- handling upstream 404 during Archive load/detail access;
- optional scheduled reconciliation/cleanup.

A stale binding must not produce a fake permanent/archive state after upstream content has disappeared.

## 9. Upstream modification boundary

Only reviewed generic upstream patches modify upstream behavior. They are developed on dedicated patch branches, exported with `git format-patch`, and replayed from the pinned upstream SHA during release assembly. Initial requirement: non-expiring Paste plus maximum-expiration transition.

No Feishu webhook, UI, checkbox, archive, Batch Mode, or binding logic belongs in the patch.
