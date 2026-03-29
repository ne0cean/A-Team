# 17. 도구·프레임워크 평가 & 병렬 처리 가이드

> **목적**: 외부 프레임워크/도구를 A-Team에 통합할 때 사용하는 7차원 평가 프레임워크, 병렬 처리 도구 카탈로그, 케이스별 선택 가이드, 리서치 노트, 통합 로드맵을 하나의 문서로 제공한다.

> **사용 시점**: 새 프레임워크 도입 검토 / 기존 도구 교체 판단 / 병렬 작업 도구 선택 / 아키텍처 의사결정

---

## Part 1: 평가 프레임워크 (7차원)

외부 프레임워크/도구/서비스를 A-Team 생태계에 통합할 때 사용하는 7차원 평가 체계.

### 평가 차원 요약

| # | 차원 | 핵심 질문 | 가중치 |
|---|------|----------|--------|
| 1 | 토큰 효율성 | 동일 작업 시 총 비용이 얼마나 드는가? | ★★★ |
| 2 | 산출물 퀄리티 | 에이전트 간 정보 손실/할루시네이션 전파가 있는가? | ★★★ |
| 3 | 레이턴시 | 첫 유의미한 출력까지 얼마나 걸리는가? | ★★☆ |
| 4 | 장애 복원력 | 부분 실패 시 복구 가능한가? | ★★★ |
| 5 | 생태계 호환성 | 기존 A-Team 커맨드/워크플로우와 어떻게 공존하는가? | ★★☆ |
| 6 | 옵저버빌리티 | 에이전트 의사결정을 추적/디버깅할 수 있는가? | ★★☆ |
| 7 | 거버넌스 | 파일 소유권/리소스 충돌을 방지할 수 있는가? | ★★☆ |

> 가중치는 프로젝트 성격에 따라 조정. ★★★ = 필수, ★★☆ = 중요, ★☆☆ = 참고.

---

### 1. 토큰 효율성 (Cost Efficiency)

#### 측정 기준
- **총 토큰 소비량**: 동일 태스크를 프레임워크 유/무로 실행 시 비교
- **에이전트 수 대비 증가율**: 에이전트 N개일 때 토큰이 O(N), O(N²), O(N·context) 중 어떤 패턴?
- **컨텍스트 전달 방식**: 전체 복사 vs 공유 상태 vs 요약 전달

#### 체크리스트
- [ ] 에이전트 간 컨텍스트 전달 시 중복 데이터가 얼마나 되는가?
- [ ] 5개 에이전트 기준 예상 토큰 비용 (input + output)
- [ ] 캐싱/요약 메커니즘이 있는가?
- [ ] 기존 Task tool 대비 비용 증감 추정

#### 벤치마크 방법
```
동일 태스크를 3가지 방식으로 실행:
A) 현재 방식 (Task tool 직접)
B) 후보 프레임워크
C) 하이브리드
→ 토큰 수, 비용, 완료 시간 비교
```

---

### 2. 산출물 퀄리티 (Output Quality)

#### 측정 기준
- **정보 손실률**: 에이전트 A의 출력 중 B가 활용하지 못한 비율
- **할루시네이션 전파**: A가 부정확한 정보를 생성했을 때 B·C가 검증하는가/증폭하는가
- **최종 출력 일관성**: 복수 에이전트의 산출물이 서로 모순되지 않는가

#### 체크리스트
- [ ] 에이전트 간 출력 검증 메커니즘 (크로스체크, 투표, 적대적 리뷰)
- [ ] 중간 산출물에 대한 타입 검증/스키마 강제
- [ ] 기존 `/review`, `/adversarial` 커맨드와의 역할 분리
- [ ] 장문 파이프라인(5+ 태스크)에서 컨텍스트 유실 대책

#### 벤치마크 방법
```
알려진 정답이 있는 태스크를 실행:
→ 최종 출력의 정확도, 누락 정보, 모순 포인트 카운트
→ 단일 에이전트 vs 멀티에이전트 비교
```

---

### 3. 레이턴시 (Latency / Time to First Value)

#### 측정 기준
- **TTFV (Time to First Value)**: 첫 유의미한 출력까지의 시간
- **총 완료 시간**: 전체 워크플로우 종료까지
- **오버헤드**: 프레임워크 초기화, 그래프 컴파일, 라우팅 등 순수 오버헤드

#### 체크리스트
- [ ] 프레임워크 부트스트랩 시간 (import → ready)
- [ ] 병렬 실행 지원 여부 및 실질적 속도 향상
- [ ] `/vibe` 즉시 실행 원칙과의 충돌 여부
- [ ] 스트리밍 출력 지원 (중간 결과 점진적 표시)

#### 벤치마크 방법
```
동일 태스크:
→ 첫 출력까지 시간, 총 완료 시간, 프레임워크 오버헤드 분리 측정
```

---

### 4. 장애 복원력 (Resilience)

#### 측정 기준
- **부분 실패 복구**: 에이전트 1개 실패 시 나머지가 계속 동작하는가
- **재시도 비용**: 체크포인트에서 재개 vs 처음부터 재실행
- **실패 전파 차단**: 1개 에이전트 에러가 전체 파이프라인을 중단시키는가

#### 체크리스트
- [ ] 체크포인팅/스냅샷 지원 (MemorySaver, SQLite, PostgreSQL 등)
- [ ] 에이전트별 독립 타임아웃 설정
- [ ] 권한 거부/API 실패 시 fallback 전략
- [ ] 재시도 시 이미 완료된 에이전트는 스킵 가능한가
- [ ] graceful degradation (일부 실패해도 부분 결과 반환)

#### 벤치마크 방법
```
의도적으로 에이전트 1개를 실패시킴 (API 차단, 타임아웃):
→ 전체 시스템 동작 관찰
→ 복구까지 시간/비용 측정
```

#### 실전 교훈 (2026-03-27)
> 서브에이전트 3개 병렬 리서치 시 2개가 WebSearch/WebFetch 권한 거부로 실패.
> 현재 구조는 fallback 없이 전체 결과가 불완전해짐.
> → 체크포인팅 또는 메인 에이전트 fallback이 필수.

---

### 5. 생태계 호환성 (Ecosystem Compatibility)

#### 측정 기준
- **기존 워크플로우 보존**: 현재 슬래시 커맨드 체계가 유지되는가
- **점진적 도입 가능성**: 전체 교체 없이 일부만 적용 가능한가
- **MCP 호환**: 기존 MCP 서버와 연동되는가

#### 체크리스트
- [ ] 기존 커맨드 (`/craft`, `/review`, `/vibe` 등)와 공존 가능한가
- [ ] Task tool (Claude Code 네이티브)과 혼용 가능한가
- [ ] `.context/CURRENT.md`, `PARALLEL_PLAN.md` 규칙과 충돌 없는가
- [ ] `install-commands.sh` 배포 파이프라인에 영향 없는가

#### 통합 아키텍처 모델
```
┌─────────────────────────────────┐
│  A-Team Commands (워크플로우)     │  ← /craft, /review, /vibe
│  = WHAT to do                    │
├─────────────────────────────────┤
│  Orchestration Layer             │  ← 후보 프레임워크 (조건분기, 체크포인팅)
│  = HOW to coordinate             │
├─────────────────────────────────┤
│  Execution Layer                 │  ← Claude Code Task tool 또는 Crew
│  = WHO does it                   │
├─────────────────────────────────┤
│  Governance Layer                │  ← PARALLEL_PLAN.md + 파일 소유권
│  = RULES & BOUNDARIES            │
└─────────────────────────────────┘
```

---

### 6. 옵저버빌리티 (Observability)

#### 측정 기준
- **실행 추적**: 어떤 에이전트가 어떤 순서로 무엇을 했는가
- **의사결정 투명성**: LLM이 왜 이 도구를 선택했는가
- **장애 진단 시간**: 문제 발생 → 원인 특정까지 걸리는 시간

#### 체크리스트
- [ ] 빌트인 트레이싱 (LangSmith, OpenAI Traces 등)
- [ ] 커스텀 로깅 훅 지원
- [ ] 기존 `/investigate` 커맨드와 연동 가능한가
- [ ] 실행 리플레이 (같은 입력으로 재현 가능한가)
- [ ] 비용/토큰 사용량 실시간 모니터링

---

### 7. 거버넌스 (Governance)

#### 측정 기준
- **리소스 충돌 방지**: 복수 에이전트가 동일 파일을 동시 수정하지 않는가
- **권한 격리**: 에이전트별 도구/파일 접근 범위 제한 가능한가
- **감사 추적**: 누가 언제 무엇을 변경했는가

#### 체크리스트
- [ ] 파일 레벨 잠금/소유권 메커니즘
- [ ] 에이전트별 도구 화이트리스트 설정
- [ ] PARALLEL_PLAN.md 파일 소유권 규칙 자동 강제
- [ ] 커밋 시 에이전트 출처 표기 (Co-Authored-By)
- [ ] 보안 가드레일 (민감 파일 접근 차단)

---

### 평가 사용법

#### 새 프레임워크 평가 시
1. 위 7개 차원별 체크리스트를 순회
2. 각 차원에 점수 부여 (1-5)
3. 가중치 적용하여 총점 산출
4. 벤치마크 실행하여 정량 검증

#### 평가 템플릿
```markdown
## [프레임워크명] 평가 결과

| 차원 | 점수(1-5) | 가중치 | 가중점수 | 비고 |
|------|-----------|--------|----------|------|
| 토큰 효율성 | ? | ★★★(3) | ? | |
| 산출물 퀄리티 | ? | ★★★(3) | ? | |
| 레이턴시 | ? | ★★☆(2) | ? | |
| 장애 복원력 | ? | ★★★(3) | ? | |
| 생태계 호환성 | ? | ★★☆(2) | ? | |
| 옵저버빌리티 | ? | ★★☆(2) | ? | |
| 거버넌스 | ? | ★★☆(2) | ? | |
| **총점** | | **/17** | **/85** | |

### 결론
- 도입 여부: YES / NO / PARTIAL
- 도입 범위: 전체 교체 / Orchestration만 / Execution만
- 우선 적용 대상: [구체적 커맨드/워크플로우]
```

#### 가중치 커스터마이징

| 프로젝트 유형 | 높은 가중치 | 낮은 가중치 |
|--------------|-----------|-----------|
| MVP/프로토타입 | 레이턴시, 퀄리티 | 거버넌스, 옵저버빌리티 |
| 프로덕션 서비스 | 복원력, 거버넌스 | 레이턴시 |
| 리서치/분석 | 퀄리티, 토큰효율 | 거버넌스 |
| 대규모 팀 작업 | 거버넌스, 호환성 | 레이턴시 |

---

### 프레임워크 비교 스냅샷 (2026-03-27)

7차원 기준 주요 프레임워크 스냅샷. 정량 수치는 Part 3 비교 매트릭스 참고.

| 차원 | CrewAI | LangGraph | OpenAI Agents SDK |
|------|--------|-----------|-------------------|
| 토큰 효율성 | 중 (선형 증가) | 상 (공유 상태) | 상 (경량) |
| 산출물 퀄리티 | 중 (검증 없음) | 상 (상태 타입 안전) | 중 (가드레일) |
| 레이턴시 | 상 (빠른 셋업) | 중 (컴파일 오버헤드) | 상 (최소 오버헤드) |
| 장애 복원력 | 하 (전체 중단) | 상 (체크포인팅) | 중 (가드레일만) |
| 생태계 호환성 | 상 (MCP v1.10+) | 중 (LangChain 의존) | 하 (벤더 편향) |
| 옵저버빌리티 | 하 (verbose만) | 상 (LangSmith) | 상 (Traces) |
| 거버넌스 | 하 (없음) | 중 (상태 스키마) | 중 (가드레일) |

> 이 스냅샷은 시점에 따라 변동됨. 도입 전 반드시 벤치마크로 검증할 것.

---

## Part 2: 도구 카탈로그 (Tier 1~5)

> 출처: 2026-03 병렬 처리 도구 종합 리서치

### 전체 분류 체계 (Taxonomy)

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

### 2축 분류 체계: 조율 방식 × 격리 수준

Tier 기반 분류가 **도구 레벨**을 구분한다면, 2축 분류는 **작업 방식**을 구분한다.

**축 1: 조율 방식 (Coordination)**

| 방식 | 설명 | Tier 1 예시 | Tier 2-5 예시 |
|------|------|------------|--------------|
| 중앙 집중 | 오케스트레이터가 모든 에이전트 통제 | A-Team orchestrator | CrewAI, LangGraph |
| 위임 | 상위 플래너 → 하위 자율 실행 | Agent Teams | Gas Town, 계층형 |
| 동등 | 에이전트 간 직접 핸드오프 | — | Swarms MoA, OpenAI handoff |
| 인간 개입 | 사람이 핵심 결정점에 개입 | PARALLEL_PLAN 리뷰 | 모든 패턴에 오버레이 |

**축 2: 격리 수준 (Isolation)**

| 수준 | 충돌 위험 | 오버헤드 | 도구 예시 |
|------|----------|---------|----------|
| 컨텍스트 | 높음 | 최소 | Task tool 세션 분리 |
| 파일소유권 | 중간 | 낮음 | PARALLEL_PLAN.md 소유권 선언 |
| 워크트리 | 낮음 | 중간 | Superset, Claude Squad, git worktree |
| 컨테이너 | 없음 | 높음 | OpenHands Docker 샌드박스 |

**6가지 실전 패턴**

| # | 패턴명 | 조율 × 격리 | 에이전트 수 | 적합한 경우 |
|---|--------|------------|-----------|-----------|
| ❶ | 기본형 | 중앙 × 컨텍스트 | 1-2 | 단순 병렬 (리서치 + 구현) |
| ❷ | A-Team형 | 중앙 × 파일소유권 | 3-5 | 일반 개발 스프린트 |
| ❸ | 배치형 | 중앙 × 워크트리 | 5+ | 대규모 리팩토링 |
| ❹ | 팀형 | 위임 × 워크트리 | 5+ | 장기 프로젝트 |
| ❺ | 스웜형 | 동등 × 워크트리 | 3+ | 설계 결정, 아키텍처 선택 |
| ❻ | 샌드박스형 | 동등 × 컨테이너 | 1+ | 보안 테스트, 신뢰 불가 코드 |

**실전 선택 플로우**

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

### Tier 1: Claude Code 네이티브 도구

#### Task Tool (서브에이전트)

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

#### Claude Code Agent Teams (실험적)

| 항목 | 내용 |
|------|------|
| **유형** | Anthropic 실험 기능 |
| **출시** | 2026-02 (Opus 4.6과 함께) |
| **상태** | 실험적 — 프로덕션 미권장 |

- **동작**: `TeammateTool`로 팀원 에이전트 정의 → tmux pane에서 병렬 실행 → 결과 자동 수집
- **특징**: Claude Code에 내장된 공식 멀티에이전트, tmux 기반 시각화
- **한계**: 아직 실험 단계, 문서 부족, 커스터마이징 제한
- **A-Team 관계**: 성숙 시 orchestrator의 실행 백엔드로 활용 가능

#### A-Team Orchestrator (PARALLEL_PLAN.md 기반)

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

### Tier 2: 터미널/워크트리 오케스트레이터

#### Superset IDE

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

#### Claude Squad

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

#### Agent Orchestrator (ComposioHQ)

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

#### Multiclaude

| 항목 | 내용 |
|------|------|
| **유형** | Auto-merge 오케스트레이터 |
| **핵심** | CI-gated PR 워크플로우 |
| **병렬 수** | 5-10개 |

- **동작**: 태스크별 브랜치 자동 생성 → Claude Code 실행 → PR → CI 통과 시 auto-merge
- **장점**: 완전 자동 merge 파이프라인, CI 게이트로 품질 보장
- **한계**: merge conflict 자동 해결 미흡, 설정 학습곡선
- **적합 케이스**: CI/CD 파이프라인 있는 프로젝트, 독립 기능 대량 구현

#### Gas Town

| 항목 | 내용 |
|------|------|
| **유형** | 멀티에이전트 워크스페이스 관리자 |
| **핵심** | "Mayor" 에이전트 계층 구조 |

- **동작**: Mayor(시장) 에이전트가 전체 조율 → Worker 에이전트에게 태스크 위임
- **장점**: 계층적 조율, 컨텍스트 관리 내장
- **한계**: 커뮤니티 규모 작음, 문서 부족
- **적합 케이스**: 에이전트 3-5개 중규모 프로젝트

#### CAO / Mato (경량 tmux)

| 항목 | CAO | Mato |
|------|-----|------|
| **핵심** | tmux 자동 분기/관리 | tmux 탭별 상태 시각화 |
| **장점** | 경량 Python, 자동 세션 분기 | 실시간 모니터링 |
| **한계** | 체크포인팅 없음, 거버넌스 없음 | 오케스트레이션 로직 없음 |
| **결론** | A-Team보다 기능 열위 | 부보조 시각화 도구만 가치 |

---

### Tier 3: 프레임워크 레벨

#### 비교 매트릭스

| 프레임워크 | 언어 | 토큰 효율 | 복원력 | 거버넌스 | 학습곡선 | A-Team 호환 |
|-----------|------|----------|--------|---------|---------|------------|
| **CrewAI** | Python | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | 패턴 차용 |
| **LangGraph** | Python | ★★★☆☆ | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ | MCP 연동 |
| **OpenAI SDK** | Python | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★★☆ | 패턴 차용 완료 |
| **Swarms** | Python | ★★☆☆☆ | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ | MoA 패턴 차용 |
| **MetaGPT** | Python | ★★★☆☆ | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ | SOP 패턴 차용 |
| **smolagents** | Python | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ | ★★★★★ | 참고용 |

#### 각 프레임워크의 핵심 차용 포인트

- **CrewAI**: 역할 기반 에이전트 팀 구성 → A-Team이 이미 6가지 에이전트로 구현
- **LangGraph**: 상태 그래프 + SQLite 체크포인팅 → A-Team은 파일 기반으로 경량 구현
- **OpenAI Agents SDK**: 3-tier Guardrail + handoff() → A-Team이 guardrails.md로 구현 완료
- **Swarms**: MixtureOfAgents 패턴 → A-Team orchestrator MoA 모드로 네이티브 구현
- **MetaGPT**: SOP (Standard Operating Procedure) → A-Team docs/08 패턴 5로 문서화

---

### Tier 4: 샌드박스/플래닝 도구

#### OpenHands vs Plandex vs A-Team

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

### Tier 5: MCP 인프라

#### MCP 서버 선택 가이드

| MCP 서버 | 용도 | 우선순위 | 토큰 영향 |
|----------|------|---------|----------|
| **memory** (공식) | 세션 간 도메인 지식 공유 | P0 | +5% |
| **Context Mode** | 컨텍스트 98% 압축 | P0 | -50% |
| **Network-AI** | 레이스컨디션 안전 공유 상태 | P1 (4명+) | +10% |
| **Magg** | MCP 자율 발견·설치 | P2 | +5% |
| **TMUX MCP** | 터미널 자동 분기 | 미표준화 | N/A |

---

## Part 3: 케이스별 선택 가이드

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

### 정량적 비교 매트릭스

#### 토큰 효율성

| 도구 | 패턴 | 상대 비용 | 에이전트 3개 기준 |
|------|------|----------|----------------|
| A-Team (수동 분기) | O(N) | 1.0x | ~150K 토큰 |
| Claude Squad | O(N) | 1.0x | ~150K |
| Superset IDE | O(N) + merge | 1.2x | ~180K |
| Task tool (단순) | O(N) | 1.0x | ~150K |
| Supervisor (자동) | O(N·ctx) | 2.5x | ~375K |
| OpenHands | O(N·history) | 5-10x | ~750K+ |
| CrewAI | O(N·ctx) | 2.0x | ~300K |

#### 복원력 (부분 실패 시)

| 도구 | 격리 수준 | MTTR | 데이터 손실 |
|------|----------|------|-----------|
| A-Team + checkpoint | 세션 격리 | 5-10분 | 체크포인트 이후만 |
| Superset IDE | worktree 격리 | 2분 | 브랜치 단위 |
| Claude Squad | tmux 세션 격리 | 5분 | 세션 단위 |
| Supervisor (단일) | 없음 | 30분+ | 전체 |
| OpenHands | Docker 격리 | 10분 | 컨테이너 단위 |

#### "Agentmaxxing" 실전 가이드라인

> 2026년 트렌드: 5-7개 에이전트를 git worktree로 동시 실행하는 "Agentmaxxing" 패턴

| 에이전트 수 | 실용성 | 권장 도구 | 주의사항 |
|------------|--------|----------|---------|
| 1-2 | 안전 | Task tool | 추가 도구 불필요 |
| 3-5 | 최적 | A-Team + Claude Squad | 파일 소유권 필수 |
| 5-7 | 상한선 | Superset IDE | merge 전략 필수 |
| 8-10 | 위험 | ComposioHQ | CI 게이트 필수 |
| 10+ | 특수 | Superset + 커스텀 | 전문 DevOps 필요 |

---

### 의사결정 플로우차트

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

## Part 4: 리서치 노트 (멀티 에이전트 오케스트레이션)

> 출처: 2026-03-27 Antigravity (Gemini 2.5) 리서치. 에이전트 간 협업, 터미널 분기 실행, 토큰 소진 대응 전략 포함.
> **모든 A-Team 에이전트는 세션 시작 시 이 섹션을 참조하여 최적의 실행 모드를 선택해야 한다.**

### 실행 모드 비교: 자동화 vs 수동 분기

| 구분 | 자동형 (Supervisor) | 수동 분기형 (Manual Swarm) |
| :--- | :--- | :--- |
| **정의** | 메인 에이전트가 모든 하위 작업을 직접 통제 | 에이전트가 계획을 수립하고 사용자가 터미널별 분기 실행 |
| **토큰 효율** | 낮음 (컨텍스트 누적으로 비용 급증) | **매우 높음** (세션별 독립 버젯 사용) |
| **복원력** | 낮음 (메인 사망 시 전체 중단) | **매우 높음** (태스크 간 리스크 완벽 격리) |
| **추천 상황** | 간단한 기능 구현, 루틴 작업 | **대규모 설계, 복잡한 리팩토링, 장기 세션** |

### 주요 오픈소스 도구 (2025-2026 라이징)

에이전트 조율 및 시각화를 돕는 핵심 프로젝트들. (상세 스펙은 Part 2 참고)

- **[OpenHands (구 OpenDevin)](https://openhands.dev/)**: 샌드박스 기반 에이전트 실행 표준. A-Team의 '격리된 작업장'으로 활용 가능.
- **[Mato](https://github.com/vertexaisearch/mato)**: 터미널 탭별로 에이전트 상태를 시각화하는 TMUX형 멀티플렉서.
- **[CAO (CLI Agent Orchestrator)](https://github.com/basnijholt/agent-cli)**: TMUX 세션을 활용해 에이전트를 자동 분기/관리하는 경량 오케스트레이터.
- **[Plandex](https://plandex.ai/)**: 샌드박스 실행 후 승인(Review) 단계를 명확히 분리한 터미널 에이전트.

### A-Team 통합 제언: 핵심 스킬 및 MCP

#### Migration-Snapshot Skill
에이전트가 토큰 소진 임박 시 자신의 '추론 상태'를 JSON/MarkDown으로 덤프하여 다음 에이전트에게 100% 성능 전이를 보장하는 스킬.

#### MCP 인프라 구성
- **Shared Memory**: 터미널이 달라도 공통 도메인 지식을 공유 (`mcp-memory-server`).
- **TMUX Controller**: 에이전트가 직접 창을 열고 닫으며 작업을 분배 (`mcp-tmux-server`).

### 인계 및 마이그레이션 프로토콜 (Handoff Rules)

에이전트가 작업을 넘길 때 반드시 지켜야 할 3원칙:
1. **Context Snapshot**: 현재의 논리적 시퀀스와 '막혔던 지점'을 기록한다.
2. **Clean State**: 모든 변경사항을 커밋하거나 스테이징하여 파일 누락을 방지한다.
3. **Task Link**: `parallel-task-plan.md`의 어떤 항목이 다음 담당자의 몫인지 명시한다.

---

## Part 5: A-Team 통합 로드맵

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

## 참조 프로젝트 링크

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

*통합 작성: 2026-03-29*
*원본: 17-integration-evaluation-framework.md (2026-03-27) + 18-multi-agent-orchestration-research.md (2026-03-27) + 20-parallel-processing-landscape.md (2026-03-28)*
