#!/usr/bin/env bash
# todo.sh — A-Team 통합 TODO 관리 (고도화 버전)
# 사용법:
#   todo add "내용" [프로젝트명]     → 추가
#   todo list [프로젝트명]           → 목록 (필터 가능)
#   todo done "검색어"               → 완료 처리
#   todo stats                       → 통계
#   todo                             → 전체 대기 목록

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TODO_FILE="$SCRIPT_DIR/../TODO.md"
DEFAULT_PROJECT=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
DATE=$(date '+%Y-%m-%d')

# 파일 없으면 초기화
if [ ! -f "$TODO_FILE" ]; then
    cat > "$TODO_FILE" << 'EOF'
# Central TODO List (A-Team Managed)

이 파일은 여러 프로젝트의 할 일을 통합 관리하는 공간입니다.
`/todo` 명령어를 통해 자유롭게 기록하고 조회할 수 있습니다.

## 📋 Task List
EOF
fi

CMD="${1:-list}"

case "$CMD" in
  add)
    TASK="$2"
    PROJECT="${3:-$DEFAULT_PROJECT}"
    if [ -z "$TASK" ]; then
      echo "❌ 사용법: todo add \"할 일 내용\" [프로젝트명]"
      exit 1
    fi
    # Task List 섹션 아래에 추가
    if grep -q "## 📋 Task List" "$TODO_FILE"; then
      sed -i "/## 📋 Task List/a - [ ] [$PROJECT] $TASK" "$TODO_FILE"
    else
      echo "- [ ] [$PROJECT] $TASK" >> "$TODO_FILE"
    fi
    echo "✅ 추가됨: [$PROJECT] $TASK"

    # Git 동기화
    cd "$SCRIPT_DIR/.."
    git add TODO.md
    git commit -m "todo: [$PROJECT] $TASK" 2>/dev/null || true
    git push origin main 2>/dev/null || echo "⚠️  push 실패 (로컬 저장 완료)"
    ;;

  done)
    SEARCH="$2"
    if [ -z "$SEARCH" ]; then
      echo "❌ 사용법: todo done \"검색어\""
      exit 1
    fi
    # [ ] → [x] 변환 + 날짜 추가
    MATCH=$(grep -n "\- \[ \].*$SEARCH" "$TODO_FILE" | head -1)
    if [ -z "$MATCH" ]; then
      echo "❌ '$SEARCH' 에 해당하는 대기 작업을 찾을 수 없습니다."
      exit 1
    fi
    LINE_NUM=$(echo "$MATCH" | cut -d: -f1)
    sed -i "${LINE_NUM}s/- \[ \]/- [x]/" "$TODO_FILE"
    # 날짜 추가 (이미 없으면)
    if ! sed -n "${LINE_NUM}p" "$TODO_FILE" | grep -q "($DATE)"; then
      sed -i "${LINE_NUM}s/$/ ($DATE)/" "$TODO_FILE"
    fi
    DONE_TASK=$(sed -n "${LINE_NUM}p" "$TODO_FILE")
    echo "✅ 완료 처리됨: $DONE_TASK"

    # Git 동기화
    cd "$SCRIPT_DIR/.."
    git add TODO.md
    git commit -m "todo: done — $SEARCH ($DATE)" 2>/dev/null || true
    git push origin main 2>/dev/null || echo "⚠️  push 실패 (로컬 저장 완료)"
    ;;

  list)
    FILTER="${2:-}"
    echo "📋 대기 중인 TODO:"
    echo "─────────────────────────────────────"
    if [ -n "$FILTER" ]; then
      grep -E "^\s*-\s*\[\s*\].*\[$FILTER\]" "$TODO_FILE" || echo "([$FILTER] 대기 작업 없음)"
    else
      grep -E "^\s*-\s*\[\s*\]" "$TODO_FILE" || echo "(대기 중인 작업 없음)"
    fi
    echo "─────────────────────────────────────"

    # 완료 항목 수도 표시
    TOTAL_PENDING=$(grep -cE "^\s*-\s*\[\s*\]" "$TODO_FILE" 2>/dev/null || echo "0")
    TOTAL_DONE=$(grep -cE "^\s*-\s*\[x\]" "$TODO_FILE" 2>/dev/null || echo "0")
    echo "📊 대기: $TOTAL_PENDING | 완료: $TOTAL_DONE"
    ;;

  stats)
    echo "📊 TODO 통계"
    echo "═════════════════════════════════════"

    TOTAL_PENDING=$(grep -cE "^\s*-\s*\[\s*\]" "$TODO_FILE" 2>/dev/null || echo "0")
    TOTAL_DONE=$(grep -cE "^\s*-\s*\[x\]" "$TODO_FILE" 2>/dev/null || echo "0")
    TOTAL=$((TOTAL_PENDING + TOTAL_DONE))

    echo "  전체: $TOTAL (대기: $TOTAL_PENDING, 완료: $TOTAL_DONE)"
    echo ""

    # 프로젝트별 분류
    PROJECTS=$(grep -oE "\[[A-Za-z0-9_-]+\]" "$TODO_FILE" | grep -v "\[x\]" | grep -v "\[ \]" | sort -u | tr -d '[]')
    if [ -n "$PROJECTS" ]; then
      printf "  %-15s  %-6s  %-6s\n" "프로젝트" "대기" "완료"
      printf "  ─────────────────────────────────\n"
      for prj in $PROJECTS; do
        P=$(grep -cE "^\s*-\s*\[\s*\].*\[$prj\]" "$TODO_FILE" 2>/dev/null || echo "0")
        D=$(grep -cE "^\s*-\s*\[x\].*\[$prj\]" "$TODO_FILE" 2>/dev/null || echo "0")
        printf "  %-15s  %-6s  %-6s\n" "$prj" "$P" "$D"
      done
    fi
    echo "═════════════════════════════════════"
    ;;

  *)
    echo "📋 A-Team TODO 관리"
    echo ""
    echo "사용법:"
    echo "  todo add \"내용\" [프로젝트]  — 새 할 일 추가"
    echo "  todo list [프로젝트]        — 대기 목록 (프로젝트 필터)"
    echo "  todo done \"검색어\"         — 완료 처리"
    echo "  todo stats                  — 프로젝트별 통계"
    ;;
esac
