#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE_FILE="$ROOT/downstream/release.json"
BUILD_ROOT="${BUILD_ROOT:-$ROOT/.build}"

cleanup() {
  if [[ -n "${WORKTREE:-}" && -e "${WORKTREE:-}/.git" ]]; then
    git -C "$WORKTREE" am --abort >/dev/null 2>&1 || true
    git -C "$ROOT" worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

[[ -f "$RELEASE_FILE" ]] || {
  echo "Missing downstream/release.json." >&2
  echo "Create it from downstream/release.example.json and pin an exact upstream SHA." >&2
  exit 1
}

if [[ "${ALLOW_DIRTY:-0}" != "1" ]]; then
  git -C "$ROOT" diff --quiet && git -C "$ROOT" diff --cached --quiet || {
    echo "Refusing release assembly from a dirty downstream checkout." >&2
    exit 1
  }
  [[ -z "$(git -C "$ROOT" status --porcelain --untracked-files=normal)" ]] || {
    echo "Refusing release assembly with untracked files. Set ALLOW_DIRTY=1 only for local experimentation." >&2
    exit 1
  }
fi

mapfile -t manifest < <(python3 - "$RELEASE_FILE" <<'PY'
import json, sys
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    d = json.load(f)
print(d['upstream']['commit'])
print(d.get('patchSeries', 'downstream/patches/series'))
print(d.get('addon', {}).get('path', 'downstream/addons/feishu'))
PY
)
BASE="${manifest[0]}"
SERIES_REL="${manifest[1]}"
ADDON_REL="${manifest[2]}"
SERIES_FILE="$ROOT/$SERIES_REL"

git -C "$ROOT" cat-file -e "$BASE^{commit}" 2>/dev/null || {
  echo "Pinned upstream commit is not present locally: $BASE" >&2
  exit 1
}
[[ -f "$SERIES_FILE" ]] || { echo "Missing patch series file: $SERIES_REL" >&2; exit 1; }
[[ -d "$ROOT/$ADDON_REL" ]] || { echo "Missing Add-on path: $ADDON_REL" >&2; exit 1; }

mapfile -t PATCHES < <(
  sed -e 's/[[:space:]]*#.*$//' \
      -e '/^[[:space:]]*$/d' \
      -e 's/^[[:space:]]*//' \
      -e 's/[[:space:]]*$//' \
      "$SERIES_FILE"
)

for rel in "${PATCHES[@]}"; do
  [[ -f "$ROOT/downstream/patches/$rel" ]] || {
    echo "Series entry does not exist: downstream/patches/$rel" >&2
    exit 1
  }
done

mkdir -p "$BUILD_ROOT"
WORKTREE="$BUILD_ROOT/patched-upstream"
if [[ -e "$WORKTREE" ]]; then
  echo "Build worktree already exists: $WORKTREE" >&2
  echo "Remove it with 'git worktree remove --force $WORKTREE' before rebuilding." >&2
  exit 1
fi

git -C "$ROOT" worktree add --detach "$WORKTREE" "$BASE" >/dev/null

for rel in "${PATCHES[@]}"; do
  echo "Applying downstream/patches/$rel"
  if ! git -C "$WORKTREE" am --committer-date-is-author-date "$ROOT/downstream/patches/$rel"; then
    echo "Patch replay failed at downstream/patches/$rel" >&2
    echo "Release assembly stopped. Fix the responsible patch branch and regenerate the exported patch." >&2
    exit 1
  fi
done

DOWNSTREAM_SHA="$(git -C "$ROOT" rev-parse HEAD)"
UPSTREAM_SHA="$(git -C "$WORKTREE" rev-parse "$BASE")"
ASSEMBLED_HEAD="$(git -C "$WORKTREE" rev-parse HEAD)"
ASSEMBLED_TREE="$(git -C "$WORKTREE" rev-parse HEAD^{tree})"
PROVENANCE="$BUILD_ROOT/release-provenance.json"

python3 - "$ROOT" "$PROVENANCE" "$UPSTREAM_SHA" "$DOWNSTREAM_SHA" "$ASSEMBLED_HEAD" "$ASSEMBLED_TREE" "$SERIES_REL" "${PATCHES[@]}" <<'PY'
import hashlib, json, os, sys
root, out, upstream, downstream, assembled_head, assembled_tree, series, *patches = sys.argv[1:]
items = []
for rel in patches:
    path = os.path.join(root, 'downstream', 'patches', rel)
    with open(path, 'rb') as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    items.append({'path': f'downstream/patches/{rel}', 'sha256': digest})
data = {
    'schemaVersion': 1,
    'upstreamCommit': upstream,
    'downstreamCommit': downstream,
    'patchSeries': series,
    'patches': items,
    'assembledHead': assembled_head,
    'assembledTree': assembled_tree,
}
with open(out, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')
PY

echo
echo "Release source assembly complete:"
echo "  patched upstream worktree: $WORKTREE"
echo "  Feishu Add-on source:      $ROOT/$ADDON_REL"
echo "  provenance:                $PROVENANCE"
echo
echo "Next CI stages must run the project-specific test/typecheck/build commands in BOTH targets."
echo "Do not manually edit $WORKTREE. Re-run assembly after fixing source patches."

# Keep the assembled worktree on successful completion so CI/local build stages can consume it.
# Disable EXIT cleanup after success. The caller must remove it after build/deploy.
trap - EXIT
