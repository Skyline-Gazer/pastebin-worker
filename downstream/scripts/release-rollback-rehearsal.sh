#!/usr/bin/env bash
set -euo pipefail

ROOT="${RELEASE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
TAG=""
PROVENANCE=""
MODE=""
FIRST_RELEASE_EXCEPTION="no"
SELECTED_SHA=""
TMPROOT=""
TAG_ROOT=""

cleanup() {
  if [[ -n "$TAG_ROOT" ]]; then
    git -C "$ROOT" worktree remove --force "$TAG_ROOT" >/dev/null 2>&1 || true
  fi
  [[ -n "$TMPROOT" ]] && rm -rf "$TMPROOT"
}
trap cleanup EXIT

report_failure() {
  echo 'ROLLBACK_REHEARSAL_STATUS=failed' >&2
  [[ -n "$MODE" ]] && echo "ROLLBACK_MODE=$MODE" >&2
  echo "FIRST_RELEASE_EXCEPTION=$FIRST_RELEASE_EXCEPTION" >&2
  [[ -n "$TAG" ]] && echo "SELECTED_TAG=$TAG" >&2
  [[ -n "$SELECTED_SHA" ]] && echo "SELECTED_TAG_SHA=$SELECTED_SHA" >&2
  echo 'DEPLOY_CLAIM=no' >&2
  echo "$1" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) TAG="${2:-}"; shift 2 ;;
    --root) ROOT="${2:-}"; shift 2 ;;
    --provenance) PROVENANCE="${2:-}"; shift 2 ;;
    *) report_failure 'Unsupported rollback rehearsal option.' ;;
  esac
done

[[ -n "$TAG" ]] || report_failure 'An explicit immutable tag is required.'
[[ -d "$ROOT/.git" || -f "$ROOT/.git" ]] || report_failure 'Rollback root is not a Git checkout.'
if [[ "$TAG" =~ ^downstream-v[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[1-9][0-9]*$ ]]; then
  MODE='production-tag'
elif [[ "$TAG" == fixture-nonprod-* ]]; then
  MODE='fixture'
  FIRST_RELEASE_EXCEPTION='yes'
else
  report_failure 'Tag must be a protected production tag or a fixture-nonprod-* tag.'
fi

git -C "$ROOT" show-ref --verify --quiet "refs/tags/$TAG" || report_failure 'Selected rollback authority is not an existing tag.'
SELECTED_SHA="$(git -C "$ROOT" rev-parse "refs/tags/$TAG^{commit}")" || report_failure 'Selected tag does not resolve to a commit.'
[[ "$SELECTED_SHA" =~ ^[0-9a-f]{40}$ ]] || report_failure 'Selected tag did not resolve to a commit SHA.'
TMPROOT="$(mktemp -d "${RELEASE_TMPDIR:-/tmp/release-rollback-rehearsal.XXXXXX}")"
TAG_ROOT="$TMPROOT/tagged-release"
git -C "$ROOT" worktree add --detach "$TAG_ROOT" "$SELECTED_SHA" >/dev/null || report_failure 'Could not create selected-tag worktree.'
[[ -x "$TAG_ROOT/downstream/scripts/release-candidate.sh" || -f "$TAG_ROOT/downstream/scripts/release-candidate.sh" ]] || report_failure 'Selected tag lacks the candidate gate.'

CANDIDATE_OUTPUT="$TMPROOT/candidate.out"
if ! RELEASE_ROOT="$TAG_ROOT" bash "$TAG_ROOT/downstream/scripts/release-candidate.sh" >"$CANDIDATE_OUTPUT" 2>&1; then
  grep -E '^(TARGET_(PASTEBIN|ADDON)|CANDIDATE_STATUS|DEPLOY_CLAIM)=|^Refusing |^Missing |^Invalid |^Pinned |^Series |^Patch ' "$CANDIDATE_OUTPUT" >&2 || true
  report_failure 'Selected-tag candidate validation failed.'
fi
grep -qx 'CANDIDATE_STATUS=passed' "$CANDIDATE_OUTPUT" || report_failure 'Selected-tag candidate did not pass.'
grep -qx 'TARGET_PASTEBIN=passed' "$CANDIDATE_OUTPUT" || report_failure 'Patched Pastebin target did not pass.'
grep -qx 'TARGET_ADDON=passed' "$CANDIDATE_OUTPUT" || report_failure 'Feishu Add-on target did not pass.'

PROVENANCE_MATCH='not-supplied'
if [[ -n "$PROVENANCE" ]]; then
  [[ -f "$PROVENANCE" ]] || report_failure 'Supplied provenance file does not exist.'
  if ! RELEASE_ROOT="$TAG_ROOT" python3 - "$PROVENANCE" "$SELECTED_SHA" "$CANDIDATE_OUTPUT" <<'PY'
import hashlib, json, os, re, sys
path, selected, candidate_path = sys.argv[1:]
data = json.load(open(path, encoding='utf-8'))
candidate = dict(line.split('=', 1) for line in open(candidate_path, encoding='utf-8').read().splitlines() if '=' in line)
required = ('schemaVersion', 'upstreamCommit', 'downstreamCommit', 'patchSeries', 'patches', 'assembledHead', 'assembledTree', 'targets')
if any(key not in data for key in required) or data['schemaVersion'] != 1: raise SystemExit(1)
if data['downstreamCommit'] != selected: raise SystemExit(1)
if data['assembledHead'] != candidate.get('ASSEMBLED_HEAD') or data['assembledTree'] != candidate.get('ASSEMBLED_TREE'): raise SystemExit(1)
if any(data['targets'].get(key, {}).get('status') != 'passed' for key in ('patchedPastebin', 'feishuAddon')): raise SystemExit(1)
root = os.environ['RELEASE_ROOT']
manifest = json.load(open(os.path.join(root, 'downstream/release.json'), encoding='utf-8'))
if data['upstreamCommit'] != manifest['upstream']['commit'] or data['patchSeries'] != manifest['patchSeries']: raise SystemExit(1)
expected = []
for line in open(os.path.join(root, manifest['patchSeries']), encoding='utf-8'):
    line = line.split('#', 1)[0].strip()
    if line:
        patch = os.path.join(root, 'downstream', 'patches', line)
        expected.append({'path': f'downstream/patches/{line}', 'sha256': hashlib.sha256(open(patch, 'rb').read()).hexdigest()})
if data['patches'] != expected: raise SystemExit(1)
PY
  then
    report_failure 'Supplied provenance does not match the selected committed inputs and assembly.'
  fi
  PROVENANCE_MATCH='passed'
fi

echo 'ROLLBACK_REHEARSAL_STATUS=passed'
echo "ROLLBACK_MODE=$MODE"
echo "FIRST_RELEASE_EXCEPTION=$FIRST_RELEASE_EXCEPTION"
echo "SELECTED_TAG=$TAG"
echo "SELECTED_TAG_SHA=$SELECTED_SHA"
echo 'TARGET_PASTEBIN=passed'
echo 'TARGET_ADDON=passed'
echo "PROVENANCE_MATCH=$PROVENANCE_MATCH"
echo 'DEPLOY_CLAIM=no'
