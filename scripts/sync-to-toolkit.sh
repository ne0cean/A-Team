#!/bin/bash
# sync-to-toolkit.sh
# toolkit-improvements/claude-code-layer/ 변경사항을 vibe-toolkit에 자동 동기화

set -e

TOOLKIT_PATH="/Users/noir/Desktop/Projects/vibe-toolkit"
REPO_ROOT="$(git rev-parse --show-toplevel)"
LAYER_PATH="$REPO_ROOT/toolkit-improvements/claude-code-layer"

# 마지막 커밋에서 toolkit-improvements/ 변경 여부 확인
if git rev-parse HEAD^ &>/dev/null; then
  CHANGED=$(git diff HEAD^ HEAD --name-only | grep "^toolkit-improvements/" || true)
else
  CHANGED=$(git diff-tree --no-commit-id -r --name-only HEAD | grep "^toolkit-improvements/" || true)
fi

if [ -z "$CHANGED" ]; then
  exit 0
fi

echo "🔧 toolkit-improvements 변경 감지 → vibe-toolkit 동기화 중..."

# CLAUDE.md 동기화
if [ -f "$LAYER_PATH/CLAUDE.md" ]; then
  cp "$LAYER_PATH/CLAUDE.md" "$TOOLKIT_PATH/CLAUDE.md"
  echo "  ✓ CLAUDE.md"
fi

# rules/ 동기화
if [ -d "$LAYER_PATH/rules" ] && [ -n "$(ls -A "$LAYER_PATH/rules")" ]; then
  cp "$LAYER_PATH/rules/"*.md "$TOOLKIT_PATH/.agent/rules/" 2>/dev/null || true
  echo "  ✓ .agent/rules/"
fi

# workflows/ 동기화
if [ -d "$LAYER_PATH/workflows" ] && [ -n "$(ls -A "$LAYER_PATH/workflows")" ]; then
  cp "$LAYER_PATH/workflows/"*.md "$TOOLKIT_PATH/.agent/workflows/" 2>/dev/null || true
  echo "  ✓ .agent/workflows/"
fi

# commands/ 동기화 (.claude/commands/)
if [ -d "$LAYER_PATH/commands" ] && [ -n "$(ls -A "$LAYER_PATH/commands")" ]; then
  mkdir -p "$TOOLKIT_PATH/.claude/commands"
  cp "$LAYER_PATH/commands/"*.md "$TOOLKIT_PATH/.claude/commands/" 2>/dev/null || true
  echo "  ✓ .claude/commands/"
fi

# scripts/ 동기화 (toolkit-improvements/scripts/ → vibe-toolkit/scripts/)
SCRIPTS_SRC="$REPO_ROOT/toolkit-improvements/scripts"
if [ -d "$SCRIPTS_SRC" ] && [ -n "$(ls -A "$SCRIPTS_SRC")" ]; then
  mkdir -p "$TOOLKIT_PATH/scripts"
  cp "$SCRIPTS_SRC/"* "$TOOLKIT_PATH/scripts/" 2>/dev/null || true
  echo "  ✓ scripts/"
fi

# vibe-toolkit 변경사항 커밋 & 푸시
cd "$TOOLKIT_PATH"

git add -A

if git diff --staged --quiet; then
  echo "ℹ️  vibe-toolkit에 실제 변경사항 없음 (스킵)"
  exit 0
fi

SOURCE_MSG=$(cd "$REPO_ROOT" && git log -1 --format='%s')

git add -A
git commit -m "$(cat <<EOF
chore: sync Claude Code layer from connectome

NOW: $SOURCE_MSG
SOURCE: connectome/toolkit-improvements/claude-code-layer/
EOF
)"
git push origin main

echo "✅ vibe-toolkit 업데이트 완료"
