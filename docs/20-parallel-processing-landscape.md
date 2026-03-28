# 20. 병렬 처리 도구 & 프로젝트 종합 가이드 (2026-03)

> **목적**: 서브에이전트, 멀티에이전트, 스웜, 오케스트레이션 등 병렬 처리에 관한 2026년 현 시점의 모든 주요 도구/프로젝트/패턴을 체계적으로 정리하고, 개발 케이스별 최적 선택지를 제시한다.

---

## 1. 전체 분류 체계 (Taxonomy)

```
병렬 처리 도구
├── Tier 1: Claude Code 네이티브
│   ├── Task tool (서브에이전트)
│   ├── Claude Code Agent Teams (실험적)
│   └── A-Team Orchestrator (PARALLEL_PLAN.md)
│
├── Tier 2: 터미널/워크트리 오케스트레이터
│   ├── Claude Squad (tmux 멀티플렉서)
│   ├── Superset IDE (git worktree 기반)
│   ├── Agent Orchestrator — ComposioHQ (CI/PR 자동화)
│   ├── Multiclaude (auto-merge CI-gated)
│   ├── Gas Town (mayor 에이전트 계층)
│   └── CAO / Mato (경량 tmux 관리)
│
├── Tier 3: 프레임워크 레벨
│   ├── CrewAI (역할 기반 에이전트 팀)
│   ├── LangGraph (상태 그래프 + 체크포인팅)
│   ├── OpenAI Agents SDK (경량 핸드오프)
│   ├── Swarms (MoA + 스웜 패턴)
│   ├── MetaGPT (SOP 기반)
│   └── smolagents (HuggingFace 경량)
│
├── Tier 4: 샌드박스/플래닝 도구
│   ├── OpenHands (Docker 샌드박스 에이전트)
│   └── Plandex (plan-implement-review CLI)
│
└── Tier 5: MCP 인프라
    ├── mcp-memory-server (공유 메모리)
    ├── Context Mode (98% 컨텍스트 압축)
    ├── Network-AI (Atomic LockedBlackboard)
    └── Magg (메타-MCP 자율 발견)
```

---

## 1.5. 2축 분류 체계: 조율 방식 × 격리 수준

Tier 기반 분류가 **도구 레벨**을 구분한다면, 2축 분류는 **작업 방식**을 구분한다.

### 축 1: 조율 방식 (Coordination)

| 방식 | 설명 | Tier 1 예시 | Tier 2-5 예시 |
|------|------|------------|--------------|
| 중앙 집중 | 오케스트레이터가 모든 에이전트 통제 | A-Team orchestrator | CrewAI, LangGraph |
| 위임 | 상위 플래너 → 하위 자율 실행 | Agent Teams | Gas Town, 계층형 |
| 동등 | 에이전트 간 직접 핸드오프 | — | Swarms MoA, OpenAI handoff |
| 인간 개입 | 사람이 핵심 결정점에 개입 | PARALLEL_PLAN 리뷰 | 모든 패턴에 오버레이 |

### 축 2: 격리 수준 (Isolation)

| 수준 | 충돌 위험 | 오버헤드 | 도구 예시 |
|------|----------|---------|----------|
| 컨텍스트 | 높음 | 최소 | Task tool 세션 분리 |
| 파일소유권 | 중간 | 낮음 | PARALLEL_PLAN.md 소유권 선언 |
| 워크트리 | 낮음 | 중간 | Superset, Claude Squad, git worktree |
| 컨테이너 | 없음 | 높음 | OpenHands Docker 샌드박스 |

### 6가지 실전 패턴

| # | 패턴명 | 조율 × 격리 | 에이전트 수 | 적합한 경우 |
|---|--------|------------|-----------|-----------|
| ❶ | 기본형 | 중앙 × 컨텍스트 | 1-2 | 단순 병렬 (리서치 + 구현) |
| ❷ | A-Team형 | 중앙 × 파일소유권 | 3-5 | 일반 개발 스프린트 |
| ❸ | 배치형 | 중앙 × 워크트리 | 5+ | 대규모 리팩토링 |
| ❹ | 팀형 | 위임 × 워크트리 | 5+ | 장기 프로젝트 |
| ❺ | 스웜형 | 동등 × 워크트리 | 3+ | 설계 결정, 아키텍처 선택 |
| ❻ | 샌드박스형 | 동등 × 컨테이너 | 1+ | 보안 테스트, 신뢰 불가 코드 |

### 실전 선택 플로우

```
요청 수신 → 에이전트 수 예측 + 작업 유형 판별
│
├─ 1-2개 + 독립 → ❶ 기본형
├─ 3-5개 + 파일 분리 가능 → ❷ A-Team형
├─ 5+ 또는 파일 충돌 → ❸ 배치형
├─ 장기 + 위임 → ❹ 팀형
├─ 설계 결정 / 비교 → ❺ 스웜형
└─ 보안 / 샌드박스 필요 → ❻ 샌드박스형
```

> **참조**: orchestrator.md Phase 2.0에서 이 플로우를 자동 실행하여 패턴을 선택하고, PARALLEL_PLAN.md 상단에 기록한다.

---

## 2. Tier 1: Claude Code 네이티브 도구

### 2.1 Task Tool (서브에이전트)

| 항목 | 내용 |
|------|------|
| **유형** | Claude Code 내장 |
| **설치** | 불필요 (기본 제공) |
| **병렬 수** | 실용적 한계 3-5개 |
| **격리** | 세션별 독립 컨텍스트 |
| **토큰 효율** | ★★★★★ (구조화 요약만 전달) |

- **동작**: 메인 에이전트가 `Task` 도구로 서브에이전트 스폰 → 독립 세션에서 실행 → 결과 JSON 반환
- **장점**: 외부 의존성 0, 즉시 사용 가능, 세션 격리로 토큰 오버헤드 최소
- **한계**: 에이전트 간 직접 통신 불가 (모두 메인 경유), 파일 충돌 관리 수동
- **A-Team 활용**: orchestrator가 Task tool로 researcher/coder/reviewer 스폰

### 2.2 Claude Code Agent Teams (실험적)

| 항목 | 내용 |
|------|------|
| **유형** | Anthropic 실험 기능 |
| **출시** | 2026-02 (Opus 4.6과 함께) |
| **GitHub Stars** | N/A (내장 기능) |
| **상태** | 실험적 — 프로덕션 미권장 |

- **동작**: `TeammateTool`로 팀원 에이전트 정의 → tmux pane에서 병렬 실행 → 결과 자동 수집
- **특징**: Claude Code에 내장된 공식 멀티에이전트, tmux 기반 시각화
- **한계**: 아직 실험 단계, 문서 부족, 커스터마이징 제한
- **A-Team 관계**: 성숙 시 orchestrator의 실행 백엔드로 활용 가능

### 2.3 A-Team Orchestrator (PARALLEL_PLAN.md 기반)

| 항목 | 내용 |
|------|------|
| **유형** | A-Team 네이티브 구현 |
| **파일** | `.claude/agents/orchestrator.md` |
| **패턴** | Supervisor + MoA (선택적) |
| **파일 소유권** | ★★★★★ (PARALLEL_PLAN.md 명시) |
| **토큰 효율** | ★★★★★ (O(1) 컨텍스트) |

- **동작**: Phase 0(거버넌스) → Phase 1(컨텍스트) → Phase 2(분해) → Phase 3(계획) → Phase 4(실행) → Phase 5(취합)
- **강점**: 명시적 파일 소유권, 3-tier Guardrail, 체크포인팅, MoA 모드
- **한계**: 수동 PARALLEL_PLAN.md 작성 필요 (자동화 대비 5-10분 추가)

---

## 3. Tier 2: 터미널/워크트리 오케스트레이터

### 3.1 Superset IDE

| 항목 | 내용 |
|------|------|
| **GitHub** | superset-ai/superset (3,285+ stars) |
| **언어** | TypeScript |
| **핵심 기술** | Git worktree 기반 병렬 |
| **병렬 수** | 10+ 에이전트 동시 |
| **라이선스** | Apache 2.0 |

- **동작**: 각 에이전트에 별도 git worktree 할당 → 독립 브랜치에서 작업 → auto-merge
- **장점**: 파일 충돌 원천 차단 (worktree 격리), 대규모 병렬화, GUI 제공
- **한계**: IDE 종속 (VS Code 확장), 프로젝트 크기에 따라 worktree 오버헤드
- **적합 케이스**: 대규모 리팩토링, 10+ 파일 동시 수정, CI 파이프라인 통합

### 3.2 Claude Squad

| 항목 | 내용 |
|------|------|
| **GitHub** | smtg-ai/claude-squad |
| **언어** | Go |
| **핵심 기술** | tmux 세션 멀티플렉싱 |
| **병렬 수** | 5-7개 권장 |
| **호환** | Claude Code, Codex, Aider, 기타 CLI |

- **동작**: tmux 세션별로 독립 에이전트 실행 → TUI 대시보드로 모니터링 → git worktree로 격리
- **장점**: 에이전트 종류 무관 (Claude/GPT/Codex 혼용 가능), 실시간 모니터링
- **한계**: tmux 의존, macOS/Linux만, 에이전트 간 조율 로직 없음
- **적합 케이스**: 독립적인 다수 태스크 병렬 실행, 다중 AI 도구 혼용

### 3.3 Agent Orchestrator (ComposioHQ)

| 항목 | 내용 |
|------|------|
| **GitHub** | ComposioHQ/agent-orchestrator |
| **언어** | TypeScript (43K+ lines) |
| **병렬 수** | 최대 30개 동시 |
| **특징** | CI/PR 자동화 내장 |

- **동작**: GitHub 이슈 → 자동 브랜치 생성 → 에이전트 할당 → PR 생성 → CI 검증
- **장점**: GitHub 워크플로우 완전 통합, 대규모 배치 처리, 자동 PR 생성
- **한계**: GitHub 종속, TypeScript 런타임 필요, 설정 복잡
- **적합 케이스**: 이슈 기반 자동 구현, 대규모 마이그레이션, CI 게이트 필수 프로젝트

### 3.4 Multiclaude

| 항목 | 내용 |
|------|------|
| **유형** | Auto-merge 오케스트레이터 |
| **핵심** | CI-gated PR 워크플로우 |
| **병렬 수** | 5-10개 |

- **동작**: 태스크별 브랜치 자동 생성 → Claude Code 실행 → PR → CI 통과 시 auto-merge
- **장점**: 완전 자동 merge 파이프라인, CI 게이트로 품질 보장
- **한계**: merge conflict 자동 해결 미흡, 설정 학습곡선
- **적합 케이스**: CI/CD 파이프라인 있는 프로젝트, 독립 기능 대량 구현

### 3.5 Gas Town

| 항목 | 내용 |
|------|------|
| **유형** | 멀티에이전트 워크스페이스 관리자 |
| **핵심** | "Mayor" 에이전트 계층 구조 |

- **동작**: Mayor(시장) 에이전트가 전체 조율 → Worker 에이전트에게 태스크 위임
- **장점**: 계층적 조율, 컨텍스트 관리 내장
- **한계**: 커뮤니티 규모 작음, 문서 부족
- **적합 케이스**: 에이전트 3-5개 중규모 프로젝트

### 3.6 CAO / Mato (경량 tmux)

| 항목 | CAO | Mato |
|------|-----|------|
| **핵심** | tmux 자동 분기/관리 | tmux 탭별 상태 시각화 |
| **장점** | 경량 Python, 자동 세션 분기 | 실시간 모니터링 |
| **한계** | 체크포인팅 없음, 거버넌스 없음 | 오케스트레이션 로직 없음 |
| **결론** | A-Team보다 기능 열위 | 부보조 시각화 도구만 가치 |

---

## 4. Tier 3: 프레임워크 레벨

### 비교 매트릭스

| 프레임워크 | 언어 | 토큰 효율 | 복원력 | 거버넌스 | 학습곡선 | A-Team 호환 |
|-----------|------|----------|--------|---------|---------|------------|
| **CrewAI** | Python | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | 패턴 차용 |
| **LangGraph** | Python | ★★★☆☆ | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ | MCP 연동 |
| **OpenAI SDK** | Python | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★★☆ | 패턴 차용 완료 |
| **Swarms** | Python | ★★☆☆☆ | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ | MoA 패턴 차용 |
| **MetaGPT** | Python | ★★★☆☆ | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ | SOP 패턴 차용 |
| **smolagents** | Python | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ | ★★★★★ | 참고용 |

### 각 프레임워크의 핵심 차용 포인트

- **CrewAI**: 역할 기반 에이전트 팀 구성 → A-Team이 이미 6가지 에이전트로 구현
- **LangGraph**: 상태 그래프 + SQLite 체크포인팅 → A-Team은 파일 기반으로 경량 구현
- **OpenAI Agents SDK**: 3-tier Guardrail + handoff() → A-Team이 guardrails.md로 구현 완료
- **Swarms**: MixtureOfAgents 패턴 → A-Team orchestrator MoA 모드로 네이티브 구현
- **MetaGPT**: SOP (Standard Operating Procedure) → A-Team docs/08 패턴 5로 문서화

---

## 5. Tier 4: 샌드박스/플래닝 도구

### OpenHands vs Plandex vs A-Team

| 측면 | OpenHands | Plandex | A-Team |
|------|-----------|---------|--------|
| **GitHub Stars** | 69.9K | 15.2K | — |
| **실행 모델** | Docker 샌드박스 | cumulative diff | Task tool 세션 |
| **언어** | Python + TS | Go | Markdown/JSON |
| **토큰 비용** | 3-10x | 2-3x | 1-1.5x |
| **에이전트 조율** | peer-to-peer | 단일 AI | Supervisor DAG |
| **파일 소유권** | 없음 | 없음 | 명시적 |
| **품질 보증** | 없음 | 사용자 승인 | reviewer 에이전트 |
| **외부 의존성** | Python + Docker | Go binary | 없음 |
| **대규모 프로젝트** | 우수 | 우수 (tree-sitter) | 중간 |

**결론**: A-Team이 토큰 효율·거버넌스·자동화에서 우수. OpenHands/Plandex는 패턴만 참고.

**차용 가능 아이디어**:
- OpenHands → 에이전트 레지스트리 (동적 에이전트 등록)
- Plandex → tree-sitter 프로젝트 맵 (토큰 절감용 MCP)

---

## 6. Tier 5: MCP 인프라

### MCP 서버 선택 가이드

| MCP 서버 | 용도 | 우선순위 | 토큰 영향 |
|----------|------|---------|----------|
| **memory** (공식) | 세션 간 도메인 지식 공유 | P0 | +5% |
| **Context Mode** | 컨텍스트 98% 압축 | P0 | -50% |
| **Network-AI** | 레이스컨디션 안전 공유 상태 | P1 (4명+) | +10% |
| **Magg** | MCP 자율 발견·설치 | P2 | +5% |
| **TMUX MCP** | 터미널 자동 분기 | 미표준화 | N/A |

---

## 7. 개발 케이스별 최적 선택 가이드

### Case 1: 솔로 개발자 — 빠른 프로토타이핑

```
추천: Task tool (서브에이전트 2-3개)
토큰 예산: 세션당 $1-2
설정 시간: 0분
```

| 도구 | 역할 |
|------|------|
| Task tool (researcher) | 기술 리서치 |
| Task tool (coder) | 구현 |
| 메인 에이전트 | 조율 + 리뷰 |

**불필요**: 오케스트레이터, PARALLEL_PLAN.md, 외부 도구

### Case 2: 소규모 팀 (에이전트 2-3개) — 기능 구현

```
추천: A-Team Orchestrator + PARALLEL_PLAN.md
토큰 예산: 세션당 $2-5
설정 시간: 5분 (PARALLEL_PLAN.md 작성)
```

| 도구 | 역할 |
|------|------|
| orchestrator | 태스크 분해 + 조율 |
| coder | 구현 (파일 소유권 명시) |
| reviewer | 품질 검증 |

**추가 고려**: 설계 결정 필요시 MoA 모드 활성화

### Case 3: 중규모 팀 (에이전트 4-7개) — 복잡한 리팩토링

```
추천: A-Team + Claude Squad 또는 Superset IDE
토큰 예산: 세션당 $5-15
설정 시간: 15분
```

| 도구 | 역할 |
|------|------|
| A-Team orchestrator | 계획 + 파일 소유권 |
| Claude Squad / Superset | 병렬 실행 + 모니터링 |
| checkpoint.sh | BLOCKED 복구 |

**핵심**: 파일 충돌 방지가 critical → PARALLEL_PLAN.md 파일 소유권 필수

### Case 4: 대규모 (에이전트 8+) — 대규모 마이그레이션

```
추천: Superset IDE 또는 ComposioHQ Agent Orchestrator
토큰 예산: 세션당 $15-50
설정 시간: 30분+
```

| 도구 | 역할 |
|------|------|
| Superset IDE | git worktree 병렬 (10+ 에이전트) |
| ComposioHQ | GitHub 이슈 → 자동 PR → CI |
| A-Team governance | 규칙 + 가드레일 |

**주의**: 이 규모에서는 merge conflict 자동 해결 전략 필수

### Case 5: 장기 프로젝트 (2주+) — 지속적 개발

```
추천: A-Team + 체크포인팅 + Context Mode MCP
토큰 예산: 일 $5, 총 $50-100
설정 시간: 20분
```

| 도구 | 역할 |
|------|------|
| A-Team orchestrator | 세션 간 연속성 |
| checkpoint.sh | 진행 상황 저장/복구 |
| Context Mode | 토큰 98% 압축 |
| mcp-memory | 도메인 지식 누적 |
| .context/CURRENT.md | 상태 싱글 소스 오브 트루스 |

**핵심**: 토큰 소진 시 체크포인트에서 완벽 복구 + Context Mode로 세션 수명 3배 연장

### Case 6: 설계 의사결정 — 아키텍처/보안

```
추천: A-Team MoA 모드 (MixtureOfAgents)
토큰 예산: 기본의 3배 ($6-15)
설정 시간: 0분 (자동 감지)
```

| 도구 | 역할 |
|------|------|
| researcher | 최신 동향 리서치 |
| architect | 구현 복잡도 분석 |
| coder | 기존 코드 호환성 검토 |
| orchestrator (aggregator) | 3개 의견 취합 → 최적 결정 |

**트리거**: 요청에 "최선 방안", "옵션 비교", "설계 선택" 등 키워드 포함 시 자동 활성화

### Case 7: 코드 리뷰 + 품질 검증

```
추천: A-Team Reviewer + 3-tier Guardrail
토큰 예산: 세션당 $1-3
설정 시간: 0분
```

| 도구 | 역할 |
|------|------|
| Tier 1 (Input) | 보안 키워드 스캔, 파일 소유권 검증 |
| Tier 2 (Tool) | hooks로 위험 명령 차단 |
| Tier 3 (Output) | reviewer Critical + Informational Pass |

### Case 8: 리서치 집약 작업

```
추천: Task tool 병렬 리서치 + A-Team researcher
토큰 예산: 세션당 $2-5
설정 시간: 0분
```

| 도구 | 역할 |
|------|------|
| Task (researcher) x 3-4 | 각각 다른 주제 병렬 조사 |
| 메인 에이전트 | 결과 종합 + 문서화 |

**팁**: 배경 실행(`run_in_background`)으로 4개 리서치 동시 진행 가능

---

## 8. 정량적 비교 매트릭스

### 토큰 효율성

| 도구 | 패턴 | 상대 비용 | 에이전트 3개 기준 |
|------|------|----------|----------------|
| A-Team (수동 분기) | O(N) | 1.0x | ~150K 토큰 |
| Claude Squad | O(N) | 1.0x | ~150K |
| Superset IDE | O(N) + merge | 1.2x | ~180K |
| Task tool (단순) | O(N) | 1.0x | ~150K |
| Supervisor (자동) | O(N·ctx) | 2.5x | ~375K |
| OpenHands | O(N·history) | 5-10x | ~750K+ |
| CrewAI | O(N·ctx) | 2.0x | ~300K |

### 복원력 (부분 실패 시)

| 도구 | 격리 수준 | MTTR | 데이터 손실 |
|------|----------|------|-----------|
| A-Team + checkpoint | 세션 격리 | 5-10분 | 체크포인트 이후만 |
| Superset IDE | worktree 격리 | 2분 | 브랜치 단위 |
| Claude Squad | tmux 세션 격리 | 5분 | 세션 단위 |
| Supervisor (단일) | 없음 | 30분+ | 전체 |
| OpenHands | Docker 격리 | 10분 | 컨테이너 단위 |

### "Agentmaxxing" 실전 가이드라인

> 2026년 트렌드: 5-7개 에이전트를 git worktree로 동시 실행하는 "Agentmaxxing" 패턴

| 에이전트 수 | 실용성 | 권장 도구 | 주의사항 |
|------------|--------|----------|---------|
| 1-2 | 안전 | Task tool | 추가 도구 불필요 |
| 3-5 | 최적 | A-Team + Claude Squad | 파일 소유권 필수 |
| 5-7 | 상한선 | Superset IDE | merge 전략 필수 |
| 8-10 | 위험 | ComposioHQ | CI 게이트 필수 |
| 10+ | 특수 | Superset + 커스텀 | 전문 DevOps 필요 |

---

## 9. A-Team 통합 로드맵

### 현재 구현 완료 (Phase 1)

- [x] Supervisor 패턴 (orchestrator.md Phase 0-5)
- [x] 3-tier Guardrail (guardrails.md)
- [x] MixtureOfAgents 모드 (설계 결정용)
- [x] 파일 기반 체크포인팅 (checkpoint.sh + checkpointing.md)
- [x] SOP 패턴 (docs/08 패턴 5)
- [x] 파일 소유권 체계 (PARALLEL_PLAN.md)
- [x] 6가지 전문 에이전트 (orchestrator/researcher/coder/reviewer/architect/judge)

### Phase 2 (진행 중)

- [ ] checkpoint.sh 실전 시나리오 테스트
- [ ] .context/checkpoints/ 초기화 + 운용
- [ ] MoA 모드 실전 검증
- [ ] Context Mode MCP 글로벌 배포

### Phase 3 (선택적 강화)

- [ ] Selective Context Loading (토큰 30% 추가 절감)
- [ ] Checkpoint Metadata Index (빠른 검색)
- [ ] Agent Chain Tracing (에이전트 체인 추적)
- [ ] tree-sitter 프로젝트 맵 MCP (Plandex 아이디어)
- [ ] 에이전트 동적 레지스트리 (OpenHands 아이디어)

### 외부 도구 통합 우선순위

| 도구 | 통합 수준 | 시기 | 조건 |
|------|----------|------|------|
| Context Mode | MCP 설치 | 즉시 | 무조건 |
| mcp-memory | MCP 설치 | Phase 2 | 장기 프로젝트 |
| Claude Squad | 보조 도구 | 필요시 | 에이전트 5+ |
| Superset IDE | 보조 도구 | 필요시 | 대규모 리팩토링 |
| ComposioHQ | 외부 통합 | 필요시 | GitHub 자동화 |
| Network-AI | MCP 설치 | Phase 3 | 에이전트 4+ 동시 |

---

## 10. 의사결정 플로우차트

```
새 병렬 작업 시작
│
├─ 에이전트 1-2개?
│  └→ Task tool 직접 사용 (추가 도구 불필요)
│
├─ 에이전트 3-5개?
│  ├─ 독립 태스크? → Claude Squad (tmux 병렬)
│  └─ 의존성 있음? → A-Team orchestrator + PARALLEL_PLAN.md
│
├─ 에이전트 5-7개?
│  ├─ 파일 충돌 우려? → Superset IDE (worktree 격리)
│  └─ 독립 작업? → Claude Squad + checkpoint.sh
│
├─ 에이전트 8+개?
│  └→ ComposioHQ 또는 Superset + CI 게이트
│
├─ 설계 결정?
│  └→ A-Team MoA 모드 (3명 전문가 + aggregator)
│
├─ 장기 프로젝트?
│  └→ A-Team + checkpoint.sh + Context Mode + mcp-memory
│
└─ 토큰 예산 제약?
   └→ 수동 분기형 (PARALLEL_PLAN.md) — 30-60% 절감
```

---

## 11. 참조 프로젝트 링크

| 프로젝트 | URL | Stars |
|----------|-----|-------|
| OpenHands | github.com/All-Hands-AI/OpenHands | 69.9K |
| Plandex | github.com/plandex-ai/plandex | 15.2K |
| CrewAI | github.com/crewAIInc/crewAI | 25K+ |
| LangGraph | github.com/langchain-ai/langgraph | 10K+ |
| Swarms | github.com/kyegomez/swarms | 5K+ |
| MetaGPT | github.com/geekan/MetaGPT | 45K+ |
| Superset IDE | github.com/superset-ai/superset | 3.3K+ |
| Claude Squad | github.com/smtg-ai/claude-squad | 신규 |
| Agent Orchestrator | github.com/ComposioHQ/agent-orchestrator | 신규 |
| Network-AI | github.com/jovancoding/network-ai | — |
| Context Mode | npmjs.com/package/context-mode | — |

---

*Last Updated: 2026-03-28 by Claude Opus 4.6*
*Sources: 4 research agents + 6 web searches + A-Team docs 05/08/17/18/19*
