#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/chatpack"
DOCS="$OUT/docs"
FILES="$OUT/files"
SLICES="$OUT/slices"

mkdir -p "$OUT" "$DOCS" "$FILES" "$SLICES"

timestamp() { date +"%Y-%m-%d %H:%M %Z"; }

# 1) FILEMAP.md
{
  echo "# FILEMAP"
  echo
  if git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Snapshot of repo files:"
    echo
    git -C "$ROOT" ls-files | sort | sed 's/^/- /'
  else
    echo "_Git not detected; listing working directory files._"
    echo
    (cd "$ROOT" && find . -type f ! -path "./node_modules/*" ! -path "./chatpack/*" | sort | sed 's/^/- /')
  fi
} > "$DOCS/FILEMAP.md"

# 2) diff.patch
if git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$ROOT" diff > "$OUT/diff.patch" || true
else
  printf "" > "$OUT/diff.patch"
fi

# 3) Bootstrap docs if empty or missing
bootstrap() {
  local path="$1" ; shift
  local content="$*"
  if [ ! -s "$path" ]; then
    printf "%s\n" "$content" > "$path"
  fi
}

bootstrap "$DOCS/ARCHITECTURE.md" "# ARCHITECTURE

(placeholder written by checkpoint — replace with your own, or keep.)
See also: CHAT-CONTRACT.md, DECISIONS.md, FILEMAP.md."

bootstrap "$DOCS/CHANGELOG.md" "# CHANGELOG

$(timestamp) — Created checkpoint scaffolding."

bootstrap "$DOCS/CHAT-CONTRACT.md" "# CHAT-CONTRACT

Provide drop-in files, keep Admin readable, preserve Product Studio export."

bootstrap "$DOCS/DECISIONS.md" "# DECISIONS

ADR-001 — Use Fabric.js for canvas editing (see ARCHITECTURE)."

bootstrap "$DOCS/HANDOFF.md" "# HANDOFF

Paste chatpack/context.md at the top of a new chat."

# 4) Build context.md (single file to paste)
CTX="$OUT/context.md"
{
  echo "# CHAT CONTEXT — $(timestamp)"
  echo
  echo "> Paste this entire file into a new chat to bring the assistant up to speed."
  echo
  if [ -s "$DOCS/HANDOFF.md" ]; then
    echo "---"
    cat "$DOCS/HANDOFF.md"
    echo
  fi
  echo "---"
  echo
  echo "## Architecture (short)"
  awk 'NR<=2000' "$DOCS/ARCHITECTURE.md"
  echo
  echo "---"
  echo
  echo "## Decisions (short)"
  awk 'NR<=1000' "$DOCS/DECISIONS.md"
  echo
  echo "---"
  echo
  echo "## Recent changes (tail)"
  tail -n 80 "$DOCS/CHANGELOG.md" || true
  echo
  echo "---"
  echo
  echo "## FILEMAP (top)"
  head -n 400 "$DOCS/FILEMAP.md"
  echo
  echo "---"
  echo
  echo "## Current diff (if any)"
  if [ -s "$OUT/diff.patch" ]; then
    # Limit to avoid gigantic pastes
    head -n 1500 "$OUT/diff.patch"
  else
    echo "_No local diff._"
  fi
} > "$CTX"

echo "✅ Chatpack updated at: $OUT"
echo "   - docs/ARCHITECTURE.md, CHANGELOG.md, CHAT-CONTRACT.md, DECISIONS.md, HANDOFF.md"
echo "   - docs/FILEMAP.md"
echo "   - diff.patch"
echo "   - context.md  ← paste this into the next chat"
