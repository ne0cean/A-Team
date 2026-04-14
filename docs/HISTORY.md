# A-Team — 방법론·이론·스킬 적용 전체 히스토리

> A-Team 리포지토리에 적용된 모든 방법론, 이론, 외부 레퍼런스, 주요 아키텍처 결정의 시계열 기록.
> 각 항목은 git 커밋과 매핑되어 검증 가능.
> **대상 범위**: `f369adb` (init, 2026-03-19) → 최신 (Phase 11)

---

## Phase 0 — Foundation: ClawTeam 기반 (2026-03-19, `f369adb`)

**첫 커밋. 개념 정립기.**

### 채택된 것
- **HKUDS ClawTeam 분석 기반 멀티에이전트 레퍼런스** (git: `f369adb`)
  - docs/architecture: 스웜 구조, Transport 레이어, 메시지 흐름, 격리 전략
  - docs/task-design: 4단계 설계 방법론 (분해→명세→의존성→일정)
  - docs/workflows: 팀 셋업, 에이전트 통신, 모니터링, 크로스머신 패턴
- **5-Phase Build Methodology** (`4bded4b`)
  - 기획 → 계획 → 구현 → 검증 → 배포 5단계 표준화
  - 문서: `docs/06-build-methodology.md`
- **3원 철학 확립**: *Harness · Mirror · TODO*
  - **Harness**: 에이전트가 망치지 않게 — 위험 명령 차단, 빌드 실패 시 세션 종료 불가
  - **Mirror**: 맥락을 잃지 않게 — `.context/CURRENT.md` 세션 간 상태 보존
  - **TODO**: 할 일을 놓치지 않게 — central memos + project tasks 2-tier

### 초기 서브에이전트 5종 (`da51009`)
- architect, coder, reviewer, researcher, orchestrator
- 모두 `.claude/agents/*.md` thin wrapper 형식

---

## Phase 1 — Vibe-Toolkit + Harness Engineering (2026-03-20, `44b1658`)

**governance/ 신설, 하네스 엔지니어링 정식 도입.**

### 채택된 것
- **Vibe-Toolkit 통합** (`44b1658`)
  - `/vibe` (`717e0bf`, `3f4ff85`): 세션 시작 — 컨텍스트 로드 + 분류 + 즉시 실행
  - `/end` (`0484e80` 이후 "always push"): 세션 종료 — commit + push 자동
- **governance/ 디렉터리 신설** (`44b1658`)
  - `governance/rules/`: claude-code.md, coding-safety.md, sync-and-commit.md, turbo-auto.md, vibe-rules.md
  - `governance/workflows/`: model-switch.md, prjt.md, self-optimization.md, session-end.md, session-start.md, todo.md, vibe.md
  - `governance/skills/`: add-provider, auto-sync, e2e-test, sse-endpoint, upgrade
- **하네스 엔지니어링 템플릿** (`44b1658`)
  - `templates/hooks/` 4종 훅
  - `templates/settings.json` — 훅 설정 표준
  - `docs/11-integration-guide.md`, `docs/12-harness-engineering.md` 신설
- **init.sh 통합 스캐폴드** (`44b1658`)
  - 신규 프로젝트 원클릭 부트스트랩

### 하네스 훅 계층 (docs/12)
> "The model contains the intelligence; the harness makes that intelligence useful."

| 이벤트 | 타이밍 | 주요 용도 | 차단 가능 |
|--------|-------|---------|----------|
| UserPromptSubmit | 사용자 입력 후 | 컨텍스트 주입 | ✗ |
| **PreToolUse** | 도구 실행 전 | 위험 명령 차단, 민감 파일 보호 | ✓ |
| **PostToolUse** | 도구 실행 후 | 빌드 플래그, 검증 | ✗ |
| Stop | 완료 신호 | **빌드 검증 강제** (npm run build) | ✓ |
| Notification | 세션 종료 | 감사 로그 | ✗ |
| SessionStart | 세션 시작 | 환경 준비 | ✗ |
| PreCompact | 압축 전 | 중요 컨텍스트 보호 | ✓ |

- `pre-bash.sh`: 위험 명령 차단 (rm -rf, force push 등)
- `pre-write.sh`: 민감 파일 보호 (.env, credentials)
- `stop-check.sh`: 빌드 검증 강제

---

## Phase 2 — TODO System + 핸드오프 인프라 (2026-03-20, `db9406a` ~ `cf58869`)

- **/pickup 명령어** (`db9406a`): 토큰 소진 후 작업 재개 (수신측 AI가 실행)
- **/handoff vs /pickup 구분 확립**
  - `/handoff`: 계획된 모델 전환 (송신측)
  - `/pickup`: 갑작스런 중단 후 재개 (수신측)
- **2-tier TODO separation** (`2859108`)
  - TODO.md: personal memos only
  - CURRENT.md: project-specific tasks
- **Mobile Development Guide** (`f0cbef1`)
  - `docs/14-mobile-development.md`
  - `scripts/setup-mobile.sh` 크로스플랫폼 체커
- **centralize PRJT and TODO workflows** (`cf58869`)

---

## Phase 3 — Research Mode + Claude Code 신규 기능 (2026-03-21, `575a6db` ~ `0736027`)

- **/re (Research Mode) 명령어** (`575a6db`): 자율 리서치 에이전트
- **/rc (Remote Control) 핸드오버** (`fbc9edb`): 디바이스 간 작업 컨텍스트 이어주기
- **A-Team 최적화** (`0736027`)
  - 미구현 스크립트 구현 완성
  - 플랫폼 호환성 (auto-sync.sh, model-exit.sh)
  - 84 LOC model-exit.sh (핸드오프 자동화)
- **install-commands.sh** (`94980e8`)
  - A-Team → `~/.claude/commands` 전역 동기화
  - cp → symlink 전환 (후일 Phase 6에서)

---

## Phase 4 — 3-Tier Architecture + TDD + MoA (2026-03-22, `3cc4127` ~ `2c0caa3`)

**아키텍처·방법론 체계화.**

### 채택된 것
- **3-Tier Progressive Architecture** (`3cc4127`)
  - NANO (소규모) / STANDARD (중형) / PRO (대규모)
  - 프로젝트 크기별 도구·절차 차등
  - `docs/16-project-tiers.md`
- **통합 매뉴얼 + /vibe 신규 프로젝트 감지** (`12c1a05`)
- **TDD 방법론 통합** (`7e48762`)
  - Red-Green-Refactor 엄수
  - Vitest + Playwright + Superpowers 방법론
  - `/tdd` 커맨드 (`6d6aae8`): 실전 사례 포함
  - `docs/15-tdd-methodology.md`
- **통합 평가 프레임워크 7차원** (`8d11d21`)
  - `docs/17-tools-and-frameworks.md`
  - CrewAI, LangGraph, Superset, Claude Squad, agentmaxxing 비교
- **MoA + Guardrail + Checkpointing 통합** (`2c0caa3`)
  - Mixture of Agents 오케스트레이션
  - Guardrail 품질 게이트
  - Checkpointing 세션 연속성
  - `docs/19-adoption-plan.md`

---

## Phase 5 — gstack 통합 Wave 1-4 (2026-03-23 ~ 03-24)

**외부 gstack 레포 통합, 커맨드 대량 확장.**

### gstack Wave 1 (`62d229d`) — 에이전트 업그레이드 + 4 신규 커맨드
- 상태코드 표준화
- reviewer 2-Pass 방식 도입
- `governance/rules/preamble.md` 108줄 추가
- **4 신규 커맨드**:
  - `/investigate` — 체계적 근본 원인 분석
  - `/ship` — PR 생성 전 완전 검증 파이프라인
  - `/retro` — 엔지니어링 회고
  - `/office-hours` — 아이디어 검증 & 설계 발견

### gstack Wave 2 (`d68ee58`) — 계획 검증 4종 + 보안 감사
- `/autoplan` — 자동 계획 검토 파이프라인
- `/plan-eng` — 엔지니어링 계획 검토
- `/plan-ceo` — CEO 시각 계획 검토
- `/cso` — Chief Security Officer 보안 감사

### gstack Wave 3 (`ea968de`) — 브라우저 자동화
- `/browse` — 브라우저 자동화
- `/qa` — 웹 앱 체계적 QA 테스트

### gstack Wave 4 (`9f7edba`) — 6개 재설계 + careful 훅
- 기존 커맨드 리팩터
- **careful-check.sh** 훅 (114 LOC): 위험 명령 2단계 승인
- `/adversarial` — 적대적 코드 리뷰
- `/craft` — PRO Tier 품질 파이프라인
- `/tdd` — TDD Red-Green-Refactor 루프
- `/doc-sync` — 문서 Drift 감지 & 동기화
- `/benchmark` — 성능 기준선 시스템
- `/land` — 배포 신뢰도 검증 파이프라인

---

## Phase 6 — Infrastructure 강화 (2026-03-25 ~ 26)

- **/ship에 doc-sync 통합 + README 전면 업데이트** (`ee7f689`)
- **USER_GUIDE.md 신규** (`b2af1fa`) — 빠른 참조 가이드
- **lessons-learned index + context-mode MCP** (`a0110c6`)
  - `docs/INDEX.md` + `docs/CONCEPT-INDEX.md`
  - 문제/버그 발생 시 키워드 grep → 해당 문서만 on-demand 로드
  - context-mode MCP로 검색 엔진 내장
- **독립 프로젝트 신원 설정** (`6f1055a`)
  - A-Team 자체의 `CLAUDE.md` + `.context/` 확립
- **누락 커맨드 배포 + orphan 감지 가드** (`45cd5e6`)
- **문서 클린 아키텍처 통합** (22개 → 17개) (`616feec`)
- **Skills 2.0 자율 자동화 + MoE 전략** (`494c9ce`)
  - Mixture of Experts 전략 통합

---

## Phase 7 — Ralph Loop + PIOP + 외부 레포 4개 차용 (2026-03-27 ~ 29)

**자율 반복 개발 프로토콜 확립.**

### Ralph Loop 자율 개발 데몬 (`1cc97d6`)
- **`/ralph start "task" --check "cmd" --max N --budget $N`**
- OS 레벨 백그라운드 프로세스 (`scripts/ralph-daemon.mjs`)
- 완료 판정 가능한 태스크 자동 반복 (Simpsons Ralph Wiggum에서 영감 — "멍청할 정도로 단순하게 끝까지")
- Research → Ralph 파이프라인 연결

### 외부 레포 4개 차용 + PIOP Phase 1 + 14 lib TDD (`eb0726d`, 116 tests)
- **PIOP (Progressive Iterative Optimization Protocol)** 프로토콜 정립
- 외부 4개 레포에서 14개 lib 모듈 차용
- 116 tests (이전 대비 대량 증가)

### PIOP MEDIUM wiring + Ralph Loop 실전 테스트 (`b9162ed`)
- 중급 단계 연동
- Ralph Loop 실전 투입 시작

### formatLearning() (`37de84b`)
- `lib/learnings.ts`에 포맷팅 함수 추가
- 레슨런드 자동 기록 구조화

---

## Phase 8 — bkit 차용 (2026-03-30, `61f6f8d`, 153 tests)

**외부 bkit 레포의 안정성 모듈 4종 통합.**

### 차용된 4개 모듈
| 모듈 | 파일 | 기능 |
|------|-----|------|
| **Circuit Breaker** | `lib/circuit-breaker.ts` | 3-state (closed/open/half_open) 회로 차단기, per-feature 격리, auto-cooldown |
| **State Machine** | `lib/state-machine.ts` | 선언적 FSM (transition table + guard + action, 와일드카드, 히스토리) |
| **Gate Manager** | `lib/gate-manager.ts` | Quality Gate (pass/retry/fail 3-verdict, metric-driven 조건) |
| **Self-Healing** | `lib/self-healing.ts` | 자동 복구 파이프라인 (Error→Fix→Verify 루프, max 5회, escalation) |

### Orchestrator 연결
- `orchestrator.md`에 circuit-breaker + self-healing 연결
- 153 tests 달성 (기존 116 + bkit 37)

---

## Phase 9 — Thin-Wrapper Architecture (2026-04-07, `e123c5b`, 153 tests)

**메인 컨텍스트 90%+ 절감 달성.**

### 9개 신규 서브에이전트 생성
- `cso` (Chief Security Officer)
- `adversarial` (적대적 리뷰)
- `review-pr` (GitHub PR 리뷰)
- `benchmark` (성능 벤치)
- `qa` (QA 테스트)
- `doc-sync` (문서 동기화)
- `autoplan` (자동 계획 검토)
- `tdd` (TDD 루프)
- `guardrail` (품질 자동 체크, Haiku tier-2)

### 9 슬래시 커맨드 thin wrapper 전환
- 기존 3–5KB → **~350B** (메인 컨텍스트 **90%+ 절감**)
- 각 커맨드는 description만 포함, 실제 로직은 subagent에 위임

### 추가 최적화
- `install-commands.sh` cp → symlink 전환 (스킬 목록 중복 제거)
- `vibe.md` Step 0.3 Daily Tip (매일 2개 유용한 명령어 자동 소개)
- Tier 2 guardrail 에이전트 (haiku 모델, 코드 변경 후 품질 자동 체크)
- **자동 트리거링**: `description` 기반 자연어 매칭 → `/command` 없이 자동 라우팅

---

## Phase 10 — UI Auto-Inspect (2026-04-09, `38acac2`, 153 tests)

**시각 검증 파이프라인 자동화. MCP 대비 토큰 93% 절감.**

### 구현
- **`scripts/browser/`** — Playwright CLI 6개 스크립트
  - `snapshot.js`, `diff.js`, `element.js`, `flow.js`, `report.js`, `install.sh`
- **`templates/hooks/pre-ui-capture.sh`** — PreToolUse: UI 파일 수정 전 before 스크린샷 자동
- **`templates/hooks/post-ui-verify.sh`** — PostToolUse: after + 픽셀 diff + 좌표 추출 + additionalContext 주입
- **`.claude/agents/ui-inspector.md`** — UI 진단 전문 에이전트 (Bash+Read, MCP 0 오버헤드)
- **`governance/rules/visual-verification.md`** — 자동 검증 거버넌스
- **`governance/skills/ui-inspect/SKILL.md`** — 스킬 카탈로그 등록

### 효과
- **MCP 대비 토큰 93% 절감** (15,000 → ~1,000 tok/검증)
- Playwright + Chromium 설치, E2E 스크린샷 테스트 PASS
- orchestrator.md에 ui-inspector 라우팅 + UI 복합 태스크 자동 체이닝

---

## Phase 11 — Unified Advisor + Cost Tracking (2026-04-10, `7eb08fc` ~ `de9c77d`)

### Unified Advisor Architecture (`7eb08fc`, 166 tests)
- `advisor_20260301` 통합
- Phase 1+2 → Phase 1-5 확장
- 멀티 advisor tool 통합

### Token Cost Estimation + Pre-Check Skip Gate (`de9c77d`, 171 tests)
- `lib/cost-tracker.ts` 신설
- 비용 초과 시 pre-check 생략 판정
- model-pricing.json 기반 정확한 비용 추정

---

## Phase 12 — Security + PIOP Phase 1-5 (2026-04-11 ~ 12, `497934b` ~ `2f23743`)

### PIOP Phase 1-5 Cross-Module Wiring (`497934b`)
- Cross-module 통합 완료
- Advisor Config Unification

### CSO Audit Remediation 14건 (`eb538f7`, `2f23743`)
- **HIGH**: H01, H02, H03 (3건)
- **MEDIUM**: M01, M02, M03, M04 (4건)
- **LOW**: L02 (1건)
- 기타 6건 추가 패치
- `advisor-breaker-config.json` 단일화 (`2284276`)
- **237 tests 달성**

---

## Phase 13 — Parallel Subagent Rules (2026-04-13, `9dbe256`)

- 서브에이전트 병렬 분기 판단 룰 공식화
- 원칙: TodoWrite 후 독립 작업 4건 이상 시 병렬 고려
- memory에 `feedback_parallel_subagent.md` 기록

---

## Phase 14 — Optimization Research (이번 세션, 2026-04-13 ~ 14)

**14 범주 × ~100 후보 조사, 7 RFC + Wave 1 구현.**

### Research 단계
| 커밋 | 단계 |
|------|-----|
| `aadf13e` | Round 1 — 7 parallel researchers (C1~C7 + A1~A7) |
| `a772f46` | Round 2 — Selection Criteria 필터 (13 PASS, 13 FAIL) + P1-P8 매핑 (22 GREEN, 11 YELLOW, 5 RED) |
| `14ffd5a` | Round 3 — 6 deep-dives (DD-01 ~ DD-06) |
| `ee7fd96` | Round 4 — 7 RFCs (001~007) |
| `0bba418` | Stage 6-7 — Final 4 docs (EXECUTIVE_SUMMARY, INTEGRATION_ROADMAP, PRIORITY_MATRIX, REJECTED) |
| `f308ebf` | Stage 9-10 — Holistic plan + Weekly cron protocol |
| `34fd527` | Adversarial Review 19 findings 반영 |
| `cdb990d` | G7 No Regression Across Versions 신설 |

### Governance 신설 (사건 후속)
- `c6e9388` **ateam-first.md** (Survey Before Invent 원칙)
- `c6e9388` **autonomous-loop.md** (Execute-Before-Describe)
- `349f473` **truth-contract.md** (거짓말 영구 금지)
- Sovereignty 제8원칙 추가

### Wave 1 Implementation
| 커밋 | RFC |
|------|-----|
| `8c83565` | RFC-001 Prompt Caching — `scripts/prompt-cache.mjs` + daemon-utils 연동 + 7 tests |
| `48d8c38` | RFC-003 ToolSearch — `templates/mcp.json.example` + `governance/rules/tool-search.md` |
| `f4694b6` | RFC-004 Classical Tools — `scripts/install-classical-tools.sh` (cross-platform) |
| `2bbecd8` | RFC-004 coder routing + RFC-007 Spotlighting Phase S — `scripts/spotlight.mjs` + 14 tests |
| `0195950` | Bench runner + verify-g7 + Wave 1 estimate (v-baseline dry-run + v-wave-1-estimate) |
| `6e31676` | RESUME_STATE Wave 1 완료 |

### 결과
- **258/258 tests pass** (기존 237 + 신규 21 = 7 prompt-caching + 14 spotlight)
- 모든 RFC opt-in default OFF (regression 0% 보장)
- **Total M1 delta estimate: -48.5%** (실측 전)
- `v-baseline` tag + `v-wave-1-estimate` tag
- G7 verify v-baseline → v-wave-1-estimate: ✓ PASS

---

## 방법론·원칙 통합 인덱스 (알파벳순)

| 방법론/원칙 | Phase | 출처 | 상세 위치 |
|------------|-------|------|-----------|
| **3-Tier Progressive Architecture** | 4 | 자체 | `docs/16-project-tiers.md` |
| **5-Phase Build Methodology** | 0 | HKUDS ClawTeam | `docs/06-build-methodology.md` |
| **7-Dimension Evaluation Framework** | 4 | 자체 | `docs/17-tools-and-frameworks.md` |
| **A-Team First (Survey Before Invent)** | 14 | 자체 (2026-04-14) | `governance/rules/ateam-first.md` |
| **Advisor Architecture (Unified)** | 11 | Anthropic beta | `lib/advisor-breaker-config.json` |
| **Autonomous Loop Contract** | 14 | 자체 (2026-04-14) | `governance/rules/autonomous-loop.md` |
| **bkit 4 Modules** (circuit/FSM/gate/self-heal) | 8 | bkit 외부 레포 | `lib/circuit-breaker.ts` 등 |
| **Budget-Aware Tool Routing** | 14 (RFC-006) | arXiv 2511.17006 | `rfc/RFC-006-cost-routing.md` |
| **careful-check hooks** | 5 | gstack Wave 4 | `templates/hooks/careful-check.sh` |
| **Cascade Routing** (Haiku→Sonnet→Opus) | 14 (RFC-006) | Anthropic 모델 docs | 동일 |
| **Checkpointing** | 4 | MoA 통합 | `governance/rules/checkpointing.md` |
| **ClawTeam Swarm Architecture** | 0 | HKUDS | `docs/architecture.md` (initial) |
| **Context-mode MCP** | 6 | 외부 MCP | `docs/05-mcp-servers.md` |
| **Context Continuity Protocol (CC Mirror)** | 2, 7 | 자체 | `docs/13-context-continuity-protocol.md` |
| **CSO Audit (보안 리메디에이션)** | 12 | OWASP + 자체 | 14건 수정 (`eb538f7`) |
| **Decision Gates (G1–G5)** | 14 | 자체 | `MANIFEST.md` |
| **Earned Integration** | 14 | 자체 | `MANIFEST.md` Meta-Principle |
| **G7 No Regression Across Versions** | 14 | 자체 (2026-04-14) | `MANIFEST.md` + `scripts/verify-g7.mjs` |
| **Guardrail Pattern** | 4, 9 | 자체 + MoA | `.claude/agents/guardrail.md` (Haiku tier-2) |
| **Handoff Compression 5-layer** | 14 (RFC-002) | Multi-agent orchestration guide | Facts/Story/Reasoning/Action/Caution |
| **Handoff vs Pickup Protocol** | 2 | 자체 | `.claude/commands/handoff.md`, `pickup.md` |
| **Harness Engineering** | 1 | Vibe-Toolkit | `docs/12-harness-engineering.md`, 7 hook events |
| **Hooks (PreToolUse/PostToolUse/Stop/...)** | 1, 5, 10 | Claude Code 네이티브 | `templates/hooks/` 4종 + UI Auto-Inspect 2종 |
| **lessons-learned Index System** | 6 | 자체 | `docs/INDEX.md` + `CONCEPT-INDEX.md` |
| **Mirror Sync** | 2 | 자체 | `governance/rules/mirror-sync.md` |
| **MoA (Mixture of Agents)** | 4 | 학술 + 자체 | `docs/19-adoption-plan.md` |
| **MoE (Mixture of Experts)** | 6 | Skills 2.0 | `docs/09-*.md`, `governance/skills/` |
| **Mobile Development Guide** | 2 | 자체 | `docs/14-mobile-development.md`, `setup-mobile.sh` |
| **PIOP Protocol (Progressive Iterative Optimization)** | 7, 11, 12 | 자체 | `PROTOCOL.md` + `governance/` |
| **Prompt Caching (Anthropic)** | 14 (RFC-001) | Anthropic Feb 2026 | `scripts/prompt-cache.mjs` |
| **Protected Assets (P1–P8)** | 14 | 자체 | `MANIFEST.md` |
| **Ralph Loop (Wiggum pattern)** | 7 | 학술 (Ralph Wiggum) + 자체 | `.claude/commands/ralph.md` + `scripts/ralph-daemon.mjs` |
| **ReAct + Reflexion** | 14 (round-1 C4) | 학술 | 기존 Ralph Loop이 변형 |
| **Remote Control (/rc)** | 3 | 자체 | `.claude/commands/rc.md` |
| **Research Mode (/re)** | 3 | 자체 | `.claude/commands/re.md` |
| **reviewer 2-Pass** | 5 | gstack Wave 1 | `.claude/agents/reviewer.md` |
| **Role-Based Tool Whitelist** | 14 (RFC-007) | OWASP ASI Top 10 | 설계 완료, 구현 대기 |
| **Role Partitioning** | 0 | ClawTeam + 자체 | `docs/01-role-partitioning.md` |
| **Selection Criteria (8-AND)** | 14 | 자체 | `MANIFEST.md` |
| **Self-Healing** (bkit) | 8 | bkit | `lib/self-healing.ts` |
| **Sovereignty Model (8 원칙)** | 14 | 자체 (2026-04-14) | `governance/rules/ateam-sovereignty.md` |
| **Spotlighting** (delimiting/datamarking/encoding) | 14 (RFC-007) | Microsoft 2025 논문 | `scripts/spotlight.mjs` |
| **State Machine FSM** | 8 | bkit | `lib/state-machine.ts` |
| **TDD (Red-Green-Refactor)** | 4 | Beck + 자체 | `docs/15-tdd-methodology.md`, `CLAUDE.md` |
| **Thin-Wrapper Architecture** | 9 | 자체 | 9 subagents + ~350B slash commands |
| **Token Cost Estimation** | 11 | 자체 | `lib/cost-tracker.ts` |
| **TODO 2-Tier Separation** | 2 | 자체 | `TODO.md` + `CURRENT.md` |
| **ToolSearch (defer_loading)** | 14 (RFC-003) | Anthropic Feb 2026 | `templates/mcp.json.example` |
| **Truth Contract** | 14 | 자체 (2026-04-14) | `governance/rules/truth-contract.md` |
| **UI Auto-Inspect** | 10 | Playwright + 자체 | `scripts/browser/` + `ui-inspector` agent |
| **Vibe (/vibe) + End (/end)** | 1 | Vibe-Toolkit | `.claude/commands/vibe.md`, `end.md` |
| **Visual Verification governance** | 10 | 자체 | `governance/rules/visual-verification.md` |
| **/adversarial, /craft, /ship, /retro 등 25+ 커맨드** | 5 | gstack + 자체 | `.claude/commands/` |

---

## 외부 레퍼런스 총 인덱스

### 학술 논문 (Phase 14 RFC 기반)
| 논문 | Phase | 영향 |
|------|-------|------|
| **Budget-Aware Tool-Use Enables Effective Agent Scaling** (arXiv 2511.17006) | 14 (RFC-006) | 33% API 비용 절감 검증, PIOP 확장 |
| **Microsoft Spotlighting** (2025) | 14 (RFC-007) | Prompt injection ASR >50% → <2% |
| **AgentPoison** (arXiv 2407.12784) | 14 (A2) | Memory poisoning defense (deferred) |
| **MemoryGraft** (arXiv 2512.16962) | 14 (A2) | 동일 |
| **G-Memory: Hierarchical Memory** (NeurIPS 2025) | 14 (C3) | Stage 9 cognitive daemon 후보 |
| **Collaborative Memory** (arXiv 2505.18279) | 14 (A7) | Multi-user memory sharing (deferred) |
| **Chain-of-Verification** (arXiv 2603.24481) | 14 (C4 Tier 2) | M4 correctness gate 후보 |
| **Terminal-Bench 2.0** (Stanford 2025) | 14 (A5) | Trajectory metrics 참조 |
| **Self-Consistency in LLMs** (arXiv 2203.11171) | 14 (C4 reject) | 18.6× token으로 거부 |
| **HumanEval Pro / MBPP Pro** (ACL'25) | 14 (C4) | DSPy 76.2→96.2% 근거 |

### OSS 레포 (차용·참조)
| 레포 | Phase | 채택 여부 | 채용 방식 |
|------|-------|-----------|-----------|
| **HKUDS ClawTeam** | 0 | ★ 기반 | 아키텍처 전체 흡수 |
| **Vibe-Toolkit** | 1 | ★ 흡수 | /vibe, /end 통합 |
| **gstack** | 5 | ★ Wave 1-4 흡수 | 에이전트 + 15+ 커맨드 + careful 훅 |
| **bkit** | 8 | ★ 4 모듈 흡수 | circuit/FSM/gate/self-heal |
| **Playwright** | 10 | ★ scripts/browser | UI Auto-Inspect 파이프라인 |
| **ripgrep / fd / jq / ast-grep** | 14 (RFC-004) | ✓ Phase 1 install | 옵트인 routing |
| **promptfoo** | 14 (RFC-005) | ✓ RFC 수용 (미구현) | B1-B6 eval gate |
| **Langfuse** | 14 (RFC-005) | ✓ RFC 수용 (미구현) | OTEL observability |
| **OpenHands SDK V1** | 14 (C7) | ∅ 패턴만 차용 | Event-sourcing 영감 |
| **Cline / Roo Code** | 14 (C7) | ∅ 패턴만 차용 | Diff-based editing 영감 |
| **BMAD** | 14 (C7) | ∅ edge case | Sprint/architecture gate |
| **SWE-agent** | 14 (C7) | ∅ edge case | Atomic diff operators |
| **SuperClaude** | 14 (C7) | ∅ edge case | Cognitive persona |

### 거부 후보 (REJECTED.md 참조)
- **Agno** (MPL copyleft, P6 Sovereignty 위반)
- **Letta/MemGPT** (P1 thin-wrapper 대체 위협)
- **Mem0** (Cloud SaaS, P6 위반)
- **Braintrust / LangSmith / Phoenix / Helicone / Datadog** (SaaS-only cluster)
- **Self-Consistency** (18.6× token)
- **Tree of Thoughts** (context bloat)
- **AutoGen 0.4 / Swarm** (deprecated upstream)
- **Pydantic-AI** (Python 전용, A-Team TS 비호환)

---

## 메트릭 진화 (Tests & Context 절감)

| Phase | Tests | 주요 지표 | 커밋 |
|-------|-------|---------|------|
| 0 (Foundation) | 0 | 레퍼런스 문서만 | `f369adb` |
| 4 (3-Tier/TDD) | (초기) | Tier 기준 신설 | `3cc4127` |
| 7 (PIOP Phase 1) | 116 | 외부 4 레포 lib TDD | `eb0726d` |
| 8 (bkit 통합) | **153** | +37 bkit 모듈 tests | `61f6f8d` |
| 9 (Thin-wrapper) | 153 | **메인 컨텍스트 90%+ 절감** | `e123c5b` |
| 10 (UI Auto-Inspect) | 153 | **MCP 대비 토큰 93% 절감** | `38acac2` |
| 11 (Unified Advisor) | 166→171 | Token cost estimation | `de9c77d` |
| 12 (PIOP Phase 1-5) | **237** | Cross-module + 14건 보안 수정 | `2f23743` |
| 14 (RFC-001 구현) | 244 | +7 prompt-caching | `8c83565` |
| 14 (RFC-007 구현) | 258 | +14 spotlight | `2bbecd8` |
| 14 (Wave 1 estimate) | 258 | **Total M1 delta -48.5%** (추정) | `0195950` |

---

## 거버넌스 파일 진화

### Phase 0-1 (초기)
- `PROTOCOL.md`, `README.md`, `TODO.md`, `HANDOVER_OPUS.md`
- `docs/01~12-*.md` — 방법론별 문서

### Phase 1-3 (governance/ 신설)
- `governance/rules/claude-code.md`, `coding-safety.md`, `sync-and-commit.md`, `turbo-auto.md`, `vibe-rules.md`
- `governance/rules/preamble.md` (Phase 5 gstack)
- `governance/rules/mirror-sync.md` (Phase 2)
- `governance/rules/checkpointing.md`
- `governance/rules/guardrails.md`
- `governance/workflows/` 7종

### Phase 10 (UI Auto-Inspect)
- `governance/rules/visual-verification.md`
- `governance/skills/ui-inspect/SKILL.md`

### Phase 14 (이번 세션)
- `governance/rules/ateam-sovereignty.md` — 제8원칙 추가
- `governance/rules/ateam-first.md` — Survey Before Invent
- `governance/rules/autonomous-loop.md` — 자율 루프 계약
- `governance/rules/truth-contract.md` — 거짓말 영구 금지
- `governance/rules/tool-search.md` — RFC-003 ToolSearch 정책
- `governance/workflows/eternal-growth.md` — Weekly auto-research

---

## 스킬(Skills) 카탈로그 진화

Phase 1 (`44b1658`) 초기 5종:
- `add-provider`, `auto-sync`, `e2e-test`, `sse-endpoint`, `upgrade`

Phase 5 (gstack Wave 1-4)에서 커맨드 연계 스킬 대량 추가.

Phase 10 (UI Auto-Inspect):
- `ui-inspect`

Phase 14 (미래):
- `review` (ast-grep, Phase 2)

현재 총 스킬 수: `ls ~/tools/A-Team/governance/skills/` 로 확인 가능.

---

## 2026-04-14 구조적 실패 2건 (Phase 14)

### 사건 1: Ralph 모드 오해석
- 사용자 "리서치+랄프 모드로 밤새 조사해"
- Claude: `/ralph` 슬래시 커맨드 + `scripts/ralph-daemon.mjs` 존재 **미확인**
- Ralph Loop를 일반 Ralph Wiggum 패턴으로 해석, ScheduleWakeup 발명
- → **Phase 14 A-Team First 원칙 신설** (Survey Before Invent)

### 사건 2: 자율 루프 끊김
- 사용자 "풀자동으로해 나 잘거야" 확약 후 Claude 확약
- Claude: 7 RFC 저장 후 commit/push/wakeup을 **말로만 예고**, tool call 누락
- 자율 루프 정지, 사용자 수면 중 작업 멈춤
- → **Phase 14 Truth Contract + Autonomous Loop Contract 신설**

**공통 원인**: 말과 실행의 괴리, 기존 자원 미확인. 이후 구조적 방어 장치 3개 영구 박음 (`governance/rules/` + 전역 memory).

---

## 읽기 순서 권장

### 신규 기여자용
1. `README.md` — A-Team 개요
2. `docs/INDEX.md` — 레슨런드 인덱스 (on-demand 로드)
3. `PROTOCOL.md` — 핵심 프로토콜
4. `docs/11-integration-guide.md` — 통합 가이드
5. `docs/12-harness-engineering.md` — 하네스 철학
6. `governance/rules/ateam-sovereignty.md` — 8원칙 (**필독**)
7. `governance/rules/truth-contract.md` — 거짓말 금지 (**필독**)
8. `USER_GUIDE.md` — 빠른 참조
9. 본 문서 (HISTORY.md) — 진화 과정 이해

### Phase 14 이해용
1. `docs/research/2026-04-optimization/MANIFEST.md` — 원칙
2. `docs/research/2026-04-optimization/final/EXECUTIVE_SUMMARY.md` — 요약
3. `docs/research/2026-04-optimization/final/INTEGRATION_ROADMAP.md` — Wave 1-3
4. `docs/research/2026-04-optimization/rfc/RFC-00*.md` — 7 RFC
5. `docs/research/2026-04-optimization/final/ADVERSARIAL_REVIEW.md` — 비판적 검토

---

## 유지 관리 원칙

- 매 **Phase 또는 Wave 완료 후** 본 HISTORY.md에 새 섹션 append
- Weekly Auto-Research (Stage 10) 실행 시 자동 갱신 고려
- **제거하지 않음**: 거부된 후보도 재평가 트리거와 함께 보존
- 커밋 해시 검증 가능 상태 유지 — 주장은 git log로 증명 가능해야 함 (Truth Contract 준수)

---

**Last updated**: 2026-04-14 (Phase 14 Wave 1 implementation 기준)
**Maintenance**: 매 Wave/Phase 완료 후 append. 거버넌스 변경 시 즉시 반영.
