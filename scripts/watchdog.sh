#!/usr/bin/env bash
# watchdog.sh — 범용 프로세스 감시 + 자동 재기동 데몬
# 사용: bash watchdog.sh --name "myapp" --command "node server.js" [옵션...]
#
# 공통 패턴 통합:
#   - Trading/scripts/watchdog.sh  → 프로세스 감시 + 재기동
#   - mole/bin/memory-guardian.sh  → 로그 로테이션 + 알림
#   - t33a-remapper/scripts/t33a_relay.sh → PID 파일 + heartbeat + postmortem
#
# 주의: 이 스크립트는 기존 프로젝트 코드를 수정하지 않음.
#       기존 watchdog을 교체하려면 아래 "마이그레이션 가이드" 참조.

set -euo pipefail

# ─── 기본값 ─────────────────────────────────────────────────

NAME=""
COMMAND=""
WORKDIR="$PWD"
CHECK_INTERVAL=30
MAX_RESTARTS=10
RESTART_WINDOW=3600     # 이 시간(초) 안에 MAX_RESTARTS 초과 시 포기
RESTART_DELAY=3
HEARTBEAT_FILE=""       # 지정 시 heartbeat staleness 감지 활성
HEARTBEAT_STALE_SEC=180 # heartbeat 파일 갱신 없으면 hung으로 판단
NOTIFY_CMD=""           # 알림 명령 (예: telegram-notify.sh). 없으면 자동 탐색.
PORT=""                 # 지정 시 포트 감시 모드 (Trading 호환)
DAEMON=0                # 1이면 백그라운드로 자신을 실행

# ─── 파싱 ────────────────────────────────────────────────────

usage() {
    cat <<EOF
사용법: watchdog.sh [옵션]

필수:
  --name NAME           감시 대상 이름 (PID/로그 파일명에 사용)
  --command "CMD"       실행할 명령어

선택:
  --workdir DIR         명령어 실행 디렉토리 (기본: 현재 디렉토리)
  --check-interval N    감시 주기 (초, 기본: 30)
  --max-restarts N      최대 재기동 횟수/시간창 (기본: 10)
  --restart-window N    재기동 횟수 집계 시간창 (초, 기본: 3600)
  --restart-delay N     재기동 전 대기 (초, 기본: 3)
  --heartbeat-file PATH heartbeat 파일 감시 (t33a relay 호환)
  --heartbeat-stale N   heartbeat 허용 지연 (초, 기본: 180)
  --notify-cmd "CMD"    알림 명령어 (없으면 telegram-notify.sh 자동 탐색)
  --port N              포트 감시 모드 (Trading watchdog 호환)
  --daemon              백그라운드 데몬으로 실행

파일:
  PID:  /tmp/watchdog-{NAME}.pid
  LOG:  ~/Library/Logs/watchdog-{NAME}.log

예시:
  # 기본 프로세스 감시
  watchdog.sh --name "trading-backend" \\
    --command "PYTHONPATH=. .venv/bin/python -m uvicorn bot.dashboard.app:app" \\
    --workdir ~/Projects/Trading \\
    --check-interval 15

  # 포트 감시 모드 (Trading 호환)
  watchdog.sh --name "trading-frontend" \\
    --command "npx next dev --port 3000" \\
    --workdir ~/Projects/Trading/web-dashboard \\
    --port 3000

  # heartbeat 감시 (t33a relay 호환)
  watchdog.sh --name "t33a" \\
    --command "/data/local/tmp/t33a_remap" \\
    --heartbeat-file /data/local/tmp/t33a.heartbeat \\
    --heartbeat-stale 180

  # 백그라운드 데몬 + Telegram 알림
  watchdog.sh --name "myapp" --command "node server.js" --daemon

마이그레이션 가이드:
  Trading:
    기존: bash scripts/watchdog.sh
    교체: bash ~/Projects/a-team/scripts/watchdog.sh \\
            --name trading-backend \\
            --command "PYTHONPATH=. .venv/bin/python -m uvicorn bot.dashboard.app:app --host 0.0.0.0 --port 8000" \\
            --workdir ~/Projects/Trading \\
            --check-interval 15 \\
            --port 8000

  mole Guardian (launchd plist 사용 중 → 계속 launchd 사용 권장):
    watchdog.sh는 단순 루프 데몬. macOS 영속성은 launchd가 우월.
    launchd plist의 ProgramArguments에 watchdog.sh를 래핑 용도로 사용 가능.

  t33a relay:
    t33a_relay.sh는 Android shell(/system/bin/sh)에서 동작 — bash 불가.
    watchdog.sh는 macOS/Linux bash 환경 전용. t33a는 기존 relay.sh 유지.
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --name)              NAME="$2";               shift 2 ;;
        --command)           COMMAND="$2";            shift 2 ;;
        --workdir)           WORKDIR="$2";            shift 2 ;;
        --check-interval)    CHECK_INTERVAL="$2";     shift 2 ;;
        --max-restarts)      MAX_RESTARTS="$2";       shift 2 ;;
        --restart-window)    RESTART_WINDOW="$2";     shift 2 ;;
        --restart-delay)     RESTART_DELAY="$2";      shift 2 ;;
        --heartbeat-file)    HEARTBEAT_FILE="$2";     shift 2 ;;
        --heartbeat-stale)   HEARTBEAT_STALE_SEC="$2"; shift 2 ;;
        --notify-cmd)        NOTIFY_CMD="$2";         shift 2 ;;
        --port)              PORT="$2";               shift 2 ;;
        --daemon)            DAEMON=1;                shift ;;
        --help|-h)           usage ;;
        *) echo "알 수 없는 옵션: $1" >&2; exit 1 ;;
    esac
done

# ─── 검증 ────────────────────────────────────────────────────

[[ -z "$NAME" ]]    && { echo "오류: --name 필수" >&2; exit 1; }
[[ -z "$COMMAND" ]] && { echo "오류: --command 필수" >&2; exit 1; }

# NAME에 경로 구분자 금지
NAME="${NAME//\//-}"
NAME="${NAME// /_}"

# ─── 경로 설정 ───────────────────────────────────────────────

PID_FILE="/tmp/watchdog-${NAME}.pid"
LOG_DIR="${HOME}/Library/Logs"
LOG_FILE="${LOG_DIR}/watchdog-${NAME}.log"
MAX_LOG_LINES=5000

mkdir -p "$LOG_DIR"

# ─── 데몬 모드 ───────────────────────────────────────────────

if [[ "$DAEMON" -eq 1 ]]; then
    # 이미 데몬으로 실행 중이면 스킵
    if [[ -f "$PID_FILE" ]]; then
        OLD_PID=$(cat "$PID_FILE" 2>/dev/null || echo "")
        if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
            echo "[watchdog] 이미 실행 중 (PID: $OLD_PID)" >&2
            exit 0
        fi
    fi

    # 자신을 --daemon 없이 백그라운드 실행
    nohup bash "$0" \
        --name "$NAME" \
        --command "$COMMAND" \
        --workdir "$WORKDIR" \
        --check-interval "$CHECK_INTERVAL" \
        --max-restarts "$MAX_RESTARTS" \
        --restart-window "$RESTART_WINDOW" \
        --restart-delay "$RESTART_DELAY" \
        ${HEARTBEAT_FILE:+--heartbeat-file "$HEARTBEAT_FILE"} \
        ${HEARTBEAT_STALE_SEC:+--heartbeat-stale "$HEARTBEAT_STALE_SEC"} \
        ${NOTIFY_CMD:+--notify-cmd "$NOTIFY_CMD"} \
        ${PORT:+--port "$PORT"} \
        >> "$LOG_FILE" 2>&1 &

    DAEMON_PID=$!
    echo "$DAEMON_PID" > "$PID_FILE"
    echo "[watchdog] 백그라운드 시작 (PID: $DAEMON_PID)"
    echo "[watchdog] 로그: $LOG_FILE"
    echo "[watchdog] 중지: kill \$(cat $PID_FILE)"
    exit 0
fi

# ─── 중복 실행 방지 ──────────────────────────────────────────

if [[ -f "$PID_FILE" ]]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null || echo "")
    if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
        echo "[watchdog/${NAME}] 이미 실행 중 (PID: $OLD_PID). 종료하려면: kill $OLD_PID" >&2
        exit 1
    fi
fi

echo "$$" > "$PID_FILE"
trap 'rm -f "$PID_FILE"; log "INFO" "watchdog 종료 (PID=$$)"; exit 0' EXIT INT TERM

# ─── 유틸리티 ────────────────────────────────────────────────

log() {
    local level="$1" msg="$2"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "${ts} [${level}] ${msg}" | tee -a "$LOG_FILE"
}

rotate_log() {
    if [[ -f "$LOG_FILE" ]]; then
        local lines
        lines=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
        if (( lines > MAX_LOG_LINES )); then
            tail -n 2000 "$LOG_FILE" > "${LOG_FILE}.tmp"
            mv "${LOG_FILE}.tmp" "$LOG_FILE"
            log "INFO" "로그 로테이션 (${lines} → 2000줄)"
        fi
    fi
}

# ─── 알림 ────────────────────────────────────────────────────

# telegram-notify.sh 자동 탐색
if [[ -z "$NOTIFY_CMD" ]]; then
    for candidate in \
        "${HOME}/Projects/a-team/scripts/telegram-notify.sh" \
        "${HOME}/.local/bin/telegram-notify.sh" \
        "$(command -v telegram-notify.sh 2>/dev/null || true)"
    do
        if [[ -x "$candidate" ]]; then
            NOTIFY_CMD="$candidate"
            break
        fi
    done
fi

notify() {
    local title="$1" msg="$2"

    # Telegram (있을 때)
    if [[ -n "$NOTIFY_CMD" ]]; then
        "$NOTIFY_CMD" "[${NAME}] ${title}: ${msg}" 2>/dev/null || true
        return
    fi

    # macOS 알림 (fallback)
    if command -v osascript &>/dev/null; then
        osascript -e "display notification \"${msg}\" with title \"watchdog: ${title}\"" 2>/dev/null || true
    fi
}

# ─── 프로세스 체크 ───────────────────────────────────────────

CHILD_PID=""

is_running() {
    # 포트 감시 모드 (Trading watchdog 호환)
    if [[ -n "$PORT" ]]; then
        lsof -i ":${PORT}" -sTCP:LISTEN >/dev/null 2>&1
        return $?
    fi

    # heartbeat 감시 (t33a relay 호환)
    if [[ -n "$HEARTBEAT_FILE" && -f "$HEARTBEAT_FILE" ]]; then
        local mtime now age
        mtime=$(stat -f %m "$HEARTBEAT_FILE" 2>/dev/null || stat -c %Y "$HEARTBEAT_FILE" 2>/dev/null || echo 0)
        now=$(date +%s)
        age=$(( now - mtime ))
        if (( age > HEARTBEAT_STALE_SEC )); then
            log "WARN" "heartbeat stale (${age}초 경과, 한계: ${HEARTBEAT_STALE_SEC}초)"
            return 1
        fi
    fi

    # PID 감시 (기본)
    if [[ -n "$CHILD_PID" ]]; then
        kill -0 "$CHILD_PID" 2>/dev/null
        return $?
    fi

    return 1
}

# ─── 재기동 ──────────────────────────────────────────────────

start_process() {
    cd "$WORKDIR" || {
        log "ERROR" "workdir 진입 실패: $WORKDIR"
        return 1
    }

    eval "$COMMAND" &
    CHILD_PID=$!
    log "INFO" "시작 (PID: $CHILD_PID) 명령: $COMMAND"
    sleep "$RESTART_DELAY"

    # 시작 직후 죽었는지 확인
    if ! kill -0 "$CHILD_PID" 2>/dev/null; then
        log "ERROR" "시작 직후 종료 (PID: $CHILD_PID)"
        CHILD_PID=""
        return 1
    fi

    return 0
}

stop_process() {
    if [[ -n "$CHILD_PID" ]] && kill -0 "$CHILD_PID" 2>/dev/null; then
        kill "$CHILD_PID" 2>/dev/null || true
        sleep 1
        kill -9 "$CHILD_PID" 2>/dev/null || true
    fi
    CHILD_PID=""
}

# ─── 재기동 횟수 추적 ────────────────────────────────────────

RESTART_TIMES=()

record_restart() {
    local now
    now=$(date +%s)
    RESTART_TIMES+=("$now")

    # 시간창 밖 항목 제거
    local window_start=$(( now - RESTART_WINDOW ))
    local new_times=()
    for t in "${RESTART_TIMES[@]}"; do
        (( t >= window_start )) && new_times+=("$t")
    done
    RESTART_TIMES=("${new_times[@]}")
}

restart_limit_exceeded() {
    (( ${#RESTART_TIMES[@]} >= MAX_RESTARTS ))
}

# ─── 메인 루프 ───────────────────────────────────────────────

log "INFO" "watchdog 시작 (PID=$$, name=${NAME}, interval=${CHECK_INTERVAL}s)"
log "INFO" "command: $COMMAND"
log "INFO" "workdir: $WORKDIR"
[[ -n "$PORT" ]]           && log "INFO" "포트 감시: ${PORT}"
[[ -n "$HEARTBEAT_FILE" ]] && log "INFO" "heartbeat: ${HEARTBEAT_FILE} (stale=${HEARTBEAT_STALE_SEC}s)"
[[ -n "$NOTIFY_CMD" ]]     && log "INFO" "알림: ${NOTIFY_CMD}"

# 최초 기동
start_process || {
    log "ERROR" "최초 기동 실패"
    notify "기동 실패" "최초 실행 중 오류 발생"
    exit 1
}

while true; do
    sleep "$CHECK_INTERVAL"
    rotate_log

    if ! is_running; then
        log "WARN" "프로세스 다운 감지"

        if restart_limit_exceeded; then
            log "ERROR" "재기동 한계 초과 (${#RESTART_TIMES[@]}/${MAX_RESTARTS} in ${RESTART_WINDOW}s) — watchdog 종료"
            notify "재기동 한계 초과" "${#RESTART_TIMES[@]}회 재기동 후 포기. 수동 확인 필요."
            exit 1
        fi

        stop_process

        record_restart
        local_count=${#RESTART_TIMES[@]}
        log "INFO" "재기동 시도 (${local_count}/${MAX_RESTARTS})"
        notify "재기동" "${local_count}번째 재기동"

        if ! start_process; then
            log "ERROR" "재기동 실패"
            notify "재기동 실패" "명령 실행 오류"
        fi
    fi
done
