#!/usr/bin/env bash
set -euo pipefail

BASE_REF_DEFAULT="origin/main"
SINCE="${1:-$BASE_REF_DEFAULT}"
OUT="chatpack"
MAX_PER_FILE=800
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# Ensure we know the base; fallback to merge-base or first commit
git fetch --quiet origin || true
if ! git rev-parse --verify --quiet "$SINCE" >/dev/null; then
  if git rev-parse --verify --quiet "$BASE_REF_DEFAULT" >/dev/null; then
    SINCE="$BASE_REF_DEFAULT"
  else
    FIRST="$(git rev-list --max-parents=0 HEAD | tail -n1)"
    SINCE="${FIRST:-HEAD~0}"
  fi
fi

rm -rf "$OUT"
mkdir -p "$OUT/files" "$OUT/slices" "docs" || true

# Always include core docs if present
BASE_DOCS=(docs/ARCHITECTURE.md docs/DECISIONS.md docs/CHANGELOG.md docs/FILEMAP.md docs/CHAT-CONTRACT.md)
for f in "${BASE_DOCS[@]}"; do
  [ -f "$f" ] && install -D "$f" "$OUT/$f"
done

# Collect changed files (allow zero changes)
mapfile -t changed < <(git diff --name-only "$SINCE"...HEAD -- . ":(exclude)node_modules" ":(exclude)dist" ":(exclude)build" || true)

# Always include manifests
for f in package.json backend/package.json frontend/package.json; do
  [ -f "$f" ] && changed+=("$f")
done

# Optional ignore: skip paths in .chatgptignore (best-effort)
ignore_pat="^$"  # matches nothing
if [ -f .chatgptignore ]; then
  # build a regex that matches any ignored prefix
  ignore_pat="$(sed 's/[].[^$\\*/]/\\&/g; s#/\+$#/#; s#^\./##' .chatgptignore \
    | grep -v '^\s*$' \
    | sed 's#/$##' \
    | awk '{printf("%s%s", NR==1?"":"|", "^" $0)}')"
  [ -z "$ignore_pat" ] && ignore_pat="^$"
fi

ctx_list=()
for f in "${changed[@]}"; do
  [ -n "${f:-}" ] || continue
  [[ "$f" =~ $ignore_pat ]] && continue
  [ -f "$f" ] || continue

  size=$(wc -c < "$f")
  ext="${f##*.}"
  if [[ "$ext" =~ ^(js|jsx|ts|tsx|json|css|scss|md|yaml|yml|env|sh|py|go|java|rb|php)$ ]]; then
    total=$(wc -l < "$f" || echo 0)
    out="$OUT/slices/${f//\//__}"
    if [ "$total" -le "$MAX_PER_FILE" ]; then
      install -D "$f" "$out"
    else
      head -n $((MAX_PER_FILE/2)) "$f" > "$out"
      printf "\n/* ...snip... (%s total lines) */\n\n" "$total" >> "$out"
      tail -n $((MAX_PER_FILE/2)) "$f" >> "$out"
    fi
    ctx_list+=("slices/${f//\//__}")
  else
    if [ "$size" -le 200000 ]; then
      install -D "$f" "$OUT/files/$f"
      ctx_list+=("files/$f")
    fi
  fi
done

# Write a compact diff; don't fail if empty
git diff --minimal --binary "$SINCE"...HEAD > "$OUT/diff.patch" || true

# Always produce context.md even if there are zero changes
{
  echo "# Context (generated)"
  echo "- Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- Base: \`$SINCE\` → HEAD"
  echo "- Files included: ${#ctx_list[@]}"
  echo
  [ -f docs/ARCHITECTURE.md ] && { echo "## ARCHITECTURE.md"; echo '```md'; sed -n '1,400p' docs/ARCHITECTURE.md; echo '```'; }
  [ -f docs/DECISIONS.md ] && { echo "## DECISIONS.md"; echo '```md'; sed -n '1,400p' docs/DECISIONS.md; echo '```'; }
  [ -f docs/FILEMAP.md ] && { echo "## FILEMAP.md (first 200 lines)"; echo '```md'; sed -n '1,200p' docs/FILEMAP.md; echo '```'; }
  echo "## Changed file slices"
  if [ "${#ctx_list[@]}" -eq 0 ]; then
    echo "_No changed files detected versus \`$SINCE\`. Docs included above._"
  else
    for f in "${ctx_list[@]}"; do
      echo "### $f"
      echo '```'
      sed -n '1,800p' "$OUT/$f"
      echo '```'
    done
  fi
  echo "## Diff (summary)"
  echo '```diff'
  git diff --name-status "$SINCE"...HEAD || true
  echo '```'
} > "$OUT/context.md"

echo "✅ Chat context ready → $OUT/context.md"
