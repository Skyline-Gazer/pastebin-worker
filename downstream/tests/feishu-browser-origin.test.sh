#!/usr/bin/env bash
# Issue #130: OAuth callback origin must stay on the canonical Add-on host.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHECK="$ROOT/downstream/scripts/check-feishu-browser-origin.sh"
TRACKED="$ROOT/downstream/addons/feishu/wrangler.toml"
DOCS_BUILD="$ROOT/docs/BUILD_DEPLOY.md"
DOCS_ADDON="$ROOT/docs/FEISHU_ADDON.md"
FIXTURE="$(mktemp)"
trap 'rm -f "$FIXTURE"' EXIT

"$CHECK" "$TRACKED"

python3 - "$DOCS_BUILD" "$DOCS_ADDON" <<'PY'
from pathlib import Path
import sys

build, addon = (Path(p).read_text(encoding="utf-8") for p in sys.argv[1:3])
required_build = (
    "https://pb.test.223.im",
    "FEISHU_OAUTH_REDIRECT_URI",
    "FEISHU_ALLOWED_ORIGINS",
    "/api/auth/callback",
    "check-feishu-browser-origin.sh",
)
missing = [item for item in required_build if item not in build]
if missing:
    raise SystemExit("BUILD_DEPLOY.md missing browser-origin phrases: " + ", ".join(missing))
if "no custom Feishu hostname" in addon:
    raise SystemExit("FEISHU_ADDON.md still claims production has no custom Feishu hostname")
if "https://pb.test.223.im" not in addon:
    raise SystemExit("FEISHU_ADDON.md must name https://pb.test.223.im as the public Add-on origin")
PY

cat > "$FIXTURE" <<'TOML'
name = "pastebin-feishu-prod"
workers_dev = true
[vars]
FEISHU_OAUTH_REDIRECT_URI = "https://pastebin-feishu-prod.r7a.workers.dev/api/auth/callback"
FEISHU_ALLOWED_ORIGINS = "https://pastebin-feishu-prod.r7a.workers.dev"
[[routes]]
pattern = "pb.test.223.im"
custom_domain = true
TOML

if "$CHECK" "$FIXTURE" >/tmp/feishu-browser-origin-bad.out 2>/tmp/feishu-browser-origin-bad.err; then
  echo "expected workers.dev OAuth redirect to fail" >&2
  exit 1
fi
if ! grep -q "must not use workers.dev" /tmp/feishu-browser-origin-bad.err; then
  echo "expected workers.dev rejection in stderr" >&2
  cat /tmp/feishu-browser-origin-bad.err >&2
  exit 1
fi

echo "feishu-browser-origin.test.sh: PASS"
