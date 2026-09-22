# FT-10 SPEC — Archive Markdown/GFM rendering verification

Status: **SPEC APPROVED** — production execution requires separate Phase 0 and Phase D owner gates

```text
FT10_TEST_OBJECTIVE=archive_markdown_gfm_rendering
FT10_STARTED=NO
FT10_AUTHORIZED=NO
FT10_FUNCTIONAL_RESULT=NOT_RUN
FT10_FIXTURE_PROVISIONING_REQUIRED=YES
FT10_FIXTURE_PROVISIONING_AUTHORIZED=NO
FT10_FIXTURE_P2P_SENT=NO
FT10_FIXTURE_CREATED=NO
FT10_FIXTURE_CREATE_SUBMITTED=NO
FT10_FIXTURE_PROVISIONING_RESULT=NOT_RUN
FT10_ARCHIVE_ACTION_SUBMITTED=NO
FT10_ARCHIVE_SUBMISSION_COUNT=0
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

## 3. Frozen fixture (exact bytes; no template)

The SPEC freezes the exact fixture below. A later execution may **not** alter
it; no template placeholder exists. Any substitution of another marker
requires a new owner planning decision.

```text
FT10_FIXTURE_MARKER=FT_MARKDOWN_RENDER_20260918_01
```

Exact active source (frozen):

```markdown
- [ ] FT_MARKDOWN_RENDER_20260918_01

**bold-render-check**

`inline-code-render-check`
```

Exact archived source (after canonical archive action):

```markdown
- [x] FT_MARKDOWN_RENDER_20260918_01

**bold-render-check**

`inline-code-render-check`
```

Byte-level properties (frozen):

```text
ENCODING=UTF-8
LINE_ENDING=LF
HAS_CR=NO
HAS_FINAL_LF=NO
ACTIVE_BODY_BYTES=87
ARCHIVED_BODY_BYTES=87
```

The only expected source-byte difference produced by the archive lifecycle
action is:

```text
[ ] -> [x]
```

## 3.1 Phase 0 — fixture provisioning contract (future separate owner authorization)

### 3.1.1 Canonical provisioning surface (frozen)

Historical repository contract (see `docs/planning/ft04-markdown-inbound-plan.md`
and webhook inbound docs):

```text
plain Feishu P2P text
  -> MarkdownSource = decoded text exactly

native Feishu Code Block
  -> MarkdownSource = provider code_block.text exactly
  -> provider MAY supply terminal LF
  -> terminal LF MUST NOT be stripped
```

Because this fixture's contract requires `HAS_FINAL_LF=NO` with exact 87-byte
active body, FT-10 **MUST NOT** use Feishu native Code Block as the canonical
provisioning surface (a provider-supplied terminal LF would violate the frozen
bytes). Freeze:

```text
FT10_FIXTURE_PROVISIONING_SURFACE=FEISHU_P2P_PLAIN_TEXT
FT10_FIXTURE_PROVISIONING_PROVIDER=FEISHU
FT10_FIXTURE_PROVISIONING_MESSAGE_COUNT=1
FT10_FIXTURE_SYNTHETIC_WEBHOOK_ALLOWED=NO
FT10_FIXTURE_DIRECT_API_CREATE_ALLOWED=NO
FT10_FIXTURE_NATIVE_CODE_BLOCK_ALLOWED=NO
```

The action must be: **exactly one real owner-originated Feishu P2P plain-text
message** carrying the frozen multiline fixture.

Exact intended MarkdownSource (frozen):

```markdown
- [ ] FT_MARKDOWN_RENDER_20260918_01

**bold-render-check**

`inline-code-render-check`
```

Expected stored body acceptance contract:

```text
ENCODING=UTF-8
LINE_ENDING=LF
HAS_CR=NO
HAS_FINAL_LF=NO
ACTIVE_BODY_BYTES=87
```

### 3.1.2 Phase 0 pre-send guard (read-only)

Before the owner sends the one P2P, perform read-only setup checks:

```text
FT10_FIXTURE_MARKER=FT_MARKDOWN_RENDER_20260918_01

no existing live binding/Paste attributable to this marker
no existing succeeded create for this dedicated FT-10 fixture
no ambiguous pending/reconciliation create state relevant to provisioning
Feishu ingress/create path available
```

Do **not** mutate anything during this guard. Only after a separate future
owner fixture authorization may the one P2P be sent.

### 3.1.3 Phase 0 submission semantics

Future Phase 0 authorization distinguishes the owner message from the
downstream create result:

```text
FT10_FIXTURE_PROVISIONING_AUTHORIZED=NO
FT10_FIXTURE_P2P_SENT=NO
FT10_FIXTURE_CREATE_SUBMITTED=NO
FT10_FIXTURE_CREATED=NO
FT10_FIXTURE_PROVISIONING_RESULT=NOT_RUN
```

After the future single owner P2P sent:

```text
FT10_FIXTURE_P2P_SENT=YES
```

After ingress actually creates the entry:

```text
FT10_FIXTURE_CREATE_SUBMITTED=YES
```

Only after all setup acceptance checks pass:

```text
FT10_FIXTURE_CREATED=YES
FT10_FIXTURE_PROVISIONING_RESULT=PASS
```

Do **not** set `FT10_STARTED=YES` during fixture provisioning.

### 3.1.4 Phase 0 acceptance

Successful setup requires mechanically verifying:

```text
exactly one new dedicated Active entry
exactly one corresponding new Paste
exactly one succeeded create operation
binding visibility=active
retention_mode=permanent
managed task unchecked
Paste body exactly equals frozen 87-byte active body
HAS_CR=NO
HAS_FINAL_LF=NO
no duplicate Paste
no reconciliation_required
no unexpected pending create
```

Record (no credentials/secrets in durable docs):

```text
FT10_FIXTURE_BINDING_ID=<actual>
FT10_FIXTURE_PASTE_NAME=<actual>
FT10_FIXTURE_CREATE_OP_ID=<actual>
```

### 3.1.5 Provider-byte mismatch rule

If the real Feishu plain-text message produces bytes that do NOT equal the
frozen 87-byte contract — including unexpected terminal LF, CRLF,
prefix/suffix, or Markdown transformation — then:

```text
FT10_FIXTURE_PROVISIONING_RESULT=FAIL
FT10_FIXTURE_CREATED=NO
FT10_STARTED=NO
FT10_ARCHIVE_ACTION_SUBMITTED=NO
```

STOP. Do **NOT**:

- trim or normalize the Paste;
- edit D1;
- send a second P2P;
- create a second fixture;
- archive the mismatched fixture;
- delete/clean up the mismatched fixture automatically.

Any retry or cleanup requires a new explicit owner decision. This preserves
the provider-source contract instead of altering production data to satisfy
the test fixture.

### 3.1.6 Phase 0 no-retry rule

```text
FT10_FIXTURE_PROVISIONING_SEND_COUNT_MAX=1
FT10_FIXTURE_PROVISIONING_NO_AUTOMATIC_RETRY=YES
```

If the network/provider/create outcome is ambiguous after the message was
sent, do not resend. Inspect read-only state and settle the setup as
PASS/FAIL/INCONCLUSIVE. A second owner P2P requires new explicit
authorization and a new planning decision if fixture identity/body must
change.

### 3.1.7 Fresh Phase A after successful provisioning

Only when:

```text
FT10_FIXTURE_PROVISIONING_RESULT=PASS
FT10_FIXTURE_CREATED=YES
```

may execution proceed to a completely **fresh read-only Phase A**. Phase A then
verifies:

```text
actual binding identity
actual Paste name
active/permanent state
version
exact 87-byte active body
no pending/uncertain/reconciliation operation
authenticated frontend
deployed GFM frontend compatibility
live Worker pin
```

Phase A must not inherit mutable-state observations from Phase 0. Then STOP
for Phase C owner authorization. No archive action is authorized merely
because fixture provisioning succeeded.

## 4. Phase-D archive-execution preconditions

```text
FT10_PRECONDITION_1_PLAN_APPROVED
FT10_PRECONDITION_2_FIXTURE_ACTIVE_STATE
FT10_PRECONDITION_3_FIXTURE_BODY_BYTES
FT10_PRECONDITION_4_AUTH
FT10_PRECONDITION_5_DEPLOY_COMPAT
FT10_PRECONDITION_6_NO_PENDING_OP
FT10_PRECONDITION_7_OWNER
```

`FT10_PRECONDITION_1..7` are **Phase-D archive-execution preconditions**.
They authorize eligibility for the canonical archive action under test.
They are **NOT** prerequisites for fixture provisioning, and **NOT**
"before the first production action" gates: Phase 0 fixture provisioning is
itself a production mutation that must complete first.

They are evaluated:

```text
AFTER successful Phase 0 fixture provisioning
AND AFTER fresh read-only Phase A
AND BEFORE the Phase D archive submission.
```

Phase 0 has its own separate setup guard and authorization (SPEC §3.1).

Any false gate immediately before Phase D:

```text
FT10_EXECUTION_STATUS=BLOCKED_PRECONDITION
FT10_FUNCTIONAL_RESULT=NOT_RUN
FT10_ARCHIVE_ACTION_SUBMITTED=NO
STOP
```

## 5. Canonical action (later authorized)

```text
FT10_ACTION_1_SURFACE=canonical frontend Active permanent archive flow
FT10_ACTION_2_SINGLE=exactly one lifecycle HTTP submission
FT10_ACTION_3_IDEMPOTENCY=frontend-generated Idempotency-Key
```

The permanent-archive UI is **not** a single click (unlike FT-09 Restore).
For the current baseline the canonical minimal UI path is:

```text
1. click the active managed Markdown checkbox  -> completion chooser opens
   (archive_permanent is already the selected action)
2. click 确认归档 exactly once
3. exactly one lifecycle HTTP submission
   POST /api/entries/<id>/complete {"action":"archive_permanent"}
```

It is **not** necessary to click the `永久归档` chooser button again when it is
already the selected action.

Execution-time invariants (Phase D) — not preconditions:

```text
FT10_ARCHIVE_SUBMISSION_COUNT=1
FT10_ACTION_SINGLE_SUBMISSION=YES
NO_RETRY=YES

# optional interaction counters (explicit, not single-click semantics):
FT10_MANAGED_TASK_TRIGGER_CLICK_COUNT=1
FT10_CONFIRM_ARCHIVE_CLICK_COUNT=1
```

The critical safety property is **one network mutation submission**, not "one
total UI click". No direct API secondary submit; no duplicate confirm; no
replay.

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
    lifecycle status rendered separately from Markdown content.
    Expected for the canonical permanent scenario:
      role=status
      text=永久归档
    (a countdown belongs to timed archive, which FT-10 is NOT testing)

FT10_RESULT_9_SOURCE_BYTES_UNCHANGED_BY_VIEWING
    mechanical sequence (frozen):
      A. immediately after confirmed archive success: GET Paste
         record POST_ARCHIVE_SOURCE_BYTES; expect exact archived fixture bytes
      B. inspect canonical Archive DOM read-only
      C. after Archive inspection: GET Paste again
         record POST_VIEW_SOURCE_BYTES
      D. compare POST_VIEW_SOURCE_BYTES == POST_ARCHIVE_SOURCE_BYTES
    PASS only when the two after-action byte snapshots are identical.
    (The pre-action vs post-view comparison is intentionally NOT used: the
    archive action legitimately changes `[ ]` -> `[x]`.)

FT10_RESULT_10_NO_UNEXPECTED_LIFECYCLE_MUTATION
    D1 lifecycle/op snapshot immediately after archive
      ==
    D1 lifecycle/op snapshot after rendering inspection
    (except no expected read-only metadata changes).
    No new lifecycle operation may be created by Archive rendering/viewing;
    no unexpected second Paste/binding.
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
Before archive action, precondition false:
  FT10_EXECUTION_STATUS=BLOCKED_PRECONDITION
  FT10_FUNCTIONAL_RESULT=NOT_RUN
  FT10_ARCHIVE_ACTION_SUBMITTED=NO

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
Status: SPEC APPROVED
FT10_STARTED=NO
FT10_AUTHORIZED=NO
FT10_FIXTURE_PROVISIONING_AUTHORIZED=NO
FT10_FIXTURE_P2P_SENT=NO
FT10_FIXTURE_CREATED=NO
FT10_FIXTURE_CREATE_SUBMITTED=NO
FT10_FIXTURE_PROVISIONING_RESULT=NOT_RUN
FT10_ARCHIVE_ACTION_SUBMITTED=NO
FT10_ARCHIVE_SUBMISSION_COUNT=0
FT10_FUNCTIONAL_RESULT=NOT_RUN
PRODUCTION_MUTATION_THIS_ROUND=NO
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
```

## 15. Execution settlement (2026-09-22)

The approved SPEC was executed under the separate Phase 0 and Phase C owner
authorizations. See [`evidence/ft-10-archive-markdown-pass.md`](evidence/ft-10-archive-markdown-pass.md)
for the complete read-only correlation and DOM evidence.

```text
FT10_FINAL_DRIFT_CHECK=PASS
FT10_PRECONDITION_7_OWNER=YES
FT10_STARTED=YES
FT10_ARCHIVE_ACTION_SUBMITTED=YES
FT10_ARCHIVE_SUBMISSION_COUNT=1
FT10_ACTION_SINGLE_SUBMISSION=YES
NO_RETRY=YES
FT10_FUNCTIONAL_RESULT=PASS
FT10_COMPLETE=YES
FT10_IMPLEMENTATION_REQUIRED=NO
```

The exact fixture was archived permanently through the canonical frontend path.
The resulting binding is `archived`, `permanent`, `expires_at=NULL`, version 2;
the single `complete_permanent` operation succeeded with expected version 1.
No code or deployment change was required.
