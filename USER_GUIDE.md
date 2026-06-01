# A-Team 사용자 가이드 — 2026

AI 에이전트를 팀처럼 조직해 아이디어→구현→배포 전 사이클을 자동화하는 글로벌 툴킷.
29개 에이전트 + 72개 커맨드 + 안전 하네스 + 거버넌스 레이어.

---

## 1. 핵심 개념

| 레이어 | 역할 | 자동 여부 |
|--------|------|----------|
| **Harness** | 위험 명령 차단, 빌드 실패 시 세션 종료 불가 | 자동 |
| **Context** | `.context/CURRENT.md` — 세션 간 상태 보존 | `/vibe` + `/end` |
| **Agents** | 29개 전문 에이전트 — orchestrator가 작업 배분 | "A-Team으로 처리해줘" |
| **Commands** | 72개 슬래시 커맨드 — 카테고리별 파이프라인 | 직접 호출 |
| **Governance** | stdlib + SKILL-INDEX + Circuit Breaker + DD | 규칙 자동 적용 |

---

## 2. 세션 워크플로우

```
/pickup   →   작업   →   /end
```

| 커맨드 | 용도 |
|--------|------|
| `/pickup` | 세션 재개 기본 진입점 — 흔적 감지 후 복구 또는 /vibe 분기 |
| `/vibe` | 새 세션 시작 — CURRENT.md 로드 + 태스크 분류 + 즉시 실행 |
| `/end` | 세션 종료 — CURRENT.md 갱신 → 빌드 검증 → 커밋 |
| `/zzz` | 풀 오토 수면 모드 — 토큰 리셋 자동 이어받기 |
| `/resume` | 리셋 후 작업 재개 (시점 무관) |
| `/handoff` | 모델 전환 핸드오프 — 맥락 저장 + 새 AI 전달용 프롬프트 |

**상태 파일**: `.context/CURRENT.md` — 항상 여기서 현재 상태 확인

---

## 3. 커맨드 카테고리 지도

### Engineering

| 커맨드 | 용도 |
|--------|------|
| `/tdd` | TDD Red-Green-Refactor 루프 |
| `/craft` | PRO Tier 품질 파이프라인 |
| `/review` | Pre-Landing PR 리뷰 |
| `/ship` | PR 생성 전 완전 검증 |
| `/land` | 배포 신뢰도 검증 |
| `/adversarial` | 적대적 코드 리뷰 (공격자 시각) |
| `/cso` | OWASP/STRIDE 보안 감사 |
| `/qa` | 웹 앱 8카테고리 브라우저 자동화 테스트 |
| `/investigate` | 체계적 근본 원인 분석 |
| `/incident` | 장애 감지·진단·복구 |
| `/benchmark` | 성능 기준선 측정 + 회귀 감지 |
| `/blueprint` | 에이전트/자동화 시스템 설계 문서 생성 |
| `/plan-ceo` | CEO 시각 계획 검토 |
| `/plan-eng` | 엔지니어링 계획 검토 |
| `/autoplan` | CEO→디자인→엔지니어링 3단계 자동 검토 |
| `/optimize` | Post-Integration Optimization |
| `/pmi` | Post-Major-Integration 5-Phase 감사 |
| `/cold-review` | 월간 구조 냉철 감사 |
| `/retro` | 엔지니어링 회고 |
| `/doc-sync` | 코드-문서 drift 감지 + 동기화 |
| `/github-review` | GitHub PR 리뷰 + 코멘트 게시 |
| `/issue-triage` | GitHub 이슈 트리아지 |
| `/legal-check` | 라이선스 컴플라이언스 검사 |
| `/dd` | M&A Due Diligence 6단계 파이프라인 |
| `/ralph` | Autonomous AI development loop |
| `/autoresearch` | Karpathy식 프롬프트 자동 최적화 루프 |
| `/improve` | 글로벌 툴킷 개선사항 등록/반영 |

### Operations

| 커맨드 | 용도 |
|--------|------|
| `/daily-brief` | 내부+외부 종합 성장 브리핑 |
| `/insights` | analytics.jsonl → 주간 인사이트 리포트 |
| `/dashboard` | analytics.jsonl 시각화 |
| `/okr` | OKR/KPI 설정·추적·회고 |
| `/board` | AI 이사회 시뮬레이션 (월 1회) |
| `/capability` | 부서별 점수 + 런칭 시나리오 |
| `/prioritize` | RICE 기반 기능 우선순위 |
| `/prd` | 아이디어 검증 → PRD 생성 |
| `/prjt` | 전체 프로젝트 현황 |
| `/sync` | Auto-Sync 데몬 관리 |
| `/absorb` | 내부 개선사항 역류 흡수 |

### Marketing

| 커맨드 | 용도 |
|--------|------|
| `/intel` | 시장·사용자 인텔리전스 수집 |
| `/marketing` | 마케팅 마스터 오케스트레이터 |
| `/marketing-research` | 리서치 파이프라인 |
| `/marketing-generate` | 콘텐츠 생성 |
| `/marketing-social` | Native Social-First 콘텐츠 |
| `/marketing-repurpose` | 1개 → 15개 포맷 변환 |
| `/marketing-publish` | 멀티플랫폼 배포 (Postiz) |
| `/marketing-analytics` | 성과 분석 |
| `/marketing-loop` | 주간 자가 개선 루프 |
| `/card-news` | 인스타그램 카드뉴스 8장 자동 생성 |

### Design

| 커맨드 | 용도 |
|--------|------|
| `/design-brief` | 디자인 브리핑 생성 (tone/variant/density) |
| `/design-audit` | AI smell 22개 + a11y + 레이아웃 위반 감지 |
| `/design-score` | UI/PPT 품질 평가 + 학습 루프 |
| `/design-generate` | 비주얼 에셋 생성 오케스트레이터 |
| `/design-thumbnail` | 썸네일 원스탑 생성 |
| `/design-retro` | Design Subsystem 회고 |
| `/ppt` | 업무용 PPT 자동 생성 |

### Intelligence & Data

| 커맨드 | 용도 |
|--------|------|
| `/yt` | YouTube 영상 풀 추출 + 분석 |
| `/repos` | 레포지토리 현황 관리 |
| `/csv-clean` | CSV 데이터 품질 정리 |
| `/data-calc` | Excel/CSV 집계 연산 |
| `/excel-to-csv` | Excel → CSV 변환 |

### Utilities & Session Tools

| 커맨드 | 용도 |
|--------|------|
| `/todo` | 빠른 메모 관리 |
| `/browse` | 브라우저 자동화 |
| `/office-hours` | 아이디어 검증 & 설계 발견 |
| `/thinking-partner` | 복잡한 문제 질문과 탐색으로 함께 풀기 |
| `/handoff` | 모델 전환 핸드오프 |
| `/dashboard-prd` | 대시보드 PRD 대화형 생성 |
| `/webapp-prd` | 웹앱 PRD 대화형 생성 |
| `/rc` | 디바이스 간 컨텍스트 핸드오버 |

---

## 4. 에이전트 카탈로그 (29개)

**"이 작업을 A-Team으로 처리해줘"** → orchestrator가 자동 배분

### Engineering (13)

| 에이전트 | 역할 | 복잡도 |
|---------|------|--------|
| `orchestrator` | 멀티스텝 작업 분배 + 결과 취합 | high |
| `coder` | 기능 구현, 버그 수정, 리팩토링 | medium |
| `architect` | 시스템 구조 설계 + 기술 스택 결정 | high |
| `reviewer` | 코드 품질 게이트 (orchestrator 내부) | medium |
| `review-pr` | PR 머지 전 독립 전체 검토 | medium |
| `tdd` | TDD Red-Green-Refactor 루프 | medium |
| `adversarial` | 공격자 시각으로 코드 취약점 탐지 | medium |
| `benchmark` | 성능 기준선 측정 + 회귀 감지 | medium |
| `guardrail` | 잔여 디버그 코드 + 품질 위반 감지 | low |
| `scope-validator` | 구현 전 스코프 경계 검증 | low |
| `pre-check` | 구현 전 스킵 게이트 판정 (haiku) | low |
| `ui-inspector` | 브라우저 스크린샷 + 레이아웃 진단 | medium |
| `dd-analyzer` | 외부 레포 전수 실사 + 기술부채 정량화 | medium |

### Design (4)

| 에이전트 | 역할 | 복잡도 |
|---------|------|--------|
| `designer` | 디자인 브리핑 — tone/variant/density 결정 | low |
| `design-auditor` | AI smell 22개 + a11y + 레이아웃 위반 감지 | medium |
| `marp-writer` | Marp 한국어 프레젠테이션 생성 | medium |
| `ppt-strategist` | PPT 콘텐츠 전략 + JSON 스펙 | medium |

### Intelligence (3)

| 에이전트 | 역할 | 복잡도 |
|---------|------|--------|
| `researcher` | 웹 검색 + 코드베이스 탐색 조사 | medium |
| `intel-analyzer` | 시장/경쟁사/트렌드 분석 엔진 | high |
| `insights` | analytics.jsonl 집계 → 주간 인사이트 | medium |

### Operations (7)

| 에이전트 | 역할 | 복잡도 |
|---------|------|--------|
| `pm` | 요구사항 정의 + 스코프 판정 | medium |
| `autoplan` | CEO→디자인→엔지니어링 3단계 계획 검토 | high |
| `daily-brief` | 내부+외부 종합 성장 브리핑 | high |
| `doc-sync` | 코드-문서 drift 감지 + 동기화 | medium |
| `growth-engine` | 외부 트렌드 크롤링 + 자동 적용 | high |
| `qa` | 브라우저 자동화 8카테고리 테스트 | high |
| `cherry-pick-planner` | DD 판정 후 선택적 통합 로드맵 생성 | medium |

### Governance (2)

| 에이전트 | 역할 | 복잡도 |
|---------|------|--------|
| `cso` | OWASP/STRIDE 보안 감사 + 시스템 건강 감사 | high |
| `judge` | MoA 충돌 해소 + 최종 판정 | high |

---

## 5. 주요 워크플로우 시나리오

### 신규 기능 구현
```
/office-hours   →   /blueprint   →   /plan-eng   →   orchestrator
→   /tdd   →   /craft   →   /review   →   /ship
```

### 버그 수정
```
/investigate (근본 원인) → coder → npm test → /review
```

### M&A Due Diligence
```
/dd   →   dd-analyzer (전수 실사)   →   cherry-pick-planner (통합 로드맵)
→   /pmi (통합 후 최적화)
```
- `governance/skills/dd/DD-CHECKLIST.md` — 6단계 체크리스트
- Fast-track 조건: 500줄 미만 + 테스트 80%+ + 라이선스 OK

### 마케팅 콘텐츠
```
/intel (시장 조사) → /marketing-generate → /marketing-repurpose (1→15)
→ /marketing-publish (Postiz, 22개 플랫폼)
```
- 20% 인간 편집 필수 (`[HUMAN INSERT]` 마커 채우기)

### 보안 감사
```
/adversarial (공격자 시각) → /cso (OWASP/STRIDE) → /land (배포 검증)
```

---

## 6. 거버넌스 구조

### Stdlib (`governance/stdlib/`)
공통 코딩 컨벤션 라이브러리:
- `agent-patterns.md` — 에이전트 작성 표준 (slug/frontmatter/상태코드)
- `commit-format.md` — `[type]: 요약` + NOW/NEXT/BLOCK 구조
- `error-handling.md` — BLOCKED/NEEDS_CONTEXT/DONE 패턴

### SKILL-INDEX (`governance/skills/SKILL-INDEX.md`)
29개 에이전트 + 72개 커맨드 통합 인덱스. 검증: `node scripts/verify-skill-index.mjs`

### Circuit Breaker (`governance/rules/autonomous-loop.md`)
자율 모드 강제 조항 9개. 특히 조항 6 (나레이션 금지), 조항 9 (Circuit Breaker + AGENT_STATUS).

### Analytics (`lib/analytics.ts`, `.context/analytics.jsonl`)
이벤트 스키마: `session_cost`, `design_audit`, `marketing_*`, `agent_tool_call`, `run_start/end` 등.
조회: `/dashboard`, `/insights`

---

## 7. 외부 도구 연동

| 도구 | 용도 | 상태 확인 |
|------|------|----------|
| Postiz | 22개 플랫폼 콘텐츠 배포 | localhost:4007 |
| Cloudflare Workers + D1 | Cortex Dashboard 호스팅 | `npx wrangler deploy` |
| Ollama / qwen2.5-coder | 로컬 LLM | `llm -m local-fast` |
| LiteLLM | 모델 라우터 (Groq 70B 무료) | `llm "질문"` |

**모델 라우팅 원칙**:
- 요약/번역/포맷 → `llm "질문"` (Groq 무료)
- 구현/리팩토링 → `Agent(model=sonnet)`
- 설계/아키텍처 → `Agent(model=opus)` 또는 메인 직접

---

## 8. 빠른 참조

| 상황 | 커맨드/파일 |
|------|------------|
| 세션 시작 | `/pickup` |
| 새 작업 | `/vibe` |
| 아이디어 검증 | `/office-hours` → `/prd` |
| 구현 시작 | `/blueprint` → orchestrator |
| 버그 | `/investigate` |
| PR 전 | `/review` → `/ship` |
| 배포 후 | `/land` |
| 대규모 통합 후 | `/pmi` |
| 보안 걱정 | `/cso` → `/adversarial` |
| 콘텐츠 만들기 | `/marketing-generate` → `/marketing-repurpose` |
| 현황 파악 | `/prjt` → `/dashboard` |
| 메모 | `/todo` |
| 현재 상태 | `.context/CURRENT.md` |
| 커맨드 목록 | `governance/skills/SKILL-INDEX.md` |
| 에이전트 규칙 | `governance/stdlib/agent-patterns.md` |
