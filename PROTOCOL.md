# A-Team 프로토콜 — 단일 진입점

멀티 에이전트 개발의 **표준 흐름**. 이 파일이 모든 문서의 지도다.

---

## 프로젝트 시작 전 읽어야 할 것 (순서대로)

```
1. 이 파일 (PROTOCOL.md)            ← 지금 읽는 중
2. docs/06-build-methodology.md     ← 5-Phase 전체 라이프사이클
3. docs/08-orchestration-patterns.md ← 어떤 구조로 짤 것인가
4. docs/09-production-strategy.md   ← 어떤 도구로, 어떻게 운영할 것인가
```

---

## 핵심 프로토콜 (7단계)

```
[Phase 0] Foundation
  → templates/project-scaffold.sh 실행
  → CLAUDE.md + .context/ 초기화
  → MCP 서버 설정 (docs/05-mcp-servers.md)

[Phase 1] Planning
  → 멀티 에이전트 필요성 확인 (docs/08 Step 1)
  → 아키텍처 패턴 선택: Supervisor / Swarm / Hierarchical (docs/08)
  → 4단계 태스크 설계: 분해 → 명세 → 의존성 → 산출물 (reference/task-design.md)

[Phase 2] Assembly
  → 역할 배정 + 모델 선택 (docs/01, docs/03)
  → 격리 전략: git worktree (ClawTeam) or git branch (수동) (docs/02)
  → 파일 소유권 선언 → PARALLEL_PLAN.md 작성 (templates/PARALLEL_PLAN.md)

[Phase 3] Execution
  → 에이전트 스폰 (docs/07 또는 수동)
  → 통신: inbox 메시지 / CURRENT.md (docs/04)
  → 블로커 발생 시 CURRENT.md에 즉시 기록

[Phase 4] Monitoring
  → clawteam board attach (실시간) 또는 CURRENT.md 주기 확인
  → 중요 변경 전후 Reviewer 에이전트 호출 (docs/09 전략 3)
  → 품질 게이트 / 토큰 예산 / 정지 조건 (docs/08 Step 6)

[Phase 5] Integration
  → 파일 소유권 기준 머지 충돌 해결 (docs/02)
  → 빌드 검증: npm run build / pytest / cargo test

[Phase 6] Close
  → CURRENT.md 갱신 (In Progress → 없음, Last Completions 추가)
  → SESSIONS.md 로그 추가
  → 커밋: [type]: 요약 + NOW/NEXT/BLOCK
  → 발견한 패턴 → docs/ 또는 reference/ 에 즉시 기록
```

---

## 문서 맵

### 프레임워크 (이 레포 핵심)

| 번호 | 파일 | 한 줄 요약 |
|------|------|-----------|
| 01 | `docs/01-role-partitioning.md` | 레벨 + 도메인 기준 역할 분할 |
| 02 | `docs/02-conflict-prevention.md` | 파일 소유권 → 브랜치 격리 → CURRENT.md 규칙 |
| 03 | `docs/03-model-selection.md` | 태스크 복잡도별 모델 배정 + 비용 최적화 |
| 04 | `docs/04-coordination-protocol.md` | 비동기 파일 기반 에이전트 간 조율 |
| 05 | `docs/05-mcp-servers.md` | 멀티 에이전트용 MCP 서버 선택 가이드 |
| 06 | `docs/06-build-methodology.md` | **5-Phase 완전 라이프사이클** ← 핵심 |
| 07 | `docs/07-clawteam.md` | ClawTeam CLI 치트시트 + 수동 조율 비교 |
| 08 | `docs/08-orchestration-patterns.md` | TAO루프 / Supervisor / Swarm / 계층형 패턴 |
| 09 | `docs/09-production-strategy.md` | LangGraph / CrewAI / MCP+ClawTeam 선택 + 3가지 운영전략 |
| **10** | **`docs/10-claude-code-subagents.md`** | **Claude Code 서브에이전트 5종 운용 가이드 ← 즉시 사용** |

### 서브에이전트 (`.claude/agents/`)

| 에이전트 | 모델 | 역할 |
|----------|------|------|
| `orchestrator` | Sonnet | Supervisor 리더 — 계획·배분·취합 |
| `researcher` | Haiku | 리서치·조사 전문 (읽기전용, 저비용) |
| `coder` | Sonnet | 구현·수정·빌드 검증 전문 |
| `reviewer` | Sonnet | 품질 검증·승인/거절 전문 |
| `architect` | Opus | 설계·아키텍처 결정 전문 |

### 템플릿

| 파일 | 용도 |
|------|------|
| `templates/project-scaffold.sh` | 신규 프로젝트 초기화 (1분 셋업) |
| `templates/PARALLEL_PLAN.md` | 병렬 작업 플랜 (파일 소유권 + DoD + ClawTeam 스크립트) |
| `templates/task-spec.md` | 단일 태스크 기술 명세 (에이전트 프롬프트 템플릿) |

### ClawTeam 원본 레퍼런스 (상세 스펙)

| 파일 | 내용 |
|------|------|
| `reference/architecture.md` | ClawTeam 스웜 구조 & Transport 레이어 상세 |
| `reference/clawteam-cli.md` | CLI 전체 커맨드 레퍼런스 |
| `reference/task-design.md` | 4단계 태스크 설계 원문 (예시 풍부) |
| `reference/workflows.md` | 팀 셋업·스폰·모니터링·종료 워크플로우 원문 |

### 실전 사례

| 파일 | 내용 |
|------|------|
| `examples/connectome-2026-03-18.md` | Connectome 프로젝트 실전 적용 레트로스펙티브 |

---

## 핵심 원칙 (5개)

```
1. 파일 소유권 없으면 병렬 없다
   → PARALLEL_PLAN.md 없이 두 에이전트 투입 금지

2. 구조화 출력으로만 컨텍스트 전달
   → 긴 히스토리(X) → { summary, evidence, risks, next_steps }(O)

3. 싱글 소스 오브 트루스
   → .context/CURRENT.md 또는 ClawTeam ~/.clawteam/ 중 하나만

4. 검증 루프 내장
   → 중요 변경 전후 Reviewer 에이전트 필수 통과

5. 세션 종료 = 다음 에이전트 시작 준비
   → CURRENT.md + SESSIONS.md + 빌드 통과 + 커밋 = 완료
```

---

## 빠른 시작

```bash
# 1. A-Team 클론
git clone https://github.com/ne0cean/A-Team.git

# 2. 신규 프로젝트 초기화 (서브에이전트 자동 설치 포함)
bash A-Team/templates/project-scaffold.sh my-project ./A-Team

# 3. 작업 시작 — Claude Code에서:
# 복잡한 작업: "이 기능을 A-Team으로 구현해줘"
# 단순 작업: 직접 진행

# (선택) ClawTeam 설치 — tmux 기반 완전 격리 병렬 실행
pip install clawteam
clawteam team spawn-team my-team -n leader
clawteam spawn --team my-team --agent-name worker1 --task "..."
clawteam board attach my-team
```
