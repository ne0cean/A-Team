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

## Step 1 — 컨텍스트 로드
다음 파일을 순서대로 읽는다. 없으면 스킵.
1. `.context/CURRENT.md` — 현재 상태, 진행 중 작업, 다음 할 일
2. `.context/DECISIONS.md` — 주요 기술 결정
3. `memory/MEMORY.md` — 누적 프로젝트 기억

## Step 2 — 마지막 중단 지점 파악
```bash
git status && git log --oneline -5
```

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

## Step 4.5 — 실행 모드 판단

최우선 Opus 태스크를 분석하여 실행 모드를 결정한다:

**자동 판단 기준** (docs/08 2축 분류 참조):
- 예상 에이전트 수: 태스크 범위에서 필요한 전문 에이전트 수 추정
- 작업 유형: 구현 / 설계결정 / 탐색적리서치 / 장기프로젝트
- 파일 의존성: 파일 겹침 여부

**결정 트리**:
```
에이전트 1-2개 + 독립 → 🟢 단일 터미널 (이대로 진행)
에이전트 3-5개 + 파일 분리 가능 → 🟡 A-Team 오케스트레이션 권장
에이전트 5+ 또는 대규모 변경 → 🔴 멀티터미널 디스패치 권장
설계 결정 / 옵션 비교 → 🟣 MoA 모드 권장
```

**판정 결과 출력**:
- 🟢 → "단일 터미널로 충분합니다." → Step 5로 진행
- 🟡 → "A-Team 오케스트레이션을 추천합니다. 진행할까요?" → Y: orchestrator 호출 / N: 단일 진행
- 🔴 → "멀티터미널 디스패치를 추천합니다. 진행할까요?" → Y: orchestrator + dispatch.sh / N: 단일 진행
- 🟣 → "MoA(설계 비교) 모드를 추천합니다. 진행할까요?" → Y: MoA 활성화 / N: 단일 진행

## Step 5 — 실행

브리핑 한 문장: "마지막으로 [X] 상태. Opus [N]개 / Gemini [M]개. [실행 모드]로 시작합니다."

**Opus 태스크**: Step 4.5에서 선택된 모드로 즉시 실행.
**Gemini 태스크**: GEMINI_TASKS.md에 기록만 하고 이 세션에서는 건드리지 않음.
토큰 소진 시 Gemini가 GEMINI_TASKS.md를 읽고 나머지를 이어받는다.

Research Mode 노트 적용 원하면 해당 태스크 우선. 아니면 Opus 최우선 항목 즉시 시작.

## 자율 작업 원칙
- 안전한 탐색/읽기 작업은 승인 없이 진행
- [분석 → 수정 → 검증] 흐름을 한 번에 묶어서 실행
- 실패 시 즉시 질문하지 않고 원인 파악 후 재시도 (최대 2회)
- 모호한 부분만 최소한으로 질문
