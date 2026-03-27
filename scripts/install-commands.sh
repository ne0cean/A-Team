#!/usr/bin/env bash
# install-commands.sh — A-Team .claude/commands/ → ~/.claude/commands/ 동기화
# 사용법: bash ~/tools/A-Team/scripts/install-commands.sh
# Windows(Git Bash) / macOS / Linux 호환

set -e

ATEAM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ATEAM_DIR/.claude/commands"
DST="$HOME/.claude/commands"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  A-Team 커맨드 설치"
echo "  from: $SRC"
echo "  to:   $DST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p "$DST"

added=0
updated=0

for f in "$SRC"/*.md; do
  name=$(basename "$f")
  if [ ! -f "$DST/$name" ]; then
    cp "$f" "$DST/$name"
    echo "  + $name"
    ((added++)) || true
  elif ! diff -q "$f" "$DST/$name" > /dev/null 2>&1; then
    cp "$f" "$DST/$name"
    echo "  ~ $name (updated)"
    ((updated++)) || true
  fi
done

echo ""
echo "✅ 완료 — 추가: ${added}개, 업데이트: ${updated}개"
echo "   총 $(ls "$DST" | wc -l | tr -d ' ')개 커맨드 설치됨"

# Guard: docs/commands/ 에 .claude/commands/에 없는 커맨드가 있으면 경고
DOCS_CMD="$ATEAM_DIR/docs/commands"
if [ -d "$DOCS_CMD" ]; then
  orphans=()
  for f in "$DOCS_CMD"/*.md; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    [[ "$name" == "README.md" || "$name" == "CHANGELOG.md" ]] && continue
    [ ! -f "$SRC/$name" ] && orphans+=("$name")
  done
  if [ ${#orphans[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  docs/commands/ 에만 존재하는 커맨드 발견 (배포 누락 위험):"
    for o in "${orphans[@]}"; do
      echo "   - $o → cp docs/commands/$o .claude/commands/"
    done
  fi
fi
