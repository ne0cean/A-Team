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

### Claude Code만 사용 (기본 — ClawTeam 불필요)

```bash
# 1. A-Team 클론
git clone https://github.com/ne0cean/A-Team.git

# 2. 프로젝트 초기화 (context + memory + harness 자동 생성)
bash A-Team/templates/init.sh my-project ./A-Team

# 3. Claude Code에서 바로 시작
# 복잡한 작업: "이 기능을 A-Team으로 구현해줘" → orchestrator 자동 호출
# 단순 작업: 직접 진행 (에이전트 불필요)
```

이것만으로 `.context/`, `memory/`, `.claude/hooks/` (Harness), 서브에이전트 5종이 모두 설치된다.

### ClawTeam 추가 (선택 — tmux 기반 완전 격리 병렬 실행)

ClawTeam은 각 에이전트를 독립 tmux 세션 + git worktree에서 실행한다.
단순 멀티에이전트 협업에는 위 Claude Code 모드로 충분하다.

```bash
pip install clawteam        # Python 3.10+, tmux, git 필요
clawteam team spawn-team my-team -n leader
clawteam spawn --team my-team --agent-name worker1 --task "인증 모듈 구현"
clawteam spawn --team my-team --agent-name worker2 --task "단위 테스트 작성"
clawteam board attach my-team
```

---

## 구성 문서

전체 문서 맵은 **[PROTOCOL.md](PROTOCOL.md)** 를 참고하세요.

### 핵심 진입점

| 파일 | 내용 |
|------|------|
| [`PROTOCOL.md`](PROTOCOL.md) | **단일 진입점** — 전체 문서 맵 + 7단계 프로토콜 |
| [`docs/06-build-methodology.md`](docs/06-build-methodology.md) | 5-Phase 빌드 라이프사이클 (전체 워크플로우) |
| [`docs/08-orchestration-patterns.md`](docs/08-orchestration-patterns.md) | TAO루프 / Supervisor / Swarm / 계층형 패턴 |

### 템플릿

| 파일 | 용도 |
|------|------|
| [`templates/init.sh`](templates/init.sh) | **통합 프로젝트 초기화** (Harness + Mirror 포함) — 권장 |
| [`templates/PARALLEL_PLAN.md`](templates/PARALLEL_PLAN.md) | 병렬 태스크 플랜 (파일 소유권 + DoD) |
| [`templates/task-spec.md`](templates/task-spec.md) | 단일 태스크 기술 명세 (에이전트 프롬프트 템플릿) |

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
