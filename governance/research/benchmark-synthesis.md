# A-Team 벤치마킹 종합 리포트
**작성일**: 2026-06-13 | **분석 트랙**: 3개 (A: Claude Code harness, B: Company-in-a-Box, C: AI 개발 특화 도구) | **분석 프로젝트**: 50+개

---

## 1. Executive Summary (핵심 발견 10개)

1. **규모는 상위 25%, 혁신은 업계 최고** — 87 커맨드/35 에이전트/17 훅은 중앙값(30/15/7) 대비 2-3배이며, RTK(토큰 60-90% 절감)와 governance/rules 규칙화는 분석한 50+개 프로젝트 중 유일.
2. **마케팅 파이프라인 깊이는 Jasper급, Reach는 초과** — intel→generate→repurpose→publish 22개 채널 배포는 Jasper(6-8채널)보다 넓고, CrewAI의 구조화된 마케팅 Crew보다 end-to-end로 연결됨.
3. **개발 자동화는 "프레임워크"가 아닌 "완전 배선(fully wired)"** — CrewAI/LangGraph는 빈 프레임워크이고 A-Team은 87개 스킬이 실제 작동 중. 비교 대상이 다름.
4. **영업/지원/재무 자동화는 공백** — 영업 SDR(Clay: 5/5), 고객지원 챗봇(Swarm: 4/5), 재무 리포팅(없음)이 A-Team의 명확한 갭. "Company-in-a-Box" 완성의 마지막 30%.
5. **ACI(Agent-Computer Interface) 미적용이 최대 기술 부채** — SWE-agent가 증명: raw bash 대신 LLM 최적화 도구 세트로 SWE-bench 3-5% → 12.5% 향상. A-Team도 동일 원리 적용 시 에이전트 성공률 상승 가능.
6. **이벤트 소싱(Event Sourcing) 부재** — 상태가 메모리+CURRENT.md에만 존재. OpenHands의 append-only EventLog 패턴 도입 시 세션 중단 복구, 완전한 audit trail, /zzz 안정성이 한 번에 해결됨.
7. **Vector 메모리가 없어 "같은 실수 반복" 위험** — Ruflo의 HNSW AgentDB는 과거 작업에서 자동 학습. A-Team의 MeiliSearch + D1은 검색은 되지만 에이전트 경험 축적은 안 됨.
8. **훅 수(17개)는 업계 최고이나 observability는 최하** — 이벤트를 수집만 하고 대시보드가 없음. Eyelet/disler 패턴으로 SQLite+웹 대시보드 추가 시 "훅 1위"가 "observability 1위"로도 연결됨.
9. **Solo Founder 벤치마크(Pieter Levels, Marc Lou)와 비교 시 핵심 공백은 "반복 템플릿"** — Marc Lou는 ShipFast 템플릿 1개로 $1.03M/년. A-Team의 87 스킬은 재사용성 구조(skills 계층)가 없어 같은 패턴을 매번 재작성.
10. **멀티플랫폼 지원 0%** — wshobson/agents는 마크다운 마스터 소스 하나로 Claude Code/Cursor/Gemini CLI/Copilot 6개 플랫폼을 자동 생성. A-Team은 Claude Code 전용이어서 생태계 확산 불가.

---

## 2. 경쟁 지형도

### 카테고리별 선도 프로젝트

```
Claude Code Harness (AI 개발 자동화)
├── 규모/범용: wshobson/agents (84플러그인, 6플랫폼) > Claude-Command-Suite (216커맨드) > A-Team (87커맨드)
├── 혁신/아키텍처: Ruflo (HNSW+SONA), SuperClaude (ConfidenceChecker), A-Team (RTK)
├── 품질/검증: karanb192/hooks (262 테스트), A-Team (AC verifier), wshobson (3계층 품질검증)
└── 자율화: Agent Farm (50 concurrent + heartbeat), A-Team (/zzz), Eyelet (full observability)

Company-in-a-Box (비즈니스 자동화)
├── 마케팅: Jasper (콘텐츠 파이프라인), Copy.ai (GTM), A-Team (마케팅 파이프라인)
├── 영업: Clay (리드 enrichment 5/5), Copy.ai (SDR 자동화)
├── 개발: Devin (완전자율), CrewAI (역할기반), A-Team (87 스킬)
└── 지식관리: Notion AI, A-Team Cortex (3499문서) — Cortex가 규모 면에서 우위

AI 개발 특화 도구 (코딩 에이전트)
├── SWE-bench 최고: Claude Code (80.8%), OpenHands (65-70%), Sweep (92% 이슈해결)
├── 토큰 효율: Plandex (2M 직접), A-Team+RTK (60-90% 절감), Aider (warm_cache)
├── 오픈소스: Cline (61.2k stars), OpenHands, SWE-agent, Aider
└── 자율화: Devin (완전자율), GitHub Copilot Agent (IDE 네이티브), A-Team (/zzz)
```

### A-Team 포지셔닝 (기능 폭 × 기능 깊이 × 자동화 수준)

```
         자동화 수준 높음
              │
  Devin       │         A-Team
  (자율,       │         (깊이+자율,
   폐쇄)      │          개발/마케팅)
              │
──────────────┼──────────────────── 기능 폭
  기능 폭     │            넓음
  좁음        │
              │  CrewAI/n8n
  SWE-agent   │  (범용, 낮은자동화)
  (깊이,      │
   낮은자율)  │
              │
         자동화 수준 낮음
```

A-Team 포지션: **"개발+마케팅 특화 고자동화" 영역의 1위**. 범용 자동화(n8n, Lindy)와 완전자율(Devin) 사이에서 실용적 균형점.

---

## 3. 기능 비교 매트릭스 (20개 항목)

| 기능 | A-Team | SuperClaude | BMAD | wshobson | OpenHands | CrewAI | Aider | Clay | Devin |
|------|--------|-------------|------|----------|-----------|--------|-------|------|-------|
| **스킬/커맨드 수** | 87 | 30 | 15 | 102커맨드+156스킬 | - | - | - | - | - |
| **에이전트 수** | 35 | 20 | 6 | 192 | 모듈식 | 수백 | - | - | 단일 |
| **훅 자동화** | 17개 (최고) | 미명시 | 없음 | 없음 | 이벤트로그 | 없음 | 없음 | 없음 | CI/CD 전용 |
| **TDD 통합** | /tdd 스킬 (명시) | 테스트커맨드 | /dev-story | 있음 | 65-70% SWE | 없음 | 8-10% SWE | 없음 | 자동CI수정 |
| **마케팅 자동화** | 5/5 (22채널) | 없음 | 없음 | 없음 | 없음 | 5/5 (Crew) | 없음 | 2/5 | 없음 |
| **지식베이스/검색** | 1641문서+D1 | 없음 | 없음 | 없음 | 없음 | 없음 | RepoMap | 150+소스 | 없음 |
| **토큰 최적화** | RTK 60-90% | 없음 | 70-85% | 없음 | 없음 | 없음 | warm_cache | 없음 | 없음 |
| **세션 관리** | CURRENT.md | 없음 | Phase-based | 없음 | EventLog | 없음 | 없음 | 없음 | PR-based |
| **자율 모드** | /zzz (launchd) | 없음 | 없음 | 없음 | 있음 | Flows | 없음 | 24/7 | 완전자율 |
| **품질 게이트** | AC verifier+hook | ConfidenceChecker | 없음 | 3계층(LLM+통계) | 없음 | 없음 | dirty commit | 없음 | CI자동수정 |
| **보안 감사** | CSO mini-scan | 없음 | 없음 | Safety levels(3) | Docker sandbox | 없음 | 없음 | 없음 | VM sandbox |
| **메모리 시스템** | CURRENT.md+analytics | Auto Memory | 없음 | 없음 | EventLog(replay) | 대화 컨텍스트 | 없음 | 없음 | 없음 |
| **MCP 통합** | 8개 | 8개+AIRIS | 없음 | 없음 | 있음 | 없음 | 없음 | REST API | 없음 |
| **플랫폼 지원** | Claude Code 전용 | Claude Code | Claude Code | 6 CLI (멀티) | 범용 | 범용 Python | 터미널 | SaaS | 폐쇄 |
| **커뮤니티/생태계** | 비공개 | 22.8k stars | 47k stars | 마켓플레이스 | 오픈소스 | 12k stars | 오픈소스 | SaaS | Closed |
| **영업 자동화** | 없음 | 없음 | 없음 | 없음 | 없음 | 3/5 | 없음 | 5/5 | 없음 |
| **재무 자동화** | 없음 | 없음 | 없음 | 없음 | 없음 | 4/5(SEC) | 없음 | 없음 | 없음 |
| **고객지원 자동화** | 없음 | 없음 | 없음 | 없음 | 없음 | 2/5 | 없음 | 없음 | 없음 |
| **Observability** | analytics.jsonl(텍스트) | 없음 | 없음 | 없음 | EventLog+대시보드 | 없음 | 없음 | 없음 | PR 로그 |
| **멀티스택 지원** | 단일(Claude) | 단일 | 단일 | 단일 | 멀티 BYOM | 멀티 LLM | 멀티 LLM | 없음 | 폐쇄 |

**범례**: 5/5=최고, -=해당없음, 없음=기능 부재

---

## 4. A-Team 강점 분석 (경쟁 대비 확실히 앞서는 것)

### 강점 1: RTK — 업계 유일 토큰 절감 CLI (60-90%)
- **근거**: 분석한 50+개 프로젝트 중 RTK(Rust Token Killer) 수준의 시스템 구현체 없음. BMAD 70-85% 절감은 프롬프트 패턴이고, RTK는 실행 레이어 차단.
- **유지 전략**: RTK를 프레임워크 없이 단독 사용 가능하도록 모듈화. `rtk gain` 공개 메트릭 유지로 차별점 증명.

### 강점 2: 마케팅 파이프라인 End-to-End (intel→publish, 22채널)
- **근거**: Jasper는 5/5이지만 6-8 채널. Copy.ai는 GTM 특화. A-Team은 콘텐츠 생성부터 Postiz 22채널 배포까지 단일 파이프라인. 이 조합은 분석 프로젝트 중 없음.
- **유지 전략**: repurpose 포맷 수를 22→30으로 확대. 각 채널별 성과 analytics 연동.

### 강점 3: governance/rules 의사결정 코드화
- **근거**: 대부분 프로젝트는 CLAUDE.md에 규칙 서술. A-Team은 governance/rules/ 디렉토리에 truth-contract, task-ac, model-allocation 등 별도 문서로 분리. TRIGGER-INDEX로 온디맨드 로드.
- **유지 전략**: 새 거버넌스 규칙 추가 시 TRIGGER-INDEX 즉시 갱신. 위반 자동 감지 훅 확대.

### 강점 4: 훅 적극성 (17개, 업계 표준 5-13 대비 최상위)
- **근거**: Track A 분석 기준 업계 최대(Eyelet도 지원은 13+ 타입이나 실제 배포 수는 미명시). A-Team은 PreToolUse~SubagentStop 전 생명주기 커버.
- **유지 전략**: 훅을 observability로 연결 (현재 미연결이 약점). SQLite 이벤트 저장 추가 시 훅 수 우위가 가시화됨.

### 강점 5: Cortex 지식 시스템 (1,641문서, D1+MeiliSearch)
- **근거**: Notion AI는 Workspace 내 문서만. Ruflo AgentDB는 에이전트 경험만. A-Team Cortex는 외부 지식(OneNote 등)까지 통합한 실운영 지식베이스. 규모 면에서 유사 프로젝트 없음.
- **유지 전략**: 신규 소스 추가 주기 유지 (OneNote 마이그레이션 완료 후 자동 동기화). 검색 정확도 측정 지표 도입.

### 강점 6: 세션 생명주기 명시화 (/pickup /vibe /end /zzz)
- **근거**: 업계 표준화 중인 패턴이나 이 수준의 명시적 정의는 BMAD Phase 구조와 함께 2개뿐. A-Team은 launchd 자동화까지 연결된 유일한 사례.
- **유지 전략**: /zzz의 heartbeat 기반 자동복구 추가로 자율 모드 안정성 강화.

---

## 5. A-Team 갭 분석 (경쟁사가 하는데 우리가 못하는 것)

### 갭 1: Observability 대시보드 부재
- **임팩트**: 17개 훅이 생성하는 이벤트가 analytics.jsonl 텍스트에만 쌓임. 에이전트 성능, 비용 추이, 오류 패턴 분석 불가. Eyelet은 SQLite+웹 대시보드로 "doctor" 진단 제공.
- **해결**: analytics.jsonl → SQLite 마이그레이션 + 경량 웹 대시보드 (Eyelet 패턴). Cortex 대시보드 기술(Cloudflare Workers+D1) 재활용 가능.

### 갭 2: Skills 계층 미사용
- **임팩트**: BMAD, wshobson/agents, Hooks Mastery 모두 `.claude/skills/` 재사용 마크다운 사용. A-Team은 이 계층이 없어 패턴 재사용 어렵고 신규 에이전트 온보딩 비효율.
- **해결**: 자주 쓰는 패턴 Top 20을 `.claude/skills/` 마크다운으로 추출. BMAD Helper Pattern과 호환 구조.

### 갭 3: ACI(Agent-Computer Interface) 미적용
- **임팩트**: SWE-agent 증명: raw bash → ACI 도구 세트 전환으로 해결률 3-5% → 12.5%. A-Team 에이전트도 현재 raw bash 사용. 불필요한 컨텍스트 오염, 구문 오류 발생.
- **해결**: Syntax Validator 훅(편집 전 유효성), Directory Search 최적화(/search에 --dirs-only 옵션), Empty Output Handler 추가. 구현 2주.

### 갭 4: 이벤트 소싱 부재
- **임팩트**: 세션 중단 시 상태 손실. /zzz 중 오류 발생 시 어디서 멈췄는지 불명확. RESUME.md로 일부 보완하지만 완전한 replay 불가. OpenHands EventLog는 append-only로 전체 복구 가능.
- **해결**: `governance/events.jsonl` 도입 (MessageEvent/ActionEvent/ObservationEvent 3종). /zzz 안정성 직결.

### 갭 5: 영업 자동화 공백 (Clay: 5/5 vs A-Team: 0/5)
- **임팩트**: Clay는 150+ 데이터소스에서 리드 enrichment → 점수 → 자동 outreach 완전 자동화. A-Team은 콜드 이메일, 리드 생성, CRM 연동 없음. Solo Founder로서 영업이 없으면 성장 한계.
- **해결**: Lead generation agent (Apollo/LinkedIn 크롤링) + Outreach sequence agent (이메일+follow-up). 기존 마케팅 파이프라인 앞단 연결.

### 갭 6: Vector 메모리 미사용 (Ruflo HNSW vs A-Team JSON+텍스트)
- **임팩트**: Ruflo AgentDB는 에이전트 경험 → HNSW 인덱스 → 유사 작업 자동 검색 → SONA 학습. A-Team은 같은 오류를 반복할 위험. MeiliSearch가 있지만 에이전트 경험이 아닌 노트 검색 전용.
- **해결**: 에이전트 작업 완료 시 결과를 MeiliSearch에 structured 형태로 추가 인덱싱. 완전 HNSW 미구현 상태에서도 "과거 유사 작업" 검색은 즉시 가능.

### 갭 7: 멀티플랫폼 지원 없음
- **임팩트**: wshobson/agents는 마크다운 소스 1개 → Claude Code/Cursor/Gemini CLI/Copilot 자동 생성. A-Team 87 커맨드는 Claude Code 전용. 다른 툴 사용자 도달 불가.
- **해결**: 장기 목표. 단기에는 `cursorrules` 기반 Cursor 호환 버전 1개만 추가해도 Cursor 사용자층 접근 가능.

---

## 6. 즉시 실행 액션 아이템

### P0 — 2주 내, 임팩트 높음

1. **ACI Syntax Validator 훅 추가** — 출처: Track C (SWE-agent) | 예상 임팩트: 에이전트 코드 편집 성공률 +20-30%, 구문 오류 사전 차단 | 구현 난이도: 하 (PreToolUse 훅에 AST 검증 추가)

2. **analytics.jsonl → SQLite 마이그레이션 + 기본 대시보드** — 출처: Track A (Eyelet, disler/observability) | 예상 임팩트: 훅 이벤트 쿼리 가능, 에이전트 오류 패턴 가시화, 비용 추이 분석 | 구현 난이도: 중 (Cortex 대시보드 기술 재활용)

3. **governance/events.jsonl 도입 (이벤트 소싱 기초)** — 출처: Track C (OpenHands EventLog) | 예상 임팩트: /zzz 안정성 증대, 세션 중단 복구, audit trail | 구현 난이도: 하 (세션 훅에 append 로직 추가)

4. **/zzz Heartbeat 기반 자동복구** — 출처: Track A (Agent Farm, Stale Detection >2분 → auto restart) | 예상 임팩트: 자율 모드 중 에이전트 hang 자동 감지/재시작 | 구현 난이도: 중

5. **Skills 계층 도입 (Top 20 패턴 추출)** — 출처: Track A (BMAD, wshobson/agents .claude/skills/) | 예상 임팩트: 신규 에이전트 온보딩 시간 50% 감소, 패턴 재사용률 향상 | 구현 난이도: 하 (기존 커맨드에서 추출)

### P1 — 1개월 내

1. **Changelog 자동 생성 (GitHub Actions 연동)** — 출처: Track A (Claude-Command-Suite) | 예상 임팩트: 릴리스 노트 자동화, CI/CD 통합 | 구현 난이도: 하

2. **Builder-Validator 패턴 명시화** — 출처: Track A (Hooks Mastery) | 예상 임팩트: AC 검증 자동화 루프, 에이전트 역할 명확화 | 구현 난이도: 중

3. **커맨드 네임스페이싱 도입** — 출처: Track A (SuperClaude /sc:*, Claude-Command-Suite /dev:* /test:*) | 예상 임팩트: 87개 커맨드 탐색성 향상, 충돌 방지 | 구현 난이도: 하 (리네이밍)

4. **에이전트 경험 MeiliSearch 인덱싱 (Vector 메모리 기초)** — 출처: Track A (Ruflo AgentDB) | 예상 임팩트: 유사 과거 작업 자동 검색, 반복 오류 감소 | 구현 난이도: 중

5. **멀티파일 diff 샌드박스 (/craft 미리보기 단계)** — 출처: Track C (Plandex) | 예상 임팩트: 의도치 않은 변경 방지, /craft 사용 신뢰도 향상 | 구현 난이도: 중

### P2 — 분기 내

1. **영업 자동화 에이전트 (Lead generation + Outreach)** — 출처: Track B (Clay, Copy.ai) | 예상 임팩트: 콜드 아웃리치 완전 자동화, 마케팅 파이프라인 앞단 연결 | 구현 난이도: 상

2. **고객 지원 챗봇 (Cortex-aware FAQ agent)** — 출처: Track B (OpenAI Swarm airline/support_bot 패턴) | 예상 임팩트: 반복 질문 자동 처리, Cortex 지식 활용 | 구현 난이도: 중

3. **재무 리포팅 자동화 (Stripe → Dashboard)** — 출처: Track B (Marc Lou 패턴: Stripe 자동화, Danny Postma 대시보드) | 예상 임팩트: MRR/마진/추세 자동 시각화, 의사결정 근거 확보 | 구현 난이도: 중

4. **Cursor 호환 cursorrules 자동 생성** — 출처: Track A (wshobson/agents 멀티플랫폼), Track C (Cursor .cursorrules 패턴) | 예상 임팩트: Cursor 사용자층 접근, A-Team 규칙 Cursor 환경 이식 | 구현 난이도: 중

5. **시나리오 시뮬레이터 (WFGY 패턴)** — 출처: Track A (Claude-Command-Suite) | 예상 임팩트: 비즈니스 가정 자동 검증, 의사결정 지원 에이전트 | 구현 난이도: 상

---

## 7. 흡수 추천 프로젝트 Top 5 (/dd 실행 권장)

1. **Eyelet (bdmorin/eyelet)** — Hook 이벤트 SQLite 저장 + 웹 대시보드 + "doctor" 진단. A-Team의 17개 훅이 생성하는 이벤트를 즉시 가시화 가능. /dd 실행 시 기대 효과: analytics.jsonl → SQLite 마이그레이션 경로 확인, Vue 3 대시보드 컴포넌트 재활용.

2. **claude_code_agent_farm (Dicklesworthstone)** — 50 concurrent 에이전트, Heartbeat 모니터링, 실시간 상태 대시보드. /zzz 자율 모드 안정성 직결. /dd 실행 시 기대 효과: heartbeat 구현 코드 참조, stale detection 임계값(2분) 검증.

3. **karanb192/claude-code-hooks** — 262개 테스트 통과, Safety levels(Critical/High/Strict), 위험 명령 자동 차단. A-Team 보안 기준선 즉시 업그레이드. /dd 실행 시 기대 효과: rm -rf/fork bomb 차단 훅 패턴 직접 흡수.

4. **SWE-agent (Princeton NLP)** — ACI(Agent-Computer Interface) 참조 구현. 4개 핵심 도구(Syntax Validator, File Viewer, Directory Search, Empty Output Handler). /dd 실행 시 기대 효과: ACI 도구 명세 직접 참조, A-Team 훅에 이식할 검증 로직 추출.

5. **Ruflo (ruvnet/ruflo)** — HNSW 벡터 메모리 + SONA 신경 패턴 학습 + PII 자동 마스킹. 에이전트 학습 능력의 참조 구현. /dd 실행 시 기대 효과: HNSW 인덱싱 구조 분석, PII 마스킹 정규식 패턴 추출, MeiliSearch 연동 설계 참고.

---

## 8. A-Team 로드맵 반영 제안

### 현재 Phase 구조에 추가/수정 권장

**Phase 0 (기반 강화) 추가**:
- `observability-layer`: analytics.jsonl → SQLite + 기본 웹 대시보드
- `event-sourcing`: governance/events.jsonl 도입
- `skills-layer`: .claude/skills/ 계층 생성 및 Top 20 패턴 이식

**Phase 1 (자동화 확장) 수정**:
- 기존: 에이전트 수 확장 → 수정: 에이전트 품질 지표 추가 (Builder-Validator 패턴 명시화)
- 추가: ACI 도구 세트 (SWE-agent 패턴 이식)
- 추가: Heartbeat 기반 /zzz 자동복구

**Phase 2 (비즈니스 자동화 완성) 신규**:
- 영업 자동화: Lead agent + Outreach agent (Clay 수준 목표)
- 고객지원: Cortex-aware FAQ bot
- 재무: Stripe → MRR 대시보드 자동화
- 목표 상태: 마케팅(5/5)+개발(5/5)+영업(4/5)+지원(3/5)+재무(3/5) = "실질적 Company-in-a-Box"

**Phase 3 (생태계 확산) 신규**:
- Cursor cursorrules 자동 생성
- 에이전트 경험 Vector 메모리 (MeiliSearch 기반)
- 커맨드 네임스페이싱 완성
- 목표: Claude Code 생태계 상위 10%

**삭제 권장**:
- 없음. 현재 Phase 구조는 탄탄함. 위 항목들을 각 Phase에 추가하는 방식 권장.

---

## 9. 결론: A-Team의 3개월 후 목표 상태

### 수치 목표

| 지표 | 현재 | 3개월 목표 | 근거 |
|------|------|-----------|------|
| 커맨드 수 | 87 | 100+ | P0~P1 액션 구현 시 자연 증가 |
| 에이전트 수 | 35 | 40 | 영업/지원 에이전트 추가 |
| 훅 수 | 17 | 22 | ACI Validator + EventSourcing + Heartbeat 훅 |
| Observability | 0 (텍스트) | SQLite + 웹 대시보드 | Eyelet 패턴 이식 |
| 비즈니스 기능 커버리지 | 마케팅+개발 (5/5) | +영업(3/5)+지원(2/5)+재무(2/5) | P1~P2 액션 |
| 에이전트 작업 성공률 | 미측정 | 측정 기반 +15% | ACI + EventLog 도입 후 측정 가능 |
| 토큰 절감 | 60-90% (RTK) | 65-90% | Skills 계층 + ACI 도구 최적화 |
| 멀티플랫폼 | Claude Code 전용 | +Cursor 호환 | cursorrules 자동 생성 P2 |

### 3개월 후 포지션
> **"Claude Code 생태계 상위 15-20% 진입, 실질적 Solo Founder Company-in-a-Box로서 개발+마케팅+영업 자동화 커버"**

현재 A-Team은 개발과 마케팅 자동화에서 업계 최고 수준(5/5)이나, 비즈니스 운영 전체(영업/지원/재무)는 공백. P0~P2 액션 15개 실행 시 공백 3개 영역이 2-3/5로 진입하고, 기존 강점(RTK, 마케팅 파이프라인, Cortex, 훅 시스템)은 더욱 강화된다.

**핵심 레버**: Eyelet 패턴 observability 도입(2주)이 다른 모든 개선의 측정 기반을 만들기 때문에 P0 액션 2번이 사실상 전체 로드맵의 선결 조건.

---

**소스**: Track A (20+개 Claude Code harness 프로젝트) + Track B (18개 AI Company/Solo Founder 사례) + Track C (12개 AI 개발 특화 도구)  
**신뢰도**: 1차 소스(GitHub 코드/공식 문서) 85%, 2차 소스(케이스 스터디/리포트) 15%  
**다음 리뷰**: 2026-09-13 (3개월 후)
