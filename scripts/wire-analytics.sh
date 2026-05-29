#!/bin/bash
# wire-analytics.sh — Add log-event.mjs call to all unwired commands
# Idempotent: skips commands that already have log-event

CMDS_DIR="/Users/noir/Projects/a-team/.claude/commands"
WIRED=0
SKIPPED=0

for f in "$CMDS_DIR"/*.md; do
  name=$(basename "$f" .md)

  # Already wired?
  if grep -q "log-event" "$f" 2>/dev/null; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Detect frontmatter
  if head -1 "$f" | grep -q "^---"; then
    # Find closing --- line number
    close_line=$(awk 'NR>1 && /^---/{print NR; exit}' "$f")
    if [ -n "$close_line" ]; then
      # Insert after frontmatter closing ---
      sed -i '' "${close_line}a\\
\\
> Analytics: \`node scripts/log-event.mjs command_start name=${name}\` — 실행 시작 시 반드시 호출
" "$f"
      WIRED=$((WIRED + 1))
      echo "[wired] $name (after frontmatter)"
      continue
    fi
  fi

  # No frontmatter — check if starts with #
  if head -1 "$f" | grep -q "^#"; then
    # Insert after first heading
    sed -i '' "1a\\
\\
> Analytics: \`node scripts/log-event.mjs command_start name=${name}\` — 실행 시작 시 반드시 호출
" "$f"
    WIRED=$((WIRED + 1))
    echo "[wired] $name (after heading)"
    continue
  fi

  # Fallback — prepend
  tmp=$(mktemp)
  echo "> Analytics: \`node scripts/log-event.mjs command_start name=${name}\` — 실행 시작 시 반드시 호출" > "$tmp"
  echo "" >> "$tmp"
  cat "$f" >> "$tmp"
  mv "$tmp" "$f"
  WIRED=$((WIRED + 1))
  echo "[wired] $name (prepended)"
done

echo ""
echo "Done: $WIRED wired, $SKIPPED already had log-event"
