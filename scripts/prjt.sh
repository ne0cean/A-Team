#!/usr/bin/env bash
# prjt.sh — 중앙 TODO 기반의 프로젝트 목록 및 상태 요약 (A-Team 표준 준수)
# 사용법: bash A-Team/scripts/prjt.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TODO_FILE="$SCRIPT_DIR/../TODO.md"

if [ ! -f "$TODO_FILE" ]; then
    echo "❌ TODO.md 파일이 없습니다."
    exit 1
fi

echo "📂 [최우선] 현재 진행 중인 모든 작업 목록:"
echo "─────────────────────────────────────────"
# 1. ## 📋 Task List 섹션에서 대기 중인 작업([ ])만 모두 추출 (A-Team 표준 2단계)
grep -E "^\s*-\s*\[\s*\]" "$TODO_FILE" || echo "(대기 중인 작업 없음)"
echo "─────────────────────────────────────────"

echo ""
echo "📊 프로젝트별 요약:"
echo "─────────────────────────────────────────"

# 2. 프로젝트 태그 추출
PROJECTS=$(grep -oE "\]\s*\[[^]]+\]" "$TODO_FILE" | grep -oE "\[[^]]+\]" | tr -d '[]' | sort -u)

if [ -z "$PROJECTS" ]; then
    echo "(추적 중인 프로젝트 없음)"
else
    # 테이블 헤더
    printf "%-15s | %-10s | %-20s\n" "프로젝트" "대기 수" "최근 완료"
    printf "─────────────────────────────────────────\n"

    for prj in $PROJECTS; do
        PENDING=$(grep -E "^\s*-\s*\[\s*\]\s*\[$prj\]" "$TODO_FILE" | wc -l)
        LAST_READY=$(grep -E "^\s*-\s*\[x\]\s*\[$prj\]" "$TODO_FILE" | head -n 1 | sed -E "s/.*\[$prj\] //")
        
        [ -z "$LAST_READY" ] && LAST_READY="(없음)"
        LAST_READY_SHORT=$(echo "$LAST_READY" | cut -c1-18)
        [ ${#LAST_READY} -gt 18 ] && LAST_READY_SHORT="${LAST_READY_SHORT}..."
        
        printf "%-15s | %-10s | %-20s\n" "$prj" "$PENDING" "$LAST_READY_SHORT"
    done
fi
echo "─────────────────────────────────────────"
