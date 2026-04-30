---
description: 세션 시작 — 컨텍스트 로드 + Opus/Gemini 분류 + 즉시 실행 (Turbo One-Stop Start)
---

세션을 시작합니다.

## Step 0 — A-Team 업데이트 확인
A-Team 위치를 순서대로 탐색합니다:
```bash
ATEAM=$(git rev-parse --show-toplevel 2>/dev/null)/A-Team
[ -d "$ATEAM" ] || ATEAM=~/tools/A-Team
[ -d "$ATEAM" ] || ATEAM=~/.local/A-Team
```
디렉토리가 존재하면:
```bash
cd "$ATEAM" && git fetch origin 2>/dev/null && git log HEAD..origin/master --oneline 2>/dev/null
```
- 새 커밋 있으면 → `git pull origin master` 후 변경 파일 한 줄 요약
- 없으면 이 단계 스킵

## Step 0.5 — 신규 프로젝트 감지

아래 조건을 bash로 확인한다:
```bash
# 신규 프로젝트 판단 기준
HAS_CONTEXT=$([ -f ".context/CURRENT.md" ] && echo "yes" || echo "no")
HAS_GIT=$(git log --oneline -1 2>/dev/null | head -1)
HAS_BUILD=$(ls package.json pyproject.toml go.mod Cargo.toml 2>/dev/null | head -1)
```

**3가지 중 2가지 이상 "없음"이면 신규 프로젝트로 판단:**
- `.context/CURRENT.md` 없음
- git 커밋 기록 없음 (빈 레포 또는 git init 직후)
- `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` 없음

**신규 프로젝트로 판단되면 사용자에게 질문:**

> 📁 새 프로젝트로 감지됩니다. 프로젝트 규모를 알려주세요:
>
> **1) NANO** — 토이/실험 (하루~1주, 구조 없이 빠르게)
> **2) STANDARD** — MVP/사이드 (1주~3개월, 에이전트 병렬 협업)
> **3) PRO** — 판매 제품 (장기 운영, DDD + 품질 파이프라인)
>
> 선택하시면 `init.sh`로 적합한 구조를 자동 셋업합니다.

사용자 응답 받으면:
```bash
bash A-Team/templates/init.sh "$(basename $(pwd))" ./A-Team
# Tier 선택 프롬프트에 사용자가 선택한 번호 입력
```
init.sh 완료 후 Step 1로 진행.

기존 프로젝트(조건 미해당)면 이 단계 스킵.

## Step 1 — 컨텍스트 로드
다음 파일을 순서대로 읽는다. 없으면 스킵.
1. `.context/CURRENT.md` — 현재 상태, 진행 중 작업, 다음 할 일
2. `.context/DECISIONS.md` — 주요 기술 결정
3. `memory/MEMORY.md` — 누적 프로젝트 기억
4. `A-Team/docs/INDEX.md` — 레슨런드 인덱스 (경량. 이번 세션 작업 영역과 겹치는 항목 있으면 해당 본문만 on-demand 로드)

## Step 2 — 마지막 중단 지점 파악
```bash
git status && git log --oneline -5
```

## Step 2.5 — 다른 에이전트 결과물 확인
```bash
ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
# 에이전트 결과물 디렉토리 탐색 (최근 72시간 내 생성/수정된 파일)
find "$ROOT/.context/agent-results" -name "*.md" 2>/dev/null | sort -r | head -20
find "$ROOT/.agent/results" -name "*.md" 2>/dev/null | sort -r | head -10
# RemoteTrigger / 스케줄 에이전트 결과 로그
find "$ROOT/.claude" -name "agent-*.log" -newer "$ROOT/.context/CURRENT.md" 2>/dev/null | sort -r | head -5
```

결과물이 있으면:
1. 각 파일의 **앞 30줄**만 읽어 요약 (전체 읽기 금지 — 토큰 절약)
2. 완료된 Gemini 태스크가 있으면 `.context/GEMINI_TASKS.md`에서 해당 항목 `[x]` 처리
3. 다른 에이전트가 남긴 **BLOCK / 미완료 항목**이 있으면 이번 세션 태스크 후보로 추가
4. 확인 완료된 결과 파일은 `archived: true` 헤더를 첫 줄에 추가 (재처리 방지)

없으면 이 단계 스킵.

> **결과물 저장 컨벤션** (에이전트가 결과를 남길 때 따라야 할 규칙):
> - 경로: `.context/agent-results/YYYYMMDD-HHMMSS-{agent-type}-{task-slug}.md`
> - 헤더 필수: `agent`, `task`, `status` (done/partial/blocked), `timestamp`
> - 예: `.context/agent-results/20260326-143000-gemini-product-hunt-copy.md`

## Step 3 — Research Mode 노트 확인
```bash
find "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.research/notes" -name "*.md" -newer "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.context/CURRENT.md" 2>/dev/null | sort -r | head -10
```
- 새 노트 있으면: 카테고리별 핵심 발견 브리핑 후 "어떤 제안을 이번 세션에서 적용할까요?" 질문
- 없으면 스킵

## Step 4 — 태스크 분류 (Opus / Gemini)

CURRENT.md의 Next Tasks를 아래 기준으로 분류하고 `.context/GEMINI_TASKS.md`를 생성/갱신한다.

**🔵 Opus 태스크 (Claude — 고난이도):**
- 아키텍처 설계 / 복잡한 리팩토링 / 멀티파일 연쇄 변경
- 보안 취약점 분석 및 수정
- 신규 핵심 기능 구현 (비즈니스 로직 포함)
- 복잡한 버그 디버깅 (원인 불명)
- A-Team 오케스트레이션 필요 작업
- 성능 최적화 (profiling 기반)

**🟡 Gemini 태스크 (위임 가능 — 단순/반복):**
- 문서/README 작성 및 업데이트, 주석 보완
- CSS/스타일 조정 (레이아웃 변경 없음)
- 단순 설정 파일 수정 (config, env)
- 테스트 케이스 추가 (로직 변경 없음)
- 단순 CRUD 구현 (패턴 명확)
- 번역, 린팅 에러 일괄 수정
- 마이너 버그 수정 (원인 명확, 단일 파일)
- 리서치 / 레퍼런스 조사

## Step 5 — 실행
브리핑 한 문장: "마지막으로 [X] 상태. [첫 번째 Opus 태스크] 시작합니다."
Research Mode 노트 적용 원하면 해당 태스크 우선. 아니면 Opus 최우선 항목 즉시 시작.

## 자율 작업 원칙
- 안전한 탐색/읽기 작업은 승인 없이 진행
- [분석 → 수정 → 검증] 흐름을 한 번에 묶어서 실행
- 실패 시 즉시 질문하지 않고 원인 파악 후 재시도 (최대 2회)
- 모호한 부분만 최소한으로 질문
