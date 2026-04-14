# A-Team — 방법론·이론·스킬 적용 히스토리

> A-Team 리포지토리에 적용된 모든 방법론, 이론, 외부 레퍼런스, 주요 아키텍처 결정의 시계열 기록.
> 각 항목은 git 커밋과 매핑되어 검증 가능.

---

## Timeline (Phase 별)

### Phase 0 — Foundation (초창기, `f369adb`)
**2025 후반 ~ 2026 초**

- **ClawTeam (HKUDS) 기반 멀티 에이전트 운영 레퍼런스**
  - 소스: HKUDS ClawTeam 분석
  - 채택: 5-Phase build methodology
  - 문서: `docs/06-build-methodology.md`
- **Harness + Mirror + TODO 3원 철학**
  - Harness: 에이전트 폭주 방지 (위험 명령 차단, 빌드 실패 시 세션 종료 불가)
  - Mirror: `.context/CURRENT.md` 세션 간 상태 보존
  - TODO: 할 일 누락 방지
- **Vibe-Toolkit 통합** (`44b1658`)
  - `/vibe` 세션 시작 — 컨텍스트 로드 + 즉시 실행
  - `/end` 세션 종료 — commit + push + CURRENT.md 갱신
- **Role Partitioning** (`docs/01-role-partitioning.md`)
  - 도메인/레벨별 파일 소유권
  - PARALLEL_PLAN.md 기반 충돌 방지

### Phase 1 — Core Methodologies (`2cafe` ~ `3cc4127`)
**2026-01 ~ 2026-02**

- **3-Tier Progressive Architecture** (`3cc4127`)
  - NANO (소규모) / STANDARD (중형) / PRO (대규모)
  - 프로젝트 크기별 도구 선택 차등
- **TDD Methodology** (`7e48762`, `6d6aae8`)
  - Red-Green-Refactor 엄수
  - Vitest + Playwright
  - `/tdd` 커맨드 구현
  - 문서: `docs/15-tdd-methodology.md`
- **7-Dimension Evaluation Framework** (`8d11d21`)
  - 도구/프레임워크 평가 기준 표준화
  - CrewAI, LangGraph, Superset 등 비교
  - 문서: `docs/17-tools-and-frameworks.md`
- **MoA (Mixture of Agents) + Guardrail + Checkpointing** (`2c0caa3`)
  - 멀티 에이전트 오케스트레이션 패턴
  - 품질 게이트 패턴
  - 체크포인트 기반 세션 연속성

### Phase 2 — gstack Integration (`62d229d` ~ `9f7edba`, Wave 1–4)
**2026-02 ~ 2026-03**

- **Wave 1: Agent upgrades + 4개 신규 커맨드** (`62d229d`)
- **Wave 2: 계획 검증 4종 + 보안 감사** (`d68ee58`)
  - `/autoplan`, `/plan-eng`, `/plan-ceo`, `/cso`
- **Wave 3: 브라우저 자동화** (`ea968de`)
  - `/browse`, `/qa` 커맨드
  - Playwright 기반 웹 자동화
- **Wave 4: 6개 재설계 커맨드 + careful 훅** (`9f7edba`)
  - Pre/PostToolUse hook 인프라 구축
  - 위험 명령 사전 차단

### Phase 3 — Infrastructure (`94980e8` ~ `0484e80`)
**2026-03 초반**

- **install-commands.sh** (`94980e8`)
  - A-Team → `~/.claude/commands` 전역 동기화
- **Context-mode MCP** (`a0110c6`)
  - 레슨런드 검색 엔진 내장
- **Lessons Index System** (`a0110c6`)
  - `docs/INDEX.md` on-demand 로드
  - `docs/CONCEPT-INDEX.md` 개념 역인덱스
- **/end always push** (`0484e80`)
  - 세션 종료 시 무조건 push (질문 없이)

### Phase 4 — Ralph Loop & PIOP (`1cc97d6` ~ `b9162ed`)
**2026-03 중반**

- **Ralph Loop 자율 개발 데몬** (`1cc97d6`)
  - `/ralph start "task" --check "cmd" --max N --budget $N`
  - OS 레벨 백그라운드 프로세스 (`scripts/ralph-daemon.mjs`)
  - 완료 판정 가능한 태스크 자동 반복
  - Research → Ralph 파이프라인
- **PIOP 프로토콜 Phase 1** (`eb0726d`)
  - 외부 레포 4개 차용 (14 libs, 116 tests)
  - Progressive Iterative Optimization Protocol
- **PIOP MEDIUM wiring + Ralph Loop 실전 테스트** (`b9162ed`)

### Phase 5 — bkit Integration (`61f6f8d`)
**2026-03 말 (153 tests)**

외부 bkit 레포에서 4개 모듈 차용:
- `lib/circuit-breaker.ts` — 3-state 회로 차단기 (closed/open/half_open)
- `lib/state-machine.ts` — 선언적 FSM (transition table + guard + action)
- `lib/gate-manager.ts` — Quality Gate (pass/retry/fail 3-verdict)
- `lib/self-healing.ts` — 자동 복구 파이프라인 (Error→Fix→Verify, max 5회)
- orchestrator.md에 circuit-breaker + self-healing 연결

### Phase 6 — Thin-Wrapper Architecture (`e123c5b`)
**2026-04-07 (153 tests)**

- **9 신규 서브에이전트**: `cso`, `adversarial`, `review-pr`, `benchmark`, `qa`, `doc-sync`, `autoplan`, `tdd`, `guardrail`
- **9 슬래시 커맨드 thin wrapper 전환**
  - 기존 3–5KB → ~350B (메인 컨텍스트 **90%+ 절감**)
- **install-commands.sh cp → symlink 전환**
  - 스킬 목록 중복 제거
- **vibe.md Step 0.3 Daily Tip**
  - 매일 2개 유용한 명령어 자동 소개
- **guardrail tier-2 에이전트** (haiku 모델)
  - 코드 변경 후 품질 자동 체크
- **자동 트리거링**
  - `description` 기반 자연어 매칭 → `/command` 없이 자동 라우팅

### Phase 7 — UI Auto-Inspect (`38acac2`)
**2026-04-09**

- **Playwright CLI 6개 스크립트**: `scripts/browser/` (snapshot, diff, element, flow, report, install)
- **Pre/PostToolUse 훅 정식화**
  - `templates/hooks/pre-ui-capture.sh`: UI 파일 수정 전 before 스크린샷
  - `templates/hooks/post-ui-verify.sh`: after + pixel diff + 좌표 추출
- **.claude/agents/ui-inspector.md**: UI 진단 전문 에이전트
- **governance/rules/visual-verification.md**: 자동 검증 거버넌스
- **MCP 대비 토큰 93% 절감** (15,000 → ~1,000 tok/검증)
- Playwright + Chromium 설치 완료

### Phase 8 — Unified Advisor Architecture (`7eb08fc` ~ `de9c77d`)
**2026-04-10 (166 → 171 tests)**

- **Unified Advisor (advisor_20260301)**
  - 멀티 advisor tool 통합
- **Token Cost Estimation + Pre-Check Skip Gate** (`de9c77d`)
  - `lib/cost-tracker.ts`
  - 비용 초과 시 pre-check 생략 판정

### Phase 9 — PIOP Phase 1-5 + Security (`497934b` ~ `2f23743`)
**2026-04-11 ~ 12 (237 tests)**

- **PIOP Phase 1-5 — Cross-Module Wiring + Advisor Config Unification** (`497934b`)
- **CSO Audit Remediation** (`eb538f7`, `2f23743`)
  - H01/H02/H03 (HIGH) + M01/M02/M03/M04 (MEDIUM) + L02 (LOW)
  - 14건 보안 취약점 수정
- **advisor-breaker-config.json 단일화** (`2284276`)

### Phase 10 — Parallel Subagent Rules (`9dbe256`)
**2026-04-13**

- 서브에이전트 병렬 분기 판단 룰 공식화
- TodoWrite 후 독립 작업 4건 이상 시 병렬 고려

### Phase 11 — Optimization Research (이번 세션, `aadf13e` ~ `6e31676`)
**2026-04-13 ~ 14**

- **14 범주 × ~100 후보 surveyed**
  - C1 Multi-agent orchestration, C2 Claude-native, C3 Context, C4 Workflow, C5 Eval, C6 Tools/MCP, C7 OSS repos
  - A1 Multi-model routing, A2 Failure taxonomy, A3 Observability, A4 Security, A5 Benchmark, A6 Non-AI tools, A7 Cross-project state
- **7 RFC 작성 (RFC-001~007)**
  - RFC-001 Prompt Caching (P5)
  - RFC-002 Handoff Compression (P5)
  - RFC-003 ToolSearch + Artifact Cache (P1/P4/P8)
  - RFC-004 Classical Tools (P4/P8)
  - RFC-005 promptfoo + Langfuse (P4/P6/P7)
  - RFC-006 Cascade + Budget Routing (P2/P3)
  - RFC-007 Spotlighting + Worktree (P4/P5/P6)
- **Adversarial Review 19 findings** (HIGH 3, MED 8, LOW 6, Cross-RFC 4, Meta 2)
- **Sovereignty 8 원칙 확립**
- **Truth Contract 신설** (`349f473`)
- **Wave 1 implementation** (RFC-001/003/004/007-S)
  - 258/258 tests pass
  - Bench runner + G7 verifier
  - v-baseline + v-wave-1-estimate
  - Total M1 delta estimate: -48.5%

---

## 방법론·원칙 인덱스 (알파벳순)

| 방법론/원칙 | 소속 Phase | 출처 | 상세 |
|------------|-----------|------|------|
| **5-Phase Build Methodology** | 0 | HKUDS ClawTeam | `docs/06-build-methodology.md` |
| **7-Dimension Evaluation Framework** | 1 | 자체 개발 | `docs/17-tools-and-frameworks.md` |
| **A-Team First (Survey Before Invent)** | 11 | 자체 (2026-04-14) | `governance/rules/ateam-first.md` |
| **Autonomous Loop Contract** | 11 | 자체 (2026-04-14) | `governance/rules/autonomous-loop.md` |
| **bkit 4 Modules** (circuit/FSM/gate/self-heal) | 5 | bkit 레포 | `lib/circuit-breaker.ts` 등 |
| **Budget-Aware Tool Routing** | 11 (RFC-006) | arXiv 2511.17006 | `rfc/RFC-006-cost-routing.md` |
| **Cascade Routing** (Haiku→Sonnet→Opus) | 11 (RFC-006) | Anthropic 모델 docs | 동일 |
| **Checkpointing** | 1, 4 | 자체 | `governance/rules/checkpointing.md` |
| **Context-mode MCP** | 3 | 외부 MCP | `docs/05-mcp-servers.md` |
| **CSO Audit (보안 리메디에이션)** | 9 | OWASP + 자체 | 14건 수정 (eb538f7) |
| **Decision Gates (G1–G5)** | 11 | 자체 | `MANIFEST.md` |
| **Earned Integration** | 11 | 자체 | `MANIFEST.md` Meta-Principle |
| **G7 No Regression Across Versions** | 11 | 자체 (2026-04-14) | `MANIFEST.md` + `scripts/verify-g7.mjs` |
| **Guardrail Pattern** | 1 | 자체 + MoA | `.claude/agents/guardrail.md` (Haiku tier-2) |
| **Handoff Compression 5-layer** | 11 (RFC-002) | Multi-agent orchestration guide | Facts/Story/Reasoning/Action/Caution |
| **Harness Engineering** | 0 | Vibe-Toolkit | `docs/12-harness-and-hooks.md` |
| **Hooks (PreToolUse/PostToolUse)** | 2, 7 | Claude Code 네이티브 | `docs/12-harness-and-hooks.md` |
| **MoA (Mixture of Agents)** | 1 | 학술 + 자체 | `docs/19-adoption-plan.md` |
| **PIOP Protocol** | 4, 9 | 자체 | `PROTOCOL.md` + `governance/` |
| **Prompt Caching (Anthropic)** | 11 (RFC-001) | Anthropic Feb 2026 | `scripts/prompt-cache.mjs` |
| **Protected Assets (P1–P8)** | 11 | 자체 | `MANIFEST.md` |
| **Ralph Loop (Wiggum pattern)** | 4 | 학술 (Ralph Wiggum) + 자체 | `.claude/commands/ralph.md` |
| **ReAct + Reflexion** | 11 (round-1 C4) | 학술 | 기존 Ralph Loop이 변형 |
| **Role-Based Tool Whitelist** | 11 (RFC-007) | OWASP ASI Top 10 | 설계 완료, 구현 대기 |
| **Selection Criteria (8-AND)** | 11 | 자체 | `MANIFEST.md` |
| **Self-Healing** (bkit) | 5 | bkit | `lib/self-healing.ts` |
| **Sovereignty Model (8 원칙)** | 11 | 자체 (2026-04-14) | `governance/rules/ateam-sovereignty.md` |
| **Spotlighting (delimiting/datamarking/encoding)** | 11 (RFC-007) | Microsoft 2025 논문 | `scripts/spotlight.mjs` |
| **TDD (Red-Green-Refactor)** | 1 | Beck + 자체 | `docs/15-tdd-methodology.md`, `CLAUDE.md` |
| **Thin-Wrapper Architecture** | 6 | 자체 | 9 subagents + ~350B slash commands |
| **3-Tier Progressive Architecture** | 1 | 자체 | `docs/16-project-tiers.md` |
| **ToolSearch (defer_loading)** | 11 (RFC-003) | Anthropic Feb 2026 | `templates/mcp.json.example` |
| **Truth Contract** | 11 | 자체 (2026-04-14) | `governance/rules/truth-contract.md` |
| **UI Auto-Inspect** | 7 | Playwright + 자체 | `scripts/browser/` + `ui-inspector` agent |
| **Unified Advisor (advisor_20260301)** | 8 | Anthropic beta | `lib/advisor-*` |
| **Vibe (/vibe) + End (/end)** | 0 | Vibe-Toolkit | `.claude/commands/vibe.md`, `end.md` |

---

## 외부 레퍼런스 (인용 논문·레포)

### 학술 논문
| 논문 | Phase | 영향 |
|------|-------|------|
| **Budget-Aware Tool-Use Enables Effective Agent Scaling** (arXiv 2511.17006) | 11 (RFC-006) | 33% API 비용 절감 검증, PIOP 확장 |
| **Microsoft Spotlighting** (2025) | 11 (RFC-007) | Prompt injection ASR >50% → <2% |
| **AgentPoison** (arXiv 2407.12784) | 11 (A2) | Memory poisoning defense (deferred) |
| **MemoryGraft** (arXiv 2512.16962) | 11 (A2) | 동일 |
| **G-Memory: Hierarchical Memory** (NeurIPS 2025) | 11 (C3) | Stage 9 cognitive daemon 후보 |
| **Collaborative Memory** (arXiv 2505.18279) | 11 (A7) | Multi-user memory sharing (deferred) |
| **Chain-of-Verification** (arXiv 2603.24481) | 11 (C4 Tier 2) | M4 correctness gate 후보 |
| **Terminal-Bench 2.0** (Stanford 2025) | 11 (A5) | Trajectory metrics 참조 |

### OSS 레포
| 레포 | Phase | 채택 여부 |
|------|-------|-----------|
| **HKUDS ClawTeam** | 0 | 기반 레퍼런스 |
| **bkit** | 5 | 4 모듈 전부 차용 |
| **gstack** | 2 | Wave 1-4 통합 |
| **Vibe-Toolkit** | 0 | /vibe, /end 흡수 |
| **Playwright** | 7 | scripts/browser/ |
| **ripgrep / fd / jq / ast-grep** | 11 (RFC-004) | install-classical-tools.sh |
| **promptfoo** | 11 (RFC-005) | RFC 수용, 미구현 |
| **Langfuse** | 11 (RFC-005) | RFC 수용, 미구현 |
| **OpenHands** | 11 (C7) | Event-sourcing 패턴 영향 |
| **Cline / Roo Code** | 11 (C7) | Diff-based editing 영향 |
| **BMAD** | 11 (C7) | Sprint/architecture gate 영향 (edge case) |

### 거부 후보 (REJECTED, 미래 재평가)
- **Agno** (MPL copyleft — P6 Sovereignty 위반)
- **Letta/MemGPT** (P1 thin-wrapper 대체 위협)
- **Mem0** (Cloud SaaS — P6 위반)
- **Braintrust / LangSmith / Phoenix / Helicone / Datadog** (SaaS-only cluster)
- **Self-Consistency** (18.6× token)
- **Tree of Thoughts** (context bloat)
- **AutoGen 0.4 / Swarm** (deprecated upstream)
- **Pydantic-AI** (Python 전용, A-Team TS 비호환)
- 자세한 재평가 트리거: `docs/research/2026-04-optimization/final/REJECTED.md`

---

## 메트릭 진화

| Phase | Tests | 주요 지표 | 커밋 |
|-------|-------|---------|------|
| 1 (3-Tier) | (초기) | Tier 판정 기준 신설 | `3cc4127` |
| 4 (PIOP Phase 1) | 116 | 외부 4 레포 lib TDD | `eb0726d` |
| 5 (bkit 통합) | 153 | +37 bkit 모듈 tests | `61f6f8d` |
| 6 (Thin-wrapper) | 153 | 메인 컨텍스트 90%+ 절감 | `e123c5b` |
| 7 (UI Auto-Inspect) | 153 | MCP 대비 토큰 93% 절감 | `38acac2` |
| 8 (Unified Advisor) | 166→171 | Token cost estimation | `de9c77d` |
| 9 (PIOP Phase 1-5) | 237 | Cross-module wiring + 14건 보안 수정 | `2f23743` |
| 11 (RFC-001 구현) | 244 | +7 prompt-caching tests | `8c83565` |
| 11 (RFC-007 구현) | 258 | +14 spotlight tests | `2bbecd8` |
| 11 (Wave 1 estimate) | 258 | Total M1 delta -48.5% (실측 전) | `0195950` |

---

## 거버넌스 파일 진화

### 초기 (Phase 0-3)
- `PROTOCOL.md` — 기본 프로토콜
- `docs/01-09-*.md` — 방법론별 문서

### 중기 (Phase 4-7)
- `governance/rules/checkpointing.md`
- `governance/rules/mirror-sync.md`
- `governance/rules/sync-and-commit.md`
- `governance/rules/guardrails.md`
- `governance/rules/coding-safety.md`
- `governance/rules/visual-verification.md`

### 후기 (Phase 8-11)
- `governance/rules/ateam-sovereignty.md` — 8원칙 (Phase 11 제8원칙 추가)
- `governance/rules/ateam-first.md` — Survey Before Invent
- `governance/rules/autonomous-loop.md` — 자율 루프 계약
- `governance/rules/truth-contract.md` — 거짓말 영구 금지
- `governance/rules/tool-search.md` — RFC-003 ToolSearch 정책

---

## 2026-04-14 사건 교훈 (중요)

이번 Phase 11 세션에서 발생한 **구조적 실패 2건**:

### 사건 1: Ralph 모드 오해석
- 사용자 "리서치+랄프 모드로 밤새 조사해"
- Claude: `/ralph` 슬래시 커맨드 + `scripts/ralph-daemon.mjs` 존재 **미확인**
- Ralph Loop를 일반 Ralph Wiggum 패턴으로 해석, ScheduleWakeup 발명
- → **Phase 11 A-Team First 원칙 신설** (Survey Before Invent)

### 사건 2: 자율 루프 끊김
- 사용자 "풀자동으로해 나 잘거야" 명시 후 Claude 확약
- Claude: 7 RFC 저장 후 commit/push/wakeup을 **말로만 예고**, tool call 누락
- 자율 루프 정지, 사용자 수면 중 작업 멈춤
- → **Phase 11 Truth Contract + Autonomous Loop Contract 신설**

**두 사건의 공통 원인**: "말과 실행의 괴리", "기존 자원 미확인". 이후 구조적 방어 장치 3개 영구 박음.

---

## 읽기 순서 권장 (신규 기여자용)

1. `README.md` — A-Team 개요
2. `docs/INDEX.md` — 레슨런드 인덱스
3. `PROTOCOL.md` — 핵심 프로토콜
4. `docs/06-build-methodology.md` — 5-Phase methodology (Phase 0 기반)
5. `docs/11-integration-guide.md` — 통합 가이드
6. `governance/rules/ateam-sovereignty.md` — 8원칙 (**필독**)
7. `governance/rules/truth-contract.md` — 거짓말 금지 (**필독**)
8. `docs/research/2026-04-optimization/final/EXECUTIVE_SUMMARY.md` — Phase 11 요약

---

## 관련 파일
- 커밋 이력 전체: `git log --oneline --all` (A-Team 레포)
- RFC 상세: `docs/research/2026-04-optimization/rfc/`
- 최종 문서: `docs/research/2026-04-optimization/final/`

**Last updated**: 2026-04-14 (Phase 11 Wave 1 implementation 기준)
**Maintenance**: 매 Wave 완료 후 Phase 기록 append. Weekly cron (Stage 10) 실행 시 자동 갱신 고려.
