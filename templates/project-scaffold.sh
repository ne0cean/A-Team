#!/usr/bin/env bash
# project-scaffold.sh — A-Team 멀티 에이전트 프로젝트 초기화 스크립트
# 사용법: bash A-Team/templates/project-scaffold.sh [프로젝트명] [A-Team-레포-경로]
# 예시:   bash A-Team/templates/project-scaffold.sh my-project ./A-Team

set -e

PROJECT_NAME=${1:-"my-project"}
ATEAM_DIR=${2:-"./A-Team"}
DATE=$(date +%Y-%m-%d)

echo "🔧 A-Team 프로젝트 초기화: $PROJECT_NAME"

# ─────────────────────────────────────────
# 1. .context/ 디렉토리 초기화
# ─────────────────────────────────────────
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
  - A-Team 서브에이전트 설치 완료

---

## Next Tasks
1. [ ] PRD 작성 및 태스크 분해
2. [ ] PARALLEL_PLAN.md 작성 (orchestrator 에이전트 활용)
3. [ ] 에이전트 스폰 및 병렬 작업 시작

---

## Blockers
- (없음)
EOF

cat > .context/SESSIONS.md << EOF
# 세션 로그 — $PROJECT_NAME

새로운 작업 세션이 끝날 때마다 결과를 남깁니다.

---

## [$DATE] 초기화

**완료**: A-Team 프레임워크로 프로젝트 스캐폴딩
**에이전트**: orchestrator, researcher, coder, reviewer, architect 설치
**빌드**: (해당 없음)

---
EOF

echo "✅ .context/ 초기화 완료"

# ─────────────────────────────────────────
# 2. Claude Code 서브에이전트 설치
# ─────────────────────────────────────────
AGENTS_SRC="$ATEAM_DIR/.claude/agents"
AGENTS_DST=".claude/agents"

if [ -d "$AGENTS_SRC" ]; then
  mkdir -p "$AGENTS_DST"
  cp "$AGENTS_SRC"/*.md "$AGENTS_DST/"
  echo "✅ A-Team 서브에이전트 설치 완료 (.claude/agents/)"
  echo "   └─ orchestrator, researcher, coder, reviewer, architect"
else
  echo "⚠️  A-Team 서브에이전트 소스를 찾을 수 없음: $AGENTS_SRC"
  echo "   A-Team 레포 경로를 두 번째 인자로 전달하거나"
  echo "   수동으로 .claude/agents/ 디렉토리를 생성하세요."
fi

# ─────────────────────────────────────────
# 3. PARALLEL_PLAN.md 템플릿 복사
# ─────────────────────────────────────────
PLAN_SRC="$ATEAM_DIR/templates/PARALLEL_PLAN.md"
if [ -f "$PLAN_SRC" ] && [ ! -f "PARALLEL_PLAN.md" ]; then
  cp "$PLAN_SRC" PARALLEL_PLAN.md
  echo "✅ PARALLEL_PLAN.md 템플릿 복사 완료"
fi

# ─────────────────────────────────────────
# 4. CLAUDE.md 생성 (없는 경우)
# ─────────────────────────────────────────
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

## A-Team 서브에이전트
\`.claude/agents/\`에 5개 전문 에이전트가 설치되어 있습니다:
- **orchestrator** — 멀티에이전트 작업 총괄 (Supervisor 패턴)
- **researcher** — 리서치/조사 전문 (Haiku, 비용 효율)
- **coder** — 구현/수정 전문 (Sonnet)
- **reviewer** — 품질 검증 전문 (Sonnet)
- **architect** — 설계/아키텍처 전문 (Opus)

## 빠른 시작
복잡한 작업 → "이 작업을 A-Team으로 처리해줘" → orchestrator 자동 호출
단순 작업 → 직접 진행 (에이전트 불필요)

## 프로젝트 구조
[프로젝트 구조 설명]

## 빌드 명령
\`\`\`bash
npm run build
npm run test
\`\`\`
EOF
  echo "✅ CLAUDE.md 생성 완료"
else
  echo "ℹ️  CLAUDE.md 이미 존재 — 스킵"
fi

# ─────────────────────────────────────────
# 5. 글로벌 슬래시 명령어 설치 (/vibe, /end)
# ─────────────────────────────────────────
GLOBAL_COMMANDS_SRC="$ATEAM_DIR/.claude/commands"
GLOBAL_COMMANDS_DST="$HOME/.claude/commands"

if [ -d "$GLOBAL_COMMANDS_SRC" ]; then
  mkdir -p "$GLOBAL_COMMANDS_DST"
  for cmd_file in "$GLOBAL_COMMANDS_SRC"/*.md; do
    fname=$(basename "$cmd_file")
    if [ ! -f "$GLOBAL_COMMANDS_DST/$fname" ]; then
      cp "$cmd_file" "$GLOBAL_COMMANDS_DST/"
      echo "✅ 글로벌 명령어 설치: /$( echo "$fname" | sed 's/.md$//')"
    else
      echo "ℹ️  이미 존재: ~/$fname — 스킵"
    fi
  done
else
  echo "ℹ️  글로벌 명령어 소스 없음 — 스킵"
fi

# ─────────────────────────────────────────
# 6. ClawTeam 초기화 (선택)
# ─────────────────────────────────────────
if command -v clawteam &> /dev/null; then
  echo ""
  read -p "ClawTeam 팀을 생성할까요? (y/N): " INIT_CLAWTEAM
  if [[ "$INIT_CLAWTEAM" == "y" || "$INIT_CLAWTEAM" == "Y" ]]; then
    export CLAWTEAM_AGENT_NAME="leader"
    export CLAWTEAM_AGENT_TYPE="leader"
    clawteam team spawn-team "$PROJECT_NAME" -n leader -d "$PROJECT_NAME A-Team"
    echo "✅ ClawTeam 팀 '$PROJECT_NAME' 생성 완료"
  fi
else
  echo "ℹ️  ClawTeam 미설치 — Claude Code 서브에이전트 모드로 운영"
fi

# ─────────────────────────────────────────
# 완료 메시지
# ─────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════"
echo "✅ A-Team 초기화 완료: $PROJECT_NAME"
echo "═══════════════════════════════════════"
echo ""
echo "생성된 파일:"
echo "  .context/CURRENT.md      — 프로젝트 상태 추적"
echo "  .context/SESSIONS.md     — 세션 로그"
echo "  .claude/agents/          — A-Team 서브에이전트 5종"
echo "  PARALLEL_PLAN.md         — 병렬 작업 플랜 템플릿"
echo "  CLAUDE.md                — Claude Code 거버넌스"
echo "  ~/.claude/commands/      — /vibe, /end 글로벌 명령어"
echo ""
echo "다음 단계:"
echo "  1. CLAUDE.md 프로젝트 구조 섹션 채우기"
echo "  2. 복잡한 작업 시작: '이 작업을 A-Team으로 처리해줘'"
echo "  3. orchestrator가 PARALLEL_PLAN.md 자동 작성 + 에이전트 조율"
