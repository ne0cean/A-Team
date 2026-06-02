---
description: /watchdog — 범용 프로세스 감시 데몬 관리. 실행/중지/상태/로그 확인.
---

프로세스 감시 데몬을 시작하거나 관리한다.
스크립트: `~/Projects/a-team/scripts/watchdog.sh`

## 사용 시점

- "watchdog 붙여줘", "자동 재기동 설정해줘", "죽으면 살려줘" 요청 시
- 기존 프로젝트 watchdog을 범용 스크립트로 교체할 때
- 데몬 상태 확인 / 로그 보기 / 중지 요청 시

## Step 1 — 의도 파악

사용자 요청에서 다음을 확인:

| 확인 항목 | 질문 (불명확할 때만) |
|-----------|---------------------|
| 감시 대상 이름 | "어떤 앱을 감시할까요?" |
| 실행 명령어 | "어떤 명령어로 실행하나요?" |
| 동작 모드 | start / stop / status / log |

명확하면 바로 Step 2로.

## Step 2 — 동작 분기

### start (기본)

```bash
bash ~/Projects/a-team/scripts/watchdog.sh \
  --name "NAME" \
  --command "COMMAND" \
  --workdir "WORKDIR" \
  --check-interval 30 \
  --daemon
```

**포트 감시 (Trading 호환):**
```bash
bash ~/Projects/a-team/scripts/watchdog.sh \
  --name "trading-backend" \
  --command "PYTHONPATH=. .venv/bin/python -m uvicorn bot.dashboard.app:app --host 0.0.0.0 --port 8000" \
  --workdir ~/Projects/Trading \
  --port 8000 \
  --check-interval 15 \
  --daemon
```

**heartbeat 감시:**
```bash
bash ~/Projects/a-team/scripts/watchdog.sh \
  --name "myapp" \
  --command "/path/to/daemon" \
  --heartbeat-file /tmp/myapp.heartbeat \
  --heartbeat-stale 180 \
  --daemon
```

### stop

```bash
# 특정 watchdog 중지
kill "$(cat /tmp/watchdog-NAME.pid)"
rm -f /tmp/watchdog-NAME.pid
```

### status

```bash
# 실행 중인 watchdog 전체 확인
ls /tmp/watchdog-*.pid 2>/dev/null | while read f; do
  name=$(basename "$f" .pid | sed 's/watchdog-//')
  pid=$(cat "$f")
  if kill -0 "$pid" 2>/dev/null; then
    echo "● $name (PID: $pid) — 실행 중"
  else
    echo "○ $name — 중지됨 (stale PID 파일)"
  fi
done
```

### log

```bash
# 최근 로그
tail -50 ~/Library/Logs/watchdog-NAME.log

# 실시간
tail -f ~/Library/Logs/watchdog-NAME.log
```

## Step 3 — 마이그레이션 제안

기존 watchdog 발견 시 교체 가이드만 출력. **기존 파일은 수정하지 않는다.**

### Trading (scripts/watchdog.sh → 범용 교체)

```bash
# 기존 중지
pkill -f "scripts/watchdog.sh" 2>/dev/null || true

# 범용으로 교체 (백엔드)
bash ~/Projects/a-team/scripts/watchdog.sh \
  --name "trading-backend" \
  --command "PYTHONPATH=. .venv/bin/python -m uvicorn bot.dashboard.app:app --host 0.0.0.0 --port 8000" \
  --workdir ~/Projects/Trading \
  --port 8000 --check-interval 15 --daemon

# 범용으로 교체 (프론트엔드)
bash ~/Projects/a-team/scripts/watchdog.sh \
  --name "trading-frontend" \
  --command "npx next dev --port 3000" \
  --workdir ~/Projects/Trading/web-dashboard \
  --port 3000 --check-interval 15 --daemon
```

### mole Guardian (교체 불필요)

mole은 **launchd**로 관리 중 (`com.noir.memory-guardian`).
macOS 영속성은 launchd가 우월 — 교체 권장 안 함.
`mo guard status` 로 상태 확인.

### t33a relay (교체 불가)

t33a_relay.sh는 Android shell(`/system/bin/sh`) 전용.
watchdog.sh는 macOS/Linux bash 환경 전용 — 교체 불가.
기존 relay.sh 계속 사용.

## 파일 위치

| 항목 | 경로 |
|------|------|
| 스크립트 | `~/Projects/a-team/scripts/watchdog.sh` |
| PID 파일 | `/tmp/watchdog-{name}.pid` |
| 로그 | `~/Library/Logs/watchdog-{name}.log` |

## 옵션 레퍼런스

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--name NAME` | (필수) | 감시 대상 이름 |
| `--command "CMD"` | (필수) | 실행 명령어 |
| `--workdir DIR` | 현재 디렉토리 | 명령어 실행 위치 |
| `--check-interval N` | 30 | 감시 주기 (초) |
| `--max-restarts N` | 10 | 시간창 내 최대 재기동 |
| `--restart-window N` | 3600 | 재기동 집계 시간창 (초) |
| `--restart-delay N` | 3 | 재기동 전 대기 (초) |
| `--port N` | - | 포트 감시 모드 (Trading 호환) |
| `--heartbeat-file PATH` | - | heartbeat 파일 감시 |
| `--heartbeat-stale N` | 180 | heartbeat 허용 지연 (초) |
| `--notify-cmd "CMD"` | 자동 탐색 | 알림 명령어 |
| `--daemon` | - | 백그라운드 실행 |
