#!/usr/bin/env bash
# project-scaffold.sh — 멀티 에이전트 프로젝트 초기화 스크립트
# 사용법: bash project-scaffold.sh [프로젝트명]
# 설명: .context/ 디렉토리 구조와 초기 파일을 자동 생성한다.

set -e

PROJECT_NAME=${1:-"my-project"}
DATE=$(date +%Y-%m-%d)

echo "🔧 멀티 에이전트 프로젝트 초기화: $PROJECT_NAME"

# .context/ 생성
mkdir -p .context

cat > .context/CURRENT.md << EOF
# CURRENT — $PROJECT_NAME

이 문서는 프로젝트의 현재 상태를 나타내는 살아있는 문서입니다.
세션 시작 시 가장 먼저 읽고, 세션 종료 시 반드시 최신화하세요.

---

## Goal
[한 문장 목표]

## Status
초기화 완료. 개발 시작 전.

---

## In Progress Files
- (없음)

---

## Last Completions
- **프로젝트 초기화** ($DATE)
  - .context/ 구조 생성

---

## Next Tasks
1. [ ] PRD 작성 및 태스크 분해
2. [ ] 병렬 플랜 수립 (PARALLEL_PLAN.md)
3. [ ] 에이전트 스폰 및 작업 시작

---

## Blockers
- (없음)
EOF

cat > .context/SESSIONS.md << EOF
# 세션 로그 — $PROJECT_NAME

새로운 작업 세션이 끝날 때마다 결과를 남깁니다.

---

## [$DATE] 초기화

**완료**: 프로젝트 스캐폴딩
**빌드**: (해당 없음)

---
EOF

echo "✅ .context/ 초기화 완료"

# CLAUDE.md가 없으면 기본 생성
if [ ! -f CLAUDE.md ]; then
cat > CLAUDE.md << EOF
# $PROJECT_NAME — Claude Code Governance

## 세션 시작 시 반드시 읽기
1. \`.context/CURRENT.md\` — 현재 상태 / 진행 작업 / 다음 할 일
2. \`PARALLEL_PLAN.md\` (존재 시) — 내 역할과 파일 소유권 확인

## 핵심 원칙
- **파일 소유권 준수**: PARALLEL_PLAN.md에 명시된 내 파일 영역만 수정
- **Coding Safety**: 파일 전체 읽고 수정, 수정 후 빌드 검증
- **Commit Format**: \`[type]: 요약\` + NOW/NEXT/BLOCK 구조
- **컨텍스트 갱신**: 태스크 완료마다 CURRENT.md 갱신

## 프로젝트 구조
[프로젝트 구조 설명]

## 빌드 명령
\`\`\`bash
# 빌드
npm run build   # 또는 해당 빌드 명령

# 테스트
npm run test
\`\`\`
EOF
  echo "✅ CLAUDE.md 생성 완료"
else
  echo "ℹ️  CLAUDE.md 이미 존재 — 스킵"
fi

# ClawTeam 초기화 (설치된 경우)
if command -v clawteam &> /dev/null; then
  echo ""
  read -p "ClawTeam 팀을 생성할까요? (y/N): " INIT_CLAWTEAM
  if [[ "$INIT_CLAWTEAM" == "y" || "$INIT_CLAWTEAM" == "Y" ]]; then
    export CLAWTEAM_AGENT_NAME="leader"
    export CLAWTEAM_AGENT_TYPE="leader"
    clawteam team spawn-team "$PROJECT_NAME" -n leader -d "$PROJECT_NAME 멀티 에이전트 팀"
    echo "✅ ClawTeam 팀 '$PROJECT_NAME' 생성 완료"
    echo "   워커 스폰: clawteam spawn --team $PROJECT_NAME --agent-name worker1 --task '...'"
  fi
else
  echo "ℹ️  ClawTeam 미설치 — 수동 조율 모드 (PARALLEL_PLAN.md 사용)"
fi

echo ""
echo "✅ 초기화 완료!"
echo ""
echo "다음 단계:"
echo "  1. CLAUDE.md 프로젝트 구조 섹션 채우기"
echo "  2. templates/PARALLEL_PLAN.md 복사 후 태스크 설계"
echo "  3. 에이전트 스폰 (docs/06-build-methodology.md Phase 2 참조)"
