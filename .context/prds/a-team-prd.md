# A-Team PRD — AI 비즈니스 운영 시스템

> 생성일: 2026-05-23
> 기반: Working Backwards PR/FAQ (a-team-pr-faq.md)
> 상태: v1.0 초안

---

## 1. 제품 정의

### 한 문장
A-Team은 1인 창업자가 대기업 규모의 사업을 운영할 수 있게 하는 AI 비즈니스 운영 시스템이다.

### 포지셔닝
- **카테고리**: AI Business Operating System (코딩 도구가 아님)
- **기반**: Claude Code 위에 구축
- **차별화**: 코드를 짜는 게 아니라 회사를 돌린다

### 핵심 가치 3축

| 축 | 설명 | 해당 기능 |
|---|---|---|
| **구체화 + 리서치 증폭** | 막연한 아이디어 → 리서치 → 원래 의도 이상의 계획 | /office-hours, /intel, /prd, /blueprint |
| **전사 분기 처리** | 하나의 지시 → 마케팅·개발·디자인·QA·분석·법무 동시 | orchestrator, 28개 에이전트 |
| **24h 풀오토 자율** | 잠든 사이에도 작업 지속, 토큰 리셋 자동 재개 | /zzz, /pickup, auto-switch |

---

## 2. 고객

### Phase 1 (현재): 나 자신
- 1인 창업자
- 커넥톰 등 제품을 빌드하면서 A-Team을 동시에 강화
- 제품 빌드 ↔ A-Team 강화의 선순환 플라이휠

### Phase 2 (추후): 나 같은 1인 창업자
- g-stack 모델로 배포
- 온보딩/문서화 필요
- 가격 모델 _TBD_

---

## 3. 성공 기준

### 궁극적 비전
제품을 빌드 → 런칭 → GTM 수행 → 그 과정에서 A-Team 계속 개선 → 선순환으로 동반 성장 → 데카콘

### 6개월 기준 (측정 가능)
- [ ] 커넥톰 또는 1개 이상 제품 런칭 완료
- [ ] GTM 1사이클 실행 (콘텐츠 발행 → 유입 → 전환)
- [ ] A-Team으로 빌드한 과정에서 A-Team 자체가 3회 이상 개선됨 (플라이휠 증거)
- [ ] 정기 사용 커맨드가 5개 → 15개+ (사용률 증가)

---

## 4. 핵심 문제 (현재 상태 진단)

### 문제 1: 도구 과잉, 사용 과소
```
74개 커맨드 존재 → 정기 사용 ~5개 (7%)
원인: 인간이 기억하고 호출해야 하는 구조
```

### 문제 2: 성장 소스가 인간 의존
```
현재: 의장이 GeekNews/Threads 읽음 → 아이디어 → A-Team에 지시
문제: /daily-brief, growth-engine 있지만 존재조차 잊음
원인: "해야 할 일"이 있으면 도구 건너뛰고 바로 지시
```

### 문제 3: 자기 자신에게 도구를 안 씀
```
/office-hours → A-Team 자체에 적용한 적 없음 (이번이 처음)
/prd → A-Team PRD를 만든 적 없음 (이번이 처음)
/okr → A-Team OKR 설정한 적 없음
```

### 문제 4: 제품 정의 부재
```
74개 커맨드가 있지만 "여기까지가 A-Team이고, 이건 아니다"의 경계 없음
team-roadmap.md에 "대기업 팀 대체" 한 줄만 존재
```

---

## 5. 해결 방향

### 방향 1: 인간 호출 의존 제거 — "A-Team이 알아서"

| 현재 (인간 호출) | 목표 (자동) |
|---|---|
| 의장이 `/daily-brief` 기억해서 호출 | 세션 시작 시 자동 실행, 결과만 보고 |
| 의장이 `/adversarial` 기억해서 호출 | 빌드 완료 시 자동 리뷰 (Layer 2) ✅ 이번 세션 구현 |
| 의장이 GeekNews 읽고 아이디어 전달 | growth-engine이 크롤링 → 분석 → 제안 |
| 의장이 74개 중 골라서 호출 | 시그널 기반 자동 전환 ✅ 이번 세션 구현 |

**원칙**: 의장이 기억해야 하는 것 = 0. A-Team이 상황을 감지하고 적절한 도구를 스스로 선택.

### 방향 2: 제품 경계 확정 — 핵심 vs 비핵심

74개를 3축 기준으로 분류:

| 축 | 핵심 (없으면 A-Team 아님) | 보조 (있으면 좋음) | 비핵심 (정리 대상) |
|---|---|---|---|
| 구체화+리서치 | office-hours, prd, blueprint, intel, plan-ceo | plan-eng, autoplan, thinking-partner | — |
| 전사 분기 | orchestrator, tdd, adversarial, review, ship | cso, qa, design-audit, marketing-* | card-news, yt, ppt 등 |
| 24h 풀오토 | zzz, pickup, vibe, end, resume | daily-brief, growth-engine | sync, loop, rc 등 |
| 인프라 | — | pmi, cold-review, benchmark | dashboard, capability, repos 등 |

_상세 분류는 별도 세션에서 확정_

### 방향 3: 플라이휠 자동화

```
제품 빌드 (커넥톰 등)
  ↓ 빌드 중 마찰/갭 자동 감지 (friction-log)
A-Team 자동 개선
  ↓ 개선된 A-Team으로
다음 제품 더 빠르게 빌드
  ↓ 반복
```

이 루프의 핵심 컴포넌트:
- `friction-log.jsonl` — 마찰 자동 기록 ✅ 존재
- `gap-sensor.ts` — 갭 감지 ✅ 존재
- `growth-engine` — 외부 트렌드 크롤링 ✅ 존재
- **빠진 것**: 이것들을 **의장이 호출하지 않아도 자동으로 도는** 배선

---

## 6. 리스크

| 리스크 | 심각도 | 완화 전략 |
|--------|--------|----------|
| Anthropic API 의존성 | HIGH | 멀티 모델 라우팅 (Groq 무료 + Sonnet/Haiku) |
| 도구 과잉 → 복잡성 부채 | HIGH | 제품 경계 확정 + 비핵심 정리 |
| 의장 1명 = SPOF | MED | 24h 풀오토 + 문서화 (Phase 2 배포 대비) |
| 품질 신뢰 (법무/마케팅) | MED | 3-Layer 파이프라인 + 인간 승인 게이트 |

---

## 7. 비전 타임라인

| 시점 | 상태 |
|------|------|
| **현재** | A-Team 인프라 80% 완성. 제품(커넥톰 등) 빌드 시작. 사용률 7%. |
| **3개월** | 첫 제품 런칭. A-Team 자동화율 50%+. 사용률 30%+. |
| **6개월** | GTM 1사이클 완료. 플라이휠 증거 3회+. |
| **1년** | Phase 2 (배포) 준비. g-stack 모델로 외부 사용자 온보딩. |
| **3년** | 멀티 프로덕트. A-Team이 복수 제품을 동시 운영. |

---

## 8. 즉시 실행 항목 (이 PRD에서 도출)

1. **자동화 배선 강화** — daily-brief, growth-engine이 의장 호출 없이 자동 실행
2. **제품 경계 확정** — 74개 → 핵심/보조/비핵심 분류
3. **OKR 설정** — `/okr`로 A-Team 자체의 6개월 목표 설정
4. **플라이휠 배선** — friction → gap → growth → improve 자동 루프 완성
5. **커넥톰 빌드 시작** — A-Team을 실전에서 검증하는 가장 빠른 경로

---

## 부록: PR/FAQ

[.context/prds/a-team-pr-faq.md](a-team-pr-faq.md) 참조
