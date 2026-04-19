---
date: 2026-04-19
status: proposed (awaiting user confirmation)
phase_target: 0.5
prerequisite: phase-0 complete
---

# A-Team Self-Growing Company Architecture

> **궁극 목표**: a-team이 프로덕트 런칭 + 운영이 가능한 "하나의 회사"가 되는 것
> **Phase 0.5 목적**: 갭을 자동 감지·우선순위·빌드 → 폐기 사이클이 도는 self-growing 시스템

---

## 핵심 원칙

a-team은 "도구 모음"이 아니라 "조직". 조직은:
1. 자기 능력을 안다 (Self-aware)
2. 부족한 곳을 안다 (Gap-aware)
3. 부족한 곳을 채울 우선순위를 안다 (Priority-aware)
4. 채운 결과를 측정한다 (Outcome-aware)
5. 안 쓰는 능력은 정리한다 (Pruning-aware)

→ 이 5개 루프가 자동 돌아가야 "지속 성장"

---

## 시스템 다이어그램

```
CAPABILITY MAP (60+ 항목 인벤토리 × 커버리지 % × 부서)
       │
       ▼
GAP SENSORS (friction-log + missing-skill + manual-step)
       │
       ▼
PRIORITY ENGINE (impact × frequency × feasibility - dep_blockers)
       │
       ▼
ROADMAP AUTO-UPDATE (team-roadmap.md 우선순위 재정렬 제안)
       │
       ▼
PRD GENERATOR (/blueprint 자동 호출)
       │
       ▼
BUILD (수동 또는 ralph 자율)
       │
       ▼
EARNED INTEGRATION GATE (실 데이터 ≥ 1회 + 회고)
       │
       ▼
HEALTH MONITOR (/dashboard active/weekly/stale/abandoned)
       │
       └──► CAPABILITY MAP 자동 갱신 (루프)
```

---

## 7개 시스템 컴포넌트

### 1. Capability Map (`lib/capability-map.json`) [SSOT]

```json
{
  "departments": {
    "engineering": {
      "weight": 0.20,
      "capabilities": {
        "code-implementation": { "coverage": 0.90, "modules": ["coder", "orchestrator"], "evidence": "425 tests" },
        "code-review": { "coverage": 0.85, "modules": ["reviewer", "review-pr"] },
        "testing": { "coverage": 0.80, "modules": ["tdd", "qa"] },
        "deployment": { "coverage": 0.40, "modules": ["land", "ship"], "gap": "CI/CD pipeline 자동화 부재" }
      }
    },
    "marketing": {
      "weight": 0.20,
      "capabilities": {
        "content-creation": { "coverage": 0.70, "modules": ["marketing-generate"] },
        "publishing": { "coverage": 0.20, "modules": ["marketing-publish"], "gap": "Postiz 미연결" },
        "analytics": { "coverage": 0.10, "gap": "Phase 1 BI 미빌드" },
        "performance-marketing": { "coverage": 0.0, "gap": "광고 운영 모듈 0" },
        "crm-lifecycle": { "coverage": 0.0 },
        "brand-strategy": { "coverage": 0.10 }
      }
    },
    "design": { "..." },
    "qa": { "..." },
    "analytics": { "..." },
    "operations": { "..." },
    "sales-cs": { "..." }
  },
  "overall_score": 0.42,
  "launch_capability": {
    "scenario_a_dev_tool": 0.78,
    "scenario_b_b2c_saas": 0.45,
    "scenario_c_b2b_enterprise": 0.28
  }
}
```

### 2. Gap Sensors (`lib/gap-sensor.ts`)

```typescript
logFriction({
  type: 'missing-capability' | 'manual-step' | 'external-tool-required' | 'low-quality-output',
  context: '발행 자동화 시도했지만 Postiz 미연결',
  blocked_module: 'marketing-publish',
  user_workaround: '수동으로 Twitter 게시',
  capability_path: 'marketing.publishing',
});
```

자동 트리거:
- 사용자 메시지 패턴 ("안 돼/수동/외부 도구 써야") → 자동 logFriction
- 14일 zero-usage → stale 감지
- claude self-aware: "이건 a-team 갭" 인지 시 자동 기록

### 3. Priority Engine (`scripts/gap-priority.mjs`)

```
score = (impact × 3) + (frequency × 2) + (feasibility × 1)
       - dependency_blockers × 0.5

impact:        해당 갭이 막는 시나리오 수 (1-5)
frequency:     friction-log 출현 빈도 (z-score)
feasibility:   외부 인프라 의존도 역수 (5=내부, 1=API+예산 필요)
dependency:    선행 Phase 미완료 수
```

### 4. Roadmap Auto-Update (`scripts/roadmap-update.mjs`)

매주 자동 (월요일):
- friction-log 분석 → capability-map 자동 갱신
- team-roadmap.md 우선순위 재정렬 **제안** (사용자 confirm 게이트)
- 변경 근거 자동 첨부

### 5. PRD Generator (`/blueprint` 확장)

상위 갭 → `/blueprint <gap>` 자동 호출 → PRD 초안:
- capability-map 어느 항목 채우나
- analytics-schema 어떤 EventType 추가
- 외부 의존, MVP 정의, Gate 기준

### 6. Capability Score CLI (`/capability`)

```
🏢 A-Team Company Capability — 2026-04-19

부서별 점수 (가중평균):
  Engineering    ████████░░  82%
  Marketing      ███░░░░░░░  35%
  Design         ████░░░░░░  42%
  QA             ████░░░░░░  40%
  Analytics      █░░░░░░░░░  15%
  Operations     ░░░░░░░░░░  5%
  Sales/CS       ░░░░░░░░░░  3%

종합: 36%

🚀 런칭 가능 시나리오:
  A. 개발자 도구    78% ✅ 가능
  B. B2C SaaS      45% ⚠️ MVP 가능
  C. B2B 엔터프라이즈 28% ❌ 부족

🔝 다음 1순위 갭:
  1. marketing.publishing (Postiz)         score=12.3
  2. analytics.bi (Phase 1)                score=11.8
  3. operations.user-feedback              score=9.5
```

### 7. Lifecycle Gate Automation (`/vibe` Step 0.69)

- stale 모듈 자동 감지 → 회고 트리거
- abandoned 모듈 폐기 제안
- 새 모듈 빌드 요청 → priority engine 검사

---

## 거버넌스 룰 (자동 실행)

| 트리거 | 액션 |
|--------|------|
| 사용자 "안 돼/수동" 발화 | logFriction() 자동 호출 |
| `/vibe` 시작 | capability-score + 다음 갭 1순위 노출 |
| `/end` (월요일) | roadmap-update 매주 자동 |
| 모듈 14일 zero-usage | retro 강제 알림 |
| 새 모듈 요청 | priority engine 5위 밖이면 confirm |
| 모듈 abandoned (30일+) | 폐기 PR 자동 제안 |

---

## Phase 0.5 빌드 순서

1. `lib/capability-map.json` — 60+ 항목 인벤토리 (1-2시간)
2. `lib/gap-sensor.ts` + `logFriction()` helper (30분)
3. `friction-log.jsonl` 시드 데이터 (오늘 세션 회고적 입력)
4. `scripts/gap-priority.mjs` (1시간)
5. `scripts/capability.mjs` + `/capability` 커맨드 (1시간)
6. `scripts/roadmap-update.mjs` + 월요일 launchd (1시간)
7. `/vibe` Step 0.69 wiring (30분)

총 6-8시간. Phase 0.5 = 약 1주 작업.

---

## Phase 0.5 Gate

- [ ] capability-map.json 60+ 항목 작성
- [ ] friction-log 시드 ≥ 5건
- [ ] /capability CLI 작동 + 점수 표시
- [ ] roadmap-update 1회 실 실행 (제안 생성)
- [ ] /vibe Step 0.69 활성화
- [ ] PRD 1건 자동 생성 (priority 1순위 갭에 대해)

→ Gate PASS 시 Phase 1 BI 진입 (priority engine이 추천하는 모듈)

---

## 정직한 예측

Phase 0.5 완성 후:
- **3개월**: 시나리오 A (개발자 도구) 90% 도달
- **6개월**: 시나리오 B (B2C SaaS MVP+) 65% 도달
- **12개월**: 시나리오 B 운영 80% / 시나리오 C MVP 50%
- **전제**: 매주 friction-log + roadmap-update 작동

만약 Phase 0.5 안 만들면:
- 정적 로드맵으로 진행 → 6개월 후 데이터와 동떨어진 모듈 빌드 가능성
- 갭 감지가 사용자 수동에 의존 → "이거 부족함" 못 잡으면 영원히 못 채움
