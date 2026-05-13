# Company Building Benchmarks — 2026-05-13

> 회사 빌딩 갭 분석 시 참조한 프레임워크, 사례, 프로젝트 전체 목록.
> 복기/복구 시 이 문서부터 읽으면 됨.

## 프레임워크 (전략·운영)

| 이름 | 핵심 컨셉 | 1인+AI 적용성 | URL |
|------|----------|-------------|-----|
| **EOS (Entrepreneurial Operating System)** | 6 컴포넌트: Vision/People/Data/Issues/Process/Traction. 90일 Rocks. | 중 — Data+Traction 적용, People 제외 | https://www.eosworldwide.com/eos-model |
| **Scaling Up (Verne Harnish)** | 4 결정: People/Strategy/Execution/Cash. One-Page Strategic Plan. | 중 — Cash+Execution 적용 | https://scalingup.com/ |
| **Company of One (Paul Jarvis)** | MVPr(최소 수익성), 이메일 자동화, 의도적 소규모. | 최고 — 전부 직접 적용 | https://www.summrize.com/books/company-of-one-summary |
| **E-Myth (Michael Gerber)** | 7 비즈니스 시스템. "기술자 함정" 경고. Information Systems 강조. | 고 — Systems Strategy 핵심 | https://www.waybook.com/blog/implementing-the-emyth-methodology |
| **YC Startup Playbook** | PMF → 팀 → 실행. CAC 3개월 회수. "HR/재무 혁신 말고 제품 집중" | 고 — 실행 품질 기준 | https://playbook.samaltman.com/ |
| **Stripe Atlas Guides** | 법인+EIN+은행+회계+세금+컴플라이언스 체크리스트. | 고 — 법무/재무 기반 | https://stripe.com/guides/atlas-guides |
| **APQC PCF v8.0** | 13 카테고리 프로세스 분류. 기업 운영 전체 커버. | 고 — 갭 분석 기준 | https://www.apqc.org/process-frameworks |
| **MIT Sloan GenAI Board** | AI 페르소나 이사회 시뮬레이션 패턴 | 고 — /board 커맨드 설계 근거 | https://sloanreview.mit.edu/article/how-i-built-a-personal-board-of-directors-with-genai/ |

## 벤치마크 사례 (1인 회사)

| 이름 | 수익 | 핵심 패턴 | URL |
|------|------|----------|-----|
| **Pieter Levels** | $250K+/월 | 180+ cron job, PHP+SQLite, 0 직원. "검증→수동→자동화" 순서. Interior AI 99%+ 이익률. | https://nomadicblueprint.com/case-studies/pieter-levels |
| **Tatsuya Mizuno** | 40+ 블로그/월 | Claude AI + 24 API로 3 블로그 + 10 제품 단독 운영. | https://medium.com/@t.mizuno27/how-i-use-claude-ai-to-run-3-blogs-24-apis-and-10-products-alone |
| **ChadGPT AI Board** | N/A | 2-4명 AI 어드바이저 자동 선택 → 다른 음성 토론 → Board Consensus | https://chadgpt.com/building-your-own-ai-board-of-directors |

## GitHub 프로젝트 (회사 자동화)

| 레포 | Stars | 설명 | A-Team 활용 |
|------|-------|------|------------|
| `jim-schwoebel/awesome_ai_agents` | 1,500+ | AI 에이전트 리소스 1,500+개 큐레이션 | CS/Sales 에이전트 선정 시 참조 |
| `dariubs/awesome-workflow-automation` | — | 워크플로 자동화 도구 큐레이션 | n8n/Make 대안 탐색 |
| `eudk/awesome-ai-tools` | — | 2026 업데이트 AI 도구 모음 | 솔로프레너 스택 참조 |
| `nateherkai/AIS-OS` | — | ai-dev-operating-system: Claude Code rules+agents+sprint | A-Team과 유사 — 구조 비교용 |
| `asset-factory-mcp` | 2★ | 42개 SOP 도구 MCP 서버 | SOP 목록 갭 보완 소스 |
| `solo-founder-playbook` | 17★ | Claude Code 기반 6 스킬, 101 파운더 인터뷰 | 파운더 인사이트 참조 |
| `awesome-one-person-company` | 17★ | 실제 indie 제품 수익 사례 | 제품 아이디어 벤치마크 |

## SaaS 도구 스택 (제로베이스 구현 대신 사용할 것)

### 재무
| 도구 | 비용/월 | 역할 | 대체 구현 필요? |
|------|---------|------|----------------|
| **Stripe** | 수수료만 | 결제+인보이스+구독 | ❌ 그대로 사용 |
| **Wave** | 무료 | 회계+인보이스 | ❌ |
| **Mercury** | 무료 | 비즈니스 뱅킹 | ❌ |
| **Ramp** | 무료 | 경비+카드 | ❌ |

### 법무/컴플라이언스
| 도구 | 비용/월 | 역할 |
|------|---------|------|
| **CookieYes** | 무료~$55 | GDPR 쿠키 동의 |
| **Iubenda** | ~$9 | Privacy Policy + ToS 자동 생성 |
| **Vanta** | 별도 | SOC 2 자동화 (고객 요구 시) |

### 고객 라이프사이클
| 도구 | 비용/월 | 역할 |
|------|---------|------|
| **Customer.io** | 무료~$100 | 이메일 시퀀스, 온보딩 |
| **Lindy.ai** | $50 | AI 에이전트 CS/Sales |
| **ProsperStack** | — | 이탈 방지 |

### 워크플로 자동화
| 도구 | 비용/월 | 역할 |
|------|---------|------|
| **n8n** (셀프호스팅) | $0 | 무제한 워크플로, Anthropic 네이티브 |
| **Make.com** | ~$9 | 비주얼 로직, Zapier 대비 60% 저렴 |
| **Postiz** | $0 (셀프호스팅) | 소셜 미디어 22+ 채널 발행 |

### AI 운영
| 도구 | 비용/월 | 역할 |
|------|---------|------|
| **Alfred** | $25 | AI Chief of Staff (이메일 트리아지+브리핑) |
| **Motion** | $19 | AI 스케줄링 |
| **Reclaim.ai** | $8-18 | 캘린더 최적화 |

## 핵심 원칙 (이 리서치에서 도출)

1. **"HR/마케팅/재무에서 혁신하지 마라"** (YC) — 검증된 도구 쓰고 제품에 집중
2. **"검증→수동 100건→자동화"** (Levels) — 인프라 먼저 아님
3. **"기술자 함정"** (E-Myth) — 코드만 짜고 사업 시스템 안 만드는 것이 가장 흔한 실패
4. **"문화는 AI가 복제 못하는 유일한 경쟁 우위"** (WEF) — 의사결정 원칙 문서화
5. **"인간 CoS $150K-300K/년 vs AI $50/월"** — AI Chief of Staff는 즉시 ROI

---
*이 문서는 .research/notes/에 영구 보관. 다음 리서치 시 중복 탐색 방지.*
