# A-Team — 멀티 에이전트 팀 운영 레퍼런스

> ClawTeam(HKUDS) 분석 기반. 에이전트 팀을 실제 프로젝트에 투입하기 위한 설계·운영 가이드.
> **어떤 프로젝트에도 적용 가능한 범용 툴킷.**

## 핵심 개념

```
솔로 에이전트 🤖  →  에이전트 스웜 🤖🤖🤖🤖
    (순차)                  (병렬 + 협업)
```

사람은 **목표**만 제시한다. 리더 에이전트가 스웜을 만들고, 작업을 배분하고, 결과를 통합한다.

---

## 빠른 시작

### 새 프로젝트에 적용

```bash
# 1. 프로젝트 초기화 (context 디렉토리 + CLAUDE.md 자동 생성)
bash templates/project-scaffold.sh my-project

# 2. PARALLEL_PLAN.md로 태스크 설계
cp templates/PARALLEL_PLAN.md ./PARALLEL_PLAN.md
# → 에이전트 구성, 파일 소유권, 태스크 목록 작성

# 3. 에이전트 스폰 (ClawTeam 사용 시)
pip install clawteam
clawteam team spawn-team my-team -n leader
clawteam spawn --team my-team --agent-name worker1 --task "..."
clawteam board attach my-team
```

### ClawTeam 없이 (수동 모드)

```bash
# 1. 프로젝트 초기화
bash templates/project-scaffold.sh my-project

# 2. PARALLEL_PLAN.md 작성
# 3. 각 에이전트에게 각자 섹션의 PARALLEL_PLAN.md 전달
# 4. 완료 시마다 .context/CURRENT.md 갱신
# 5. git branch로 격리: git checkout -b agent/worker1
```

---

## 구성 문서

### 핵심 방법론

| 문서 | 내용 |
|------|------|
| [`docs/06-build-methodology.md`](docs/06-build-methodology.md) | **5-Phase 빌드 라이프사이클** (전체 워크플로우 완전판) |
| [`docs/07-clawteam.md`](docs/07-clawteam.md) | ClawTeam CLI 통합 가이드 + 치트시트 |

### 세부 원칙

| 문서 | 내용 |
|------|------|
| [`docs/01-role-partitioning.md`](docs/01-role-partitioning.md) | 역할 분할 원칙 (레벨 + 도메인) |
| [`docs/02-conflict-prevention.md`](docs/02-conflict-prevention.md) | 파일 충돌 방지 (소유권 + 브랜치 + CURRENT.md) |
| [`docs/03-model-selection.md`](docs/03-model-selection.md) | 태스크별 모델 선택 가이드 |
| [`docs/04-coordination-protocol.md`](docs/04-coordination-protocol.md) | 에이전트 간 비동기 조율 프로토콜 |
| [`reference/architecture.md`](reference/architecture.md) | ClawTeam 스웜 구조 & 메시지 흐름 |
| [`reference/task-design.md`](reference/task-design.md) | 태스크 설계 방법론 (4단계) |
| [`reference/workflows.md`](reference/workflows.md) | 팀 셋업·스폰·모니터링·종료 워크플로우 |
| [`reference/clawteam-cli.md`](reference/clawteam-cli.md) | ClawTeam CLI 전체 레퍼런스 |

### 템플릿

| 파일 | 용도 |
|------|------|
| [`templates/PARALLEL_PLAN.md`](templates/PARALLEL_PLAN.md) | 병렬 태스크 플랜 (에이전트 구성 + 파일 소유권 + DoD) |
| [`templates/task-spec.md`](templates/task-spec.md) | 단일 태스크 기술 명세 (에이전트 프롬프트 템플릿) |
| [`templates/project-scaffold.sh`](templates/project-scaffold.sh) | 신규 프로젝트 초기화 스크립트 |

### 실제 사례

| 파일 | 내용 |
|------|------|
| [`examples/connectome-2026-03-18.md`](examples/connectome-2026-03-18.md) | Connectome 프로젝트 실전 적용 레트로스펙티브 |

---

## 설계 철학

1. **에이전트가 에이전트를 만든다** — 리더가 `clawteam spawn`으로 워커를 동적 생성
2. **파일 기반 통신** — Zero dependency, 원자적 쓰기(tmp → rename)로 경합 없음
3. **의존성 기반 스케줄링** — Task `blocked-by` 체인으로 순서 자동 보장
4. **격리된 작업 공간** — 워커마다 독립 git worktree, 브랜치 충돌 없음
5. **모델 비용 최적화** — 태스크 복잡도에 맞는 모델 배정, Research는 항상 Haiku

---

## 빠른 의사결정

```
에이전트 몇 명?
├── 1명 → 일반 세션
└── 2명 이상 →
    파일 겹침 가능성?
    ├── 없음 → branch 격리 + PARALLEL_PLAN.md
    └── 있음 → clawteam spawn (worktree 자동) 권장

태스크 의존성?
├── 없음 → 전체 병렬
└── 있음 → blocked-by 또는 직렬 처리 블록
```

---

## ClawTeam 설치

```bash
pip install clawteam        # Python 3.10+, tmux, git 필요
pip install clawteam[p2p]   # P2P 트랜스포트 포함

# 팀 생성
clawteam team spawn-team my-team -n leader

# 워커 스폰
clawteam spawn --team my-team --agent-name worker1 --task "인증 모듈 구현"
clawteam spawn --team my-team --agent-name worker2 --task "단위 테스트 작성"

# 실시간 모니터링
clawteam board attach my-team
```
