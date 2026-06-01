# SKILL-INDEX — A-Team 통합 스킬 인덱스

> Paperclip Phase 4 흡수 (2026-06-01)
> 자동 검증: `node scripts/verify-skill-index.mjs`
> 스키마: [SKILL-SCHEMA.md](SKILL-SCHEMA.md)

---

## Agents (`.claude/agents/`)

### Engineering
| Slug | Description | Complexity |
|------|-------------|------------|
| adversarial | 공격자 시각으로 코드 취약점 탐지 | medium |
| architect | 시스템 구조 설계 + 기술 스택 결정 | high |
| benchmark | 성능 기준선 측정 + 회귀 감지 | medium |
| cherry-pick-planner | DD 판정 후 선택적 통합 로드맵 생성 | medium |
| coder | 기능 구현, 버그 수정, 리팩토링 | medium |
| dd-analyzer | 외부 레포 전수 실사 + 기술부채 정량화 | medium |
| guardrail | 변경 후 잔여 디버그 코드 + 품질 위반 감지 | low |
| pre-check | 구현 전 스킵 게이트 판정 (haiku) | low |
| review-pr | PR 머지 전 독립 전체 검토 | medium |
| reviewer | 코드 품질 게이트 (orchestrator 내부) | medium |
| scope-validator | 구현 전 스코프 경계 검증 | low |
| tdd | TDD Red-Green-Refactor 루프 | medium |
| ui-inspector | 브라우저 스크린샷 + 레이아웃 진단 | medium |

### Design
| Slug | Description | Complexity |
|------|-------------|------------|
| design-auditor | AI smell 22개 + a11y + 레이아웃 위반 감지 | medium |
| designer | 디자인 브리핑 — tone/variant/density 결정 | low |
| marp-writer | Marp 한국어 프레젠테이션 생성 | medium |
| ppt-strategist | PPT 콘텐츠 전략 + JSON 스펙 | medium |

### Intelligence
| Slug | Description | Complexity |
|------|-------------|------------|
| intel-analyzer | 시장/경쟁사/트렌드 분석 엔진 | high |
| insights | analytics.jsonl 집계 → 주간 인사이트 | medium |
| researcher | 웹 검색 + 코드베이스 탐색 조사 | medium |

### Operations
| Slug | Description | Complexity |
|------|-------------|------------|
| autoplan | CEO→디자인→엔지니어링 3단계 계획 검토 | high |
| daily-brief | 내부+외부 종합 성장 브리핑 | high |
| doc-sync | 코드-문서 drift 감지 + 동기화 | medium |
| growth-engine | 외부 트렌드 크롤링 + 자동 적용 | high |
| orchestrator | 멀티스텝 작업 분배 + 결과 취합 | high |
| pm | 요구사항 정의 + 스코프 판정 | medium |
| qa | 브라우저 자동화 8카테고리 테스트 | high |

### Governance
| Slug | Description | Complexity |
|------|-------------|------------|
| cso | OWASP/STRIDE 보안 감사 + 시스템 건강 감사 | high |
| judge | MoA 충돌 해소 + 최종 판정 | high |

---

## Commands (`.claude/commands/`)

### Engineering
| Command | Description | Trigger |
|---------|-------------|---------|
| /adversarial | 적대적 코드 리뷰 | manual/auto |
| /autoresearch | Karpathy식 프롬프트 자동 최적화 루프 | manual |
| /benchmark | 성능 기준선 측정 | auto |
| /blueprint | 에이전트/자동화 시스템 설계 문서 | auto |
| /cold-review | 월간 구조 냉철 감사 | auto |
| /craft | PRO Tier 품질 파이프라인 | manual |
| /cso | 보안 감사 (CSO 단독 실행) | auto |
| /dd | M&A Due Diligence 6단계 | manual |
| /design-audit | AI smell + 브랜드 체크 | hook |
| /doc-sync | 문서 Drift 감지 + 동기화 | manual |
| /github-review | GitHub PR 리뷰 + 코멘트 게시 | manual |
| /improve | 글로벌 툴킷 개선사항 등록/반영 | manual |
| /incident | 장애 감지·진단·복구 | manual |
| /investigate | 체계적 근본 원인 분석 | auto |
| /issue-triage | GitHub 이슈 트리아지 | manual |
| /land | 배포 신뢰도 검증 | manual |
| /legal-check | 라이선스 컴플라이언스 검사 | manual |
| /optimize | Post-Integration Optimization | auto |
| /plan-ceo | CEO 시각 계획 검토 | auto |
| /plan-eng | 엔지니어링 계획 검토 | auto |
| /pmi | Post-Major-Integration 감사 | auto |
| /qa | 웹 앱 체계적 QA 테스트 | auto |
| /ralph | Autonomous AI development loop | manual |
| /re | Research Mode 관리 | manual |
| /retro | 엔지니어링 회고 | manual |
| /review | Pre-Landing PR 리뷰 | auto |
| /ship | PR 생성 전 완전 검증 | manual |
| /tdd | TDD Red-Green-Refactor | auto |

### Operations
| Command | Description | Trigger |
|---------|-------------|---------|
| /absorb | 내부 개선사항 역류 흡수 | manual |
| /autoplan | 자동 계획 검토 파이프라인 | manual |
| /board | AI 이사회 시뮬레이션 (월 1회) | auto |
| /capability | 부서별 점수 + 런칭 시나리오 | manual |
| /daily-brief | 일간 성장 브리핑 | auto |
| /dashboard | analytics.jsonl 시각화 | manual |
| /end | 세션 종료 — 커밋 + 상태 갱신 | manual |
| /okr | OKR/KPI 설정·추적·회고 | manual |
| /pickup | 세션 재개 기본 진입점 | manual |
| /prd | 아이디어 검증 → PRD 생성 | auto |
| /prioritize | RICE 기반 기능 우선순위 | manual |
| /prjt | 전체 프로젝트 현황 | manual |
| /rc | 디바이스 간 컨텍스트 핸드오버 | manual |
| /resume | 리셋 후 작업 재개 | manual |
| /sync | Auto-Sync 데몬 관리 | manual |
| /vibe | 새 세션 시작 + 컨텍스트 로드 | manual |
| /zzz | 풀 오토 수면 모드 | manual |

### Marketing
| Command | Description | Trigger |
|---------|-------------|---------|
| /card-news | 인스타그램 카드뉴스 8장 자동 생성 | manual |
| /intel | 시장·사용자 인텔리전스 수집 | auto |
| /marketing | 마케팅 마스터 오케스트레이터 | manual |
| /marketing-analytics | 성과 분석 | manual |
| /marketing-generate | 콘텐츠 생성 | manual |
| /marketing-loop | 주간 자가 개선 루프 | manual |
| /marketing-publish | 멀티플랫폼 배포 | manual |
| /marketing-repurpose | 1→15 콘텐츠 변환 | manual |
| /marketing-research | 리서치 파이프라인 | manual |
| /marketing-social | Native Social-First 콘텐츠 | manual |

### Design
| Command | Description | Trigger |
|---------|-------------|---------|
| /design-brief | 디자인 브리핑 생성 | manual |
| /design-generate | 비주얼 에셋 생성 | manual |
| /design-retro | Design Subsystem 회고 | manual |
| /design-score | UI/PPT 품질 평가 + 학습 루프 | auto |
| /design-thumbnail | 썸네일 원스탑 생성 | manual |
| /ppt | 업무용 PPT 자동 생성 | manual |

### Intelligence & Data
| Command | Description | Trigger |
|---------|-------------|---------|
| /insights | analytics.jsonl → 주간 인사이트 | manual |
| /yt | YouTube 영상 풀 추출 + 분석 | manual |
| /csv-clean | CSV 데이터 품질 정리 | auto |
| /data-calc | Excel/CSV 집계 연산 | auto |
| /excel-to-csv | Excel → CSV 변환 | auto |
| /repos | 레포지토리 현황 관리 | manual |

---

## Governance Skills (`governance/skills/`)

| 디렉토리 | 내용 |
|---------|------|
| `dd/` | M&A Due Diligence 체크리스트 |
| `autoresearch/` | 프롬프트 최적화 shadow-evals |

---

## 통계

| 구분 | 수량 |
|------|------|
| Agents | 29 |
| Commands | 72 |
| Governance Skills | 2 |
| **총계** | **103** |

---

*자동 검증: `node scripts/verify-skill-index.mjs`*
