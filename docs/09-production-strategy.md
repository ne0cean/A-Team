# 09. 프레임워크 선택 & 실전 운영 전략

**"어떤 도구로 구현하고, 어떻게 운영할 것인가?"**

---

## 프레임워크 비교

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

→ MCP 서버 선택: `docs/05-mcp-servers.md` 참조 (아직 없으면 A-Team 레포에 추가 예정)

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

## 실전 운영 전략 3가지

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

- [ ] 멀티 에이전트 필요성 확인 (`docs/08-orchestration-patterns.md` Step 1)
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
