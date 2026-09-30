#!/usr/bin/env bash
set -uo pipefail

OWNER="Skyline-Gazer"
REPO="Skyline-Gazer/pastebin-worker"
HOSTED_REPO="github.com/$REPO"
PROJECT_NUMBER="3"
PROJECT_ID="PVT_kwDOEwGMMc4BkEoc"
ISSUE_NUMBER="186"
ITEM_ID="PVTI_lADOEwGMMc4BkEoczg86CUA"
FIELD_ID="PVTSSF_lADOEwGMMc4BkEoczhi2l5A"
OPTION_ID="98236657"

# Pin every child CLI call to github.com, independent of caller environment.
unset GH_REPO GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR
GH_HOST="github.com"
export GH_HOST

refuse() {
  echo "Refusing GitHub write: unauthorized command or target." >&2
  exit 2
}

prepare_publication_context() {
  publish_root="$(git rev-parse --show-toplevel 2>/dev/null)" || refuse
  publish_branch="$(git -C "$publish_root" symbolic-ref --quiet --short HEAD 2>/dev/null)" || refuse
  [[ "$publish_branch" == codex/* ]] || refuse
  git -C "$publish_root" check-ref-format "refs/heads/$publish_branch" >/dev/null 2>&1 || refuse
  [[ -z "$(git -C "$publish_root" status --porcelain --untracked-files=all 2>/dev/null)" ]] || refuse

  fetch_url="$(git -C "$publish_root" remote get-url --all origin 2>/dev/null)" || refuse
  push_url="$(git -C "$publish_root" remote get-url --push --all origin 2>/dev/null)" || refuse
  [[ "$fetch_url" == "$push_url" ]] || refuse
  case "$fetch_url" in
    "git@github.com:$REPO"|"git@github.com:$REPO.git"|\
    "ssh://git@github.com/$REPO"|"ssh://git@github.com/$REPO.git"|\
    "https://github.com/$REPO"|"https://github.com/$REPO.git") ;;
    *) refuse ;;
  esac
  [[ -z "${GIT_SSH:-}" && -z "${GIT_SSH_COMMAND:-}" && -z "${GIT_PROXY_COMMAND:-}" ]] || refuse
  ssh_command="$(git -C "$publish_root" config --get core.sshCommand 2>/dev/null || true)"
  [[ -z "$ssh_command" ]] || refuse
  mirror="$(git -C "$publish_root" config --bool --get remote.origin.mirror 2>/dev/null)"
  mirror_status=$?
  [[ "$mirror_status" -eq 1 || ( "$mirror_status" -eq 0 && "$mirror" != true ) ]] || refuse

  git -C "$publish_root" fetch --quiet origin refs/heads/downstream/main >/dev/null 2>&1 || refuse
  publish_base="$(git -C "$publish_root" rev-parse --verify 'FETCH_HEAD^{commit}' 2>/dev/null)" || refuse
  publish_head="$(git -C "$publish_root" rev-parse --verify 'HEAD^{commit}' 2>/dev/null)" || refuse
  git -C "$publish_root" merge-base --is-ancestor "$publish_base" "$publish_head" 2>/dev/null || refuse
}

reject_proxy_route() {
  publish_root="$(git rev-parse --show-toplevel 2>/dev/null)" || refuse
  fetch_url="$(git -C "$publish_root" remote get-url --all origin 2>/dev/null)" || refuse
  case "$fetch_url" in
    "https://github.com/$REPO"|"https://github.com/$REPO.git") ;;
    *) refuse ;;
  esac
  for variable in HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy; do
    [[ -z "${!variable:-}" ]] || refuse
  done
  proxy_config="$(git -C "$publish_root" config --name-only --get-regexp \
    '^(core\.gitProxy|remote\.origin\.proxy|http(\..*)?\.proxy)$' 2>/dev/null || true)"
  [[ -z "$proxy_config" ]] || refuse
}

args=("$@")
route_args=()
repo_count=0
repo=""

for ((i = 0; i < ${#args[@]}; i++)); do
  case "${args[i]}" in
    --repo)
      ((i + 1 < ${#args[@]})) || refuse
      repo_count=$((repo_count + 1))
      repo="${args[i + 1]}"
      i=$((i + 1))
      ;;
    -R*|--repo*|--hostname*|--host*|-h*)
      refuse
      ;;
    *)
      route_args+=("${args[i]}")
      ;;
  esac
done

[[ "$repo_count" -eq 1 && "$repo" == "$HOSTED_REPO" && ${#route_args[@]} -gt 0 ]] || refuse
[[ "${route_args[0]}" != -* ]] || refuse

if [[ "${route_args[0]}:${route_args[1]-}" == "git:push" ]]; then
  if [[ ${#args[@]} -eq 4 && ${args[0]} == git && ${args[1]} == push && \
    ${args[2]} == --repo && ${args[3]} == "$HOSTED_REPO" && ${#route_args[@]} -eq 2 ]]; then
    prepare_publication_context
    remote_ref="refs/heads/$publish_branch"
    remote_branch="$(git -C "$publish_root" ls-remote --heads origin "$remote_ref" 2>/dev/null)" || refuse
    [[ -z "$remote_branch" ]] || refuse

    printf '%s\n' \
      "TARGET_OWNER=$OWNER" \
      "TARGET_HOST=github.com" \
      "TARGET_REPO=${REPO##*/}" \
      "TARGET_ACTION=git_branch_push" \
      "TARGET_BASE_SHA=$publish_base" \
      "TARGET_HEAD_REF=$remote_ref" \
      "TARGET_HEAD=$publish_head"
    git -C "$publish_root" -c core.hooksPath=/dev/null push --porcelain --no-follow-tags \
      "--force-with-lease=$remote_ref:" origin "HEAD:$remote_ref"
    status=$?
    if [[ "$status" -eq 0 ]]; then
      echo "RESULT=success"
    else
      echo "RESULT=failure"
    fi
    echo "CHILD_EXIT=$status"
    exit "$status"
  fi

  [[ ${#args[@]} -eq 6 && ${args[0]} == git && ${args[1]} == push && \
    ${args[2]} == --repo && ${args[3]} == "$HOSTED_REPO" && \
    ${args[4]} == --expected-head && ${#route_args[@]} -eq 4 ]] || refuse
  expected_remote_head="${args[5]}"
  [[ "$expected_remote_head" =~ ^[0-9a-f]{40}$ ]] || refuse
  reject_proxy_route
  prepare_publication_context
  remote_ref="refs/heads/$publish_branch"
  [[ "$expected_remote_head" != "$publish_head" ]] || refuse

  remote_branch="$(git -C "$publish_root" ls-remote --heads origin "$remote_ref" 2>/dev/null)" || refuse
  [[ "$remote_branch" == "$expected_remote_head"$'\t'"$remote_ref" ]] || refuse
  git -C "$publish_root" fetch --quiet origin "$remote_ref" >/dev/null 2>&1 || refuse
  fetched_head="$(git -C "$publish_root" rev-parse --verify 'FETCH_HEAD^{commit}' 2>/dev/null)" || refuse
  [[ "$fetched_head" == "$expected_remote_head" ]] || refuse
  git -C "$publish_root" merge-base --is-ancestor "$expected_remote_head" "$publish_head" 2>/dev/null || refuse

  git -C "$publish_root" fetch --quiet origin refs/heads/downstream/main >/dev/null 2>&1 || refuse
  publish_base="$(git -C "$publish_root" rev-parse --verify 'FETCH_HEAD^{commit}' 2>/dev/null)" || refuse
  git -C "$publish_root" merge-base --is-ancestor "$publish_base" "$publish_head" 2>/dev/null || refuse
  current_branch="$(git -C "$publish_root" symbolic-ref --quiet --short HEAD 2>/dev/null)" || refuse
  current_head="$(git -C "$publish_root" rev-parse --verify 'HEAD^{commit}' 2>/dev/null)" || refuse
  [[ "$current_branch" == "$publish_branch" && "$current_head" == "$publish_head" ]] || refuse
  [[ -z "$(git -C "$publish_root" status --porcelain --untracked-files=all 2>/dev/null)" ]] || refuse
  remote_branch="$(git -C "$publish_root" ls-remote --heads origin "$remote_ref" 2>/dev/null)" || refuse
  [[ "$remote_branch" == "$expected_remote_head"$'\t'"$remote_ref" ]] || refuse

  printf '%s\n' \
    "TARGET_OWNER=$OWNER" \
    "TARGET_HOST=github.com" \
    "TARGET_REPO=${REPO##*/}" \
    "TARGET_ACTION=git_branch_fast_forward_update" \
    "TARGET_BASE_SHA=$publish_base" \
    "TARGET_EXPECTED_REMOTE_HEAD=$expected_remote_head" \
    "TARGET_HEAD_REF=$remote_ref" \
    "TARGET_HEAD=$publish_head"
  git -C "$publish_root" -c core.hooksPath=/dev/null push --porcelain \
    --no-follow-tags "--force-with-lease=$remote_ref:$expected_remote_head" \
    origin "$publish_head:$remote_ref"
  status=$?
  if [[ "$status" -eq 0 ]]; then
    echo "RESULT=success"
  else
    echo "RESULT=failure"
  fi
  echo "CHILD_EXIT=$status"
  exit "$status"
fi

if [[ "${route_args[0]}:${route_args[1]-}" == "pr:create" ]]; then
  [[ ${#args[@]} -eq 12 && ${#route_args[@]} -eq 10 && \
    ${args[0]} == pr && ${args[1]} == create && \
    ${args[2]} == --repo && ${args[3]} == "$HOSTED_REPO" && \
    ${args[4]} == --base && ${args[5]} == downstream/main && \
    ${args[6]} == --head && ${args[8]} == --title && \
    ${args[10]} == --body-file ]] || refuse
  pr_branch="${args[7]}"
  pr_title="${args[9]}"
  pr_body="${args[11]}"
  [[ -n "$pr_title" && "$pr_body" == /* && -s "$pr_body" && ! -L "$pr_body" ]] || refuse

  prepare_publication_context
  [[ "$publish_branch" == "$pr_branch" ]] || refuse
  remote_ref="refs/heads/$publish_branch"
  remote_branch="$(git -C "$publish_root" ls-remote --heads origin "$remote_ref" 2>/dev/null)" || refuse
  [[ "$remote_branch" == "$publish_head"$'\t'"$remote_ref" ]] || refuse
  cd / || refuse
  existing_pr="$(gh pr list --repo "$HOSTED_REPO" --head "$publish_branch" \
    --state all --json number --jq 'length' 2>/dev/null)" || refuse
  [[ "$existing_pr" == 0 ]] || refuse

  printf '%s\n' \
    "TARGET_OWNER=$OWNER" \
    "TARGET_HOST=github.com" \
    "TARGET_REPO=${REPO##*/}" \
    "TARGET_ACTION=pr_create" \
    "TARGET_BASE=downstream/main" \
    "TARGET_BASE_SHA=$publish_base" \
    "TARGET_HEAD=$publish_branch" \
    "TARGET_HEAD_SHA=$publish_head"
  gh pr create --repo "$HOSTED_REPO" --base downstream/main \
    --head "$publish_branch" --title "$pr_title" --body-file "$pr_body"
  status=$?
  if [[ "$status" -eq 0 ]]; then
    echo "RESULT=success"
  else
    echo "RESULT=failure"
  fi
  echo "CHILD_EXIT=$status"
  exit "$status"
fi

[[ "${route_args[0]}" != "api" && "${route_args[0]}" != "repo" ]] || refuse

# Only core comment commands and the fixed Project route may use passthrough.
# This blocks user-defined top-level gh aliases/extensions from selecting an
# unreviewed API, repository, Project, or host route.
case "${route_args[0]}:${route_args[1]-}" in
  issue:comment|pr:comment|project:item-edit) ;;
  *) refuse ;;
esac

for arg in "${route_args[@]}"; do
  [[ "$arg" != *://* ]] || refuse
done

cd / || refuse

if [[ "${route_args[0]}" == "project" ]]; then
  expected=(
    project item-edit
    --repo "$HOSTED_REPO"
    --id "$ITEM_ID"
    --field-id "$FIELD_ID"
    --project-id "$PROJECT_ID"
    --single-select-option-id "$OPTION_ID"
  )
  [[ ${#args[@]} -eq ${#expected[@]} ]] || refuse
  for ((i = 0; i < ${#expected[@]}; i++)); do
    [[ "${args[i]}" == "${expected[i]}" ]] || refuse
  done

  printf '%s\n' \
    "TARGET_OWNER=$OWNER" \
    "TARGET_HOST=github.com" \
    "TARGET_REPO=${REPO##*/}" \
    "TARGET_ACTION=project_item_status_done" \
    "TARGET_PROJECT_NUMBER=$PROJECT_NUMBER" \
    "TARGET_PROJECT_ID=$PROJECT_ID" \
    "TARGET_ISSUE_NUMBER=$ISSUE_NUMBER" \
    "TARGET_ITEM_ID=$ITEM_ID" \
    "TARGET_FIELD_ID=$FIELD_ID" \
    "TARGET_OPTION_ID=$OPTION_ID"

  gh project item-edit \
    --id "$ITEM_ID" \
    --field-id "$FIELD_ID" \
    --project-id "$PROJECT_ID" \
    --single-select-option-id "$OPTION_ID"
  status=$?
  if [[ "$status" -eq 0 ]]; then
    echo "RESULT=success"
  else
    echo "RESULT=failure"
  fi
  echo "CHILD_EXIT=$status"
  exit "$status"
fi

printf '%s\n' \
  "TARGET_OWNER=$OWNER" \
  "TARGET_HOST=github.com" \
  "TARGET_REPO=${REPO##*/}" \
  "TARGET_ACTION=repository_write"
exec gh "${args[@]}"
