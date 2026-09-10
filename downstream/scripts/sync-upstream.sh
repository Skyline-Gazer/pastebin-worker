#!/usr/bin/env bash
# Fast-forward-only mirror of SharzyL/pastebin-worker:goshujin onto
# Skyline-Gazer/pastebin-worker:upstream-sync. Never writes official upstream,
# downstream/main, release.json, patches, tags, or production.
set -euo pipefail

ROOT="${RELEASE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ORIGIN_REMOTE="${ORIGIN_REMOTE:-origin}"
OFFICIAL_REMOTE="${OFFICIAL_REMOTE:-official}"
OFFICIAL_FETCH_URL="${OFFICIAL_FETCH_URL:-https://github.com/SharzyL/pastebin-worker.git}"
REQUIRED_REPO="Skyline-Gazer/pastebin-worker"
SYNC_REF="refs/heads/upstream-sync"
OFFICIAL_BRANCH="goshujin"

PREVIOUS_UPSTREAM_SYNC_SHA=""
OFFICIAL_UPSTREAM_SHA=""
FINAL_UPSTREAM_SYNC_SHA=""
UPSTREAM_SYNC_STATUS="NOT_STARTED"
PATCH_COMPATIBILITY="NOT_RUN"
RELEASE_PIN=""
RELEASE_PIN_CHANGED="NO"
DOWNSTREAM_MAIN_CHANGED="NO"
PRODUCTION_CHANGED="NO"
OFFICIAL_UPSTREAM_WRITTEN="NO"
PATCH_REBASE_NOTE=""

emit_summary() {
  echo "UPSTREAM_SOURCE:"
  echo "SharzyL/pastebin-worker:goshujin"
  echo
  echo "PREVIOUS_UPSTREAM_SYNC_SHA:"
  echo "${PREVIOUS_UPSTREAM_SYNC_SHA:-unknown}"
  echo
  echo "OFFICIAL_UPSTREAM_SHA:"
  echo "${OFFICIAL_UPSTREAM_SHA:-unknown}"
  echo
  echo "FINAL_UPSTREAM_SYNC_SHA:"
  echo "${FINAL_UPSTREAM_SYNC_SHA:-unknown}"
  echo
  echo "UPSTREAM_SYNC_STATUS:"
  echo "${UPSTREAM_SYNC_STATUS}"
  echo
  echo "PATCH_COMPATIBILITY:"
  echo "${PATCH_COMPATIBILITY}"
  echo
  echo "RELEASE_PIN:"
  echo "${RELEASE_PIN:-unknown}"
  echo
  echo "RELEASE_PIN_CHANGED:"
  echo "${RELEASE_PIN_CHANGED}"
  echo
  echo "DOWNSTREAM_MAIN_CHANGED:"
  echo "${DOWNSTREAM_MAIN_CHANGED}"
  echo
  echo "PRODUCTION_CHANGED:"
  echo "${PRODUCTION_CHANGED}"
  echo
  echo "OFFICIAL_UPSTREAM_WRITTEN:"
  echo "${OFFICIAL_UPSTREAM_WRITTEN}"
  echo
  echo "UPSTREAM_SOURCE=SharzyL/pastebin-worker:goshujin"
  echo "PREVIOUS_UPSTREAM_SYNC_SHA=${PREVIOUS_UPSTREAM_SYNC_SHA:-unknown}"
  echo "OFFICIAL_UPSTREAM_SHA=${OFFICIAL_UPSTREAM_SHA:-unknown}"
  echo "FINAL_UPSTREAM_SYNC_SHA=${FINAL_UPSTREAM_SYNC_SHA:-unknown}"
  echo "UPSTREAM_SYNC_STATUS=${UPSTREAM_SYNC_STATUS}"
  echo "PATCH_COMPATIBILITY=${PATCH_COMPATIBILITY}"
  echo "RELEASE_PIN=${RELEASE_PIN:-unknown}"
  echo "RELEASE_PIN_CHANGED=${RELEASE_PIN_CHANGED}"
  echo "DOWNSTREAM_MAIN_CHANGED=${DOWNSTREAM_MAIN_CHANGED}"
  echo "PRODUCTION_CHANGED=${PRODUCTION_CHANGED}"
  echo "OFFICIAL_UPSTREAM_WRITTEN=${OFFICIAL_UPSTREAM_WRITTEN}"
  if [[ -n "$PATCH_REBASE_NOTE" ]]; then
    echo "$PATCH_REBASE_NOTE"
  fi
}

die() {
  echo "$*" >&2
  emit_summary
  exit 1
}

read_release_pin() {
  local file="$ROOT/downstream/release.json"
  [[ -f "$file" ]] || die "Missing downstream/release.json."
  RELEASE_PIN="$(python3 - "$file" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as source:
    data = json.load(source)
print(data["upstream"]["commit"])
PY
)"
}

ensure_official_remote() {
  if git -C "$ROOT" remote get-url "$OFFICIAL_REMOTE" >/dev/null 2>&1; then
    git -C "$ROOT" remote set-url "$OFFICIAL_REMOTE" "$OFFICIAL_FETCH_URL"
  else
    git -C "$ROOT" remote add "$OFFICIAL_REMOTE" "$OFFICIAL_FETCH_URL"
  fi
  git -C "$ROOT" remote set-url --push "$OFFICIAL_REMOTE" "no_push://disabled-by-policy"
}

classify() {
  local sync="$1"
  local official="$2"
  if [[ "$sync" == "$official" ]]; then
    echo EQUAL
  elif git -C "$ROOT" merge-base --is-ancestor "$sync" "$official"; then
    echo FAST_FORWARD
  elif git -C "$ROOT" merge-base --is-ancestor "$official" "$sync"; then
    echo LOCAL_AHEAD
  else
    echo DIVERGED
  fi
}

run_patch_compat() {
  local base="$1"
  if bash "$ROOT/downstream/scripts/check-patches.sh" "$base"; then
    PATCH_COMPATIBILITY="PASS"
    return 0
  fi
  PATCH_COMPATIBILITY="FAIL"
  PATCH_REBASE_NOTE="UPSTREAM_ADVANCED_PATCH_REBASE_REQUIRED"
  return 1
}

[[ "${GITHUB_REPOSITORY:-}" == "$REQUIRED_REPO" ]] || die "Refusing to run: GITHUB_REPOSITORY must be ${REQUIRED_REPO}."

read_release_pin
ensure_official_remote

PREVIOUS_UPSTREAM_SYNC_SHA="$(git -C "$ROOT" ls-remote "$ORIGIN_REMOTE" "$SYNC_REF" | awk '{print $1}')"
OFFICIAL_UPSTREAM_SHA="$(git -C "$ROOT" ls-remote "$OFFICIAL_REMOTE" "refs/heads/${OFFICIAL_BRANCH}" | awk '{print $1}')"
[[ -n "$PREVIOUS_UPSTREAM_SYNC_SHA" && -n "$OFFICIAL_UPSTREAM_SHA" ]] || die "Could not resolve origin/upstream-sync or official goshujin."
git -C "$ROOT" fetch "$ORIGIN_REMOTE" "$SYNC_REF"
git -C "$ROOT" fetch "$OFFICIAL_REMOTE" "refs/heads/${OFFICIAL_BRANCH}"
FINAL_UPSTREAM_SYNC_SHA="$PREVIOUS_UPSTREAM_SYNC_SHA"

KIND="$(classify "$PREVIOUS_UPSTREAM_SYNC_SHA" "$OFFICIAL_UPSTREAM_SHA")"

case "$KIND" in
  EQUAL)
    UPSTREAM_SYNC_STATUS="NOOP"
    FINAL_UPSTREAM_SYNC_SHA="$PREVIOUS_UPSTREAM_SYNC_SHA"
    ;;
  FAST_FORWARD)
    UPSTREAM_SYNC_STATUS="FAST_FORWARD_AVAILABLE"
    if ! git -C "$ROOT" push "$ORIGIN_REMOTE" "${OFFICIAL_UPSTREAM_SHA}:${SYNC_REF}"; then
      die "Fast-forward push of ${SYNC_REF} was rejected. Fail closed; no force."
    fi
    FINAL_UPSTREAM_SYNC_SHA="$(git -C "$ROOT" ls-remote "$ORIGIN_REMOTE" "$SYNC_REF" | awk '{print $1}')"
    [[ "$FINAL_UPSTREAM_SYNC_SHA" == "$OFFICIAL_UPSTREAM_SHA" ]] || die "Post-push origin/upstream-sync does not match official SHA."
    UPSTREAM_SYNC_STATUS="FAST_FORWARDED"
    ;;
  LOCAL_AHEAD)
    UPSTREAM_SYNC_STATUS="LOCAL_AHEAD_BLOCKED"
    ;;
  DIVERGED)
    UPSTREAM_SYNC_STATUS="DIVERGED_BLOCKED"
    ;;
  *)
    die "Unknown ancestry classification: $KIND"
    ;;
esac

PATCH_OK=0
if run_patch_compat "$OFFICIAL_UPSTREAM_SHA"; then
  PATCH_OK=1
fi

if [[ "$UPSTREAM_SYNC_STATUS" == "LOCAL_AHEAD_BLOCKED" || "$UPSTREAM_SYNC_STATUS" == "DIVERGED_BLOCKED" ]]; then
  die "upstream-sync is ${UPSTREAM_SYNC_STATUS}; refusing to merge, rebase, reset, or rewind."
fi

if [[ "$PATCH_OK" -ne 1 ]]; then
  die "Patch series does not replay onto official SHA ${OFFICIAL_UPSTREAM_SHA}."
fi

emit_summary
