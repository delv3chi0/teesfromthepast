#!/usr/bin/env bash
set -euo pipefail

SINCE="${1:-origin/main}"   # or a commit/tag; default compare point
OUT="chatpack"
MAX_PER_FILE=800            # max lines per file to include
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

rm -rf "$OUT"
mkdir -p "$OUT/files" "$OUT/slices"

# 1) Always include core docs
BASE_DOCS=(docs/ARCHITECTURE.md docs/DECISIONS.md docs/CHANGELOG.md docs/FILEMAP.md docs/CHAT-CONTRACT.md)
for f in "${BASE_DOCS[@]}"; do
  [ -f "$f" ] && install -D "$f" "$OUT/$f"
done

# 2) Collect changed files since $SINCE
mapfile -t changed < <(git diff --name-only "$SINCE"...HEAD -- . ":(exclude)node_modules" ":(exclude)dist" ":(exclude)build")
# Also include dependency manifests
for f in package.json package-lock.json pnpm-lock.yaml yarn.lock backend/package.json frontend/package.json; do
  [ -f "$f" ] && changed+=("$f")
done

# 3) Filter by .chatgptignore
ignoretmp="$(mktemp)"
( [ -f .chatgptignore ] && cat .chatgptignore ) > "$ignoretmp" || true
filtered=()
for f in "${changed[@]}"; do
  # skip if matched by ignore
  if [ -n "$f" ] && ! git check-ignore -q --stdin < <(echo "$f") 2>/dev/null; then
    filtered+=("$f")
  fi
done

# 4) Slice large files to keep context tight (first/last portions)
slice_file () {
  local f="$1"
  local out="$2"
  local lines total
  total=$(wc -l < "$f" || echo 0)
  if [ "$total" -le "$MAX_PER_FILE" ]; then
    cat "$f" > "$out"
  else
    head -n $((MAX_PER_FILE/2)) "$f" > "$out"
    echo -e "\n/* ...snip... (${total} total lines) */\n" >> "$out"
    tail -n $((MAX_PER_FILE/2)) "$f" >> "$out"
  fi
}

# 5) Write files
ctx_list=()
for f in "${filtered[@]}"; do
  [ -f "$f" ] || continue
  ext="${f##*.}"
  # route to slices for big text-y files
  case "$ext" in
    js|jsx|ts|tsx|json|css|scss|md|yaml|yml|env|sh|py|go|java|rb|php)
      slice_file "$f" "$OUT/slices/${f//\//__}"
      ctx_list+=("slices/${f//\//__}")
      ;;
    *)
      # small or unknown: copy raw (size gate)
      if [ "$(wc -c < "$f")" -le 200000 ]; then
        install -D "$f" "$OUT/files/$f"
        ctx_list+=("files/$f")
      fi
      ;;
  esac
done

# 6) Include a compact diff too (for patching hints)
git diff --minimal --binary "$SINCE"...HEAD > "$OUT/diff.patch" || true

# 7) Build context.md (single upload)
{
  echo "# Context (generated)"
  echo "- Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- Base: \`$SINCE\` → HEAD"
  echo "- Files included: ${#ctx_list[@]}"
  echo
  echo "## How to read"
  echo "- Use exact repo paths. Ask for a full file if a slice is insufficient."
  echo "- Apply hints from \`diff.patch\` if proposing patches."
  echo
  if [ -f docs/ARCHITECTURE.md ]; then
    echo "## ARCHITECTURE.md"
    echo '```md'
    sed -n '1,300p' docs/ARCHITECTURE.md
    echo '```'
  fi
  if [ -f docs/DECISIONS.md ]; then
    echo "## DECISIONS.md"
    echo '```md'
    sed -n '1,400p' docs/DECISIONS.md
    echo '```'
  fi
  if [ -f docs/FILEMAP.md ]; then
    echo "## FILEMAP.md (first 200 lines)"
    echo '```md'
    sed -n '1,200p' docs/FILEMAP.md
    echo '```'
  fi
  echo "## Changed file slices"
  for f in "${ctx_list[@]}"; do
    echo "### $f"
    echo '```'
    sed -n '1,800p' "$OUT/$f"
    echo '```'
  done
  echo "## Diff (summary)"
  echo '```diff'
  git diff --name-status "$SINCE"...HEAD
  echo '```'
} > "$OUT/context.md"

echo "Chat context ready → $OUT/"
