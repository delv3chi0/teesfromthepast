#!/usr/bin/env bash
set -euo pipefail
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

# Build a table: path | size | brief purpose (from top comment or guess)
echo '| Path | Size | Purpose |' > docs/FILEMAP.md
echo '|------|------|---------|' >> docs/FILEMAP.md

# find source-ish files
find . -type f \
  -not -path "./.git/*" \
  -not -path "./node_modules/*" \
  -not -path "./dist/*" \
  -not -path "./build/*" \
  -not -name "*.lock" \
  -not -name "*.map" \
  -not -name "*.png" -not -name "*.jpg" -not -name "*.pdf" \
  -not -name "*.woff*" \
  | sort | while read -r f; do
    sz=$(wc -c < "$f" | awk '{printf "%.1fKB",$1/1024}')
    # Grab first comment-ish line as purpose
    purpose=$(sed -n '1,20p' "$f" \
      | sed -n 's@^[[:space:]]*//\s*@@p; s@^[[:space:]]*#\s*@@p; s@^[[:space:]]*/\*\s*@@p' \
      | head -n 1)
    [ -z "$purpose" ] && purpose="—"
    echo "| \`$f\` | $sz | $purpose |" >> docs/FILEMAP.md
  done
echo "Wrote docs/FILEMAP.md"
