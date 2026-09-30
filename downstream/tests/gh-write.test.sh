#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WRAPPER="$ROOT/downstream/scripts/gh-write.sh"
FIXTURE="$(mktemp -d)"
LOG="$FIXTURE/gh.args"
ENV_LOG="$FIXTURE/gh.env"
CALLER="$FIXTURE/caller"
OUTPUT="$FIXTURE/output"
EXPECTED="$FIXTURE/expected"
EXPECTED_ENV="$FIXTURE/expected.env"
GIT_STUB_LOG="$FIXTURE/git.args"
GH_STUB_READ_LOG="$FIXTURE/gh.read.args"
trap 'rm -rf "$FIXTURE"' EXIT

[[ -x "$WRAPPER" ]] || {
  echo "Expected executable wrapper: $WRAPPER" >&2
  exit 1
}

mkdir "$FIXTURE/bin"
cat >"$FIXTURE/bin/gh" <<'STUB'
#!/usr/bin/env bash
if [[ "${1-}" == "pr" && "${2-}" == "list" ]]; then
  printf '%s\n' "$@" >>"$GH_STUB_READ_LOG"
  printf '%s\n' "${GH_STUB_PR_COUNT:-0}"
  exit 0
fi
printf '%s\n' "$@" >"$GH_STUB_LOG"
printf 'GH_HOST=%s\n' "${GH_HOST-unset}" >"$GH_STUB_ENV_LOG"
printf 'GH_REPO=%s\n' "${GH_REPO-unset}" >>"$GH_STUB_ENV_LOG"
printf 'GIT_DIR=%s\n' "${GIT_DIR-unset}" >>"$GH_STUB_ENV_LOG"
printf 'GIT_WORK_TREE=%s\n' "${GIT_WORK_TREE-unset}" >>"$GH_STUB_ENV_LOG"
printf 'GIT_COMMON_DIR=%s\n' "${GIT_COMMON_DIR-unset}" >>"$GH_STUB_ENV_LOG"
printf 'PWD=%s\n' "$(pwd -P)" >>"$GH_STUB_ENV_LOG"
exit "${GH_STUB_EXIT:-0}"
STUB
chmod +x "$FIXTURE/bin/gh"
mkdir "$CALLER"
git -C "$CALLER" init -q
git -C "$CALLER" remote add origin https://attacker.example/attacker/repository.git
export GH_STUB_LOG="$LOG"
export GH_STUB_ENV_LOG="$ENV_LOG"
export GH_STUB_READ_LOG
export GH_HOST="attacker.example"
export GH_REPO="attacker/target"
export GIT_DIR="$CALLER/.git"
export GIT_WORK_TREE="$CALLER"
export GIT_COMMON_DIR="$CALLER/.git"

run_guard() {
  : >"$LOG"
  : >"$ENV_LOG"
  set +e
  (cd "$CALLER" && GH_STUB_EXIT="${GH_STUB_EXIT:-0}" PATH="$FIXTURE/bin:$PATH" \
    "$WRAPPER" "$@") >"$OUTPUT" 2>&1
  RUN_STATUS=$?
  set -e
}

expect_reject() {
  run_guard "$@"
  [[ "$RUN_STATUS" -eq 2 ]]
  [[ ! -s "$LOG" && ! -s "$ENV_LOG" ]]
  ! grep -q '^TARGET_ACTION=' "$OUTPUT"
  ! grep -q '^RESULT=success$' "$OUTPUT"
}

REPO="github.com/Skyline-Gazer/pastebin-worker"
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
printf 'GH_HOST=github.com\nGH_REPO=unset\nGIT_DIR=unset\nGIT_WORK_TREE=unset\nGIT_COMMON_DIR=unset\nPWD=/\n' >"$EXPECTED_ENV"
diff -u "$EXPECTED_ENV" "$ENV_LOG"
grep -q '^TARGET_OWNER=Skyline-Gazer$' "$OUTPUT"
grep -q '^TARGET_HOST=github.com$' "$OUTPUT"
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
expect_reject project item-edit -Rother/repository --repo "$REPO" --id "$ITEM_ID" --field-id "$FIELD_ID" --project-id "$PROJECT_ID" --single-select-option-id "$OPTION_ID"
expect_reject project item-edit -R=github.com/Skyline-Gazer/pastebin-worker --id "$ITEM_ID" --field-id "$FIELD_ID" --project-id "$PROJECT_ID" --single-select-option-id "$OPTION_ID"
expect_reject project item-edit "--repo=$REPO" --id "$ITEM_ID" --field-id "$FIELD_ID" --project-id "$PROJECT_ID" --single-select-option-id "$OPTION_ID"
expect_reject project item-edit --repo=github.enterprise.example/Skyline-Gazer/pastebin-worker --id "$ITEM_ID" --field-id "$FIELD_ID" --project-id "$PROJECT_ID" --single-select-option-id "$OPTION_ID"

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
expect_reject -- api graphql --repo "$REPO" -f query=mutation
expect_reject api --method POST graphql --repo "$REPO" -f query=mutation
expect_reject api https://api.github.com/graphql --repo "$REPO" -f query=mutation
expect_reject api repos/Skyline-Gazer/pastebin-worker/issues --repo "$REPO" --method POST
expect_reject repo archive other/repository --repo "$REPO"
expect_reject alias set escape 'api graphql mutation' --repo "$REPO"
expect_reject escape --repo "$REPO"
expect_reject extension dangerous --repo "$REPO"
expect_reject pr dangerous-alias 190 --repo "$REPO"
expect_reject issue close 186 --repo "$REPO"
expect_reject issue close https://github.com/cli/cli/issues/1 --repo "$REPO"
expect_reject issue close https://GitHub.com/cli/cli/issues/1 --repo "$REPO"
expect_reject issue close https://www.github.com/cli/cli/issues/1 --repo "$REPO"
expect_reject issue close http://github.com/Skyline-Gazer/pastebin-worker/issues/186 --repo "$REPO"
expect_reject issue close https://github.com/Skyline-Gazer/pastebin-worker/issues/186 --repo "$REPO"
expect_reject issue comment 186 --repo "$REPO" --body https://example.invalid
expect_reject issue close 186 --repo Skyline-Gazer/pastebin-worker
expect_reject issue close 186 --repo github.enterprise.example/Skyline-Gazer/pastebin-worker
expect_reject issue close 186 --repo github.com/other/repository
expect_reject --repo "$REPO"

SENTINEL="AUDIT_MUST_NOT_ECHO_CALLER_ARGUMENTS"
run_guard issue comment 186 --repo "$REPO" --body "$SENTINEL"
[[ "$RUN_STATUS" -eq 0 ]]
printf '%s\n' issue comment 186 --repo "$REPO" --body "$SENTINEL" >"$EXPECTED"
diff -u "$EXPECTED" "$LOG"
diff -u "$EXPECTED_ENV" "$ENV_LOG"
grep -q '^TARGET_ACTION=repository_write$' "$OUTPUT"
! grep -q "$SENTINEL" "$OUTPUT"

run_guard pr comment 190 --repo "$REPO" --body-file "$FIXTURE/review.md"
[[ "$RUN_STATUS" -eq 0 ]]
printf '%s\n' pr comment 190 --repo "$REPO" --body-file "$FIXTURE/review.md" >"$EXPECTED"
diff -u "$EXPECTED" "$LOG"
diff -u "$EXPECTED_ENV" "$ENV_LOG"
grep -q '^TARGET_ACTION=repository_write$' "$OUTPUT"

for scheme in http https; do
  for host in github.com GitHub.com www.github.com; do
    for target in issues pull; do
      expect_reject issue comment "$scheme://$host/cli/cli/$target/1" \
        --repo "$REPO" --body "$SENTINEL"
    done
    expect_reject pr comment "$scheme://$host/cli/cli/pull/1" \
      --repo "$REPO" --body "$SENTINEL"
  done
done

expect_reject issue close 186
expect_reject issue close 186 --repo other/repository
expect_reject issue close 186 --repo "$REPO" --repo "$REPO"
expect_reject issue close 186 -R "$REPO"
expect_reject issue close 186 -Rother/repository --repo "$REPO"
expect_reject issue close 186 -R=github.com/Skyline-Gazer/pastebin-worker --repo "$REPO"
expect_reject issue close 186 "--repo=$REPO"
expect_reject issue close 186 --repository "$REPO" --repo "$REPO"
expect_reject issue close 186 --repo-target "$REPO" --repo "$REPO"
expect_reject issue close 186 --repo=github.enterprise.example/Skyline-Gazer/pastebin-worker
expect_reject issue close 186 --repo "$REPO" --hostname github.enterprise.example
expect_reject issue close 186 --repo "$REPO" --hostname=github.enterprise.example
expect_reject issue close 186 --repo "$REPO" --host github.enterprise.example
expect_reject issue close 186 --repo "$REPO" -h github.enterprise.example

GH_STUB_EXIT=9 run_guard "${project_args[@]}"
[[ "$RUN_STATUS" -eq 9 ]]
grep -q '^RESULT=failure$' "$OUTPUT"
grep -q '^CHILD_EXIT=9$' "$OUTPUT"
! grep -q '^RESULT=success$' "$OUTPUT"

# Exercise guarded publication with local command stubs; these cases use no network.
REAL_GIT="$(command -v git)"
unset GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR
GIT_BIN="$FIXTURE/gitbin"
WRITE_REPO="$FIXTURE/write-repo"
PUSH_BRANCH="codex/guard-test"
mkdir -p "$GIT_BIN" "$WRITE_REPO"
cat >"$GIT_BIN/git" <<'GIT_STUB'
#!/usr/bin/env bash
args=("$@")
repo=""
command_index=0
if [[ "${args[0]-}" == "-C" ]]; then
  repo="${args[1]}"
  command_index=2
fi
while [[ "${args[command_index]-}" == "-c" ]]; do
  command_index=$((command_index + 2))
done
command="${args[command_index]-}"
case "$command" in
  fetch)
    ref="${args[${#args[@]}-1]}"
    case "$ref" in
      refs/heads/downstream/main) fetched="$GIT_STUB_BASE" ;;
      refs/heads/*) fetched="${GIT_STUB_FETCH_SHA:-${GIT_STUB_REMOTE_SHA:-$GIT_STUB_BASE}}" ;;
      *) exit 1 ;;
    esac
    printf "%s\t\t%s of origin\n" "$fetched" "$ref" >"$repo/.git/FETCH_HEAD"
    exit 0
    ;;
  ls-remote)
    ref=""
    for arg in "${args[@]}"; do
      [[ "$arg" == refs/heads/* ]] && ref="$arg"
    done
    if [[ "$ref" == "refs/heads/${GIT_STUB_REMOTE_BRANCH:-}" && -n "${GIT_STUB_REMOTE_BRANCH:-}" ]]; then
      sha="${GIT_STUB_REMOTE_SHA:-$GIT_STUB_BASE}"
      if [[ -n "${GIT_STUB_REMOTE_COUNT_FILE:-}" ]]; then
        count=0
        [[ -f "$GIT_STUB_REMOTE_COUNT_FILE" ]] && read -r count <"$GIT_STUB_REMOTE_COUNT_FILE"
        count=$((count + 1))
        printf '%s\n' "$count" >"$GIT_STUB_REMOTE_COUNT_FILE"
        if [[ "$count" -gt 1 && -n "${GIT_STUB_REMOTE_SHA_AFTER_FIRST:-}" ]]; then
          sha="$GIT_STUB_REMOTE_SHA_AFTER_FIRST"
        fi
      fi
      printf '%s\t%s\n' "$sha" "$ref"
    fi
    exit 0
    ;;
  push)
    printf '%s\n' "${args[@]}" >"$GIT_STUB_LOG"
    exit "${GIT_STUB_PUSH_EXIT:-0}"
    ;;
  *)
    exec "$GH_TEST_REAL_GIT" "${args[@]}"
    ;;
esac
GIT_STUB
chmod +x "$GIT_BIN/git"
git -C "$WRITE_REPO" init -q
git -C "$WRITE_REPO" config user.name GuardTest
git -C "$WRITE_REPO" config user.email guard-test@example.invalid
git -C "$WRITE_REPO" checkout -q -b downstream/main
printf 'base\n' >"$WRITE_REPO/input"
git -C "$WRITE_REPO" add input
git -C "$WRITE_REPO" commit -qm base
WRITE_BASE="$(git -C "$WRITE_REPO" rev-parse HEAD)"
git -C "$WRITE_REPO" checkout -q -b "$PUSH_BRANCH"
printf 'topic\n' >>"$WRITE_REPO/input"
git -C "$WRITE_REPO" commit -qam topic
WRITE_HEAD="$(git -C "$WRITE_REPO" rev-parse HEAD)"
WRITE_REPO_REAL="$(git -C "$WRITE_REPO" rev-parse --show-toplevel)"
git -C "$WRITE_REPO" remote add origin git@github.com:Skyline-Gazer/pastebin-worker.git
printf 'Planning PR body\n' >"$FIXTURE/pr-body.md"
export GH_TEST_REAL_GIT="$REAL_GIT"
export GIT_STUB_BASE="$WRITE_BASE"
export GIT_STUB_LOG
export GIT_STUB_REMOTE_COUNT_FILE="$FIXTURE/ls-remote.count"

run_publish_guard() {
  : >"$GIT_STUB_LOG"
  : >"$GIT_STUB_REMOTE_COUNT_FILE"
  set +e
  (cd "$WRITE_REPO" && PATH="$GIT_BIN:$FIXTURE/bin:$PATH" \
    "$WRAPPER" "$@") >"$OUTPUT" 2>&1
  RUN_STATUS=$?
  set -e
}

run_publish_guard git push --repo "$REPO"
[[ "$RUN_STATUS" -eq 0 ]]
grep -q '^TARGET_ACTION=git_branch_push$' "$OUTPUT"
grep -q "^TARGET_HEAD=$WRITE_HEAD$" "$OUTPUT"
printf '%s\n' -C "$WRITE_REPO_REAL" push --porcelain --no-follow-tags origin \
  "HEAD:refs/heads/$PUSH_BRANCH" >"$EXPECTED"
diff -u "$EXPECTED" "$GIT_STUB_LOG"
GIT_STUB_PUSH_EXIT=9 run_publish_guard git push --repo "$REPO"
[[ "$RUN_STATUS" -eq 9 ]]
grep -q '^RESULT=failure$' "$OUTPUT"
grep -q '^CHILD_EXIT=9$' "$OUTPUT"

expect_publish_reject() {
  run_publish_guard "$@"
  [[ "$RUN_STATUS" -eq 2 ]]
  [[ ! -s "$GIT_STUB_LOG" ]]
  ! grep -q '^TARGET_ACTION=git_branch_push$' "$OUTPUT"
}

expect_publish_reject git push --force --repo "$REPO"
expect_publish_reject git push --delete origin "$PUSH_BRANCH" --repo "$REPO"
expect_publish_reject git push --repo other/repository
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" expect_publish_reject git push --repo "$REPO"
GIT_STUB_BASE="0000000000000000000000000000000000000000" \
  expect_publish_reject git push --repo "$REPO"
unset GIT_STUB_REMOTE_BRANCH
GIT_STUB_BASE="$WRITE_BASE"

expect_update_reject() {
  run_publish_guard "$@"
  [[ "$RUN_STATUS" -eq 2 ]]
  [[ ! -s "$GIT_STUB_LOG" ]]
  ! grep -q '^TARGET_ACTION=git_branch_fast_forward_update$' "$OUTPUT"
}

UPDATE_ARGS=(git push --repo "$REPO" --expected-head "$WRITE_BASE")
git -C "$WRITE_REPO" remote set-url origin https://github.com/Skyline-Gazer/pastebin-worker.git
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_BASE" \
  run_publish_guard "${UPDATE_ARGS[@]}"
[[ "$RUN_STATUS" -eq 0 ]]
grep -q '^TARGET_ACTION=git_branch_fast_forward_update$' "$OUTPUT"
grep -q "^TARGET_EXPECTED_REMOTE_HEAD=$WRITE_BASE$" "$OUTPUT"
grep -q "^TARGET_HEAD=$WRITE_HEAD$" "$OUTPUT"
printf '%s\n' -C "$WRITE_REPO_REAL" -c core.hooksPath=/dev/null push \
  --porcelain --no-follow-tags origin "$WRITE_HEAD:refs/heads/$PUSH_BRANCH" >"$EXPECTED"
diff -u "$EXPECTED" "$GIT_STUB_LOG"

GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_BASE" \
  GIT_STUB_PUSH_EXIT=9 run_publish_guard "${UPDATE_ARGS[@]}"
[[ "$RUN_STATUS" -eq 9 ]]
grep -q '^RESULT=failure$' "$OUTPUT"
grep -q '^CHILD_EXIT=9$' "$OUTPUT"

expect_update_reject git push --repo "$REPO" --expected-head not-a-commit
expect_update_reject git push --repo "$REPO" --expected-head "$WRITE_BASE" --force
expect_update_reject git push --repo other/repository --expected-head "$WRITE_BASE"
expect_update_reject git push --repo "$REPO" --expected-head "$WRITE_HEAD"
expect_update_reject git push --repo "$REPO" --expected-head "$WRITE_BASE" --tags
expect_update_reject git push --repo "$REPO" --expected-head "$WRITE_BASE" \
  "$WRITE_HEAD:refs/heads/other"
UNRELATED_TREE="$(printf '' | git -C "$WRITE_REPO" mktree)"
UNRELATED_HEAD="$(printf 'unrelated fixture commit\n' | git -C "$WRITE_REPO" commit-tree "$UNRELATED_TREE")"
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$UNRELATED_HEAD" \
  expect_update_reject git push --repo "$REPO" --expected-head "$UNRELATED_HEAD"
GIT_STUB_REMOTE_BRANCH="" expect_update_reject "${UPDATE_ARGS[@]}"
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_HEAD" \
  expect_update_reject "${UPDATE_ARGS[@]}"
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_BASE" \
  GIT_STUB_FETCH_SHA="$WRITE_HEAD" expect_update_reject "${UPDATE_ARGS[@]}"
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_BASE" \
  GIT_STUB_REMOTE_SHA_AFTER_FIRST="$WRITE_HEAD" \
  expect_update_reject "${UPDATE_ARGS[@]}"
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_HEAD" \
  expect_update_reject git push --repo "$REPO" --expected-head "$WRITE_HEAD"
HTTPS_PROXY=https://proxy.invalid GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" \
  GIT_STUB_REMOTE_SHA="$WRITE_BASE" expect_update_reject "${UPDATE_ARGS[@]}"
GIT_SSH_COMMAND='ssh -o ProxyCommand=false' GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" \
  GIT_STUB_REMOTE_SHA="$WRITE_BASE" expect_update_reject "${UPDATE_ARGS[@]}"

git -C "$WRITE_REPO" config remote.origin.mirror true
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_BASE" \
  expect_update_reject "${UPDATE_ARGS[@]}"
git -C "$WRITE_REPO" config --unset remote.origin.mirror
git -C "$WRITE_REPO" config http.proxy https://proxy.invalid
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_BASE" \
  expect_update_reject "${UPDATE_ARGS[@]}"
git -C "$WRITE_REPO" config --unset http.proxy
git -C "$WRITE_REPO" remote set-url origin git@github.com:Skyline-Gazer/pastebin-worker.git
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_BASE" \
  expect_update_reject "${UPDATE_ARGS[@]}"
git -C "$WRITE_REPO" remote set-url origin https://github.com/Skyline-Gazer/pastebin-worker.git

git -C "$WRITE_REPO" switch -q downstream/main
expect_publish_reject git push --repo "$REPO"
git -C "$WRITE_REPO" switch -q "$PUSH_BRANCH"
printf 'dirty\n' >"$WRITE_REPO/untracked"
expect_publish_reject git push --repo "$REPO"
rm "$WRITE_REPO/untracked"
git -C "$WRITE_REPO" remote set-url origin https://attacker.example/other/repo.git
expect_publish_reject git push --repo "$REPO"
git -C "$WRITE_REPO" remote set-url origin git@github.com:Skyline-Gazer/pastebin-worker.git

PR_TITLE="Guarded planning publication"
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_HEAD" \
  run_publish_guard pr create --repo "$REPO" --base downstream/main \
  --head "$PUSH_BRANCH" --title "$PR_TITLE" --body-file "$FIXTURE/pr-body.md"
[[ "$RUN_STATUS" -eq 0 ]]
grep -q '^TARGET_ACTION=pr_create$' "$OUTPUT"
grep -q '^TARGET_BASE=downstream/main$' "$OUTPUT"
grep -q "^TARGET_HEAD=$PUSH_BRANCH$" "$OUTPUT"
printf '%s\n' pr create --repo "$REPO" --base downstream/main \
  --head "$PUSH_BRANCH" --title "$PR_TITLE" --body-file "$FIXTURE/pr-body.md" >"$EXPECTED"
diff -u "$EXPECTED" "$LOG"
printf '%s\n' pr list --repo "$REPO" --head "$PUSH_BRANCH" \
  --state all --json number --jq length >"$EXPECTED"
diff -u "$EXPECTED" "$GH_STUB_READ_LOG"
diff -u "$EXPECTED_ENV" "$ENV_LOG"

expect_pr_reject() {
  : >"$LOG"
  : >"$GH_STUB_READ_LOG"
  run_publish_guard "$@"
  [[ "$RUN_STATUS" -eq 2 ]]
  [[ ! -s "$LOG" && ! -s "$GH_STUB_READ_LOG" ]]
  ! grep -q '^TARGET_ACTION=pr_create$' "$OUTPUT"
}

expect_pr_reject pr create --repo "$REPO" --base upstream-sync \
  --head "$PUSH_BRANCH" --title "$PR_TITLE" --body-file "$FIXTURE/pr-body.md"
expect_pr_reject pr create --repo "$REPO" --base downstream/main \
  --head codex/other --title "$PR_TITLE" --body-file "$FIXTURE/pr-body.md"
expect_pr_reject pr create --repo "$REPO" --base downstream/main \
  --head "$PUSH_BRANCH" --title "$PR_TITLE" --body-file "$FIXTURE/missing.md"
expect_pr_reject pr create --repo "$REPO" --base downstream/main \
  --head "$PUSH_BRANCH" --title "$PR_TITLE" --body-file "$FIXTURE/pr-body.md" --draft

: >"$LOG"
: >"$GH_STUB_READ_LOG"
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_BASE" \
  run_publish_guard pr create --repo "$REPO" --base downstream/main \
  --head "$PUSH_BRANCH" --title "$PR_TITLE" --body-file "$FIXTURE/pr-body.md"
[[ "$RUN_STATUS" -eq 2 ]]
[[ ! -s "$LOG" && ! -s "$GH_STUB_READ_LOG" ]]

: >"$LOG"
: >"$GH_STUB_READ_LOG"
GH_STUB_PR_COUNT=1 GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" \
  GIT_STUB_REMOTE_SHA="$WRITE_HEAD" run_publish_guard pr create \
  --repo "$REPO" --base downstream/main --head "$PUSH_BRANCH" \
  --title "$PR_TITLE" --body-file "$FIXTURE/pr-body.md"
[[ "$RUN_STATUS" -eq 2 ]]
[[ ! -s "$LOG" ]]
grep -Fxq 'pr' "$GH_STUB_READ_LOG"
grep -Fxq 'list' "$GH_STUB_READ_LOG"

: >"$LOG"
: >"$GH_STUB_READ_LOG"
GIT_STUB_REMOTE_BRANCH="$PUSH_BRANCH" GIT_STUB_REMOTE_SHA="$WRITE_HEAD" \
  GH_STUB_EXIT=9 run_publish_guard pr create --repo "$REPO" \
  --base downstream/main --head "$PUSH_BRANCH" --title "$PR_TITLE" \
  --body-file "$FIXTURE/pr-body.md"
[[ "$RUN_STATUS" -eq 9 ]]
grep -q '^RESULT=failure$' "$OUTPUT"
grep -q '^CHILD_EXIT=9$' "$OUTPUT"

echo 'gh write guard fixtures passed'
