# ClawTeam CLI 레퍼런스

## 설치

```bash
pip install clawteam          # 기본 (FileTransport)
pip install clawteam[p2p]     # P2P/ZMQ 트랜스포트 포함
```

**필수 조건**: Python 3.10+, tmux, git

---

## 글로벌 플래그

```bash
clawteam --json <command>     # 모든 출력을 JSON으로
clawteam --help               # 도움말
```

---

## team — 팀 라이프사이클

```bash
# 팀 생성
clawteam team spawn-team <team-name> -n <leader-name> [-d "설명"]

# 팀 목록 조회
clawteam team discover

# 팀 상태
clawteam team status <team-name>

# 참여 요청 (다른 머신의 에이전트)
clawteam team request-join <team-name> --agent <agent-name>

# 참여 승인
clawteam team approve-join <team-name> <agent-name>

# 팀 정리 (종료 후)
clawteam team cleanup <team-name>
```

---

## spawn — 에이전트 스폰

```bash
# 기본 (tmux 백엔드, claude 커맨드, git worktree 격리)
clawteam spawn --team <team> --agent-name <name> --task "태스크 설명"

# 백엔드/커맨드 명시
clawteam spawn tmux claude --team <team> --agent-name <name> --task "..."
clawteam spawn subprocess claude --team <team> --agent-name <name> --task "..."

# 격리 없이
clawteam spawn --no-workspace --team <team> --agent-name <name> --task "..."

# 권한 승인 필요 (기본은 skip-permissions)
clawteam spawn --no-skip-permissions --team <team> --agent-name <name> --task "..."
```

| 설정 | 기본값 | 오버라이드 |
|------|--------|-----------|
| 백엔드 | tmux | `subprocess` |
| 커맨드 | claude | 임의 CLI |
| 워크스페이스 | git worktree 자동 | `--no-workspace` |
| 권한 | skip (자율) | `--no-skip-permissions` |

---

## task — 태스크 관리

```bash
# 생성
clawteam task create <team> "태스크 설명" -o <owner> [--blocked-by <id1>,<id2>]

# 상태 업데이트
clawteam task update <team> <task-id> --status <pending|in_progress|completed|blocked>

# 목록 조회
clawteam task list <team>
clawteam task list <team> --status blocked
clawteam task list <team> --owner worker1

# 단건 조회
clawteam task get <team> <task-id>

# 완료 대기 (블로킹)
clawteam task wait <team>
clawteam task wait <team> --timeout 3600 --poll-interval 10
clawteam --json task wait <team> --timeout 600   # NDJSON 스트리밍
```

**태스크 상태 전이**:
```
pending → in_progress → completed
    └──→ blocked (--blocked-by 완료 시 자동 해제)
```

---

## inbox — 에이전트 간 메시지

```bash
# 발송
clawteam inbox send <team> <recipient> "메시지"

# 전체 브로드캐스트
clawteam inbox broadcast <team> "메시지"

# 수신 (소비, 삭제)
clawteam inbox receive <team> --agent <agent-name>

# 엿보기 (비소비)
clawteam inbox peek <team> --agent <agent-name>

# 실시간 감시
clawteam inbox watch <team> --agent <agent-name>
```

> ⚠️ `receive`는 파일을 삭제한다. 재처리가 필요하면 `peek` 사용.

---

## board — 모니터링

```bash
# 팀 칸반 보드
clawteam board show <team>

# 실시간 갱신
clawteam board live <team> [--interval 3]

# 전체 팀 개요
clawteam board overview

# tmux 타일뷰 (에이전트 창 전체 표시, 추천)
clawteam board attach <team>

# 웹 대시보드
clawteam board serve [--port 8080]
```

---

## plan — 계획 승인

```bash
# 워커가 계획 제출
clawteam plan submit <team> <agent-name> "계획 내용"

# 리더가 승인
clawteam plan approve <team> <agent-name>

# 리더가 거절 (피드백 포함)
clawteam plan reject <team> <agent-name> "거절 이유"
```

---

## lifecycle — 에이전트 라이프사이클

```bash
# 종료 요청
clawteam lifecycle request-shutdown <team> <agent-name>

# 종료 승인
clawteam lifecycle approve-shutdown <team> <agent-name>

# 유휴 상태 신고
clawteam lifecycle idle <team> <agent-name>
```

---

## config — 설정 관리

```bash
clawteam config show               # 현재 설정 확인
clawteam config set user <name>    # 사용자 설정
clawteam config get <key>          # 특정 설정 조회
clawteam config health             # 환경 상태 확인
```

---

## identity — 에이전트 신원

```bash
clawteam identity show             # 현재 Identity 확인
clawteam identity set              # Identity 설정
```

---

## 환경변수 요약

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `CLAWTEAM_DATA_DIR` | 데이터 저장 경로 | `~/.clawteam` |
| `CLAWTEAM_TRANSPORT` | 트랜스포트 백엔드 | `file` |
| `CLAWTEAM_REDIS_URL` | Redis URL (transport=redis 시) | - |
| `CLAWTEAM_AGENT_ID` | 에이전트 고유 ID | 자동 생성 |
| `CLAWTEAM_AGENT_NAME` | 에이전트 이름 | - |
| `CLAWTEAM_AGENT_TYPE` | `leader` 또는 `worker` | - |
| `CLAWTEAM_TEAM_NAME` | 소속 팀 이름 | - |
| `CLAWTEAM_USER` | 다중 사용자 환경에서 사용자 식별 | OS 유저명 |
