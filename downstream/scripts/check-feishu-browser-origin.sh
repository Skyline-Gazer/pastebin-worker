#!/usr/bin/env bash
# Fail closed when a Feishu Wrangler config lets OAuth/session cookies
# drift off the canonical Add-on browser origin.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG="${1:-$ROOT/downstream/addons/feishu/wrangler.toml}"
CANONICAL_ORIGIN="https://pb.test.223.im"
CANONICAL_CALLBACK="$CANONICAL_ORIGIN/api/auth/callback"
CANONICAL_HOST="pb.test.223.im"

python3 - "$CONFIG" "$CANONICAL_ORIGIN" "$CANONICAL_CALLBACK" "$CANONICAL_HOST" <<'PY'
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

path, origin, callback, host = sys.argv[1:5]
text = Path(path).read_text(encoding="utf-8")

def assignment(name: str) -> str:
    match = re.search(rf'^{re.escape(name)}\s*=\s*"([^"]*)"', text, re.M)
    if not match:
        raise SystemExit(f"{path}: missing {name}")
    return match.group(1)

oauth = assignment("FEISHU_OAUTH_REDIRECT_URI")
allowed = assignment("FEISHU_ALLOWED_ORIGINS")
parsed = urlparse(oauth)
if parsed.hostname and parsed.hostname.endswith("workers.dev"):
    raise SystemExit(f"{path}: FEISHU_OAUTH_REDIRECT_URI must not use workers.dev")
if oauth != callback:
    raise SystemExit(f"{path}: FEISHU_OAUTH_REDIRECT_URI must be {callback}")
origins = [item.strip() for item in allowed.split(",") if item.strip()]
if origins != [origin]:
    raise SystemExit(f"{path}: FEISHU_ALLOWED_ORIGINS must be exactly {origin}")
if not re.search(rf'pattern\s*=\s*"{re.escape(host)}"', text):
    raise SystemExit(f"{path}: missing custom-domain route {host}")
if not re.search(r"custom_domain\s*=\s*true", text):
    raise SystemExit(f"{path}: custom_domain must be true")
print(f"CANONICAL_ORIGIN={origin}")
print(f"OAUTH_REDIRECT={oauth}")
print(f"ALLOWED_ORIGINS={allowed}")
print("feishu-browser-origin: PASS")
PY
