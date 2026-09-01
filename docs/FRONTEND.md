# Frontend Implementation

## 1. Stack

Use:

- React
- Vite
- TypeScript
- Tailwind CSS

Align with upstream dependency/tooling choices where practical.

## 2. Visual rule: upstream Pastebin Worker first

The Add-on web page is independent in code but should look like a natural Pastebin Worker page.

Prefer reuse/alignment with upstream:

- `Button`, `Link`, `Tooltip`, icons where imports are practical;
- dark-mode behavior;
- background/foreground/default color tokens;
- compact rounded surfaces;
- content width/spacing similar to upstream display pages.

If direct imports create fragile coupling, implement a thin Add-on-local equivalent that matches appearance/behavior rather than modifying upstream structure.

Forbidden by default:

- avatars;
- user/account profile UI;
- Feishu-client top chrome;
- large left navigation dashboards;
- decorative illustrations;
- enterprise analytics cards;
- unrelated metadata clutter.

## 3. Suggested component model

```text
FeishuPage
|- PageHeader
|- ViewTabs                # 进行中 / 归档
|- BatchModeToggle
|- ActiveEntryList
|  `- EntryRow
|     |- BatchSelector     # only in Batch Mode
|     `- RenderedMarkdown
|        `- ManagedTaskCheckbox
|- ArchiveEntryList
|  `- ArchiveRow
|     |- RenderedPreview
|     |- RetentionBadge/Countdown
|     `- RestoreButton
|- BatchActionBar
|- CompletionActionDialog
|- DeleteConfirmDialog
`- BatchResultNotice
```

Names are suggestions, semantics are required.

## 4. Rendered Markdown

Use a GFM-capable parser. Avoid raw `/d/<name>`-style syntax display as the default.

Task examples:

```markdown
- [ ] unchecked
- [x] checked
```

must produce semantic checkbox UI.

Code fences containing the same characters remain literal code.

Sanitize generated HTML.

## 5. Normal-mode task interaction

Clicking an unchecked managed task does not immediately persist `[x]`.

Flow:

```text
click checkbox
-> open CompletionActionDialog
-> choose archive_permanent / archive_expiring / delete
-> confirm
-> backend mutation
-> authoritative UI update
```

Cancel means no mutation.

Delete requires a second/destructive confirm step or a destructive final confirmation state in the same dialog.

## 6. Batch Mode state

Suggested React state:

```ts
batchMode: boolean
selectedIds: Set<string>
pendingAction: "archive_permanent" | "archive_expiring" | "delete" | null
batchResult: BatchResult | null
```

Do not encode Batch Mode by mutating Markdown checkbox state.

### 6.1 Selector behavior

- BatchSelector appears only in Batch Mode.
- Selection state is transient UI state.
- A selected entry does not imply completed/checked Markdown.
- Markdown completion interaction should be disabled/suppressed during Batch Mode.
- `全选/清空` may operate only on the currently loaded/visible entry set unless API pagination semantics explicitly support more.

## 7. Batch action bar

Keep it compact and consistent with upstream styling:

```text
已选择 3 项   [永久归档] [限期归档] [删除]
```

Avoid a complex admin toolbar.

## 8. Batch results

Backend returns aggregate and per-item status.

Frontend behavior:

- remove successful archived/deleted entries from Active as appropriate;
- keep failed entries visible and preferably selected;
- show concise summary, e.g. `已处理 18 项，2 项失败`;
- allow retry without forcing user to reconstruct selection manually.

## 9. Archive countdown

Frontend receives authoritative ISO timestamp:

```ts
expiresAt: string
```

Rendering may calculate:

```ts
remaining = new Date(expiresAt).getTime() - Date.now()
```

Do not derive `expiresAt` from hard-coded `MAX_EXPIRATION` in browser code.

Countdown formatting should remain compact, e.g.:

```text
剩余 89d 12h
剩余 3d 4h
```

or localized Chinese equivalents.

Do not update more frequently than the displayed precision requires. For day/hour display, minute-level or coarse updates are enough.

## 10. Archive restore

Restore is a backend operation. Do not optimistically show an Active/permanent state until expiration cancellation succeeds.

On success:

- move entry back to Active;
- clear countdown;
- restore managed checkbox state to unchecked as defined by the entry model.

## 11. Loading/error behavior

- disable duplicate submissions while a single action is in flight;
- batch action button is disabled while batch request is in flight;
- surface retryable per-item failures;
- never print secret-bearing upstream URLs/errors;
- on stale upstream 404, reconcile/remove stale Archive state rather than rendering a broken permanent item.

## 12. Accessibility

- task checkboxes and BatchSelectors need distinct labels;
- use `aria-checked`/semantic checkbox controls appropriately;
- dialogs require focus management;
- countdown/status cannot rely only on color;
- destructive Delete must be clearly named.
