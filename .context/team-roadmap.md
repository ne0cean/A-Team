---
created: 2026-04-19
updated: 2026-04-19
status: phase-0-pending
current_phase: 0
goal: "1인 + AI 팀이 대기업 마케팅/디자인/QA/분석 팀 수준 대체"
---

# Team Roadmap — 1인 회사의 대기업 팀 대체

> **단일 진실의 원천 (SSOT)**. 매 세션 `/vibe` 가 읽음. Gate 미충족 시 새 모듈 빌드 자동 거절.

---

## 핵심 원칙 (안티패턴 방지)

1. **Earned integration**: 만든 모듈이 실 데이터 1회 이상 생성하기 전엔 다음 모듈 빌드 금지
2. **분석 우선**: 측정 안 되는 모듈은 못 고침 → 분석 인프라부터
3. **Vertical slice**: 한 모듈 100% 완성 > 다섯 모듈 20% 부분
4. **저인프라 의존부터**: 외부 API/예산 필요한 모듈은 후순위
5. **데이터로 다음 결정**: 사용 데이터 받으면 우선순위 재조정 (계획 고정 X)

---

## 메타 사이클

```
DEFINE → BUILD → USE → MEASURE → ITERATE → GATE
  PRD    MVP    실사용  데이터    개선/축소  다음 진입
```

**Gate 조건** (모듈 N → N+1 진입):
- ✅ 실 사용 데이터 ≥ 1회 (테스트/파일럿 아닌 진짜 결과물)
- ✅ analytics.jsonl 에 측정 이벤트 기록
- ✅ 회고 1회 작성 (`.context/retros/`)
- ❌ 충족 안 되면 그 모듈에 머무름

**거버넌스 룰**:
- Gate 미충족 + 14일 경과 → 회고 강제 → 모듈 축소/폐기 결정
- 새 모듈 빌드 요청 시: 현재 Phase Gate 우선 검사 → 미충족이면 거절

---

## Phase 별 진척

### Phase 0 — 메타 인프라 (1주) [진행 중 — 4/5]

**목표**: 모든 모듈이 측정·회고 가능하게

| 모듈 | 상태 | Gate | 산출물 |
|------|------|------|--------|
| /vibe team-roadmap 거버넌스 wiring | ✅ 2026-04-19 | Step 0.67 추가 | `.claude/commands/vibe.md` |
| analytics 통합 스키마 | ✅ 2026-04-19 | EventType 23종 + JSON Schema | `lib/analytics-schema.json` + `lib/analytics.ts` EventType |
| 마케팅 logEvent helper | ✅ 2026-04-19 | logMarketingEvent() 추가 + 3 vitest | `lib/analytics.ts` |
| 대시보드 CLI (`/dashboard`) | ✅ 2026-04-19 | Module Health 표 + JSON 출력 + 3 vitest | `scripts/dashboard.mjs`, `.claude/commands/dashboard.md` |
| 회고 템플릿 표준화 | ✅ 2026-04-19 | design-auditor 첫 회고 작성 | `.context/retros/_template.md`, `design-auditor-2026-04-19.md` |
| 마케팅 logEvent 호출 경로 | ⏳ 다음 | 마케팅 커맨드들이 helper 실 호출 | `marketing-research.md` 등 명시 |

**Phase 0 Gate**: 1주 동안 마케팅·디자인 모듈 사용 데이터가 자동 수집·시각화됨
- 디자인: ✅ 10 events 누적, /dashboard 시각화 작동
- 마케팅: ❌ 0 events (helper만 작성, 실 호출 경로 미연결)

---

### Phase 1 — 분석/BI 모듈 (2주) 🔴 최우선 (Phase 0 후)

**왜 1번**: 다른 모든 모듈의 피드백 루프

| Sub-module | 상태 | 산출물 |
|-----------|------|--------|
| 외부 데이터 연결 | ⏳ blocked-by-phase-0 | GA4/Mixpanel/Postiz/이메일 → JSONL 통합 |
| Insights 에이전트 (Sonnet) | ⏳ | 주간 인사이트 자동 생성 |
| Anomaly detection | ⏳ | 이상치/회귀 알림 |
| Causal analysis | ⏳ | "전환율 X% 떨어진 원인 찾기" |

**Phase 1 Gate**: 1주간 실 외부 데이터 받아 인사이트 1회 생성 + 의사결정 1회 반영

---

### Phase 2 — 시장·사용자 인텔리전스 (2주)

**왜 2번**: 콘텐츠/브랜드 모듈의 입력. Phase 1이 내부 데이터, 이건 외부.

| Sub-module | 상태 | 산출물 |
|-----------|------|--------|
| 경쟁사 모니터링 | ⏳ | URL 리스트 → 변경 감지 + diff |
| JTBD/페르소나 빌더 | ⏳ | 인터뷰/리뷰 → 페르소나 자동 |
| 트렌드 시그널 | ⏳ | Reddit/Twitter/뉴스 모니터링 |
| 인텔리전스 → 마케팅 입력 | ⏳ | `marketing-research` 보강 (감 → 데이터) |

**Phase 2 Gate**: 마케팅 콘텐츠 1편이 인텔리전스 데이터 인용해 작성됨

---

### Phase 3 — 마케팅 깊이 확장 (3주)

**현재 콘텐츠 60-80% → 마케팅 팀 80%로**

| Sub-module | 우선순위 | 상태 |
|-----------|---------|------|
| 브랜드 전략 (포지셔닝/메시지 하우스) | 🔴 | ⏳ |
| 캠페인 기획 (멀티채널 통합) | 🔴 | ⏳ |
| 발행 자동화 (Postiz 진짜 연결) | 🟠 | ⏳ |
| CRM/Lifecycle | 🟡 보류 | (사용자 베이스 생긴 후) |
| 퍼포먼스 마케팅 (광고/A/B) | 🟡 보류 | (예산 있을 때) |
| 위기 대응/PR | 🟢 | ⏳ |

**Phase 3 Gate**: 캠페인 1개를 멀티채널로 발행 + 분석 데이터 수신

---

### Phase 4 — 디자인 깊이 확장 (3주)

**현재 AI smell + 비주얼 20% → 디자인 팀 70%로**

| Sub-module | 우선순위 | 상태 |
|-----------|---------|------|
| 브랜드 시스템 (BI/BX 풀 가이드 자동) | 🔴 | ⏳ |
| 디자인 시스템 (Figma plugin 연동) | 🔴 | ⏳ |
| UI/UX 리서치 (사용성 테스트 분석) | 🟠 | ⏳ |
| 프로토타이핑 (Figma + interaction) | 🟠 | ⏳ |
| 모션 (Lottie/Rive) | 🟢 | ⏳ |
| 3D/AR | 🟢 후순위 | ⏳ |

**Phase 4 Gate**: 실 브랜드 1개의 풀 가이드라인 자동 생성 + 디자인 시스템 토큰 동기화

---

### Phase 5 — QA + 사용성 (2주)

**기존 자산 (qa skill, ui-inspector, design-auditor) 재활용 비중 높음**

| Sub-module | 상태 | 비고 |
|-----------|------|------|
| 자동 회귀 테스트 통합 | ⚠️ 부분 보유 | Playwright + visual diff + a11y |
| 사용성 테스트 (Maze/UserTesting API) | ⏳ | 자동 분석 |
| 성능 모니터링 (Lighthouse CI) | ⏳ | 회귀 알림 |
| 접근성 감사 (axe-core) | ⚠️ | CI 게이트 |

**Phase 5 Gate**: 1개 PR이 모든 게이트 통과 후 머지

---

### Phase 6 — 운영 (PR/CS/세일즈/재무) (2-4주, 필요시)

| Sub-module | 트리거 |
|-----------|-------|
| 평판 모니터링 | 발행 시작 후 |
| FAQ 챗봇 | 사용자 질문 ≥ 10건 |
| 리드 자격 검증 | B2B 전환 후 |
| 인보이스 자동화 | 매출 발생 후 |

---

## 현재 모듈 상태 (Baseline)

### 보유 모듈

| 모듈 | 커버리지 | 마지막 사용 | analytics 이벤트 수 |
|------|---------|------------|---------------------|
| 마케팅 콘텐츠 (8 커맨드) | 60-80% | 2026-04-18 (Phase 3 파일럿) | 0 (스키마 미정) |
| 디자인 (4 커맨드 + 22 룰 + LLM critique + hook + CLI) | 20% | 2026-04-19 (audit-design CLI) | 10 |
| 자율 인프라 (sleep/ralph/vibe/end/sync) | — | 매일 | (analytics 미연결) |

### Phase 0 진입 전 정리 필요

- [ ] analytics.jsonl 통합 스키마 — 현재 design-auditor만 logging
- [ ] 마케팅 모듈 logEvent 호출 경로 부재 (PMI에서 발견했지만 공식화 안 됨)
- [ ] 자율 인프라 (sleep/ralph) 사용 통계 미수집

---

## 진척 측정 (자동 갱신 영역)

> 매 `/end` 또는 `/vibe` 시 갱신. 수동 편집 금지.

```
[Phase 0]  진척: 0/4 modules built  Gate: ❌ blocked
[Phase 1]  진척: 0/4 modules built  Gate: ❌ blocked-by-phase-0
[Phase 2-6] (대기)
```

**최근 Phase 진입/완료 이벤트** (최신 5개):
- 2026-04-19 — Phase 0 시작 (team-roadmap.md 작성)

---

## 즉시 다음 액션

1. **이 문서가 거버넌스로 작동하게 wiring**:
   - `/vibe` Step 0.7에 team-roadmap.md 로드 추가
   - 새 모듈 빌드 요청 감지 시 현재 Gate 검사
2. **Phase 0 첫 작업**: `lib/analytics-schema.json` + 마케팅 logEvent 호출 경로
3. **회고 디렉토리 신설**: `.context/retros/` + 템플릿

---

## 거버넌스 체크리스트 (매 세션)

- [ ] 현재 Phase의 Gate 충족 여부 확인
- [ ] 미사용 모듈 (≥ 14일 데이터 0건) 회고 트리거
- [ ] 새 모듈 요청 시 → Earned integration 위반 검사
- [ ] 외부 인프라 의존 모듈은 후순위 유지

---

## 정직한 예측

- **6개월** 안에 마케팅 80% + 디자인 70% + 분석 80% + QA 70% 도달
- **12개월** 안에 운영(CS/세일즈/재무) 60% 추가
- **전제**: 매 Phase 사용 데이터 누적 + 회고. 이게 안 되면 도구만 늘어나고 운영 안 됨.
