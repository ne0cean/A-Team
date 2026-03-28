#!/usr/bin/env bash
# todo.sh — A-Team 중앙 메모 관리 (개인 할 일 & 아이디어)
#
# ⚠️ 이 스크립트는 프로젝트에 국한되지 않는 "상위 레벨 메모"용입니다.
#    프로젝트별 구체적 태스크는 각 프로젝트의 .context/CURRENT.md에 기록하세요.
#
# 사용법:
#   todo add "내용"           → 메모 추가
#   todo list                 → 대기 목록 보기
#   todo done "검색어"        → 완료 처리
#   todo stats                → 통계

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TODO_FILE="$SCRIPT_DIR/../TODO.md"
DATE=$(date '+%Y-%m-%d')

# 파일 없으면 초기화
if [ ! -f "$TODO_FILE" ]; then
    cat > "$TODO_FILE" << 'EOF'
# Central TODO (개인 메모 & 아이디어)

프로젝트에 국한되지 않는 **상위 레벨 할 일과 아이디어**를 기록합니다.
프로젝트별 구체적 태스크는 각 프로젝트의 `.context/CURRENT.md` → Next Tasks에 기록하세요.

## 📋 메모
EOF
fi

CMD="${1:-list}"

case "$CMD" in
  add)
    TASK="$2"
    if [ -z "$TASK" ]; then
      echo "❌ 사용법: todo add \"메모 내용\""
      exit 1
    fi
    # 메모 섹션 아래에 추가
    if grep -q "## 📋 메모" "$TODO_FILE"; then
      sed -i "/## 📋 메모/a - [ ] $TASK" "$TODO_FILE"
    else
      echo "- [ ] $TASK" >> "$TODO_FILE"
    fi
    echo "✅ 추가됨: $TASK"

    # Git 동기화
    cd "$SCRIPT_DIR/.."
    git add TODO.md
    git commit -m "memo: $TASK" 2>/dev/null || true
    git push origin master 2>/dev/null || echo "⚠️  push 실패 (로컬 저장 완료)"
    ;;

  done)
    SEARCH="$2"
    if [ -z "$SEARCH" ]; then
      echo "❌ 사용법: todo done \"검색어\""
      exit 1
    fi
    MATCH=$(grep -n "\- \[ \].*$SEARCH" "$TODO_FILE" | head -1)
    if [ -z "$MATCH" ]; then
      echo "❌ '$SEARCH' 에 해당하는 대기 항목을 찾을 수 없습니다."
      exit 1
    fi
    LINE_NUM=$(echo "$MATCH" | cut -d: -f1)
    sed -i "${LINE_NUM}s/- \[ \]/- [x]/" "$TODO_FILE"
    if ! sed -n "${LINE_NUM}p" "$TODO_FILE" | grep -q "($DATE)"; then
      sed -i "${LINE_NUM}s/$/ ($DATE)/" "$TODO_FILE"
    fi
    DONE_TASK=$(sed -n "${LINE_NUM}p" "$TODO_FILE")
    echo "✅ 완료: $DONE_TASK"

    cd "$SCRIPT_DIR/.."
    git add TODO.md
    git commit -m "memo: done — $SEARCH ($DATE)" 2>/dev/null || true
    git push origin master 2>/dev/null || echo "⚠️  push 실패 (로컬 저장 완료)"
    ;;

  list)
    echo "📋 중앙 메모 (대기 중):"
    echo "─────────────────────────────────────"
    grep -E "^\s*-\s*\[\s*\]" "$TODO_FILE" || echo "(대기 중인 메모 없음)"
    echo "─────────────────────────────────────"
    PENDING=$(grep -cE "^\s*-\s*\[\s*\]" "$TODO_FILE" 2>/dev/null || echo "0")
    DONE=$(grep -cE "^\s*-\s*\[x\]" "$TODO_FILE" 2>/dev/null || echo "0")
    echo "📊 대기: $PENDING | 완료: $DONE"
    echo ""
    echo "💡 프로젝트별 태스크는 .context/CURRENT.md → Next Tasks를 확인하세요."
    ;;

  stats)
    echo "📊 중앙 메모 통계"
    echo "═════════════════════════════════════"
    PENDING=$(grep -cE "^\s*-\s*\[\s*\]" "$TODO_FILE" 2>/dev/null || echo "0")
    DONE=$(grep -cE "^\s*-\s*\[x\]" "$TODO_FILE" 2>/dev/null || echo "0")
    TOTAL=$((PENDING + DONE))
    echo "  전체: $TOTAL (대기: $PENDING, 완료: $DONE)"
    echo ""
    echo "💡 프로젝트별 태스크 현황: /prjt 또는 .context/CURRENT.md 참조"
    echo "═════════════════════════════════════"
    ;;

  *)
    echo "📋 A-Team 중앙 메모 관리"
    echo ""
    echo "  todo add \"내용\"     — 메모 추가"
    echo "  todo list           — 대기 목록"
    echo "  todo done \"검색어\" — 완료 처리"
    echo "  todo stats          — 통계"
    echo ""
    echo "⚠️  프로젝트별 태스크는 .context/CURRENT.md에 기록하세요."
    ;;
esac
