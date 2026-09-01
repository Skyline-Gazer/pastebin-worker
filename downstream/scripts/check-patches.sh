#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE_FILE="$ROOT/downstream/release.json"

cleanup() {
  if [[ -n "${WORKTREE:-}" && -e "${WORKTREE:-}/.git" ]]; then
    git -C "$WORKTREE" am --abort >/dev/null 2>&1 || true
    git -C "$ROOT" worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  fi
  [[ -n "${TMPROOT:-}" ]] && rm -rf "$TMPROOT"
}
trap cleanup EXIT

read_manifest() {
  python3 - "$RELEASE_FILE" <<'PY'
import json, sys
p = sys.argv[1]
with open(p, 'r', encoding='utf-8') as f:
    d = json.load(f)
print(d['upstream']['commit'])
print(d.get('patchSeries', 'downstream/patches/series'))
PY
}

if [[ $# -gt 1 ]]; then
  echo "Usage: downstream/scripts/check-patches.sh [upstream-base-ref]" >&2
  exit 2
fi

if [[ $# -eq 1 ]]; then
  BASE="$1"
  SERIES_REL="downstream/patches/series"
else
  [[ -f "$RELEASE_FILE" ]] || {
    echo "Missing downstream/release.json." >&2
    echo "Copy downstream/release.example.json to downstream/release.json and pin an exact upstream SHA," >&2
    echo "or pass an upstream base ref explicitly." >&2
    exit 1
  }
  mapfile -t manifest < <(read_manifest)
  BASE="${manifest[0]}"
  SERIES_REL="${manifest[1]}"
fi

SERIES_FILE="$ROOT/$SERIES_REL"
[[ -f "$SERIES_FILE" ]] || { echo "Missing patch series file: $SERIES_REL" >&2; exit 1; }

git -C "$ROOT" cat-file -e "$BASE^{commit}" 2>/dev/null || {
  echo "Pinned upstream commit is not present locally: $BASE" >&2
  echo "Fetch the upstream remote before validating." >&2
  exit 1
}

mapfile -t PATCHES < <(
  sed -e 's/[[:space:]]*#.*$//' \
      -e '/^[[:space:]]*$/d' \
      -e 's/^[[:space:]]*//' \
      -e 's/[[:space:]]*$//' \
      "$SERIES_FILE"
)

for rel in "${PATCHES[@]}"; do
  [[ "$rel" != /* && "$rel" != *".."* ]] || {
    echo "Unsafe patch path in series: $rel" >&2
    exit 1
  }
  [[ -f "$ROOT/downstream/patches/$rel" ]] || {
    echo "Series entry does not exist: downstream/patches/$rel" >&2
    exit 1
  }
done

TMPROOT=$(mktemp -d)
WORKTREE="$TMPROOT/upstream"
git -C "$ROOT" worktree add --detach "$WORKTREE" "$BASE" >/dev/null

echo "Validating ordered patch series"
echo "  upstream base: $(git -C "$WORKTREE" rev-parse HEAD)"
echo "  series:        $SERIES_REL"

if (( ${#PATCHES[@]} == 0 )); then
  echo "  patches:       none"
  echo "Patch-series validation passed (empty series)."
  exit 0
fi

for rel in "${PATCHES[@]}"; do
  echo "  apply: downstream/patches/$rel"
  if ! git -C "$WORKTREE" am --committer-date-is-author-date "$ROOT/downstream/patches/$rel"; then
    echo >&2
    echo "Patch replay failed at: downstream/patches/$rel" >&2
    echo "Do not repair this generated worktree manually." >&2
    echo "Adapt the responsible patch branch, review it, re-export it, and replay the full series again." >&2
    exit 1
  fi
done

echo "Patch-series validation passed."
echo "  assembled HEAD: $(git -C "$WORKTREE" rev-parse HEAD)"
echo "  assembled tree: $(git -C "$WORKTREE" rev-parse HEAD^{tree})"
