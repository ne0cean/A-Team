#!/usr/bin/env bash
# todo.sh — 통합 TODO 관리 스크립트 (단일 리스트형)
# 사용법:
#   bash A-Team/scripts/todo.sh "내용" [프로젝트명]  -> 추가
#   bash A-Team/scripts/todo.sh                  -> 전체 목록 보기

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TODO_FILE="$SCRIPT_DIR/../TODO.md"
DEFAULT_PROJECT=$(basename "$(pwd)")

if [ ! -f "$TODO_FILE" ]; then
    echo "# Central TODO List" > "$TODO_FILE"
    echo "" >> "$TODO_FILE"
    echo "## 📋 Task List" >> "$TODO_FILE"
fi

if [ -z "$1" ]; then
    echo "📋 현재 TODO 목록:"
    grep -E "^\s*-\s*\[\s*\]" "$TODO_FILE" || echo "(대기 중인 작업 없음)"
else
    TASK="$1"
    PROJECT="${2:-$DEFAULT_PROJECT}"
    
    # "## 📋 Task List" 섹션 아래에 추가
    if grep -q "## 📋 Task List" "$TODO_FILE"; then
        sed -i "/## 📋 Task List/a - [ ] [$PROJECT] $TASK" "$TODO_FILE"
    else
        echo "- [ ] [$PROJECT] $TASK" >> "$TODO_FILE"
    fi
    echo "✅ 추가됨: [$PROJECT] $TASK"
    
    # Git 동기화 (A-Team)
    cd "$SCRIPT_DIR/.."
    git add TODO.md
    git commit -m "todo: [$PROJECT] $TASK 추가"
    git push origin main || echo "⚠️  동기화 실패 (로컬 저장은 완료됨)"
fi
