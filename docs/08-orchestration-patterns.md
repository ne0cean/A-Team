# 08. 오케스트레이션 패턴 & 실전 운영

멀티 에이전트 시스템을 설계하고 운영할 때 필요한 핵심 개념, 패턴, 프레임워크 선택, 운영 전략.
**"어떤 구조로 짜고, 어떤 도구로 구현하며, 어떻게 운영할 것인가?"** 에 대한 답.

---

## 핵심 개념

### 멀티 에이전트 시스템이란

서로 다른 역할의 에이전트(플래너, 툴 호출 담당, 검증자 등)가 협력해
하나의 목표를 수행하는 구조.

```
단일 에이전트 → 하나의 컨텍스트, 순차 처리, 컨텍스트 열화
멀티 에이전트 → 역할 분리, 병렬 처리, 컨텍스트 격리
```

**멀티 에이전트가 필요한 시점:**
- 서브태스크를 병렬로 실행하고 싶을 때
- 도메인별 프롬프트/툴이 완전히 다를 때 (리서치 vs 코딩 vs 검증)
- 단일 컨텍스트가 너무 더러워질 때 (긴 히스토리 축적)
- 품질 검증을 자동화하고 싶을 때

---

### TAO 루프

각 에이전트의 내부 실행 사이클:

```
Thought   → 현재 상황 분석, 다음 행동 결정
    ↓
Action    → 툴 호출 (코드 실행, 검색, DB 쓰기, 다른 에이전트 호출)
    ↓
Observation → 결과 확인, 다음 루프로
    ↑___________|
```

오케스트레이터는 각 에이전트의 TAO 루프를 **외부에서** 조율한다.
개별 에이전트는 자기 루프에만 집중하면 된다.

---

### 오케스트레이터의 역할

```
┌─────────────────────────────────────────────────┐
│              오케스트레이션 레이어                  │
│                                                 │
│  • 에이전트 호출 / 라우팅                          │
│  • 결과 취합 / 합성                               │
│  • 품질 검증 트리거                               │
│  • 예산 / 토큰 / 시간 상한 관리                    │
│  • 실패 시 롤백 / 재시도                          │
│  • 전체 로깅 / 모니터링                            │
└─────────────────────────────────────────────────┘
         ↓              ↓              ↓
    [Agent A]      [Agent B]      [Agent C]
  TAO 루프 독립   TAO 루프 독립   TAO 루프 독립
```

---

## 아키텍처 패턴 3종

### 패턴 1: Supervisor (중앙 라우터)

```
           [User Request]
                 ↓
        [Supervisor/Orchestrator]
         분석 → 계획 → 배분
        /          |          \
  [Agent A]   [Agent B]   [Agent C]
   리서치      코딩         검증
        \          |          /
         결과 취합 → 최종 응답
```

**특징**:
- 하나의 상위 오케스트레이터가 전체를 통제
- 추적성·품질 관리가 우수
- 복잡하지만 예측 가능한 흐름

**적합한 경우**: 엔터프라이즈, 품질/비용 제어가 중요한 프로젝트
**2025년 이후 멀티 에이전트 사실상 표준 구조**

---

### 패턴 2: Peer-to-peer / Swarm

```
[Agent A] ←핸드오프→ [Agent B]
    ↕                    ↕
[Agent C] ←핸드오프→ [Agent D]
```

**특징**:
- 에이전트끼리 직접 핑퐁, 필요할 때 서로에게 핸드오프
- 유연하고 탐색적
- 로그 추적과 일관성 관리가 어려움

**적합한 경우**: 탐색적 리서치, 프로토타이핑, 결과가 열린 작업

---

### 패턴 3: 계층형 (Hierarchical)

```
[Top Planner]
      ↓
 [Sub-Planner A]    [Sub-Planner B]
    ↓       ↓           ↓       ↓
[Impl]  [Test]    [Impl]  [Review]
```

**특징**:
- 상위 플래너 → 서브플래너 → 구현/검증 에이전트 계층
- 대형 프로젝트의 복잡도 관리에 효과적
- 오버헤드가 가장 큼

**적합한 경우**: 서비스 전체 설계, 대규모 리팩토링, 장기 프로젝트

---

### 패턴 선택 가이드: 2축 분류 체계

**축 1: 조율 방식 (Coordination)**

| 방식 | 설명 | 예시 |
|------|------|------|
| 중앙 집중 (Centralized) | 오케스트레이터가 모든 에이전트 통제 | Supervisor, A-Team orchestrator |
| 위임 (Delegated) | 상위 플래너가 하위에게 권한 위임 | 계층형, Agent Teams |
| 동등 (Peer-to-peer) | 에이전트끼리 직접 핸드오프 | Swarm, MoA |
| 인간 개입 (Human-in-the-loop) | 사람이 핵심 결정점에 개입 | 모든 패턴에 오버레이 가능 |

**축 2: 격리 수준 (Isolation)**

| 수준 | 설명 | 충돌 위험 | 도구 |
|------|------|----------|------|
| 컨텍스트 | 같은 프로세스, 세션만 분리 | 높음 | Task tool |
| 파일소유권 | 같은 브랜치, 파일 잠금 | 중간 | PARALLEL_PLAN.md |
| 워크트리 | git worktree 별도 디렉토리 | 낮음 | Superset/Squad |
| 컨테이너 | Docker 샌드박스 완전 격리 | 없음 | OpenHands |

**6가지 실전 패턴 (2축 교차)**

| # | 패턴명 | 조율 | 격리 | 에이전트 수 | 대표 도구 |
|---|--------|------|------|-----------|----------|
| ❶ | **기본형** | 중앙 | 컨텍스트 | 1-2 | Task tool 직접 |
| ❷ | **A-Team형** | 중앙 | 파일소유권 | 3-5 | PARALLEL_PLAN.md |
| ❸ | **배치형** | 중앙 | 워크트리 | 5+ | Superset/Squad |
| ❹ | **팀형** | 위임 | 워크트리 | 5+ | Agent Teams, Gas Town |
| ❺ | **스웜형** | 동등 | 워크트리 | 3+ | MoA, Swarms |
| ❻ | **샌드박스형** | 동등 | 컨테이너 | 1+ | OpenHands |

**자동 선택 결정 트리** (orchestrator Phase 2.0에서 사용):

```
에이전트 1-2개 + 독립 작업
  → ❶ 기본형 (PARALLEL_PLAN 생략)

에이전트 3-5개 + 파일 분리 가능
  → ❷ A-Team형

에이전트 5+ 또는 파일 충돌 불가피
  → ❸ 배치형 (worktree 격리)

위임형 장기 프로젝트
  → ❹ 팀형

설계 결정 / 옵션 비교
  → ❺ 스웜형 (MoA)

보안 테스트 / 신뢰 불가 코드
  → ❻ 샌드박스형
```

---

## 실전 설계 절차 (프레임워크 불문 공통)

### Step 1: 멀티 에이전트 필요성 명확화

```markdown
## 이 프로젝트에서 멀티 에이전트가 필요한 이유

- [ ] 서브태스크 병렬 실행 필요
- [ ] 도메인별 툴/프롬프트가 완전히 다름
- [ ] 단일 컨텍스트가 오염될 만큼 긴 작업
- [ ] 자동 품질 검증 필요
```

### Step 2: 에이전트 역할 정의

최소 구성 (대부분의 프로젝트):

| 에이전트 | 역할 | 접근 가능 리소스 | 출력 |
|----------|------|-----------------|------|
| **Planner** | 요구사항 분석, 태스크 분해, 담당자 배정, 최종 취합 | 전체 컨텍스트 | 태스크 목록, 실행 계획 |
| **Researcher** | 웹/문서 리서치, 인용 포함 요약 | 외부 웹, 문서 | 요약 + 근거 + 출처 |
| **Coder** | 코드 생성·리팩토링·테스트 | 코드베이스(특정 범위) | 코드 + 테스트 결과 |
| **Reviewer** | 결과 검증, 리스크 지적, 충돌 해결 | diff, 테스트 결과 | 승인 / 거절 + 피드백 |

확장 구성 (필요 시):
- **Judge/Resolver**: 에이전트 간 충돌되는 결과 비교·통합
- **Summarizer**: 긴 컨텍스트를 다음 에이전트용으로 압축

### Step 3: 입출력 스키마 정의

```json
// 워커 입력 표준 구조
{
  "task_id": "T-001",
  "task": "Google OAuth 콜백 API 구현",
  "constraints": ["passport 미사용", "JWT 직접 구현"],
  "context_refs": ["docs/api-contract.md", "db/schema.sql"]
}

// 워커 출력 표준 구조
{
  "task_id": "T-001",
  "status": "completed",
  "summary": "POST /auth/google/callback 구현 완료",
  "evidence": ["curl 테스트 통과", "단위 테스트 3개 통과"],
  "risks": ["refresh token 만료 처리 미구현"],
  "next_steps": ["refresh token 로직 추가 필요"]
}
```

→ 구조화된 출력으로 다음 에이전트가 히스토리 대신 요약만 보고 이어서 작업 가능.

### Step 4: 공유 저장소 (싱글 소스 오브 트루스)

모든 에이전트가 동일한 단일 저장소에만 기록·참조:

| 저장소 유형 | 적합한 경우 | 도구 |
|------------|------------|------|
| **파일 시스템** | 코드 중심 프로젝트, 로컬 협업 | `.context/`, ClawTeam `~/.clawteam/` |
| **벡터 스토어** | 대규모 리서치, 장기 메모리 | Chroma, Pinecone, MCP memory 서버 |
| **DB** | 구조화 데이터 중심 | PostgreSQL + MCP postgres 서버 |
| **문서** | 비개발 협업 | Notion, Confluence |

**이 프레임워크의 기본**: `.context/CURRENT.md` + ClawTeam `~/.clawteam/teams/`

### Step 5: 라우팅·스케줄링 규칙

```
태스크 특성 → 라우팅 규칙:
  "리서치" 키워드 포함 → Researcher 에이전트
  코드 파일 수정 필요  → Coder 에이전트 (파일 소유권 확인)
  결과물이 외부 공개    → Reviewer 에이전트 필수 통과

의존성 → 실행 순서:
  의존 없음     → 병렬 실행 (동시 spawn)
  선후 관계 있음 → DAG 엣지 정의 (blocked-by)
  상호 의존     → 인터페이스 먼저 합의 후 병렬
```

DAG 예시:
```
[T1: 스키마 정의] ──→ [T2: 백엔드 API]  ──→ [T4: 통합 테스트]
                  └──→ [T3: 프론트 UI]  ──┘
```

### Step 6: 품질·예산·정지 조건

```markdown
## 품질 게이트

| 조건 | 임계값 | 근거 | 액션 |
|------|--------|------|------|
| 호출 횟수 | 에이전트당 최대 50회 | 단일 태스크 평균 20~30회 소요 + 2배 안전 마진; 초과는 무한 루프 징후 | 강제 중단 + 요약 |
| 토큰 예산 | 세션당 $5 | Sonnet 기준 약 300만 토큰 → 중형 태스크 3~5개 처리 가능; 일반 개발 세션 상한선 | 경고 → $10에서 중단 |
| 실행 시간 | 태스크당 30분 | 잘 분해된 단일 태스크 평균 10~20분; 30분 초과는 태스크 재분해 필요 신호 | 타임아웃 + 재시도 1회 |
| 빌드 실패 | 2회 연속 | 1회는 일시적 오류 가능; 2회 연속은 구조적 문제 → 전문 에이전트 필요 | Reviewer 에이전트 호출 |

### 프로젝트 규모별 조정 가이드

| 규모 | 호출 횟수 | 토큰 예산 | 시간 |
|------|----------|----------|------|
| 소형 (기능 1~2개) | 에이전트당 20회 | $2 | 15분 |
| 중형 (일반 스프린트) | 에이전트당 50회 | $5 | 30분 |
| 대형 (전체 서비스 설계) | 에이전트당 100회 | $15 | 60분 |
| 장기 (며칠~수 주) | 세션별 중형 기준 적용 | 누적 추적 | 세션 단위 측정 |

## 성공 조건
- 모든 태스크 status = completed
- 빌드 통과
- Reviewer 승인

## 실패 시 롤백
- 커밋 취소: git revert
- 상태 기록: CURRENT.md Blockers에 원인 기록
- 에스컬레이션: 사람에게 판단 요청
```

### Step 7: 관찰·로깅

각 에이전트 호출마다 기록해야 할 것:

```json
{
  "timestamp": "2026-03-20T10:00:00Z",
  "agent": "coder-worker1",
  "task_id": "T-002",
  "input": {...},
  "tool_calls": ["read_file", "write_file", "run_tests"],
  "output": {...},
  "tokens_used": 12500,
  "duration_ms": 45000,
  "status": "completed"
}
```

ClawTeam 사용 시: `~/.clawteam/teams/{team}/` 디렉토리에 자동 기록.
수동 운영 시: `SESSIONS.md`에 세션 단위로 기록.

---

## 안티패턴

| 패턴 | 결과 | 해결 |
|------|------|------|
| 싱글 소스 오브 트루스 없음 | 에이전트마다 다른 "현실"을 가짐 | CURRENT.md 또는 공유 DB 강제 |
| 에이전트 역할 불명확 | Coder가 리서치, Researcher가 코드 수정 | 역할별 접근 가능 리소스 명시적 제한 |
| 출력 스키마 없음 | 다음 에이전트가 이전 결과 해석 불가 | 구조화 JSON 출력 표준화 |
| 정지 조건 없음 | 무한 루프, 비용 폭발 | 토큰/시간/재시도 상한 필수 |
| 검증 단계 없음 | 중요 변경이 검토 없이 배포 | Reviewer 에이전트를 라우팅 그래프에 포함 |

---

## 패턴 4: MixtureOfAgents (MoA)

> **출처**: Swarms 프레임워크, 2025년 이후 고품질 설계 결정에 권장
> **A-Team 통합**: orchestrator.md 선택적 강화 섹션에 구현

### 개념

동일한 문제를 여러 전문 에이전트가 독립적으로 분석 → aggregator가 최선 합성.
"팀의 집단 지성"을 활용하는 패턴.

```
                   [동일 태스크]
                  /      |      \
         [expert-1]  [expert-2]  [expert-3]
          리서치      아키텍처      구현가능성
                  \      |      /
               [aggregator (orchestrator)]
                  최선 합성 → 결론
```

### Supervisor vs MoA 선택 기준

| 상황 | 패턴 |
|------|------|
| 구현 태스크 ("만들어줘") | Supervisor |
| 설계 결정 ("어떻게 할까") | **MoA** |
| 정답 명확한 버그 수정 | Supervisor |
| 여러 옵션 중 최선 선택 | **MoA** |
| 비용 절약이 중요 | Supervisor |
| 결정의 임팩트가 큰 경우 | **MoA** |

### MoA 비용 고려
전문가 3명 병렬 = 토큰 3배. 아키텍처/보안 결정처럼 임팩트 높은 경우만 적용.

---

## 패턴 5: SOP-based Workflow

> **출처**: MetaGPT SOP(Standard Operating Procedure) 기반 역할 분리
> **A-Team 통합**: governance/workflows/ 파일의 표준화 원칙

### 핵심 원칙

모든 워크플로우는 명시적 **입출력 artifact**를 선언한다:

```markdown
## 워크플로우: [이름]

### Input Artifacts (필수)
- CURRENT.md — 현재 프로젝트 상태
- [태스크별 추가 파일]

### Output Artifacts (보장)
- CURRENT.md 갱신 — 완료 항목 + 다음 태스크
- .context/checkpoints/ — 중단 태스크 체크포인트 (있으면)

### Completion Gate
- 빌드 통과 (CLAUDE.md 빌드 명령 기준)
- status = DONE 또는 DONE_WITH_CONCERNS
```

### 기존 workflows와 SOP 매핑

| 워크플로우 파일 | SOP 역할 |
|----------------|---------|
| `session-start.md` | 컨텍스트 로드 SOP |
| `session-end.md` | 컨텍스트 저장 SOP |
| `vibe.md` | 세션 부트스트랩 SOP |
| `self-optimization.md` | 프로젝트 헬스체크 SOP |

---

## 프레임워크 선택

### LangGraph

```python
from langgraph.graph import StateGraph

# 에이전트를 노드로, 데이터 흐름을 엣지로 표현
graph = StateGraph(AgentState)
graph.add_node("planner", planner_agent)
graph.add_node("coder", coder_agent)
graph.add_node("reviewer", reviewer_agent)

graph.add_edge("planner", "coder")
graph.add_conditional_edges("coder", route_result, {
    "approve": "reviewer",
    "retry": "coder",
})
```

**강점**:
- 그래프 기반 — 복잡한 분기/루프를 시각적으로 표현
- 하나의 공유 상태 객체로 컨텍스트 관리 (컨텍스트 오염 방지)
- 실행 리플레이/재시도 쉬움
- Supervisor-Worker 패턴 구현 최적화

**적합한 프로젝트**: 장기 분석 파이프라인, 복잡한 의존성 워크플로우

---

### CrewAI

```python
from crewai import Agent, Task, Crew

researcher = Agent(role="Research Analyst", goal="...", tools=[search_tool])
coder = Agent(role="Senior Developer", goal="...", tools=[code_tool])

task1 = Task(description="리서치...", agent=researcher)
task2 = Task(description="구현...", agent=coder, context=[task1])

crew = Crew(agents=[researcher, coder], tasks=[task1, task2])
crew.kickoff()
```

**강점**:
- 역할 기반 — 에이전트 책임과 경계 나누기 직관적
- 프로덕션 유지보수 설계 강조
- 코드 예제 풍부, 빠른 입문

**적합한 프로젝트**: 리서치 봇, 콘텐츠 생성 파이프라인, 역할이 명확한 팀 작업

---

### Claude Code / MCP + LangGraph 조합

```
LangGraph (워크플로우 오케스트레이션)
    ↓         ↓         ↓
[Node A]   [Node B]  [Node C]
    ↓         ↓         ↓
MCP 서버  MCP 서버  MCP 서버
(filesystem) (github) (postgres)
```

**강점**:
- MCP가 툴·데이터 소스 접근을 표준화 → 에이전트마다 다른 SDK 불필요
- 여러 에이전트가 동일 MCP 엔드포인트 공유 → 일관된 툴 접근
- LangGraph로 워크플로 제어, MCP로 실행 레이어 분리

**2025년 이후 대표 조합으로 평가됨**

→ MCP 서버 선택: `docs/05-mcp-servers.md` 참조

---

### 프레임워크 선택 가이드

```
Python 생태계인가?
├── YES →
│   복잡한 분기/상태 관리 필요한가?
│   ├── YES → LangGraph
│   └── NO  → CrewAI (빠른 구현)
│
└── NO  →
    Claude Code 중심 운영인가?
    ├── YES → ClawTeam + MCP (이 레포 기본 스택)
    └── NO  → 해당 언어 SDK 기반 커스텀
```

---

## 실전 운영

### 전략 1: 단일 오케스트레이션 허브 고정

**핵심 원칙**: 도구 섞기 최소화 + 싱글 컨텍스트 허브

```
[중앙 엔진] LangGraph / CrewAI / ClawTeam 중 하나 고정
      ↕
[개발 인터페이스] Claude Code (디버깅·개발용으로만)
      ↕
[기록] 프로젝트별 그래프/크루 정의 파일 + CURRENT.md
```

**실행 방법**:
1. 프로젝트 시작 시 중앙 엔진 선택 (변경하지 않음)
2. 모든 에이전트 정의·실행을 중앙 엔진에서만
3. Claude Code는 개발·디버깅 인터페이스로만 사용
4. 변경 이력과 아키텍처 결정을 중앙 엔진 설정 파일에 기록

**피해야 할 것**:
```
❌ LangGraph로 짜다가 CrewAI로 전환
❌ "일단 Claude에서 돌려보고 나중에 이식"
❌ 에이전트마다 다른 프레임워크 사용
```

---

### 전략 2: 역할·컨텍스트 강한 분리

**핵심 원칙**: 에이전트마다 보이는 것을 최소화

```
Researcher → 웹/문서만 (코드베이스 접근 없음)
Coder      → 코드베이스만 (외부 웹 없음, 담당 파일만)
Reviewer   → diff/테스트 결과만 (구현 세부사항 없음)
```

**구조화 출력으로 컨텍스트 전달**:

```
에이전트 A 완료
    ↓
긴 히스토리(X) → 구조화 요약(O)으로 다음 에이전트에 전달

// 나쁜 방법
"이전 에이전트가 다음과 같이 했습니다... [500토큰 히스토리]"

// 좋은 방법
{
  "completed": "OAuth API 구현",
  "location": "server/routes/auth.js",
  "contract": "POST /auth/google → { accessToken, user }",
  "risks": ["refresh token 미구현"],
  "next": "프론트엔드 버튼 컴포넌트 연동 가능"
}
```

**컨텍스트 격리 체크리스트**:
- [ ] 에이전트별 접근 가능 파일/디렉토리 명시
- [ ] 에이전트별 사용 가능 툴/MCP 서버 제한
- [ ] 태스크 완료 시 구조화 출력 강제 (자유 텍스트 x)
- [ ] 다음 에이전트는 전체 히스토리 대신 출력 요약만 수신

---

### 전략 3: 검증·재시도 루프 내장

**핵심 원칙**: 중요한 변경 전후에는 반드시 Reviewer 통과

```
[Planner] → 태스크 배분
     ↓
[Worker] → 구현
     ↓
중요 변경인가?
├── YES → [Reviewer] → 승인? → 완료
│              └── 거절 → [Worker] 재시도 (최대 2회)
│                              └── 2회 실패 → 사람 에스컬레이션
└── NO  → 완료
```

**Reviewer 트리거 조건**:

```markdown
## 자동 Reviewer 호출 조건

- [ ] 코어 비즈니스 로직 변경 (결제, 인증, 데이터 파이프라인)
- [ ] 10개 이상 파일 동시 수정
- [ ] 외부 API 스펙 변경
- [ ] 보안 관련 코드 (권한, 암호화, 입력 검증)
- [ ] DB 스키마 변경
```

**Judge/Resolver 에이전트** (충돌 처리):

```
Agent A 결론: "Redis 캐싱 사용"
Agent B 결론: "메모리 캐싱으로 충분"
    ↓
[Judge] 근거 비교:
  - A: 분산 환경 고려, 캐시 일관성
  - B: 현재 단일 서버, 오버엔지니어링 리스크
  → 결론: "현재는 B, 분산 전환 시 A로 마이그레이션"
```

---

## 운영 체크리스트

### 프로젝트 시작 전

- [ ] 멀티 에이전트 필요성 확인 (이 문서 Step 1)
- [ ] 아키텍처 패턴 선택 (Supervisor / Swarm / 계층형)
- [ ] 중앙 오케스트레이션 엔진 고정 (변경하지 않기로 합의)
- [ ] 에이전트 역할 + 접근 리소스 정의
- [ ] 입출력 스키마 확정
- [ ] 싱글 소스 오브 트루스 선택
- [ ] 품질 게이트 / 토큰 예산 / 정지 조건 설정

### 에이전트 스폰 전

- [ ] `PARALLEL_PLAN.md` 작성 완료
- [ ] 파일 소유권 선언 (겹침 없음 확인)
- [ ] 태스크 의존성 그래프 (DAG) 작성
- [ ] 각 태스크 DoD(완료 기준) 명시

### 실행 중

- [ ] `clawteam board live` 또는 CURRENT.md 주기적 확인
- [ ] 블로커 발생 즉시 CURRENT.md에 기록
- [ ] Reviewer 트리거 조건 해당 시 검증 단계 삽입

### 세션 종료 후

- [ ] CURRENT.md 갱신 (In Progress → Last Completions)
- [ ] SESSIONS.md 로그 추가
- [ ] 빌드 검증
- [ ] 발견한 패턴/안티패턴 이 레포에 기록
