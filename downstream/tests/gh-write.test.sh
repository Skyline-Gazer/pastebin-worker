#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WRAPPER="$ROOT/downstream/scripts/gh-write.sh"
FIXTURE="$(mktemp -d)"
LOG="$FIXTURE/gh.args"
OUTPUT="$FIXTURE/output"
EXPECTED="$FIXTURE/expected"
trap 'rm -rf "$FIXTURE"' EXIT

[[ -x "$WRAPPER" ]] || {
  echo "Expected executable wrapper: $WRAPPER" >&2
  exit 1
}

mkdir "$FIXTURE/bin"
cat >"$FIXTURE/bin/gh" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$@" >"$GH_STUB_LOG"
exit "${GH_STUB_EXIT:-0}"
STUB
chmod +x "$FIXTURE/bin/gh"
export GH_STUB_LOG="$LOG"

run_guard() {
  : >"$LOG"
  set +e
  GH_STUB_EXIT="${GH_STUB_EXIT:-0}" PATH="$FIXTURE/bin:$PATH" \
    "$WRAPPER" "$@" >"$OUTPUT" 2>&1
  RUN_STATUS=$?
  set -e
}

expect_reject() {
  run_guard "$@"
  [[ "$RUN_STATUS" -eq 2 ]]
  [[ ! -s "$LOG" ]]
}

REPO="Skyline-Gazer/pastebin-worker"
PROJECT_ID="PVT_kwDOEwGMMc4BkEoc"
ITEM_ID="PVTI_lADOEwGMMc4BkEoczg86CUA"
FIELD_ID="PVTSSF_lADOEwGMMc4BkEoczhi2l5A"
OPTION_ID="98236657"
project_args=(
  project item-edit
  --repo "$REPO"
  --id "$ITEM_ID"
  --field-id "$FIELD_ID"
  --project-id "$PROJECT_ID"
  --single-select-option-id "$OPTION_ID"
)

run_guard "${project_args[@]}"
[[ "$RUN_STATUS" -eq 0 ]]
printf '%s\n' \
  project item-edit \
  --id "$ITEM_ID" \
  --field-id "$FIELD_ID" \
  --project-id "$PROJECT_ID" \
  --single-select-option-id "$OPTION_ID" >"$EXPECTED"
diff -u "$EXPECTED" "$LOG"
grep -q '^TARGET_OWNER=Skyline-Gazer$' "$OUTPUT"
grep -q '^TARGET_REPO=pastebin-worker$' "$OUTPUT"
grep -q '^TARGET_ACTION=project_item_status_done$' "$OUTPUT"
grep -q '^TARGET_PROJECT_NUMBER=3$' "$OUTPUT"
grep -q "^TARGET_PROJECT_ID=$PROJECT_ID$" "$OUTPUT"
grep -q '^TARGET_ISSUE_NUMBER=186$' "$OUTPUT"
grep -q "^TARGET_ITEM_ID=$ITEM_ID$" "$OUTPUT"
grep -q "^TARGET_FIELD_ID=$FIELD_ID$" "$OUTPUT"
grep -q "^TARGET_OPTION_ID=$OPTION_ID$" "$OUTPUT"
grep -q '^RESULT=success$' "$OUTPUT"
grep -q '^CHILD_EXIT=0$' "$OUTPUT"
! grep -q -- '--repo\|--id\|--field-id\|--project-id' "$OUTPUT"

expect_reject project item-edit --id "$ITEM_ID" --field-id "$FIELD_ID" --project-id "$PROJECT_ID" --single-select-option-id "$OPTION_ID"
expect_reject project item-edit --repo other/repository --id "$ITEM_ID" --field-id "$FIELD_ID" --project-id "$PROJECT_ID" --single-select-option-id "$OPTION_ID"
expect_reject "${project_args[@]}" --repo "$REPO"
expect_reject project item-edit -R "$REPO" --id "$ITEM_ID" --field-id "$FIELD_ID" --project-id "$PROJECT_ID" --single-select-option-id "$OPTION_ID"
expect_reject project item-edit "--repo=$REPO" --id "$ITEM_ID" --field-id "$FIELD_ID" --project-id "$PROJECT_ID" --single-select-option-id "$OPTION_ID"

wrong=("${project_args[@]}")
wrong[5]="wrong-item"
expect_reject "${wrong[@]}"
wrong=("${project_args[@]}")
wrong[7]="wrong-field"
expect_reject "${wrong[@]}"
wrong=("${project_args[@]}")
wrong[9]="wrong-project"
expect_reject "${wrong[@]}"
wrong=("${project_args[@]}")
wrong[11]="wrong-option"
expect_reject "${wrong[@]}"
expect_reject "${project_args[@]}" --clear
expect_reject project item-edit --repo "$REPO" --field-id "$FIELD_ID" --id "$ITEM_ID" --project-id "$PROJECT_ID" --single-select-option-id "$OPTION_ID"
expect_reject project item-delete --repo "$REPO" --id "$ITEM_ID"
expect_reject project item-edit --repo "$REPO" --owner Skyline-Gazer --url https://example.invalid --field Status --value Done
expect_reject api graphql --repo "$REPO" -f query=mutation
expect_reject api --method POST graphql --repo "$REPO" -f query=mutation
expect_reject api https://api.github.com/graphql --repo "$REPO" -f query=mutation
expect_reject --repo "$REPO"

SENTINEL="AUDIT_MUST_NOT_ECHO_CALLER_ARGUMENTS"
run_guard issue comment 186 --repo "$REPO" --body "$SENTINEL"
[[ "$RUN_STATUS" -eq 0 ]]
printf '%s\n' issue comment 186 --repo "$REPO" --body "$SENTINEL" >"$EXPECTED"
diff -u "$EXPECTED" "$LOG"
grep -q '^TARGET_ACTION=repository_write$' "$OUTPUT"
! grep -q "$SENTINEL" "$OUTPUT"

expect_reject issue close 186
expect_reject issue close 186 --repo other/repository
expect_reject issue close 186 --repo "$REPO" --repo "$REPO"
expect_reject issue close 186 -R "$REPO"
expect_reject issue close 186 "--repo=$REPO"

GH_STUB_EXIT=9 run_guard "${project_args[@]}"
[[ "$RUN_STATUS" -eq 9 ]]
grep -q '^RESULT=failure$' "$OUTPUT"
grep -q '^CHILD_EXIT=9$' "$OUTPUT"
! grep -q '^RESULT=success$' "$OUTPUT"

echo 'gh write guard fixtures passed'
