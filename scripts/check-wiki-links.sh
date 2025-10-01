#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-.wiki-edit}"

echo "Checking wiki links in: $TARGET_DIR"

# 1) Reject internal links using .md extensions (allow external http/https/mailto and anchors)
BAD_INTERNAL=$(grep -RInE '\]\([^)]*\.md(#[^)]*)?\)' "$TARGET_DIR" --include='*.md' 2>/dev/null | \
  grep -vE '\]\(https?://|\]\(#|\]\(mailto:|\]\(//)' || true)
if [ -n "$BAD_INTERNAL" ]; then
  echo '❌ Found internal links using .md extensions (use [Text](path/without.md))'
  echo "$BAD_INTERNAL"
  exit 1
fi

# 2) Reject invalid subdirectory wiki links like [[examples/Page]] (ignore code blocks)
BAD_SUBDIR=
while IFS= read -r -d '' FILE; do
MATCHES=$(awk 'BEGIN{inblock=0} /^```/{inblock=!inblock; next} !inblock {print}' "$FILE" | grep -n '\[\[[^]]*/[^]]*\]\]' | grep -v '\`' || true)
  if [ -n "$MATCHES" ]; then
    while IFS= read -r LINE; do
      BAD_SUBDIR+="$FILE:$LINE
"
    done <<< "$MATCHES"
  fi
done < <(find "$TARGET_DIR" -type f -name '*.md' -print0)

if [ -n "$BAD_SUBDIR" ]; then
  echo '❌ Found invalid wiki links like [[subdir/Page]] (use [Text](subdir/Page))'
  printf "%s" "$BAD_SUBDIR"
  exit 1
fi

# 3) Reject any raw.githubusercontent.com links (ignore code spans)
if grep -RIn 'raw\.githubusercontent\.com' "$TARGET_DIR" --include='*.md' | grep -v '\`' ; then
  echo '❌ Found raw.githubusercontent.com links (use normal github.com/wiki URLs)'
  exit 1
fi

# 4) Report missing internal link targets (non-fatal)
MISSING_REPORT=""
while IFS= read -r -d '' FILE; do
  DIRNAME=$(dirname "$FILE")
  # Read content excluding fenced code blocks
  CONTENT=$(awk 'BEGIN{inblock=0} /^```/{inblock=!inblock; next} !inblock {print}' "$FILE")

  # Markdown-style internal links: [Text](path)
  LINK_MATCHES=$(echo "$CONTENT" | grep -oE '\]\(([^)]+)\)' || true)
  if [ -n "$LINK_MATCHES" ]; then
    echo "$LINK_MATCHES" | sed -E 's/^\]\(|\)$//g' | while read -r P; do
      # Skip external/anchors/mailto and protocol-less
      echo "$P" | grep -Eq '^(https?://|#|mailto:|//)' && continue || true
      # Normalize
      P_NO_ANCHOR="${P%%#*}"
      # Try root-relative first
      CAND1="$TARGET_DIR/${P_NO_ANCHOR#/}.md"
      # Try relative to current file's directory
      P_STRIPPED="${P_NO_ANCHOR#./}"
      CAND2="$DIRNAME/$P_STRIPPED.md"
      # If neither candidate exists, record missing
      if [ ! -f "$CAND1" ] && [ ! -f "$CAND2" ]; then
        MISSING_REPORT+="$FILE -> $P_NO_ANCHOR\n"
      fi
    done
  fi

  # Root wiki links: [[Page]] or [[Page|Text]] (anchors like [[Page#anchor]] are possible)
  WIKI_MATCHES=$(echo "$CONTENT" | grep -oE '\[\[[^\]|#]+(#[^\]|]+)?(\|[^]]*)?\]\]' || true)
  if [ -n "$WIKI_MATCHES" ]; then
    echo "$WIKI_MATCHES" | sed -E 's/^\[\[|\]\]$//g' | sed -E 's/(\|.*)$//' | while read -r NAME; do
      NAME_NO_ANCHOR="${NAME%%#*}"
      # Ignore if it contains a slash (subdir should not use [[...]] per policy)
      echo "$NAME_NO_ANCHOR" | grep -q '/' && continue || true
      CAND3="$TARGET_DIR/$NAME_NO_ANCHOR.md"
      if [ ! -f "$CAND3" ]; then
        MISSING_REPORT+="$FILE -> [[${NAME_NO_ANCHOR}]]\n"
      fi
    done
  fi

done < <(find "$TARGET_DIR" -type f -name '*.md' -print0)

if [ -n "$MISSING_REPORT" ]; then
  echo '⚠️ Missing link targets (non-fatal):'
  # Print unique lines sorted
  printf "%b" "$MISSING_REPORT" | sort -u
fi

echo '✅ Wiki links look good'
