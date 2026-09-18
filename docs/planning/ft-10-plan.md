# FT-10 PLAN — Archive Markdown/GFM rendering verification

Status: **PLAN READY FOR OWNER REVIEW** (planning only; `FT10_AUTHORIZED=NO` / `FT10_STARTED=NO`)

```text
FT10_TEST_OBJECTIVE=archive_markdown_gfm_rendering
FT10_STARTED=NO
FT10_AUTHORIZED=NO
FT10_ACTION_SUBMITTED=NO
FT10_FUNCTIONAL_RESULT=NOT_RUN
PREDECESSOR_FT09=PASS
PREDECESSOR_ISSUE168=CLOSED
PRODUCTION_MUTATION_THIS_ROUND=NO
```

Tracking: Issue [#174](https://github.com/Skyline-Gazer/pastebin-worker/issues/174) (**Issue**, independent FT-10 tracker; does NOT reuse #168 / #170 / #162).

## 0. Planning source baseline (frozen)

```text
PLANNING_SOURCE_BASELINE=2a4688dd219c79d18ec3ebf4c236ba97f122ade9
```

- Reviewed planning/source baseline = current `downstream/main` at planning time.
- **Not** a production deployment pin; FT-10 runtime requires capability compatibility only.
- Actual live `WORKER_PIN` is resolved read-only at Phase A by later execution.

## 1. Objective

Verify that an archived text entry is rendered as **GFM** in the canonical
Add-on Archive view (`pb.test.223.im` → 归档 tab), rather than displayed as raw
Markdown source. FT-10 is a **verification task first**, not a presumed
implementation task.

```text
ARCHIVED_TEXT_ENTRY --(Archive view)--> GFM-rendered, semantic, non-interactive
```

At minimum verify:

- GFM task marker renders as actual checkbox UI;
- archived managed task renders checked;
- archived Markdown task is non-interactive / disabled;
- ordinary GFM formatting (bold, inline code) renders semantically;
- raw `- [x] ...` marker is **not** shown as literal source in the default Archive view;
- Archive lifecycle status/countdown remains separate from Markdown rendering;
- rendering does not mutate Paste/D1;
- arbitrary nested Markdown checkboxes do not gain entry-level lifecycle semantics.

## 2. Authoritative source contract

### 2.1 Design contract (frozen)

[`docs/DESIGN.md`](../DESIGN.md) §8:

> Normal Add-on view renders GFM. Example `- [ ] test` / `- [x] done` must be
> shown as actual checkbox UI, not source text. Raw source is an optional
> explicit secondary view only.

[`docs/DESIGN.md`](../DESIGN.md) §9 (scope safety):

> Archive/delete are **entry-level** lifecycle actions. Do not let an arbitrary
> nested Markdown checkbox silently delete/archive an entire Paste. The simplest
> v1 shape is one lifecycle-managed top-level task per Feishu-managed entry.

[`docs/RETENTION_LIFECYCLE.md`](../RETENTION_LIFECYCLE.md):
checked task state, checked ≠ expiring, BatchSelector ≠ Markdown state.

### 2.2 Current source contract (audited at baseline)

**`downstream/addons/messaging/frontend/RenderedMarkdown.tsx`**

```text
marked.parse(content, { async: false, gfm: true })      # GFM parse
filterXSS(sanitized, allowList)                          # sanitize (XSS safe)
markdownAllowList allows input: ["type","checked","disabled"]
# after sanitize:
#   - non-checkbox <input> removed
#   - checkbox input.setAttribute("aria-label","Markdown task")
# interactive=false  -> every checkbox input.disabled = true
# interactive=true   -> click/change intercepted: revert + onTaskActivate callback
```

**`downstream/addons/messaging/frontend/components/MarkdownContent.tsx`**

Wraps `RenderedMarkdown` with `content`, `interactive`, `onTaskActivate`.

**`downstream/addons/messaging/frontend/components/entries/TextEntryCard.tsx`**

```text
interactiveTask = tab === "active" && !batchMode && presentation.keepInteractiveMarkdown
archived tab  -> interactiveTask = false  -> RenderedMarkdown interactive={false}
archived row renders ArchiveStatus + 恢复 (and 核对 when timed-expired)
```

**`downstream/addons/messaging/frontend/App.tsx`**

```text
active tab:   onTaskActivate -> beginCompletion(entry.id, "archive_permanent", control)
archived tab: onTaskActivate={() => undefined}      # NO lifecycle activation on archived checkbox
```

**`downstream/addons/messaging/frontend/lib/entryPresentation.ts`**

```text
if hasMarkdownTask(content): body = full content, keepInteractiveMarkdown = true
else: body = lines after first non-empty line, keepInteractiveMarkdown = false
```

### 2.3 Source-contract classification

```text
FT10_SOURCE_CONTRACT_PRESENT=YES
# GFM parse + sanitize + checkbox-only + aria-label + disabled-on-noninteractive
# + no lifecycle activation on archived checkbox
```

## 3. Existing test-coverage audit

Audited at baseline `2a4688d`:

- **`App.production.spec.tsx`** — `"refreshes live Markdown from GET /api/entries after completion"`:
  live entry `- [ ] live Markdown task` → active checkbox unchecked → archive via
  永久归档 → archived row asserts
  `checkbox(name="Markdown task")` **checked** inside the archived article.
  This is the closest current production-flow coverage of archived GFM task
  presentation.
- **`App.spec.tsx`** —
  - renders parser-recognized GFM tasks incl. uppercase + nested
    (`checkbox(name="Markdown task")` ×3, checked states);
  - fenced code stays literal + unsafe markup sanitized (no script, no
    `img[onerror]`, no `javascript:` href);
  - non-checkbox inputs removed;
  - Batch Mode disables GFM task (`toBeDisabled`) — but that is the **active**
    tab batch lock, not the archived tab.
- **`App.ia.spec.tsx`** — card title/open/copy semantics; file cards do not
  dump a `Markdown task` checkbox.

**Gap relevant to FT-10:** no explicit assertion that an **archived** row's
`checkbox(name="Markdown task")` is **disabled** in the canonical Archive view
(the existing `toBeDisabled` test targets the active-tab Batch Mode lock). This
is the key FT-10 verification gap.

```text
FT10_EXISTING_TEST_COVERAGE=PARTIAL
# archived checked checkbox: covered (production spec)
# archived disabled checkbox: NOT explicitly covered (gap)
# GFM bold/inline-code semantic rendering in archive: not explicitly covered
# raw marker not shown as source: indirectly covered (rendered), not archived-flow
```

Existing unit/integration tests are **not** production functional evidence.

## 4. Fixture strategy

Do **not** reuse or mutate the historical FT-09 target
`DMkerQPTisMNhhp8tdQc5Ech` (frozen evidence).

FT-10 uses a **dedicated new fixture** produced through a later owner-authorized
canonical lifecycle action. Recommended deterministic content (to be frozen by
SPEC before execution authorization):

```markdown
- [ ] FT_MARKDOWN_RENDER_<unique-id>

**bold-render-check**

`inline-code-render-check`
```

Constraints:

- exactly one lifecycle-managed top-level task;
- avoid multiple task checkboxes in the production fixture;
- avoid links/external fetches unless needed;
- no HTML/XSS payload in the production functional test (XSS remains
  source/test evidence; never attack production);
- expected archived source after canonical archive action:

```markdown
- [x] FT_MARKDOWN_RENDER_<unique-id>

**bold-render-check**

`inline-code-render-check`
```

SPEC must freeze the **exact fixture bytes** (including `<unique-id>`) before
any later execution authorization.

## 5. Candidate production flow (planning only)

```text
Phase A: create/identify dedicated FT-10 active fixture
         verify source bytes + D1 identity + live Worker pin + auth
Phase C: owner authorization
Phase D: one canonical archive action (永久归档)
Phase E: inspect Archive view read-only
```

Phase E verifies **DOM/semantic presentation**, not merely screenshot
appearance.

## 6. Candidate result gates

At least:

```text
FT10_RESULT_1_ARCHIVE_ROW_PRESENT
FT10_RESULT_2_MARKDOWN_TASK_CONTROL_PRESENT
FT10_RESULT_3_TASK_CHECKED
FT10_RESULT_4_TASK_DISABLED
FT10_RESULT_5_RAW_TASK_MARKER_NOT_RENDERED_AS_SOURCE
FT10_RESULT_6_BOLD_RENDERED
FT10_RESULT_7_INLINE_CODE_RENDERED
FT10_RESULT_8_ARCHIVE_STATUS_PRESENT
FT10_RESULT_9_SOURCE_BYTES_UNCHANGED_BY_VIEWING
FT10_RESULT_10_NO_UNEXPECTED_LIFECYCLE_MUTATION
```

Equivalent gates may be renumbered if the source audit reveals a better
mechanical decomposition; the semantics must be preserved.

## 7. Rendering distinction

```text
SOURCE_CONTRACT
DOM/semantic rendering evidence
visual screenshot evidence
```

A screenshot alone is **insufficient** to prove: checkbox is a real checkbox,
checkbox is disabled, bold/code are semantic elements. Preferred evidence
inspects roles/elements/DOM semantics, e.g.:

```text
role=checkbox
checked=true
disabled=true
<strong>bold-render-check</strong>
<code>inline-code-render-check</code>
```

Do not require implementation-specific CSS class names as PASS criteria.

## 8. Raw Markdown rule

The default Archive card must not simply display the literal source line
`- [x] FT_MARKDOWN_RENDER_...`. The task **label text may remain visible** as
rendered Markdown content; PASS means the `- [x]` marker is represented by
semantic rendered task UI, not shown as literal Markdown syntax. Do not write
an impossible gate requiring the label text to disappear.

## 9. Interaction safety

Archived Markdown checkbox must **not** behave as an action control:

```text
ARCHIVE_MARKDOWN_TASK_INTERACTIVE=NO
```

No click on the archived checkbox may restore / re-archive / delete / generate
a lifecycle API mutation / change task state. However, **do not click it in
production** merely to test disabled behavior if DOM state already mechanically
proves `disabled=true`. Prefer read-only semantic evidence.

## 10. Implementation requirement

If source contract exists, relevant tests already exist, deployed production
contains that frontend, and later functional execution passes:

```text
FT10_IMPLEMENTATION_REQUIRED=NO
```

If the source audit or a later execution reveals a real gap:

```text
FT10_IMPLEMENTATION_REQUIRED=YES
```

and STOP before implementing anything — a separate owner authorization would be
required for code changes.

**Current source-audit expectation:** the GFM rendering pipeline already exists
and the gap is an **evidence** gap (archived `disabled=true` + semantic
rendering not currently proven by any test or functional run). Do **not** modify
code merely because FT-10 exists.

## 11. Explicitly out of scope this round

No production fixture creation, no archiving, no checkbox click, no deploy, no
D1 writes, no Paste writes, no browser production mutation, no FT-10 execution.

Allowed: repository/source inspection, Issue creation, docs planning, docs
branch/commit/PR, normal docs CI.

```text
PRODUCTION_MUTATION_THIS_ROUND=NO
FT10_STARTED=NO
FT10_ACTION_SUBMITTED=NO
FT10_FUNCTIONAL_RESULT=NOT_RUN
```

## 12. Non-retroactivity / historical invariants

```text
FT09_FUNCTIONAL_RESULT=PASS
FT09_COMPLETE=YES
DEFECT170_OPERATIONAL_SETTLEMENT=NOT_TRIGGERED
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT08_FUNCTIONAL_RESULT=PASS
FT08_COMPLETE=YES
```

Do not reopen #168 or #170.

## 13. Governance

Planning PR is docs-only; normal CI and reviewer rules unchanged
(`quota/unavailable != PASS`; old-HEAD review does not transfer; owner approval
binds exact HEAD). No auto-merge; no automatic reviewer override.
