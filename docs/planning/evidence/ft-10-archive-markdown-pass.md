# FT-10 execution evidence — Markdown task permanent archive — PASS

Status: **FT10_EXECUTION_STATUS=COMPLETED** and **FT10_FUNCTIONAL_RESULT=PASS**.

This is the durable evidence for the owner-authorized FT-10 production
functional execution. The run performed exactly one canonical permanent
archive of the dedicated fixture. No code, Worker deployment, traffic,
binding, or configuration change was made.

```text
ISSUE=Skyline-Gazer/pastebin-worker#174
PROJECT_OWNER=Skyline-Gazer
PROJECT_NUMBER=3
PROJECT_TITLE=@markd3ng's untitled project
PROJECT_ITEM_ID=PVTI_lADOEwGMMc4BkEoczg8FFtE
PROJECT_PHASE=FT-10 (no Phase field exists)

FT10_PLAN_APPROVED=YES
FT10_SPEC_APPROVED=YES
FT10_TODO_READY=YES
FT10_AUTHORIZED=YES
FT10_PRECONDITION_7_OWNER=YES
FT10_STARTED=YES
FT10_FINAL_DRIFT_CHECK=PASS
```

## Production references

```text
CURRENT_PRODUCTION_WORKER=pastebin-feishu-prod
CURRENT_WORKER_PIN=0f19b190-0cd9-4d4c-ae50-08425a2e7d84
CURRENT_DEPLOYMENT_ID=43a7b4d1-ba0f-47a3-a35f-e45a7068c4a8
CURRENT_TRAFFIC_PERCENT=100
RESULTING_DOWNSTREAM_MAIN_AT_EXECUTION=0316b118883e062309896b87317dd15e9ad38548
```

## Dedicated fixture and frozen bytes

```text
FT10_FIXTURE_ID=0f6f8f10-70da-4b53-a046-aa7e24b59acf
FT10_FIXTURE_BINDING=FEISHU_BINDINGS_DB
FT10_FIXTURE_PASTE_NAME=AnpGTx7ces87itpQbt3AXJew
FT10_FIXTURE_CREATE_OP_ID=b4d2b5be-8db0-4488-8331-97b195a6b6b5
FT10_FIXTURE_CREATE_SUBMITTED=YES
FT10_FIXTURE_CREATE_SUBMISSION_COUNT=1
FT10_FIXTURE_CREATED=YES
FT10_FIXTURE_STATE=active (pre-action)
FT10_FIXTURE_LIFECYCLE=permanent (pre-action)
FT10_FIXTURE_EXPIRY=NULL (pre-action)
FT10_FIXTURE_CONTRACT_VERIFIED=YES
```

The owner-originated fixture message used the approved plain-text surface.
The pre-action body was 87 UTF-8 bytes, LF-delimited, without CR and without
a final LF. Its SHA-256 was
`29d7e0a1c5fbe3e292bc18db3ed5116b676d01646f8a7be74a787573f43a78c5`.

The post-action body was also 87 UTF-8 bytes, LF-delimited, without CR and
without a final LF. Its SHA-256 was
`767d004d97904c4e1e8b94bd2ee110063eae0ded6cebc6a76f0343c62da46907`.
The only intended content transition was the task marker `[ ]` to `[x]`:

```markdown
- [x] FT_MARKDOWN_RENDER_20260918_01

**bold-render-check**

`inline-code-render-check`
```

## Final drift and action gate

All required read-only preconditions passed immediately before the action:

```text
FT10_PRECONDITION_1_PRODUCTION_REFERENCE=PASS
FT10_PRECONDITION_2_FIXTURE_EXISTS_AND_EXACT=PASS
FT10_PRECONDITION_3_FIXTURE_ACTIVE_PERMANENT_NULL_EXPIRY=PASS
FT10_PRECONDITION_4_FRONTEND_AUTHENTICATED=PASS
FT10_PRECONDITION_5_ACTIVE_ROW_AND_EXACT_TASK=PASS
FT10_PRECONDITION_6_D1_NO_PENDING_CONFLICTING_OPERATION=PASS
FT10_PRECONDITION_7_OWNER_AUTHORIZATION=YES
FT10_FINAL_DRIFT_CHECK=PASS
```

The exact active managed Markdown task checkbox was clicked once. The action
dialog opened with `永久归档` already selected, and `确认归档` was clicked
once. The request was allowed to settle before any read-back. There was no
direct POST, replay, retry, compensation, restore, delete, or archived-task
checkbox click.

```text
FT10_MANAGED_TASK_TRIGGER_CLICK_COUNT=1
FT10_ARCHIVE_ACTION_SUBMITTED=YES
FT10_ARCHIVE_SUBMISSION_COUNT=1
FT10_ACTION_SINGLE_SUBMISSION=YES
FT10_ARCHIVE_OP_ID=9b9917a4-e7ee-407f-b9f3-d934ad209e59
HTTP_STATUS=200
NO_RETRY=YES
```

## Read-only post-action verification

The successful D1 operation was `complete_permanent`, with
`expected_version=1`, producing version 2. The binding is now archived,
permanent, and has no expiry. A later archive view caused no additional
lifecycle operation.

```text
PRE_VERSION=1
POST_VERSION=2
POST_VISIBILITY=archived
POST_RETENTION_MODE=permanent
POST_EXPIRY=NULL
POST_OPERATION_STATUS=succeeded
POST_OPERATION_COUNT_FOR_THIS_ACTION=1
```

The authenticated frontend showed the target only in Archive (Active count
4, Archive count 1). The archived article contained a checked, disabled
Markdown task control and rendered the bold text and inline code. It showed
`永久归档`, no countdown, and only the `恢复` action.

```text
FT10_RESULT_1_ARCHIVE_ROW_PRESENT=PASS
FT10_RESULT_2_MARKDOWN_TASK_CONTROL_PRESENT=PASS
FT10_RESULT_3_TASK_CHECKED=PASS
FT10_RESULT_4_TASK_DISABLED=PASS
FT10_RESULT_5_RAW_TASK_MARKER_NOT_RENDERED_AS_SOURCE=PASS
FT10_RESULT_6_BOLD_RENDERED=PASS
FT10_RESULT_7_INLINE_CODE_RENDERED=PASS
FT10_RESULT_8_ARCHIVE_STATUS_PRESENT=PASS
FT10_RESULT_9_SOURCE_BYTES_UNCHANGED_BY_VIEWING=PASS
FT10_RESULT_10_NO_UNEXPECTED_LIFECYCLE_MUTATION=PASS
```

The post-view Paste GET remained HTTP 200 with the same 87-byte post-action
body and SHA-256. D1 read-back remained at version 2 and the operation list
remained exactly: one successful create operation and one successful
`complete_permanent` operation.

## Settlement

```text
FT10_FIXTURE_P2P_SENT=YES
FT10_FIXTURE_PROVISIONING_RESULT=PASS
FT10_EXECUTION_STATUS=COMPLETED
FT10_FUNCTIONAL_RESULT=PASS
FT10_COMPLETE=YES
FT10_IMPLEMENTATION_REQUIRED=NO
PRODUCTION_MUTATION_THIS_ROUND=YES
PRODUCTION_MUTATION_SCOPE=FT10_FIXTURE_PROVISIONING_AND_SINGLE_PERMANENT_ARCHIVE
```

The historical planning conclusions remain unchanged:

```text
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT08_FUNCTIONAL_RESULT=PASS
FT09_FUNCTIONAL_RESULT=PASS
DEFECT170_OPERATIONAL_SETTLEMENT=NOT_TRIGGERED
```

No credentials, cookies, tokens, authorization headers, or management
passwords are included in this evidence. The next and final work is
governance settlement only: merge this documentation evidence, close Issue
#174 as completed, and mark its Project #3 item Done.
