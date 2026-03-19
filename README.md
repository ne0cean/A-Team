# A-Team — 멀티 에이전트 팀 운영 레퍼런스

> ClawTeam(HKUDS) 분석 기반. 에이전트 팀을 실제 프로젝트에 투입하기 위한 설계·운영 가이드.

## 핵심 개념

```
솔로 에이전트 🤖  →  에이전트 스웜 🤖🤖🤖🤖
    (순차)                  (병렬 + 협업)
```

사람은 **목표**만 제시한다. 리더 에이전트가 스웜을 만들고, 작업을 배분하고, 결과를 통합한다.

---

## 구성 문서

| 문서 | 내용 |
|------|------|
| [`docs/architecture.md`](docs/architecture.md) | 스웜 구조, Transport 레이어, 메시지 흐름 |
| [`docs/task-design.md`](docs/task-design.md) | 태스크 설계 방법론 (분해 → 명세 → 의존성 → 일정) |
| [`docs/workflows.md`](docs/workflows.md) | 팀 셋업, 스폰, 모니터링, 종료 워크플로우 |
| [`docs/clawteam-cli.md`](docs/clawteam-cli.md) | ClawTeam CLI 전체 레퍼런스 |

---

## 빠른 시작 (ClawTeam)

```bash
pip install clawteam        # Python 3.10+
pip install clawteam[p2p]   # P2P 트랜스포트 포함

# 팀 생성
clawteam team spawn-team my-team -n leader

# 워커 스폰 (tmux + git worktree 격리, 기본값)
clawteam spawn --team my-team --agent-name worker1 --task "인증 모듈 구현"
clawteam spawn --team my-team --agent-name worker2 --task "단위 테스트 작성"

# 실시간 모니터링
clawteam board attach my-team
```

---

## 설계 철학

1. **에이전트가 에이전트를 만든다** — 리더가 `clawteam spawn`으로 워커를 동적 생성
2. **파일 기반 통신** — Zero dependency, 원자적 쓰기(tmp → rename)로 경합 없음
3. **의존성 기반 스케줄링** — Task `blocked-by` 체인으로 순서 자동 보장
4. **격리된 작업 공간** — 워커마다 독립 git worktree, 브랜치 충돌 없음
