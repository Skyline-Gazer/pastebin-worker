# FT-10 SPEC — Archive Markdown/GFM rendering verification

Status: **SPEC DRAFT FOR OWNER REVIEW** (docs-only; execution requires a separate owner authorization)

```text
FT10_TEST_OBJECTIVE=archive_markdown_gfm_rendering
FT10_STARTED=NO
FT10_AUTHORIZED=NO
FT10_ACTION_SUBMITTED=NO
FT10_FUNCTIONAL_RESULT=NOT_RUN
RETROACTIVE_EVIDENCE=NO
```

Parent PLAN: [ft-10-plan.md](ft-10-plan.md)

## 0. Planning source baseline (frozen; single definition)

```text
PLANNING_SOURCE_BASELINE=2a4688dd219c79d18ec3ebf4c236ba97f122ade9
```

Same meaning as PLAN §0: reviewed planning/source baseline, **not** a
production deployment pin. FT-10 runtime requires capability compatibility
only; actual live `WORKER_PIN` is resolved read-only at Phase A.

## 1. Scope

Verify that an archived text entry is rendered as **GFM** in the canonical
Add-on Archive view (`pb.test.223.im` → 归档 tab), rather than displayed as raw
Markdown source. FT-10 is a verification task; it does **not** authorize
execution, deploy, code changes, or fixture production by this document.
This SPEC freezes the mechanical PASS/FAIL/INCONCLUSIVE gates for a later
authorized run.

## 2. Canonical scenario

```text
dedicated active fixture (GFM task + bold + inline code)
      |  (one canonical archive action, 永久归档)
      v
archived row in Archive view
      |
      v
GFM-rendered, checked, disabled task control + semantic bold/code
```

## 3. Fixture (must be frozen before execution)

The SPEC freezes the exact fixture below; a later execution may not alter it.

```markdown
- [ ] FT_MARKDOWN_RENDER_<unique-id>

**bold-render-check**

`inline-code-render-check`
```

Expected archived source after the canonical archive action:

```markdown
- [x] FT_MARKDOWN_RENDER_<unique-id>

**bold-render-check**

`inline-code-render-check`
```

`<unique-id>` is chosen deterministically before execution (e.g.
`20260918`-style) and recorded in the execution evidence.

## 4. Precondition gates

```text
FT10_PRECONDITION_1_PLAN_APPROVED
FT10_PRECONDITION_2_FIXTURE_ACTIVE_STATE
FT10_PRECONDITION_3_FIXTURE_BODY_BYTES
FT10_PRECONDITION_4_AUTH
FT10_PRECONDITION_5_DEPLOY_COMPAT
FT10_PRECONDITION_6_NO_PENDING_OP
FT10_PRECONDITION_7_OWNER
```

Evaluated before the first production action. Any false gate → do not submit
any action.

## 5. Canonical action (later authorized)

```text
FT10_ACTION_1_SURFACE=canonical frontend Active 永久归档 (chooser -> confirm)
FT10_ACTION_2_SINGLE=exactly one submission
FT10_ACTION_3_IDEMPOTENCY=frontend-generated Idempotency-Key
```

Execution-time invariants (Phase D) — not preconditions:

```text
FT10_ACTION_SINGLE_SUBMISSION
FT10_CANONICAL_CLICK_COUNT=1
NO_RETRY=YES
```

## 6. Result gates (measured after the one action + read-only Archive inspection)

```text
FT10_RESULT_1_ARCHIVE_ROW_PRESENT
    target article visible in 归档; pasteName/id match fixture

FT10_RESULT_2_MARKDOWN_TASK_CONTROL_PRESENT
    checkbox(role=checkbox, name="Markdown task") exists in the archived row
    (rendered GFM, not literal source text)

FT10_RESULT_3_TASK_CHECKED
    checkbox checked=true (managed task was completed by the archive action)

FT10_RESULT_4_TASK_DISABLED
    checkbox disabled=true (archived Markdown task is non-interactive)

FT10_RESULT_5_RAW_TASK_MARKER_NOT_RENDERED_AS_SOURCE
    the literal `- [x]` marker is NOT rendered as source text in the default
    Archive card; semantic checkbox UI represents it. (Label text may remain.)

FT10_RESULT_6_BOLD_RENDERED
    <strong>bold-render-check</strong> semantic element present

FT10_RESULT_7_INLINE_CODE_RENDERED
    <code>inline-code-render-check</code> semantic element present

FT10_RESULT_8_ARCHIVE_STATUS_PRESENT
    Archive lifecycle status/countdown separate from and adjacent to Markdown

FT10_RESULT_9_SOURCE_BYTES_UNCHANGED_BY_VIEWING
    Paste bytes unchanged by viewing (GET-only; no mutation)

FT10_RESULT_10_NO_UNEXPECTED_LIFECYCLE_MUTATION
    no D1 op / lifecycle state change caused by rendering/viewing;
    no unexpected second Paste/binding
```

## 7. Evidence requirements

```text
FT10_EVIDENCE_PRE_ARM      before snapshot (binding + ops + paste bytes + auth)
FT10_EVIDENCE_REQUEST_TIME UTC ISO of submission
FT10_EVIDENCE_HTTP         status + entry JSON
FT10_EVIDENCE_ARCHIVE_DOM  roles/elements from canonical Archive view
                           (role=checkbox, checked, disabled, strong, code)
FT10_EVIDENCE_PASTE_AFTER  public GET bytes (unchanged)
FT10_EVIDENCE_D1_AFTER     binding + op rows + no-anomaly
FT10_EVIDENCE_CORRELATION  request identity -> op id -> HTTP
```

Screenshot-only evidence is **insufficient**. Evidence must inspect
DOM/semantic presentation (roles/elements), not CSS class names.

## 8. PASS gate

```text
FT10_PASS_GATE =
  (all FT10_PRECONDITION_* held) AND
  (FT10_ACTION_SINGLE_SUBMISSION held) AND
  (all FT10_RESULT_* hold) AND
  (no prohibited retry/replay)
```

Distinct states:

```text
Before action, precondition false:
  FT10_EXECUTION_STATUS=BLOCKED_PRECONDITION
  FT10_FUNCTIONAL_RESULT=NOT_RUN
  FT10_ACTION_SUBMITTED=NO

Executed + contract satisfied:    FT10_FUNCTIONAL_RESULT=PASS
Executed + contract violated:     FT10_FUNCTIONAL_RESULT=FAIL
Executed + evidence insufficient: FT10_FUNCTIONAL_RESULT=INCONCLUSIVE
```

## 9. Rendering distinction

```text
SOURCE_CONTRACT                    # code says GFM
DOM/semantic rendering evidence    # observed roles/elements (REQUIRED)
visual screenshot evidence         # appearance only (INSUFFICIENT alone)
```

## 10. Raw Markdown rule

PASS requires the `- [x]` marker to be represented by semantic rendered task
UI, not shown as literal Markdown syntax. The task label text itself may remain
visible as rendered Markdown content; do not write an impossible gate requiring
the label to disappear.

## 11. Interaction safety

```text
ARCHIVE_MARKDOWN_TASK_INTERACTIVE=NO
```

The archived checkbox must not trigger restore/re-archive/delete/lifecycle
mutation. Prefer read-only semantic evidence (`disabled=true`); do not click it
in production merely to test disabled behavior.

## 12. Implementation requirement

```text
FT10_IMPLEMENTATION_REQUIRED=NO
  if source contract present + tests exist + deployed frontend matches +
  later functional execution passes

FT10_IMPLEMENTATION_REQUIRED=YES
  only if a real gap is discovered; then STOP; separate owner authorization
  for code changes
```

Current source audit (baseline `2a4688d`) indicates the GFM pipeline exists and
the gap is **evidence** (archived `disabled=true` + semantic rendering not yet
proven by test or functional run). No code change is authorized by this SPEC.

## 13. Non-retroactivity / historical invariants

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

## 14. Not in scope

Pastebin upstream, deploy, telemetry deploy, fixture recreation of FT-09,
batch, delete, restore lifecycle re-test, FT-09/FT-08 replay, source code
changes.

```text
Status: SPEC DRAFT
FT10_STARTED=NO
FT10_AUTHORIZED=NO
FT10_ACTION_SUBMITTED=NO
FT10_FUNCTIONAL_RESULT=NOT_RUN
PRODUCTION_MUTATION_THIS_ROUND=NO
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
```
