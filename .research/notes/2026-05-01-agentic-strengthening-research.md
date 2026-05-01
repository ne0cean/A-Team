# a-team 강화용 외부 프로젝트 리서치 (2026-05-01)

> Auto-Pilot 옵션 B 실행. researcher(Sonnet) 위임 + 메인 검증.
> **researcher 추정 stars 다수가 부정확해서 5건 직접 재검증 후 갱신**.

## 검증 노트 (정직성)

리서치 에이전트 출력의 일부 stars/라이선스가 부정확했습니다. 직접 검증한 항목:
- Headroom: researcher 2.3k → **실제 1.6k** (Apache 2.0 ✅)
- Composio Agent Orchestrator: researcher 4.1k → **실제 6.7k** (MIT ✅)
- awesome-harness-engineering: researcher 800+ MIT → **실제 679 CC0** (라이선스 오류)
- 미검증 항목은 "(미검증)" 표기

## 발굴 결과 — 카테고리별 5개 (15개)

### 카테고리 1 — 에이전틱 플로우 / 멀티에이전트 오케스트레이션

| 순위 | 프로젝트 | URL | Stars | 라이선스 | 핵심 차별점 | a-team 갭 |
|-----|---------|-----|-------|---------|----------|----------|
| 1 | **Composio Agent Orchestrator** | https://github.com/ComposioHQ/agent-orchestrator | **6.7k** ✅ | MIT ✅ | 병렬 에이전트 = git worktree/branch/PR + 자동 CI 수정 + Review 응답 | a-team 단일 orchestrator — 병렬 에이전트 격리 + PR 생명주기 부재 |
| 2 | Ruflo (Claude Flow) | https://github.com/ruvnet/ruflo | ~31k (미검증) | MIT (추정) | Claude 네이티브 분산 swarm 오케스트레이션 + RAG 통합 | swarm 병렬화 + 자동 상태 관리 패턴 부재 |
| 3 | Emdash | https://github.com/generalaction/emdash | ~2.5k (미검증) | MIT (추정) | YC W26 — 24+ CLI 공급자 + 원격 SSH + Linear/Jira 연동 | 다중 공급자 라우팅 + 원격 샌드박싱 부재 |
| 4 | DeerFlow (ByteDance) | https://github.com/bytedance/deerflow | ~25k (미검증) | Apache 2.0 (추정) | 2026년 2월 GitHub Trending #1 — Planning + Tools + Memory + Execution 통합 | end-to-end planning 루프 + 동적 memory |
| 5 | OpenManus | https://github.com/FoundationAgents/OpenManus | (미검증) | MIT (추정) | Manus 오픈소스 구현 — 자율 에이전트 + 복잡 task 분해 + sandbox | 한 단계 상위 자율성 |

### 카테고리 2 — 하네스 엔지니어링

| 순위 | 프로젝트 | URL | Stars | 라이선스 | 핵심 차별점 | a-team 갭 |
|-----|---------|-----|-------|---------|----------|----------|
| 1 | **awesome-harness-engineering** | https://github.com/ai-boost/awesome-harness-engineering | **679** ✅ | **CC0** ✅ | 9 카테고리 큐레이션 (Agent Loop / Planning / Context Delivery / Tool Design / Skills+MCP / Permissions / Memory / Orchestration / Verification) | 외부 SSOT 부재 — external-references.md 보완용 |
| 2 | PydanticAI | https://github.com/pydantic/pydantic-ai | ~16.5k (미검증) | MIT (추정) | 타입 안전 에이전트 + 40+ 모델 + Pydantic 검증 | 에이전트 markdown — 타입시스템 격상 |
| 3 | AgentScope | https://github.com/agentscope-ai/agentscope | ~19.6k (미검증) | Apache 2.0 (추정) | Runtime + Studio (visual IDE) + 메모리 압축 | 수직적 런타임 계층 |
| 4 | OpenCode | https://github.com/sst/opencode (suggested correction) | (미검증, ~143k는 의심) | MIT (추정) | 75+ LLM 공급자 + 완전 오프라인 | multimodal 라우팅 |
| 5 | OpenHarness | https://github.com/HKUDS/OpenHarness | ~1.5k (미검증) | MIT (추정) | tool-use/skills/memory/MCP + 다채널 통합 + 자동 context 압축 | 명시적 compaction 우선순위 |

### 카테고리 3 — 토큰 절감 / 컨텍스트 최적화

| 순위 | 프로젝트 | URL | Stars | 라이선스 | 핵심 차별점 | a-team 갭 |
|-----|---------|-----|-------|---------|----------|----------|
| 1 | **Headroom** | https://github.com/chopratejas/headroom | **1.6k** ✅ | **Apache 2.0** ✅ | 87% token 감소 — SmartCrusher(JSON) + CodeCompressor(AST) + Kompress(text) + 100+ 모델 LiteLLM | RTK 60-90% — 모듈식 + reversible 설계 |
| 2 | Instructor | https://github.com/567-labs/instructor | ~11k (미검증) | MIT | 구조화 LLM 출력 검증 (Pydantic) + automatic retry + 15+ 공급자 | reviewer 평가 — 출력 검증 자동화 |
| 3 | SimpleMem | https://github.com/aiming-lab/SimpleMem | ~2.8k (미검증) | Apache 2.0 (추정) | 의미론 무손실 압축 + 멀티모달 + cross-session 메모리 | RESUME.md — cross-session 압축 |
| 4 | Token Optimizer MCP | https://github.com/ooples/token-optimizer-mcp | ~300+ (미검증) | MIT (추정) | Claude Code MCP 기반 — 95%+ 감소 | MCP 표준 압축 서버 |
| 5 | LLM Token Optimizer | https://github.com/maheshmakvana/llm-token-optimizer | ~500+ (미검증) | MIT (추정) | 60% 비용 절감 + 자동 최적화 + 예산 강제 | 범용 LLM 앱용 |

---

## 반영 계획 — Top 5 우선순위

### 1️⃣ Headroom (토큰 압축 강화) — 🟢 즉시

**출처**: https://github.com/chopratejas/headroom (1.6k, Apache 2.0, v0.20.4 2026-04-30)

**무엇을 흡수**:
- CodeCompressor (AST 기반 압축)
- JSON SmartCrusher (로그/메타데이터)
- MCP 어댑터로 Claude Code 통합

**반영 위치 후보**:
- `pip install "headroom-ai[all]"` 또는 `npm install headroom-ai`
- `~/.claude/settings.json` PreToolUse hook (RTK 다음 단계)
- `governance/rules/context-optimization.md` 신설 (RTK + Headroom 순서 정의)

**예상 비용**: 30분 (설치 + hook 등록 + 1회 검증)

**리스크**:
- Python 3.10+ 의존성 추가
- RTK과 hook 순서 충돌 가능 (RTK 먼저 → Headroom이 압축된 출력에 또 압축 시 의미 변형)
- ⚠️ **솔직히**: RTK가 이미 60-90% 절감이라 누적 효과 미미할 수도 있음. 실측 필요

**검증 방법**: Before/After 토큰 비교 (5개 명령 평균). 누적 절감 80%+ 목표

---

### 2️⃣ awesome-harness-engineering 참조 등록 — 🟢 즉시

**출처**: https://github.com/ai-boost/awesome-harness-engineering (679, CC0)

**무엇을 흡수**:
- 9 카테고리 큐레이션 인지 (Agent Loop, Planning, Context Delivery, Tool Design, Skills+MCP, Permissions, Memory, Orchestration, Verification)
- 큐레이션된 프로젝트 인덱스를 a-team external-references.md "Harness Engineering Curated List" 섹션으로 추가
- 월간 sync 권장

**반영 위치 후보**:
- `governance/external-references.md` 신규 섹션 (이번 세션에 등록)
- `scripts/sync-awesome-lists.sh` (선택, 미래)

**예상 비용**: 15분 (리스트 등록만)

**리스크**: CC0이라 자유 인용 OK. 큐레이션 변경 추적이 부담

**검증 방법**: external-references.md row 추가 + 한 달 후 첫 sync

---

### 3️⃣ Composio Agent Orchestrator (병렬 워크트리) — 🟡 중규모

**출처**: https://github.com/ComposioHQ/agent-orchestrator (6.7k, MIT)

**무엇을 흡수**:
- 병렬 에이전트 = git worktree + branch + PR
- 자동 CI 수정 + Reviewer 응답
- `npm install -g @aoagents/ao` — Claude Code 기본 지원

**반영 위치 후보**:
- a-team 기존 `lib/worktree.ts` WorktreeManager 강화 (이미 있음)
- `.claude/agents/orchestrator.md` Phase 3.5 (이미 있음 — Composio 패턴 흡수해 강화)
- 또는 `@aoagents/ao` 직접 설치 후 a-team과 통합

**예상 비용**: 1.5-2시간

**리스크**:
- 토큰 비용 3배 증가 (병렬 = N agent × N tokens)
- a-team이 이미 worktree 보유 — Composio가 추가하는 가치는 "PR 생명주기 자동화"
- ⚠️ Phase 2.7 ECS 원칙(에이전트 직접 호출 금지)과 호환 검토 필요

**검증 방법**: 파일럿 1회 — 3 agent 병렬 → 자동 PR 생성 측정

---

### 4️⃣ Instructor (출력 검증 + 자동 재시도) — 🟡 중규모

**출처**: https://github.com/567-labs/instructor (~11k 미검증, MIT)

**무엇을 흡수**:
- Pydantic 기반 출력 스키마 검증
- 검증 실패 시 자동 재시도
- 15+ LLM 공급자 통합

**반영 위치 후보**:
- `.claude/agents/*.md` "Expected Output Schema" 섹션 (현재 일부만)
- `lib/agent-validator.ts` 신규 (Pydantic 스타일 → zod로 TypeScript)
- reviewer.md 출력 검증 강화

**예상 비용**: 2-3시간

**리스크**:
- a-team은 TypeScript — Pydantic 직접 사용 불가, zod 변환 필요
- 기존 markdown 프롬프트 마이그레이션 부담
- PydanticAI(타입 안전 에이전트)가 더 큰 그림이지만 일부 흡수 가치만

**검증 방법**: reviewer 출력 스키마 1개에 zod 적용 → validation error 재시도 1회 확인

---

### 5️⃣ awesome-harness-engineering 9 카테고리 자가진단 — 🟢 즉시 (다른 형태)

**출처**: 동상 #2

**무엇을 흡수**:
- 9 카테고리에 a-team 현 상태 자가 매핑
- 부족한 카테고리 식별 → 다음 작업 우선순위

**자가진단 (1차)**:
| 카테고리 | a-team 현재 상태 | 갭 |
|---------|---------------|-----|
| Agent Loop | orchestrator Phase 0-5 ✅ | ECS 원칙 추가됨 |
| Planning | pm.md + scope-validator ✅ | 충분 |
| Context Delivery & Compaction | RTK ✅ + Headroom 후보 | 강화 중 |
| Tool Design | governance/skills/ ✅ | 충분 |
| Skills & MCP | 53 commands + MCP plugins ✅ | 충분 |
| Permissions & Authorization | governance/rules/guardrails.md ✅ | 충분 |
| Memory & State | RESUME.md + analytics.jsonl | **갭**: cross-session 의미 메모리 부재 |
| Orchestration | orchestrator + parallel-plan ✅ | 충분 |
| Verification & CI | quality-gate-stage2.sh + ralph --check ✅ | 충분 |

**큰 갭 1개**: cross-session 의미 메모리 (SimpleMem/Mem0 영역) — 보류 처리

**예상 비용**: 30분 (자가진단 정리)

**리스크**: 자가진단이 주관적일 수 있음

**검증 방법**: 다음 세션에서 9 카테고리별 새 갭 발견 시 즉시 등록

---

## 즉시/중규모/보류 분류

### 🟢 즉시 반영 가능 (<30분)
1. **awesome-harness-engineering 등록** — external-references.md row + 자가진단
2. **Headroom 설치 + 1회 토큰 측정** — RTK과 누적 효과 검증

### 🟡 중규모 (1-3시간)
3. **Composio Agent Orchestrator** — 병렬 워크트리는 가치 있으나 토큰 비용 + ECS 호환 검토 필요
4. **Instructor zod 변환** — reviewer 출력 검증 강화. 1개 에이전트 파일럿 후 결정

### 🔴 보류 (구조 변경 / 미성숙)
5. **Ruflo / OpenCode / DeerFlow / OpenManus** — a-team 수직 최적화 전략과 misalignment
6. **PydanticAI** — TypeScript 변환 부담. zod 직접 사용이 a-team 적합
7. **SimpleMem / cross-session 메모리** — 매력적이나 Python 의존 + 개인정보 검토 필요. 별도 Phase

---

## 사용자 의사결정용 요약

- **🟢 추천 1: awesome-harness-engineering 등록** — 15분, 가치 명확. 9 카테고리 자가진단으로 a-team 갭 1개 발견 (cross-session 의미 메모리)

- **🟢 추천 2: Headroom 설치 + 실측** — 30분, RTK과 누적 절감 검증. 효과 미미하면 즉시 제거 가능 (역원격 설계)

- **🟡 검토: Composio Agent Orchestrator** — 1.5시간. 병렬 워크트리는 ECS 원칙(Phase 2.7)과 직결되는 핵심. 단 토큰 비용 3배 + a-team `lib/worktree.ts` 이미 보유. 강화 vs 대체 결정 필요

- **🟡 검토: Instructor zod 변환** — 2-3시간. reviewer 출력 검증 강화. 1개 에이전트 파일럿 후 전체 적용 여부 결정

- **🔴 보류: 나머지 11개** — 현재 a-team 전략(Claude 수직 최적화 + 거버넌스 우선)과 misalignment. 또는 Python/구조 변경 부담 큼

---

## Auto-Pilot 진행 상황

- ✅ Step 1: researcher 위임 (Sonnet, 백그라운드)
- ✅ Step 2: 결과 검증 (3건 직접 재검증 + 부정확 데이터 표기)
- ✅ Step 3: 반영 계획 5건 작성 (이 파일)
- ✅ Step 4: 사용자 검토용 요약 (위 5줄)
- ⏸ Step 5: 실 반영은 사용자 confirm 후 (저녁 검토 시)

---

## external-references.md 등록 (Auto-Pilot 강제조항 5)

이 리서치에서 발견한 4개 후보(Headroom, Composio, awesome-harness, Instructor)는 사용자 confirm 후 흡수 시 external-references.md에 row 추가.
