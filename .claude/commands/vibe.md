---
description: 세션 시작 — 컨텍스트 로드 + Opus/Gemini 분류 + 즉시 실행 (Turbo One-Stop Start)
---

> **자동 트리거**: SessionStart 훅이 새 세션 시 Step 1~2를 자동 주입합니다.
> 수동 `/vibe`는 컨텍스트 강제 리로드 또는 태스크 재분류 시 사용.

## Step 0.3 — Daily Tip (매일 2개 유용한 명령어 소개)

오늘 날짜 기반으로 아래 팁 목록에서 2개를 순환 선택하여 사용자에게 간결히 소개한다.
날짜 인덱스 = (월 × 31 + 일) % (팁 수 / 2) × 2

**팁 목록:**
1. `/adversarial` — 공격자 시각으로 코드를 검토. 인증/결제 코드 변경 시 특히 유용
2. `/cso` — OWASP Top 10 + STRIDE 전체 보안 감사. 릴리즈 전 필수
3. `/benchmark --diff` — 성능 회귀만 빠르게 확인. CI에 넣으면 회귀 자동 차단
4. `/doc-sync` — 코드-문서 drift 점수 측정. "문서 얼마나 썩었지?" 한 방에 파악
5. `/autoplan` — CEO→디자인→엔지니어링 3단계 자동 검토. 큰 기능 시작 전 리스크 선제 차단
6. `/tdd` — Red-Green-Refactor 강제. "테스트 먼저" 습관 자동화
7. `/review` — PR 머지 전 7-Phase 전체 리뷰. `/ship` 전에 한 번
8. `/qa` — 브라우저 자동화 8카테고리 QA. 헬스 스코어로 앱 상태 수치화
9. `/investigate` — 버그 근본 원인 체계적 분석. "왜 안 되지?" 대신 체계적 추적
10. `/retro` — 엔지니어링 회고. 세션 끝에 돌아보면 다음에 더 잘함
11. `/craft` — PRO Tier 품질 파이프라인. 중요한 코드에 장인 정신
12. `/land` — 배포 신뢰도 검증. "진짜 배포해도 돼?" 수치로 답변
13. `/office-hours` — 아이디어 검증 & 설계 발견. 구현 전 30분 투자로 방향 확인
14. `/ship` — PR 생성 전 완전 검증. review + test + build 한 방에
15. `Agent(subagent_type="guardrail")` — 코드 변경 후 잔여 디버그/설정 위반 자동 감지
16. `/ralph` — 야간 자율 개발 데몬. 잠자는 동안 코드 태스크 자동 반복
17. `/re` — 리서치 모드. 조사가 필요하면 데몬에게 맡기고 다른 일
18. `/sync` — 자동 저장/커밋 데몬. 작업 중 수동 커밋 부담 제거
19. `/handoff` — 모델 전환 핸드오프. Opus↔Sonnet 전환 시 맥락 유지
20. `/pickup` — 토큰 소진 후 재개. 중단된 작업 즉시 이어받기

**출력 형식 (간결하게):**
```
---
💡 오늘의 팁
  1. `/adversarial` — 공격자 시각 코드 검토. 인증 코드 변경 시 필수
  2. `/benchmark --diff` — 성능 회귀 빠른 확인. CI 자동 차단용
---
```

## Step 0.5 — Post-Integration 감지 (자동)
이전 세션 이후 메이저 통합이 있었는지 확인:
```bash
git diff --name-only HEAD~3..HEAD 2>/dev/null | grep -E '^(lib/.*\.ts|\.claude/agents/.*\.md|governance/)' || true
```
감지되면: "메이저 통합 감지. `/optimize` 자동 실행합니다." → PIOP Phase 1-5 수행.
감지 안 되면: 스킵하고 Step 1로.

## Step 0.7 — 학습/Instinct 로드 (자동, 저비용)
프로젝트에 학습 데이터가 있으면 세션 시작 시 로드:
- `lib/learnings.ts` searchLearnings() → 최근 학습 5건 요약 표시
- `lib/instinct.ts` shouldApply() → 이 프로젝트에 적용할 instinct 목록 표시
- 없으면 무시 (비용 0)

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

## Step 3.7 — Auto Mode 활성화 안내
현재 퍼미션 모드를 확인하고 auto mode 전환을 안내:
- **auto mode 사용 가능**: "🔓 Auto mode 활성 — 분류기가 안전한 액션 자동 승인"
- **미사용 시**: "`Shift+Tab`으로 auto mode 전환 권장 (승인 피로↓ + 안전장치 유지)"
- **자율 데몬**(Ralph/Research): auto mode 자동 적용 (bypassPermissions 폴백)

> **주의**: 프로덕션 배포, force push, IAM 변경은 auto mode에서도 차단됨.
> `CLAUDE_PERMISSION_MODE=bypassPermissions` 환경변수로 오버라이드 가능.

## Step 4 — 실행
브리핑: "마지막 [X] 상태. Opus [N]개 / Gemini [M]개. [모드] + [모델] + [퍼미션]. 시작."

- **Opus 태스크**: 선택된 모드로 즉시 실행
- **Gemini 태스크**: GEMINI_TASKS.md에 기록만. 토큰 소진 시 Gemini가 이어받음
- 리서치 노트 적용 원하면 해당 태스크 우선
- **디스패치/Ralph**: auto mode가 기본 (분류기 기반 안전 실행)

## 자율 작업 원칙
- 안전한 탐색/읽기는 승인 없이 진행
- [분석 → 수정 → 검증] 한 번에 묶어 실행
- 실패 시 원인 파악 후 재시도 (최대 2회), 모호한 부분만 최소 질문
- auto mode 폴백: 분류기 3회 연속 차단 시 수동 승인으로 에스컬레이션
