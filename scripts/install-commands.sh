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
  target="$DST/$name"

  # Skip source files that are themselves symlinks (e.g. pointing elsewhere)
  if [ -L "$f" ]; then
    continue
  fi

  # Skip if destination is already a correct symlink pointing to this source
  if [ -L "$target" ] && [ "$(readlink "$target")" = "$f" ]; then
    continue
  fi

  # Detect whether destination is a regular file (about to be replaced by symlink)
  if [ -f "$target" ] && [ ! -L "$target" ]; then
    ln -sf "$f" "$target"
    echo "  ~ $name (file → symlink)"
    ((updated++)) || true
  else
    ln -sf "$f" "$target"
    echo "  + $name (symlinked)"
    ((added++)) || true
  fi
done

echo ""
echo "✅ 커맨드 — 추가: ${added}개, 업데이트: ${updated}개"
echo "   총 $(ls "$DST" | wc -l | tr -d ' ')개 커맨드 설치됨"

# --- Agents 동기화 ---
AGENT_SRC="$ATEAM_DIR/.claude/agents"
AGENT_DST="$HOME/.claude/agents"

if [ -d "$AGENT_SRC" ]; then
  mkdir -p "$AGENT_DST"
  a_added=0
  for f in "$AGENT_SRC"/*.md; do
    name=$(basename "$f")
    target="$AGENT_DST/$name"
    [ -L "$f" ] && continue
    if [ -L "$target" ] && [ "$(readlink "$target")" = "$f" ]; then
      continue
    fi
    ln -sf "$f" "$target"
    ((a_added++)) || true
  done
  echo "✅ 에이전트 — ${a_added}개 신규/갱신"
  echo "   총 $(ls "$AGENT_DST"/*.md 2>/dev/null | wc -l | tr -d ' ')개 에이전트 설치됨"
fi

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
