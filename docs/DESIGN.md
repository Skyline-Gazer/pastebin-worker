# Product Design

## 1. Design goal

The Feishu Add-on page is a minimal web extension of Pastebin Worker. It should feel like another Pastebin Worker web surface, not a separate enterprise product and not a Feishu-client clone.

Core views:

```text
进行中
归档
```

Core actions:

```text
永久归档
限期归档
删除
恢复为进行中
批量
```

## 2. Normal Active view

Preferred minimal shape:

```text
Pastebin Worker / Feishu

进行中    归档                                      批量

--------------------------------------------------------
☐ test A
--------------------------------------------------------
☐ test B
--------------------------------------------------------
☑ test C
--------------------------------------------------------
```

The rendered Markdown checkbox is the task-state control in normal mode.

Do not add unnecessary sidebar navigation, profiles, avatars, dashboards, creator metadata, decorative illustrations, or Feishu-client chrome.

## 3. Single-item completion

Clicking an unchecked managed task opens one compact decision dialog **before backend mutation**:

```text
完成后如何处理？

○ 永久归档
  从进行中隐藏，并永久保留

○ 限期归档
  从进行中隐藏，到期自动删除

○ 删除
  立即删除内容，无法恢复

                 取消    确认
```

### 3.1 Permanent archive

- Markdown state becomes checked.
- Entry leaves Active.
- Paste remains non-expiring.
- Entry appears in Archive as `永久保留`.

### 3.2 Expiring archive

- Markdown state becomes checked.
- Entry leaves Active.
- Paste switches to current `MAX_EXPIRATION`.
- Entry appears in Archive with countdown.

### 3.3 Delete

- Selecting Delete requires a destructive confirmation.
- Upstream Paste is deleted immediately after confirmation.
- Add-on binding is removed after upstream success.
- v1 has no Trash/tombstone list; deleted content is not shown in Archive.

## 4. Archive view

Archive contains only still-existing archived entries:

```text
Pastebin Worker / Feishu

进行中    归档

--------------------------------------------------------
☑ 需求评审记录                         永久保留   恢复
--------------------------------------------------------
☑ 市场复盘                        剩余 89d 12h   恢复
--------------------------------------------------------
☑ Q2 预算规划                       剩余 3d 4h   恢复
--------------------------------------------------------
```

Countdown should remain visually secondary and compact. Avoid dashboard-style cards unless the upstream UI itself evolves that way.

## 5. Restore

Restore returns an archived entry to the Active state:

```text
ARCHIVED_PERMANENT -> ACTIVE_PERMANENT
ARCHIVED_EXPIRING  -> ACTIVE_PERMANENT
```

For timed archive, expiration must be cancelled before UI reports successful restore.

## 6. Batch Mode

Single-item confirmation for many entries is inefficient. Batch Mode provides a temporary selection layer without changing Markdown semantics.

### 6.1 Why selectors are separate

Normal Markdown checkbox:

```text
☐ Task A
```

means content/task state.

Batch selector:

```text
□  ☐ Task A
^  ^
|  Markdown task state
Batch selection state
```

Never use the same checkbox for both meanings.

### 6.2 Entering Batch Mode

Normal:

```text
进行中    归档                                      批量

☐ Task A
☐ Task B
☑ Task C
```

Batch:

```text
选择项目                                      全选  取消

□  ☐ Task A
□  ☐ Task B
□  ☑ Task C

已选择 0 项
```

When entries are selected:

```text
已选择 3 项
[永久归档] [限期归档] [删除]
```

The action bar can be sticky if needed, but should remain visually minimal.

### 6.3 Batch action confirmation

- Permanent archive: may execute directly or use one lightweight confirmation; no per-item dialogs.
- Expiring archive: one confirmation for the selection, e.g. `将 12 项限期归档并开始最长保留期倒计时？`.
- Delete: one destructive confirmation, e.g. `删除 8 项？这些 Paste 将立即删除且无法恢复。`.

### 6.4 Batch partial failure UX

If 18 succeed and 2 fail:

```text
已处理 18 项，2 项失败
```

Failed entries should remain selected or be clearly retryable. Do not pretend the entire batch failed/succeeded.

## 7. Batch Mode interaction lock

While Batch Mode is active, the normal task-checkbox completion flow should be disabled/suppressed so a click cannot be ambiguous between "select this entry" and "complete this task".

Batch Mode exits explicitly by Cancel or after successful operation handling.

## 8. Markdown rendering

Normal Add-on view renders GFM. Example:

```markdown
- [ ] test
- [x] done
```

must be shown as actual checkbox UI, not source text.

Raw source is an optional explicit secondary view only.

## 9. Scope safety for multiple Markdown checkboxes

Archive/delete are **entry-level** lifecycle actions. Do not let an arbitrary nested Markdown checkbox silently delete/archive an entire Paste.

Implementation must identify the managed completion control for an entry. The simplest v1 shape is one lifecycle-managed top-level task per Feishu-managed entry; additional Markdown task boxes may render as content unless explicitly mapped to lifecycle behavior.

## 10. Accessibility

- Task checkbox, BatchSelector, tabs, dialogs, and action buttons require accessible labels.
- Dialog focus must be trapped/restored correctly.
- Destructive actions must be distinguishable without relying only on color.
- Countdown text should remain understandable to screen readers.
