#!/usr/bin/env bash
# check-health.sh — A-Team 프로젝트 표준 준수 여부 확인 스크립트
# 사용법: bash A-Team/scripts/check-health.sh [프로젝트-경로]

TARGET_DIR=${1:-"."}

echo "🔍 A-Team 프로젝트 상태 점검: $TARGET_DIR"
echo "─────────────────────────────────────────"

check_file() {
  if [ -f "$TARGET_DIR/$1" ]; then
    echo "✅ [정상] $1 발견"
    return 0
  else
    echo "❌ [미발견] $1 없음"
    return 1
  fi
}

check_dir() {
  if [ -d "$TARGET_DIR/$1" ]; then
    echo "✅ [정상] $1/ 디렉토리 발견"
    return 0
  else
    echo "❌ [미발견] $1/ 디렉토리 없음"
    return 1
  fi
}

# 1. 필수 파일 및 디렉토리 점검
FAILED=0
check_file "CLAUDE.md" || FAILED=$((FAILED+1))
check_dir ".context" || FAILED=$((FAILED+1))
check_file ".context/CURRENT.md" || FAILED=$((FAILED+1))
check_file ".context/SESSIONS.md" || FAILED=$((FAILED+1))
check_dir ".claude/agents" || FAILED=$((FAILED+1))

# 2. 서브에이전트 점검
if [ -d "$TARGET_DIR/.claude/agents" ]; then
  AGENTS=(orchestrator researcher coder reviewer architect)
  MISSING_AGENTS=()
  for agent in "${AGENTS[@]}"; do
    if [ ! -f "$TARGET_DIR/.claude/agents/$agent.md" ]; then
      MISSING_AGENTS+=("$agent")
    fi
  done
  
  if [ ${#MISSING_AGENTS[@]} -eq 0 ]; then
    echo "✅ [정상] 서브에이전트 5종 모두 설치됨"
  else
    echo "⚠️  [경고] 일부 서브에이전트 누락: ${MISSING_AGENTS[*]}"
  fi
fi

# 3. 추가 권장 파일 점검
check_file "PARALLEL_PLAN.md" || echo "ℹ️  [정보] PARALLEL_PLAN.md 미사용 중 (병렬 작업 없음)"
check_file "PRD.md" || echo "ℹ️  [정보] PRD.md 없음"

echo "─────────────────────────────────────────"
if [ $FAILED -eq 0 ]; then
  echo "✨ 점검 결과: 프로젝트가 A-Team 표준을 잘 준수하고 있습니다!"
else
  echo "❗ 점검 결과: $FAILED 개의 필수 요소가 누락되었습니다. 'project-scaffold.sh'를 실행하거나 수동으로 보완하세요."
fi
