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

# --- AGENTS.md 연결 (타 에이전트용) ---
# 현재 디렉토리에 AGENTS.md 연결 생성 (프로젝트별 실행 시)
AGENTS_SRC="$ATEAM_DIR/AGENTS.md"
AGENTS_DST="$(pwd)/AGENTS.md"

if [ "$(pwd)" != "$ATEAM_DIR" ]; then
  # Windows: mklink로 진짜 심링크, 실패 시 복사본 fallback
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    WIN_SRC=$(cygpath -w "$AGENTS_SRC" 2>/dev/null || echo "$AGENTS_SRC")
    WIN_DST=$(cygpath -w "$AGENTS_DST" 2>/dev/null || echo "$AGENTS_DST")
    if [ -L "$AGENTS_DST" ] 2>/dev/null; then
      echo "✅ AGENTS.md — 이미 심링크"
    else
      rm -f "$AGENTS_DST"
      cmd /c mklink "$(cygpath -w "$AGENTS_DST")" "$(cygpath -w "$AGENTS_SRC")" >/dev/null 2>&1 \
        && echo "✅ AGENTS.md — Windows 심링크 생성" \
        || { cp "$AGENTS_SRC" "$AGENTS_DST"; echo "✅ AGENTS.md — 복사본 생성 (mklink 권한 없음 — 개발자 모드 권장)"; }
    fi
  else
    # macOS / Linux: 일반 symlink
    if [ -L "$AGENTS_DST" ] && [ "$(readlink "$AGENTS_DST")" = "$AGENTS_SRC" ]; then
      echo "✅ AGENTS.md — 이미 최신 심링크"
    else
      ln -sf "$AGENTS_SRC" "$AGENTS_DST"
      echo "✅ AGENTS.md — 심링크 생성 (Codex/Gemini 등 타 에이전트용)"
    fi
  fi
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
