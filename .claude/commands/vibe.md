---
description: 세션 시작 — 컨텍스트 로드 + Opus/Gemini 분류 + 즉시 실행 (Turbo One-Stop Start)
---

> **자동 트리거**: SessionStart 훅이 새 세션 시 Step 1~2를 자동 주입합니다.
> 수동 `/vibe`는 컨텍스트 강제 리로드 또는 태스크 재분류 시 사용.

## Step 1 — 컨텍스트 로드 (SessionStart 훅이 자동 수행)
새 세션이면 이미 주입됨 → 확인만. 수동 호출이면 아래 실행:
1. `.context/CURRENT.md` 2. `.context/DECISIONS.md` 3. `memory/MEMORY.md`
4. `git status && git log --oneline -5`
5. 새 리서치 노트: `.research/notes/` 에서 CURRENT.md 이후 파일 확인

## Step 2 — 태스크 분류 (Opus / Gemini)
CURRENT.md의 Next Tasks를 분류하고 `.context/GEMINI_TASKS.md` 갱신.

**🔵 Opus (고난이도):** 아키텍처 설계, 복잡한 리팩토링, 멀티파일 연쇄, 보안, 신규 핵심 기능, 디버깅(원인 불명), 오케스트레이션, 성능 최적화
**🟡 Gemini (위임):** 문서/README, CSS/스타일, 설정 파일, 테스트 추가, 단순 CRUD, 번역, 린팅, 마이너 버그(원인 명확), 리서치

## Step 3 — 실행 모드 + 모델 결정
최우선 Opus 태스크를 분석:

```
에이전트 1-2 + 독립     → 🟢 단일 터미널
에이전트 3-5 + 파일 분리 → 🟡 A-Team 오케스트레이션
에이전트 5+ / 대규모     → 🔴 멀티터미널 디스패치
설계 결정 / 옵션 비교    → 🟣 MoA 모드
```

**모델 추천** (현재 세션 모델과 다르면 안내):
- 아키텍처/설계 결정 → `opus` 권장
- 구현/리팩토링 → `sonnet` 권장
- 리서치/문서 → `haiku` 권장 (또는 Gemini 위임)
- 현재 모델이 적합하지 않으면: "이 태스크는 [모델] 추천. `/model [모델]`로 전환하세요."

**판정 출력**:
- 🟢 → 즉시 진행
- 🟡 → "A-Team 오케스트레이션 추천. 진행?" → orchestrator 호출
- 🔴 → "멀티터미널 디스패치 추천. 진행?" → orchestrator + dispatch.sh
- 🟣 → "MoA 모드 추천. 진행?" → MoA 활성화

## Step 3.5 — Ralph Loop 야간 태스크 제안
CURRENT.md의 Next Tasks 중 **기계 검증 가능한** 항목을 골라 야간 Ralph Loop 후보로 제안.

**선정 기준:**
- `--check` 명령을 만들 수 있는가? (빌드, 테스트, 린트 등)
- 단독 반복으로 완료 가능한가? (다른 작업에 의존 X)
- 별도 브랜치에서 안전하게 돌릴 수 있는가?

**출력 형식:**
```
🌙 오늘 밤 Ralph Loop 후보:
  1. "[태스크]" --check "[cmd]" --model [모델] --max [N]
  2. "[태스크]" --check "[cmd]" --model [모델] --max [N]
  돌릴까요? (번호 선택 or 패스)
```

사용자가 선택하면 `/ralph start` 또는 `/re pipeline`으로 등록.
패스하면 야간에 Research Mode만 실행됨.

## Step 4 — 실행
브리핑: "마지막 [X] 상태. Opus [N]개 / Gemini [M]개. [모드] + [모델]로 시작."

- **Opus 태스크**: 선택된 모드로 즉시 실행
- **Gemini 태스크**: GEMINI_TASKS.md에 기록만. 토큰 소진 시 Gemini가 이어받음
- 리서치 노트 적용 원하면 해당 태스크 우선

## 자율 작업 원칙
- 안전한 탐색/읽기는 승인 없이 진행
- [분석 → 수정 → 검증] 한 번에 묶어 실행
- 실패 시 원인 파악 후 재시도 (최대 2회), 모호한 부분만 최소 질문
