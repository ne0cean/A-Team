# 07. ClawTeam 통합 가이드

> ClawTeam은 이 프레임워크의 **CLI 자동화 레이어**다.
> 파일 기반 수동 조율(PARALLEL_PLAN.md + CURRENT.md)로도 동일한 원칙을 적용할 수 있다.
> ClawTeam은 에이전트 수가 3명 이상이거나 장기 프로젝트에서 진가를 발휘한다.

---

## 설치

```bash
pip install clawteam          # Python 3.10+, tmux, git 필요
pip install clawteam[p2p]     # ZMQ P2P 트랜스포트 포함
```

---

## 핵심 명령 치트시트

### 팀 생성

```bash
export CLAWTEAM_AGENT_NAME="leader"
export CLAWTEAM_AGENT_TYPE="leader"
clawteam team spawn-team my-team -n leader -d "프로젝트 설명"
```

### 태스크 등록 (의존성 포함)

```bash
# 기본
T1=$(clawteam --json task create my-team "태스크 설명" -o worker1 | jq -r '.id')

# 의존성 (T1 완료 후 자동 해제)
T2=$(clawteam --json task create my-team "태스크" -o worker2 --blocked-by $T1 | jq -r '.id')

# 다중 의존성
clawteam task create my-team "통합 테스트" -o worker3 --blocked-by $T1,$T2
```

### 에이전트 스폰

```bash
# 기본 (tmux + git worktree 격리)
clawteam spawn --team my-team --agent-name worker1 --task "태스크 설명 및 기술 명세"

# subprocess 백엔드
clawteam spawn subprocess claude --team my-team --agent-name worker1 --task "..."

# 격리 없이 (단순 작업)
clawteam spawn --no-workspace --team my-team --agent-name worker1 --task "..."
```

### 통신

```bash
# 1:1 메시지
clawteam inbox send my-team leader "worker1 완료: 인증 모듈, 테스트 통과"
clawteam inbox send my-team worker2 "API 스펙 변경됨, inbox 확인"

# 전체 브로드캐스트
clawteam inbox broadcast my-team "공유 인터페이스 업데이트됨"

# 메시지 수신 (소비/삭제)
clawteam inbox receive my-team --agent leader

# 메시지 엿보기 (비소비)
clawteam inbox peek my-team --agent leader

# 실시간 감시
clawteam inbox watch my-team --agent leader
```

### 계획 승인

```bash
# 워커: 작업 전 계획 제출 (복잡한 태스크)
clawteam plan submit my-team worker1 "DB 스키마 변경 예정: users 테이블에 social_id 추가"

# 리더: 승인
clawteam plan approve my-team worker1

# 리더: 거절 + 피드백
clawteam plan reject my-team worker1 "social_id 대신 provider_accounts 별도 테이블로"
```

### 태스크 상태

```bash
# 업데이트 (워커 내부에서)
clawteam task update my-team $TASK_ID --status in_progress
clawteam task update my-team $TASK_ID --status completed

# 조회
clawteam task list my-team
clawteam task list my-team --status blocked
clawteam task list my-team --owner worker1

# 완료 대기 (블로킹)
clawteam task wait my-team --timeout 3600
```

### 모니터링

```bash
clawteam board show my-team              # 현재 칸반
clawteam board live my-team              # 실시간 갱신 (3초)
clawteam board attach my-team            # tmux 타일뷰 (권장)
clawteam board overview                  # 전체 팀 개요
clawteam board serve --port 8080         # 웹 대시보드
```

### 종료

```bash
clawteam lifecycle request-shutdown my-team worker1
clawteam lifecycle approve-shutdown my-team worker1
clawteam team cleanup my-team
```

---

## 에이전트 내부에서 자동 실행할 것

ClawTeam이 스폰하면 에이전트 컨텍스트에 자동 주입되는 환경변수:

```bash
CLAWTEAM_AGENT_ID="worker1-abc123"
CLAWTEAM_AGENT_NAME="worker1"
CLAWTEAM_AGENT_TYPE="worker"
CLAWTEAM_TEAM_NAME="my-team"
```

에이전트 CLAUDE.md에 이 패턴을 세션 시작 루틴으로 포함시킨다:

```markdown
## 세션 시작 시 (ClawTeam 환경)
1. `clawteam inbox receive {CLAWTEAM_TEAM_NAME} --agent {CLAWTEAM_AGENT_NAME}` — 메시지 확인
2. `clawteam task list {CLAWTEAM_TEAM_NAME} --owner {CLAWTEAM_AGENT_NAME}` — 내 태스크 확인
3. CURRENT.md 정독
4. 담당 태스크 착수 후: `clawteam task update ... --status in_progress`
```

---

## Transport 레이어

| 방식 | 환경변수 | 적합 |
|------|----------|------|
| FileTransport (기본) | `CLAWTEAM_TRANSPORT=file` | 단일 머신, 공유 드라이브 |
| P2PTransport (ZMQ) | `CLAWTEAM_TRANSPORT=p2p` | 실시간 저지연, 멀티 머신 |

```bash
# 크로스 머신 공유 스토리지
export CLAWTEAM_DATA_DIR=/mnt/shared/clawteam

# 머신 B에서 팀 참여
clawteam team request-join my-team --agent worker-b
# 머신 A에서 승인
clawteam team approve-join my-team worker-b
```

---

## ClawTeam vs 수동 조율 비교

| 항목 | ClawTeam | 수동 (파일 기반) |
|------|----------|-----------------|
| 에이전트 스폰 | `clawteam spawn` 자동 | 수동으로 새 창/세션 열기 |
| 태스크 상태 | DB 자동 추적 | CURRENT.md 수동 갱신 |
| 의존성 | `--blocked-by` 자동 해제 | 직렬 블록 수동 감시 |
| 격리 | worktree 자동 생성 | `git checkout -b` 수동 |
| 모니터링 | `board live` / tmux 타일뷰 | CURRENT.md 주기적 확인 |
| 통신 | inbox 메시지 큐 | CURRENT.md + 구두 |
| 진입 장벽 | pip install + Python 3.10 | 없음 |

**추천**: 에이전트 2명, 단기 스프린트 → 수동 / 에이전트 3명 이상, 장기 프로젝트 → ClawTeam

---

## JSON 스크립팅

```bash
# 태스크 생성 후 ID 추출
TASK_ID=$(clawteam --json task create my-team "작업명" | jq -r '.id')

# 팀 상태 파싱
clawteam --json board show my-team | jq '.taskSummary'
# { "total": 6, "pending": 2, "in_progress": 3, "completed": 1, "blocked": 0 }

# 완료된 태스크만 추출
clawteam --json task list my-team | jq '[.[] | select(.status == "completed") | .subject]'
```
