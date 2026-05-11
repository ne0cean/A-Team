# A-Team Gap Analysis — APQC PCF 13 Categories vs Current State

> Date: 2026-05-11
> Based on: 9개 리서치 (195KB), APQC PCF v8.0, Porter Value Chain, Agency Agents 13-division
> Method: 외부 레퍼런스 기반 매핑 (내부 추측 아님)

## APQC PCF 13 Categories → A-Team 매핑

### OPERATING PROCESSES (6)

#### 1.0 Develop Vision & Strategy
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| Strategic Planning | `/office-hours`, `/plan-ceo` | ✅ 있음 | 주기적 전략 리뷰 자동화 없음 |
| Business Model Design | `/prd`, `/webapp-prd` | ✅ 있음 | - |
| Capability Assessment | `/capability`, `capability-map.json` | ✅ 있음 | - |
| Roadmap Management | `team-roadmap.md`, `/vibe` | ✅ 있음 | - |
| **OKR/KPI 추적** | 없음 | ❌ **갭** | 목표 설정→추적→회고 자동화 |

#### 2.0 Develop & Manage Products/Services
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| Product Management | `pm` agent, `/blueprint` | ✅ 있음 | scope 검증만, 백로그/우선순위 자동화 없음 |
| Requirements | `/office-hours`, `/prd` | ✅ 있음 | - |
| Architecture | `architect` agent | ✅ 있음 | - |
| Development | `coder` agent, `/tdd`, `/craft` | ✅ 있음 | - |
| Testing | QA, TDD, design-auditor | ✅ 있음 | - |
| **Feature Prioritization** | 없음 | ❌ **갭** | RICE/WSJF 자동 스코어링 |
| **User Feedback Loop** | 없음 | ❌ **갭** | NPS/CSAT 수집→분석→백로그 |

#### 3.0 Market & Sell Products/Services
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| Market Research | `/intel`, `intel-analyzer` | ✅ 있음 | - |
| Content Marketing | `/marketing-generate`, `/card-news` | ✅ 있음 | - |
| Social Media | `/marketing-social`, `/marketing-repurpose` | ✅ 있음 | 발행 미연결 (Postiz/Buffer 대기) |
| **SEO** | 없음 | ❌ **갭** | 키워드 리서치→콘텐츠 최적화→순위 추적 |
| **Sales Pipeline** | 없음 | ❌ **갭** | 리드→퍼널→클로징 자동화 |
| **Growth/A/B Testing** | 없음 | ❌ **갭** | 실험 설계→실행→분석 |
| **Paid Ads** | friction-log에 기록됨 | ❌ **갭** | 광고 집행/최적화 |

#### 4.0 Manage Supply Chain (SaaS 맥락 재해석)
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| Vendor Management | 없음 | ⚠️ 약함 | API/SaaS 의존성 관리 |
| **Cost Optimization** | `cost-tracker.ts`, `budget-tracker.ts` | ✅ 있음 | - |
| **Infrastructure** | CI (`ci.yml`), launchd crons | ✅ 있음 | 클라우드 인프라 자동화 없음 |

#### 5.0 Deliver Services
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| Deployment | `/ship`, `/land` | ✅ 있음 | - |
| Monitoring | orchestration hooks, analytics | ✅ 있음 | - |
| **Incident Response** | 없음 | ❌ **갭** | 장애 감지→진단→복구 자동화 |

#### 6.0 Manage Customer Service
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| **Customer Support** | 없음 | ❌ **갭** | 티켓→분류→응답→에스컬레이션 |
| **Knowledge Base** | 없음 | ❌ **갭** | FAQ 자동 생성/관리 |
| **Customer Success** | 없음 | ❌ **갭** | 이탈 예측, 온보딩, 헬스 스코어 |

---

### MANAGEMENT & SUPPORT PROCESSES (7)

#### 7.0 Develop & Manage Human Capital (HR)
사용자 제외 대상. 스킵.

#### 8.0 Manage Information Technology
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| DevOps/CI | GitHub Actions | ✅ 있음 | - |
| Security | `cso` agent, `/cso` | ✅ 있음 | - |
| **Infrastructure as Code** | 없음 | ❌ **갭** | Terraform/Pulumi 자동 생성 |
| **Monitoring/Alerting** | analytics.jsonl 기반 | ⚠️ 약함 | 실시간 알림 시스템 없음 |

#### 9.0 Manage Financial Resources
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| Cost Tracking | `cost-tracker.ts` | ✅ 있음 | - |
| **Budgeting/Forecasting** | 없음 | ❌ **갭** | 시나리오 기반 예산 계획 |
| **Invoicing** | 없음 | ❌ **갭** | 자동 청구/결제 |
| **Revenue Tracking** | 없음 | ❌ **갭** | MRR/ARR/Churn 대시보드 |

#### 10.0 Acquire/Construct/Manage Assets
SaaS에서는 디지털 자산 관리 = DAM (Digital Asset Management)
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| **Content Asset Management** | content/ 디렉토리 | ⚠️ 약함 | DAM 시스템 없음 |
| **Template Management** | templates/ | ✅ 있음 | - |

#### 11.0 Manage Risk/Compliance
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| Security Audit | `cso` agent | ✅ 있음 | - |
| Quality Gates | `quality-gates.md` | ✅ 있음 | - |
| **License Compliance** | 없음 | ❌ **갭** | OSS 라이선스 자동 검사 |
| **Privacy/GDPR** | 없음 | ❌ **갭** | 개인정보처리방침 자동 생성 |
| **Terms of Service** | 없음 | ❌ **갭** | 약관 템플릿 |

#### 12.0 Manage External Relationships
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| GitHub PR/Issues | `/github-review`, `/issue-triage` | ✅ 있음 | - |
| **Community Management** | 없음 | ❌ **갭** | Discord/Forum 모더레이션 |
| **DevRel** | 없음 | ❌ **갭** | 개발자 관계, 에반젤리즘 |
| **Partnership** | 없음 | ⚠️ 미래 | 규모 있어야 의미 |

#### 13.0 Develop & Manage Business Capabilities
| 기능 | A-Team 현재 | 상태 | 갭 |
|------|------------|------|-----|
| Capability Map | `capability-map.json` | ✅ 있음 | - |
| Gap Detection | `gap-sensor.ts` | ✅ 있음 | - |
| Improvement Loop | `/improve`, `/absorb` | ✅ 있음 | - |
| Learning/Retro | `/retro`, learnings.ts | ✅ 있음 | - |

---

## Gap Summary — 우선순위 매트릭스

### P0: 제품 있으면 즉시 필요 (Revenue Direct Impact)

| 갭 | 영역 | 자동화율 | 구현 난이도 | 외부 레퍼런스 |
|----|------|---------|-----------|-------------|
| **SEO 시스템** | 3.0 Market | 70% | 중 | Ahrefs + Claude + n8n |
| **Sales Pipeline** | 3.0 Market | 65-80% | 중 | HubSpot Free + Clay + Reply.io |
| **Customer Support** | 6.0 Service | 60-75% | 낮 | Intercom Fin / Help Scout |
| **Revenue Tracking** | 9.0 Finance | 70% | 낮 | Stripe Dashboard + dbt |

### P1: 성장 가속 (Growth Multiplier)

| 갭 | 영역 | 자동화율 | 구현 난이도 | 외부 레퍼런스 |
|----|------|---------|-----------|-------------|
| **Growth/A/B Testing** | 3.0 Market | 70-85% | 높 | Optimizely + Claude |
| **Customer Success** | 6.0 Service | 60-75% | 중 | ChurnZero/Gainsight 패턴 |
| **User Feedback Loop** | 2.0 Product | 65% | 중 | NPS + Claude 분석 |
| **Feature Prioritization** | 2.0 Product | 65% | 낮 | RICE scoring + LangGraph |

### P2: 운영 안정성 (Operational Reliability)

| 갭 | 영역 | 자동화율 | 구현 난이도 | 외부 레퍼런스 |
|----|------|---------|-----------|-------------|
| **Incident Response** | 5.0 Deliver | 75-90% | 중 | AWS DevOps Agent 패턴 |
| **License Compliance** | 11.0 Risk | 높 | 낮 | license-checker + Claude |
| **Privacy/ToS** | 11.0 Risk | 높 | 낮 | Claude 템플릿 생성 |
| **OKR/KPI Tracking** | 1.0 Strategy | 중 | 낮 | Notion + n8n |
| **Monitoring/Alerting** | 8.0 IT | 중 | 중 | Prometheus + Slack |

### P3: 확장 시 필요 (Scale-dependent)

| 갭 | 영역 | 자동화율 | 구현 난이도 | 외부 레퍼런스 |
|----|------|---------|-----------|-------------|
| **Community Management** | 12.0 External | 60-75% | 중 | CommunityOne + Discord.py |
| **Paid Ads** | 3.0 Market | 중 | 높 | Google/Meta Ads API |
| **Infrastructure as Code** | 8.0 IT | 75-90% | 높 | Terraform + Claude |
| **Budgeting/Forecasting** | 9.0 Finance | 70-80% | 중 | DualEntry / LightGBM |
| **Content Asset Management** | 10.0 Assets | 70% | 중 | Aprimo / S3 + metadata |

---

## 현재 커버리지 점수

| APQC Category | 커버리지 | 판정 |
|---------------|---------|------|
| 1.0 Strategy | 80% | ✅ |
| 2.0 Product | 70% | ⚠️ 피드백/우선순위 부재 |
| 3.0 Market & Sell | 50% | ❌ SEO/Sales/Growth 부재 |
| 4.0 Supply Chain | 60% | ⚠️ 인프라 자동화 약함 |
| 5.0 Deliver | 70% | ⚠️ 인시던트 대응 없음 |
| 6.0 Customer Service | 0% | ❌ 전면 부재 |
| 7.0 Human Capital | N/A | 제외 |
| 8.0 IT | 60% | ⚠️ IaC/모니터링 약함 |
| 9.0 Finance | 30% | ❌ 비용 추적만 있음 |
| 10.0 Assets | 40% | ⚠️ |
| 11.0 Risk/Compliance | 50% | ⚠️ 보안만 있음, 법무 없음 |
| 12.0 External Relations | 30% | ❌ GitHub만, 커뮤니티 없음 |
| 13.0 Business Capabilities | 90% | ✅ |

**전체 평균: 52%** (HR 제외 12개 중)

---

## 구현 로드맵 (외부 레퍼런스 기반)

### Month 0-1: Quick Wins (P0 중 구현 쉬운 것)
1. **License Compliance** — `npx license-checker` + Claude 요약 (1일)
2. **Privacy/ToS 템플릿** — Claude 생성 + 프로젝트별 커스텀 (1일)
3. **Revenue Tracking 기초** — Stripe webhook + analytics.jsonl (2일)
4. **Customer Support 설계** — Intercom Fin / Help Scout 설계문서 (1일)

### Month 1-3: Core Revenue Functions (P0)
5. **SEO 시스템** — 키워드 리서치 → 콘텐츠 최적화 → 순위 추적 (2주)
6. **Sales Pipeline** — HubSpot Free + Clay 연동 설계 (1주)
7. **Customer Support MVP** — 지식 기반 + AI 챗봇 (1주)
8. **Feature Prioritization** — RICE scoring agent (1주)

### Month 3-6: Growth (P1)
9. **Growth/A/B Testing** — 실험 프레임워크 (2주)
10. **Customer Success** — 이탈 예측 모델 + 헬스 스코어 (3주)
11. **User Feedback Loop** — NPS 수집 → 분석 → 백로그 (2주)
12. **OKR/KPI Dashboard** — 자동 추적 + 주간 리포트 (1주)

### Month 6-12: Operational Excellence (P2-P3)
13. **Incident Response** — 알림 → 진단 → 복구 자동화 (3주)
14. **Community Management** — Discord bot + 모더레이션 (2주)
15. **Monitoring/Alerting** — 실시간 이상 감지 (2주)
16. **Budgeting** — 시나리오 기반 예산 (2주)

---

## Agency Agents 13-Division 크로스 레퍼런스

| Agency Agents Division | A-Team 매핑 | 커버리지 |
|----------------------|------------|---------|
| Engineering (28 agents) | coder, architect, tdd, guardrail | 70% |
| Marketing (27 agents) | marketing-*, intel, card-news | 50% |
| Sales (9 agents) | 없음 | 0% ❌ |
| Design (8 agents) | designer, design-auditor | 80% |
| Paid Media (7 agents) | 없음 | 0% ❌ |
| QA (8 agents) | qa, ui-inspector, benchmark | 70% |
| Product (5 agents) | pm, scope-validator | 60% |
| Project Management (6 agents) | orchestrator, pre-check | 50% |
| Support (6 agents) | 없음 | 0% ❌ |
| Finance | cost-tracker | 20% |
| Academic/Strategy | researcher, office-hours | 70% |
| Spatial Computing (6 agents) | N/A | - |

**완전 부재 부서: Sales, Paid Media, Support**

---

## Sources

- APQC Process Classification Framework v8.0
- Porter's Value Chain (fourweekmba.com)
- McKinsey State of Organizations 2026
- Agency Agents (github.com/msitarzewski/agency-agents) — 13 divisions, 147 agents
- RouteLLM, ChurnZero, Gainsight, Clari, Clay — 부서별 AI 도구
- Pieter Levels, Danny Postma, Marc Lou, Tatsuya Mizuno — 실증 사례
- 상세: `.research/notes/2026-05-11-*.md` (9개, 195KB)
