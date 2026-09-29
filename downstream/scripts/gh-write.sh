#!/usr/bin/env bash
set -uo pipefail

OWNER="Skyline-Gazer"
REPO="Skyline-Gazer/pastebin-worker"
PROJECT_NUMBER="3"
PROJECT_ID="PVT_kwDOEwGMMc4BkEoc"
ISSUE_NUMBER="186"
ITEM_ID="PVTI_lADOEwGMMc4BkEoczg86CUA"
FIELD_ID="PVTSSF_lADOEwGMMc4BkEoczhi2l5A"
OPTION_ID="98236657"

refuse() {
  echo "Refusing GitHub write: unauthorized command or target." >&2
  exit 2
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
    -R|--repo=*)
      refuse
      ;;
    *)
      route_args+=("${args[i]}")
      ;;
  esac
done

[[ "$repo_count" -eq 1 && "$repo" == "$REPO" && ${#route_args[@]} -gt 0 ]] || refuse

if [[ "${route_args[0]}" == "api" ]]; then
  for arg in "${route_args[@]:1}"; do
    [[ "$arg" == "graphql" || "$arg" == */graphql ]] && refuse
  done
fi

if [[ "${route_args[0]}" == "project" ]]; then
  expected=(
    project item-edit
    --repo "$REPO"
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
    "TARGET_REPO=${REPO#*/}" \
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
  "TARGET_REPO=${REPO#*/}" \
  "TARGET_ACTION=repository_write"
exec gh "${args[@]}"
