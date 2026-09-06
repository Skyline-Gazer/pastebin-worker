#!/usr/bin/env bash
set -euo pipefail

ROOT="${RELEASE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
TAG=""; PROVENANCE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) TAG="${2:-}"; shift 2 ;;
    --provenance) PROVENANCE="${2:-}"; shift 2 ;;
    --root) ROOT="${2:-}"; shift 2 ;;
    *) echo 'TAG_ELIGIBILITY=refused' >&2; exit 2 ;;
  esac
done
refuse() { echo 'TAG_ELIGIBILITY=refused' >&2; echo "$1" >&2; exit 1; }
[[ "$TAG" =~ ^downstream-v[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[1-9][0-9]*$ ]] || refuse 'Tag name does not match the protected downstream release pattern.'
[[ -f "$PROVENANCE" ]] || refuse 'A retained provenance artifact is required for audit comparison.'
git -C "$ROOT" diff --quiet && git -C "$ROOT" diff --cached --quiet || refuse 'Dirty checkout is not eligible.'
[[ -z "$(git -C "$ROOT" status --porcelain --untracked-files=normal)" ]] || refuse 'Untracked checkout content is not eligible.'
[[ "${RELEASE_TAG_EXISTS:-0}" == "1" ]] && refuse 'Release tag already exists and is immutable.'
git -C "$ROOT" show-ref --verify --quiet "refs/tags/$TAG" && refuse 'Release tag already exists and is immutable.'

TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
if ! RELEASE_ROOT="$ROOT" "$ROOT/downstream/scripts/release-candidate.sh" >"$TMP" 2>&1; then refuse 'Current commit is not independently validated.'; fi
grep -qx 'CANDIDATE_STATUS=passed' "$TMP" || refuse 'Current commit is not independently validated.'
CURRENT="$(git -C "$ROOT" rev-parse HEAD)"
RELEASE_ROOT="$ROOT" python3 - "$PROVENANCE" "$CURRENT" "$TMP" <<'PY'
import hashlib, json, os, re, sys
path, current, candidate = sys.argv[1:]
data = json.load(open(path, encoding='utf-8'))
lines = dict(line.split('=', 1) for line in open(candidate, encoding='utf-8').read().splitlines() if '=' in line)
required = ('schemaVersion', 'upstreamCommit', 'downstreamCommit', 'downstreamTag', 'tagState', 'patches', 'assembledHead', 'assembledTree', 'targets')
if any(key not in data for key in required): raise SystemExit(1)
if data['schemaVersion'] != 1 or data['downstreamCommit'] != current: raise SystemExit(1)
if data['downstreamTag'] is not None or data['tagState'] != 'not-created': raise SystemExit(1)
if data['assembledHead'] != lines.get('ASSEMBLED_HEAD') or data['assembledTree'] != lines.get('ASSEMBLED_TREE'): raise SystemExit(1)
if any(data['targets'].get(name, {}).get('status') != 'passed' for name in ('patchedPastebin', 'feishuAddon')): raise SystemExit(1)
if not re.fullmatch(r'[0-9a-f]{40}', data['upstreamCommit']): raise SystemExit(1)
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
echo 'TAG_ELIGIBILITY=eligible'
echo "TAG_CANDIDATE_COMMIT=$CURRENT"
