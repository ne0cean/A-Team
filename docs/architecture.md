# 아키텍처 — 스웜 구조 & 메시지 흐름

## 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                     사용자 (목표 제시)                     │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│               리더 에이전트 (Leader)                      │
│  - 스웜 생성 (clawteam spawn)                            │
│  - 태스크 분배 (clawteam task create)                    │
│  - 진행 모니터링 (clawteam board live)                   │
│  - 결과 통합                                             │
└──────┬──────────────┬──────────────┬────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Worker1  │  │ Worker2  │  │ Worker3  │
│ (전문화) │  │ (전문화) │  │ (전문화) │
│ 독립 워크 │  │ 독립 워크 │  │ 독립 워크 │
│ 트리     │  │ 트리     │  │ 트리     │
└──────────┘  └──────────┘  └──────────┘
       │              │              │
       └──────────────┴──────────────┘
                      │
              공유 파일시스템
           (~/.clawteam/teams/)
```

---

## Transport 레이어

메시지 통신은 **Transport 추상 레이어**로 분리되어 있어, 스토리지 백엔드를 교체해도 상위 로직이 바뀌지 않는다.

### FileTransport (기본)

```
에이전트 A  →  MailboxManager  →  FileTransport
                                       │
                              inboxes/B/msg-{ts}-{uuid}.json
                              (원자적: .tmp-xxx 임시파일 → rename)
```

- 단일 머신 / 공유 드라이브(SSHFS, 클라우드 드라이브) 환경
- 의존성 없음, 경합 없음

### P2PTransport (선택, ZeroMQ)

```
에이전트 A  →  P2PTransport ─── ZMQ PUSH ──→  에이전트 B (PULL)
                    │
                    └── 오프라인 폴백: FileTransport
```

- 실시간 저지연 통신
- 수신자가 오프라인이면 파일로 자동 폴백, 온라인 복귀 시 수거
- `pip install clawteam[p2p]` 필요

### 환경변수로 선택

```bash
export CLAWTEAM_TRANSPORT=file   # 기본
export CLAWTEAM_TRANSPORT=p2p    # ZMQ 활성화
export CLAWTEAM_DATA_DIR=/mnt/shared/clawteam  # 공유 스토리지 경로
```

---

## 공유 상태 구조

```
~/.clawteam/
└── teams/
    └── {team-name}/
        ├── config.json        # 팀 메타데이터, 멤버 목록
        ├── tasks/
        │   └── task-{id}.json # 태스크 (status, owner, blockedBy...)
        ├── inboxes/
        │   └── {agent}/
        │       └── msg-*.json # 메시지 큐 (읽으면 삭제)
        ├── peers/
        │   └── {agent}.json   # P2P 주소 (host:port)
        └── board/             # 칸반 보드 캐시
```

- **메시지**: 임시(읽으면 삭제), 신호/알림 용도
- **태스크/설정**: 영구, 모든 에이전트가 공유

---

## 에이전트 Identity

스폰 시 자동 주입되는 환경변수:

```bash
CLAWTEAM_AGENT_ID="worker1-abc123"
CLAWTEAM_AGENT_NAME="worker1"
CLAWTEAM_AGENT_TYPE="worker"
CLAWTEAM_TEAM_NAME="my-team"
```

---

## 격리 전략

| 방식 | 설명 |
|------|------|
| **Git Worktree** (기본) | 워커마다 독립 브랜치 + 작업 디렉토리, 충돌 없음 |
| `--no-workspace` | 격리 없이 동일 디렉토리 공유 |

```bash
# 기본: git worktree 자동 생성
clawteam spawn --team my-team --agent-name worker1 --task "..."

# 격리 없이 (단순 작업 시)
clawteam spawn --no-workspace --team my-team --agent-name worker1 --task "..."
```
