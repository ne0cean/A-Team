#!/usr/bin/env bash
# init.sh — A-Team + Vibe-Toolkit 통합 프로젝트 초기화
# 사용법: bash A-Team/templates/init.sh [프로젝트명] [A-Team경로] [vibe-toolkit경로(선택)]
# 예시:   bash A-Team/templates/init.sh my-project ./A-Team
#          bash A-Team/templates/init.sh my-project ./A-Team /path/to/vibe-toolkit

set -e

PROJECT_NAME=${1:-"my-project"}
ATEAM_DIR=${2:-"./A-Team"}
VIBE_DIR=${3:-""}
DATE=$(date +%Y-%m-%d)

echo "═══════════════════════════════════════════════"
echo "  A-Team + Vibe-Toolkit 통합 초기화"
echo "  프로젝트: $PROJECT_NAME"
echo "═══════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────
# 1. .context/ — 살아있는 컨텍스트 시스템
# ─────────────────────────────────────────────────
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

## Access URLs
- Local: http://localhost:3000
- Production: (미설정)

---

## In Progress Files
- (없음)

---

## Last Completions
- **프로젝트 초기화** ($DATE)
  - .context/ 구조 생성
  - A-Team 서브에이전트 5종 설치
  - Vibe-Toolkit 거버넌스 레이어 설치

---

## Next Tasks

### 즉시
1. [ ] CLAUDE.md 프로젝트 구조 섹션 채우기
2. [ ] Goal 한 문장 작성
3. [ ] 첫 PRD 작성

---

## Blockers
- (없음)
EOF

cat > .context/SESSIONS.md << EOF
# 세션 로그 — $PROJECT_NAME

새로운 작업 세션이 끝날 때마다 결과를 남깁니다.

---

## [$DATE] 초기화

**완료**: A-Team + Vibe-Toolkit 통합 프레임워크로 프로젝트 스캐폴딩
**에이전트**: orchestrator, researcher, coder, reviewer, architect 설치
**거버넌스**: coding-safety, sync-and-commit, turbo-auto 규칙 설치

---
EOF

cat > .context/DECISIONS.md << EOF
# 의사결정 로그 — $PROJECT_NAME

기술적 결정과 그 이유를 기록합니다.

---

## [$DATE] 초기 설정

**결정**: A-Team + Vibe-Toolkit 통합 스택 사용
**이유**: 멀티에이전트 실행(A-Team) + 거버넌스 규칙(Vibe) 분리 아키텍처
**대안**: 단일 에이전트 / 직접 지시 방식

---
EOF

echo "✅ .context/ 초기화 완료"

# ─────────────────────────────────────────────────
# 2. memory/ — 장기 메모리 시스템
# ─────────────────────────────────────────────────
mkdir -p memory

cat > memory/MEMORY.md << EOF
# $PROJECT_NAME - Project Memory

## Overview
- **Root repo**: $PROJECT_NAME
- **Product**: [한 줄 설명]

## Tech Stack
- [언어/프레임워크 목록]

## Key Files
- [핵심 파일 경로와 역할]

## Architecture
- [주요 아키텍처 결정]

---

## Vibe Toolkit
→ See \`vibe-toolkit.md\` for full reference

### Key principles to always apply:
1. **DDD**: 코드 전에 문서/계획 먼저 (PRD → Tasks → Code)
2. **Coding Safety**: 파일 전체 읽고 나서 수정, 수정 후 빌드 검증
3. **Visual Verification**: 프론트엔드 작업 후 반드시 브라우저 확인 + URL 보고
4. **Commit Format**: \`[type]: summary\` + NOW/NEXT/BLOCK 구조
5. **Context Continuity**: \`.context/CURRENT.md\`를 항상 최신 상태로
6. **Atomic Changes**: 한 번에 하나씩, 검증 후 다음 단계
EOF

echo "✅ memory/ 초기화 완료"

# ─────────────────────────────────────────────────
# 3. .agent/rules/ — 거버넌스 규칙 레이어
# ─────────────────────────────────────────────────
mkdir -p .agent/rules

# A-Team governance/rules/ 에서 복사 (우선)
if [ -d "$ATEAM_DIR/governance/rules" ]; then
  cp "$ATEAM_DIR"/governance/rules/*.md .agent/rules/
  echo "✅ A-Team governance 규칙 복사 완료 (.agent/rules/)"
# vibe-toolkit 별도 경로 지정된 경우
elif [ -n "$VIBE_DIR" ] && [ -d "$VIBE_DIR/.agent/rules" ]; then
  cp "$VIBE_DIR"/.agent/rules/*.md .agent/rules/
  echo "✅ Vibe-Toolkit 규칙 복사 완료 (.agent/rules/)"
else
  # 기본 규칙 인라인 생성
  cat > .agent/rules/coding-safety.md << 'RULE'
# Coding Safety Rules

## 1. UI & 로직 보호
- 기존 로직 보존: UI 디자인 변경 시 기존 이벤트 핸들러나 API 연동 로직이 삭제되지 않도록 1순위로 보호
- 전체 구조 파악: 부분 수정 시에도 파일 전체를 정독하여 심볼 간 관계를 명확히

## 2. 치명적 사고 방지
- 심볼 체크: 존재하지 않는 변수나 메서드 참조 금지
- 데드 코드 금지: 리팩토링 후 우회된 기존 코드를 남겨두지 않음
- 빌드 검증: 수정 후 `npm run build` 등으로 런타임 에러 사전 차단

## 3. 시각적 검증 (Visual Verification)
- 프론트엔드 코드 수정 직후 브라우저에서 변경 사항 직접 확인
- 작업 완료 시 활성화된 URL을 반드시 보고
RULE

  cat > .agent/rules/sync-and-commit.md << 'RULE'
# Sync & Commit Rules

## 1. 커밋 메시지 강제 포맷
```text
[타입]: 작업 요약
NOW: 완료한 구체적 내용
NEXT: 다음 개발자가 이어받을 작업
BLOCK: 미해결 이슈
FILE: 수정된 주요 파일
```

## 2. URL 가시성
- 포트 변경이나 배포 URL 생성 시 즉시 보고하고 `.context/CURRENT.md`에 기록

## 3. 컨텍스트 연속성
- 세션 시작 시 CURRENT.md 읽고 마지막 상태 즉시 파악
- 세션 종료 시 CURRENT.md 갱신 필수
RULE

  cat > .agent/rules/turbo-auto.md << 'RULE'
# Turbo Auto Rules

## 자율 실행 기준
- 읽기 전용 명령(ls, git status, grep 등): 자동 실행
- 파일 생성/수정: 자동 실행
- 빌드/테스트: 자동 실행
- git push / 배포: 반드시 사용자 확인

## 연속 실행
- analyze → fix → validate → commit 체인을 끊지 않고 연속 실행
- ≥2회 실패 시 사용자에게 에스컬레이션 (무한 재시도 금지)
RULE

  cat > .agent/rules/mirror-sync.md << 'RULE'
# Mirror Sync Rules (CC Mirror)

## 1. 개요
모델 중단, 토큰 소진 시에도 작업 맥락을 보존하기 위한 자동 동기화 규칙입니다.

## 2. 자동 동기화 (`auto-sync.sh`)
- 백그라운드 데몬으로 실행되거나 세션 종료 훅(`stop-check.sh`)과 연동됩니다.
- 커밋 메시지: `sync: auto-commit [시간]` 포맷을 사용합니다.

## 3. 모델 핸드오프 (`model-exit.sh`)
- 사용자가 `/handoff` 혹은 `/end` 명령을 내릴 때 실행됩니다.
- `CURRENT.md` 기반으로 `HANDOFF_PROMPT.txt`를 생성하고 클립보드에 복사합니다.
RULE

  echo "✅ 기본 거버넌스 규칙 생성 완료 (.agent/rules/)"
fi

# ─────────────────────────────────────────────────
# 4. .agent/workflows/ — 세션 워크플로우
# ─────────────────────────────────────────────────
mkdir -p .agent/workflows

if [ -d "$ATEAM_DIR/governance/workflows" ]; then
  cp "$ATEAM_DIR"/governance/workflows/*.md .agent/workflows/
  echo "✅ A-Team governance 워크플로우 복사 완료 (.agent/workflows/)"
elif [ -n "$VIBE_DIR" ] && [ -d "$VIBE_DIR/.agent/workflows" ]; then
  cp "$VIBE_DIR"/.agent/workflows/*.md .agent/workflows/
  echo "✅ Vibe-Toolkit 워크플로우 복사 완료 (.agent/workflows/)"
else
  cat > .agent/workflows/session-start.md << 'WF'
# 세션 시작 워크플로우

1. `.context/CURRENT.md` 읽기
2. `git log --oneline -5` 실행
3. 상태 브리핑: "마지막 상태 [X], 다음 작업 [Y], 시작할까요?"
WF

  cat > .agent/workflows/session-end.md << 'WF'
# 세션 종료 워크플로우

1. `.context/CURRENT.md` 갱신 (완료 항목 + 다음 태스크)
2. `npm run build` 실행 및 통과 확인
3. 커밋: `[type]: 요약\nNOW: ...\nNEXT: ...\nBLOCK: ...\nFILE: ...`
4. (프론트엔드) 브라우저에서 최종 URL 확인
WF

  echo "✅ 기본 워크플로우 생성 완료 (.agent/workflows/)"
fi

# ─────────────────────────────────────────────────
# 5. .agent/skills/ — 스킬 라이브러리
# ─────────────────────────────────────────────────
mkdir -p .agent/skills

if [ -d "$ATEAM_DIR/governance/skills" ]; then
  cp -r "$ATEAM_DIR"/governance/skills/* .agent/skills/
  echo "✅ A-Team governance 스킬 복사 완료 (.agent/skills/)"
elif [ -n "$VIBE_DIR" ] && [ -d "$VIBE_DIR/.agent/skills" ]; then
  cp -r "$VIBE_DIR"/.agent/skills/* .agent/skills/
  echo "✅ Vibe-Toolkit 스킬 복사 완료 (.agent/skills/)"
fi

# ─────────────────────────────────────────────────
# 6. .claude/agents/ — A-Team 서브에이전트
# ─────────────────────────────────────────────────
AGENTS_SRC="$ATEAM_DIR/.claude/agents"
AGENTS_DST=".claude/agents"

if [ -d "$AGENTS_SRC" ]; then
  mkdir -p "$AGENTS_DST"
  cp "$AGENTS_SRC"/*.md "$AGENTS_DST/"
  echo "✅ A-Team 서브에이전트 설치 완료 (.claude/agents/)"
  echo "   └─ orchestrator, researcher, coder, reviewer, architect"
else
  echo "⚠️  A-Team 서브에이전트 소스를 찾을 수 없음: $AGENTS_SRC"
fi

# ─────────────────────────────────────────────────
# 6. PARALLEL_PLAN.md 템플릿
# ─────────────────────────────────────────────────
PLAN_SRC="$ATEAM_DIR/templates/PARALLEL_PLAN.md"
if [ -f "$PLAN_SRC" ] && [ ! -f "PARALLEL_PLAN.md" ]; then
  cp "$PLAN_SRC" PARALLEL_PLAN.md
  echo "✅ PARALLEL_PLAN.md 템플릿 복사 완료"
fi

# ─────────────────────────────────────────────────
# 7. CLAUDE.md — 통합 거버넌스 진입점
# ─────────────────────────────────────────────────
if [ ! -f CLAUDE.md ]; then
cat > CLAUDE.md << EOF
# $PROJECT_NAME — Claude Code Governance

## 세션 시작 시 반드시 읽기
1. \`memory/MEMORY.md\` — 프로젝트 요약 + 툴킷 핵심 원칙
2. \`.context/CURRENT.md\` — 현재 상태/진행 작업/다음 할 일

## 핵심 원칙
- **DDD**: 코드 전에 문서/계획 먼저
- **Coding Safety**: 파일 전체 읽고 수정, 수정 후 \`npm run build\` 검증
- **Visual Verification**: 프론트 작업 후 브라우저 확인 + URL 보고
- **Commit Format**: \`[type]: 요약\` + NOW/NEXT/BLOCK 구조

## 거버넌스 파일
- \`.agent/rules/\` — 코딩 안전, 동기화, 자율 실행 규칙
- \`.agent/workflows/\` — 세션 시작/종료 워크플로우

## A-Team 에이전트 (언제 쓸까?)

| 상황 | 에이전트 호출 방법 |
|------|-----------------|
| 복잡한 멀티파일 작업 | "이 작업을 A-Team으로 처리해줘" → orchestrator |
| 리서치/조사만 필요 | "researcher에게 맡겨줘" |
| 설계/아키텍처 결정 | "architect한테 물어봐줘" |
| 코드 리뷰/보안 검토 | "reviewer로 검증해줘" |
| 단순 작업 | 에이전트 불필요 — 직접 진행 |

### 에이전트 구성
- **orchestrator** — 멀티에이전트 총괄, PARALLEL_PLAN.md 작성 + governance 주입
- **researcher** — 리서치 전문 (Haiku, 비용 효율)
- **coder** — 구현/수정 전문 (Sonnet)
- **reviewer** — 품질 검증 + 보안 감사 (Sonnet)
- **architect** — 설계/아키텍처 (Opus)

## 프로젝트 구조
[프로젝트 구조 설명 — 직접 채우기]

## 빌드 명령
\`\`\`bash
npm run build
npm run test
\`\`\`
EOF
  echo "✅ CLAUDE.md 생성 완료 (프로젝트 구조 섹션을 직접 채워주세요)"
else
  echo "ℹ️  CLAUDE.md 이미 존재 — 스킵"
fi

# ─────────────────────────────────────────────────
# 8. .claude/hooks/ — 하네스 훅 스크립트
# ─────────────────────────────────────────────────
HOOKS_SRC="$ATEAM_DIR/templates/hooks"
HOOKS_DST=".claude/hooks"

if [ -d "$HOOKS_SRC" ]; then
  mkdir -p "$HOOKS_DST"
  cp "$HOOKS_SRC"/*.sh "$HOOKS_DST/"
  chmod +x "$HOOKS_DST"/*.sh
  echo "✅ 하네스 훅 설치 완료 (.claude/hooks/)"
  echo "   └─ pre-bash.sh, pre-write.sh, stop-check.sh, notify-log.sh"
else
  echo "ℹ️  훅 스크립트 소스 없음 — 수동 설치 필요 (.claude/hooks/)"
fi

# .claude/settings.json 생성 (없으면)
SETTINGS_SRC="$ATEAM_DIR/templates/settings.json"
if [ -f "$SETTINGS_SRC" ] && [ ! -f ".claude/settings.json" ]; then
  mkdir -p .claude
  cp "$SETTINGS_SRC" .claude/settings.json
  echo "✅ .claude/settings.json 훅 설정 복사 완료"
fi

# ─────────────────────────────────────────────────
# 9. browse 바이너리 체크 (선택적 — /browse, /qa 사용 시 필요)
# ─────────────────────────────────────────────────
BROWSE_BIN="$HOME/.claude/skills/gstack/browse/dist/browse"
if [ -f "$BROWSE_BIN" ]; then
  echo "✅ browse 바이너리 감지됨 (/browse, /qa 사용 가능)"
else
  echo "ℹ️  browse 바이너리 없음 — /browse, /qa 미사용 시 무시"
  echo "   설치: git clone https://github.com/garrytan/gstack ~/.claude/skills/gstack"
  echo "         cd ~/.claude/skills/gstack && ./setup"
fi

# ─────────────────────────────────────────────────
# 완료 메시지
# ─────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  초기화 완료: $PROJECT_NAME"
echo "═══════════════════════════════════════════════"
echo ""
echo "생성된 구조:"
echo "  .context/CURRENT.md          — 프로젝트 상태 추적 (살아있는 문서)"
echo "  .context/SESSIONS.md         — 세션 로그"
echo "  .context/DECISIONS.md        — 의사결정 로그"
echo "  memory/MEMORY.md             — 장기 메모리"
echo "  .agent/rules/                — 거버넌스 규칙 (coding-safety, sync, turbo)"
echo "  .agent/workflows/            — 세션 시작/종료 워크플로우"
echo "  .claude/agents/              — A-Team 서브에이전트 5종"
echo "  PARALLEL_PLAN.md             — 병렬 작업 플랜 템플릿"
echo "  CLAUDE.md                    — 통합 거버넌스 진입점"
echo ""
echo "다음 단계:"
echo "  1. CLAUDE.md — 프로젝트 구조 섹션 채우기"
echo "  2. .context/CURRENT.md — Goal 한 문장 작성"
echo "  3. 복잡한 작업: '이 작업을 A-Team으로 처리해줘'"
echo "     → orchestrator가 governance 로드 + PARALLEL_PLAN.md 작성 + 에이전트 조율"
echo ""
