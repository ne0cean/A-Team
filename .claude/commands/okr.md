---
description: /okr — OKR/KPI 설정·추적·회고 자동화
---

> Analytics: `node scripts/log-event.mjs command_start name=okr` — 실행 시작 시 반드시 호출

## ADVISOR MODE
brevity 해제. 코드 출력 금지.
- **KR 정의 시**: 안티패턴 즉시 플래그 (허영 지표, output vs outcome KR, 측정 불가 KR)
- **각 KR**: 측정 방법 실행 가능성 검증 1줄
- **OKR 구조**: 동일 지표 중복 KR 감지

분기별 목표 설정 → 주간 추적 → 분기 회고.
EOS Rocks 패턴 통합: 90일 최우선 과제 3-5개 + 자동 진척 추적.

## 자동 연동
- `/end` — 세션 종료 시 OKR 파일 존재하면 진행률 자동 업데이트 (자동 측정 가능 KR만)
- `/board` — 월간 이사회에서 90일 Rocks 점검 자동 포함
- `/vibe` — 세션 시작 시 현재 OKR 상태 1줄 요약 출력

## 사용법

```
/okr set          — 새 분기 OKR + 90일 Rocks 설정
/okr check        — 주간 진행률 체크 (자동 측정 + 수동 입력)
/okr retro        — 분기 회고
/okr status       — 현재 OKR + Rocks 상태 요약
```

## /okr set — 분기 OKR 설정

사용자와 대화형으로 OKR 작성:

1. **Objective 정의** (질적 목표, 영감적)
   - "무엇을 달성하고 싶은가?"
   - 3-5개 Objective 권장

2. **Key Result 정의** (정량적 측정, 각 O당 2-4개)
   - "어떻게 측정할 것인가?"
   - SMART: Specific, Measurable, Achievable, Relevant, Time-bound

3. 저장: `.context/okr/YYYY-QN.md`

### 템플릿

```markdown
# OKR — YYYY Q[N]

## O1: [Objective]
- KR1: [측정 지표] [현재값] → [목표값] | 진행: 0%
- KR2: [측정 지표] [현재값] → [목표값] | 진행: 0%
- KR3: [측정 지표] [현재값] → [목표값] | 진행: 0%

## O2: [Objective]
- KR1: ...
```

### 예시 (A-Team)

```markdown
## O1: 글로벌 회사 역량 60% 이상 달성
- KR1: APQC 13 카테고리 커버리지 52% → 70% | 진행: 0%
- KR2: 프로덕션 제품 1개 출시 0 → 1 | 진행: 0%
- KR3: 오케스트레이션 자동화율 35% → 50% | 진행: 0%

## O2: 첫 매출 달성
- KR1: MRR $0 → $100 | 진행: 0%
- KR2: 유료 사용자 0 → 10명 | 진행: 0%
```

## /okr check — 주간 체크인

1. `.context/okr/YYYY-QN.md` 읽기
2. 각 KR 현재 상태 확인:
   - 자동 측정 가능한 것: analytics.jsonl, git log, 테스트 결과 등
   - 수동 입력 필요한 것: 사용자에게 질문
3. 진행률 갱신
4. 트래픽 라이트:
   - 🟢 On Track (70%+ 진행률 대비 시간)
   - 🟡 At Risk (50-70%)
   - 🔴 Off Track (<50%)

## /okr retro — 분기 회고

분기 말 실행:
1. 최종 진행률 기록
2. 각 KR 달성/미달성 분석
3. 다음 분기 OKR 초안 제안
4. 저장: `.context/okr/YYYY-QN-retro.md`

## 90일 Rocks (EOS 패턴)

OKR 설정 시 함께 정의. Rocks = 이번 분기 **반드시 완료해야 할 3-5개 프로젝트**.

```markdown
## 90-Day Rocks — YYYY Q[N]

| # | Rock | Owner | Due | Status |
|---|------|-------|-----|--------|
| 1 | [PLACEHOLDER: 첫 제품 MVP 출시] | CEO | MM/DD | 🟡 |
| 2 | [PLACEHOLDER: 첫 유료 고객 10명] | CEO | MM/DD | 🔴 |
| 3 | [PLACEHOLDER: 콘텐츠 발행 시작] | AI | MM/DD | 🟡 |
```

**OKR과 Rocks 차이**:
- OKR = "무엇을 측정하나" (방향 + 지표)
- Rocks = "이번 분기 뭘 끝내나" (구체적 프로젝트)

**자동 추적**: `/okr check` 실행 시 Rocks status도 함께 점검. `/board`에서 90일 Rocks 테이블 자동 포함.

## 자동 측정 가능한 KPI (A-Team)

| KPI | 측정 방법 | 자동화 |
|-----|----------|--------|
| 테스트 수 | `npm test` 결과 파싱 | ✅ |
| 커맨드 수 | `ls .claude/commands/ \| wc -l` | ✅ |
| 에이전트 수 | `ls .claude/agents/ \| wc -l` | ✅ |
| 오케스트레이션 차단율 | orchestration-preempt.log | ✅ |
| 커버리지 % | vitest coverage | ✅ |
| 커밋 빈도 | git log | ✅ |
| analytics 이벤트 수 | analytics.jsonl | ✅ |
