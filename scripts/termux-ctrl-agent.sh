#!/data/data/com.termux/files/usr/bin/bash
# Termux Control Agent — PC(ADB shell)에서 Termux 유저(u0_a533) 권한 원격 실행 브릿지
#
# 목적: Android 14+ 데이터 격리(shell uid 2000 → Termux 앱 디렉토리 R/W 불가) 우회.
#       Termux 안에서 도는 폴링 데몬이 /sdcard(양쪽 R/W)를 IPC 채널로 사용.
#
# 아키텍처:
#   PC/Claude (ADB shell) → /sdcard/Download/termux_ctrl.req (bash 명령 작성)
#   Agent (Termux, u0_a533) → 1초 폴링 → 실행 → /sdcard/Download/termux_ctrl.resp (결과 기록)
#   PC/Claude → resp 읽기 → 다음 명령
#
# 부트스트랩 (1회, Termux 앱에서 직접):
#   bash /data/local/tmp/termux-ctrl-agent.sh install
#
# 이후 자동: ~/.termux/boot/termux-ctrl-agent.sh 로 자기 복제 → 재부팅 시 자동 시작.
#
# PC측 호출 예 (bash):
#   ID="REQ_$(date +%s)_$$"
#   adb shell "printf '%s\n' '$ID' 'ls ~/.termux/boot/' > /sdcard/Download/termux_ctrl.req"
#   sleep 2
#   adb shell cat /sdcard/Download/termux_ctrl.resp

REQ=/sdcard/Download/termux_ctrl.req
RESP=/sdcard/Download/termux_ctrl.resp
LOG=/sdcard/Download/termux_ctrl.log
PID_FILE=/sdcard/Download/termux_ctrl.pid
SELF="${BASH_SOURCE[0]:-$0}"
BOOT_DIR="$HOME/.termux/boot"
BOOT_TARGET="$BOOT_DIR/termux-ctrl-agent.sh"
SHORTCUT_DIR="$HOME/.shortcuts"

mode="${1:-run}"

# ── Install: 자기 자신을 ~/.termux/boot/로 복제 + 백그라운드 실행 ──
if [ "$mode" = "install" ]; then
    echo "=== Termux Control Agent 설치 ==="
    mkdir -p "$BOOT_DIR" "$SHORTCUT_DIR"

    # 기존 agent kill
    if [ -f "$PID_FILE" ]; then
        OLD=$(cat "$PID_FILE" 2>/dev/null)
        [ -n "$OLD" ] && kill "$OLD" 2>/dev/null
        sleep 1
    fi
    pkill -f 'termux-ctrl-agent.sh run' 2>/dev/null || true
    sleep 1

    # ~/.termux/boot/로 복사 (재부팅 자동 시작)
    cp "$SELF" "$BOOT_TARGET"
    chmod +x "$BOOT_TARGET"
    echo "✓ $BOOT_TARGET"

    # 수동 재시작 단축키 (디버깅/복구용)
    cat > "$SHORTCUT_DIR/termux_ctrl_restart" << 'SHORTCUT'
#!/data/data/com.termux/files/usr/bin/bash
pkill -f 'termux-ctrl-agent.sh run' 2>/dev/null
sleep 1
(setsid bash ~/.termux/boot/termux-ctrl-agent.sh run < /dev/null > /dev/null 2>&1 &)
termux-toast "termux_ctrl restarted" 2>/dev/null || true
SHORTCUT
    chmod +x "$SHORTCUT_DIR/termux_ctrl_restart"
    echo "✓ $SHORTCUT_DIR/termux_ctrl_restart"

    # 즉시 백그라운드 실행 (~/.termux/boot/ 버전 사용)
    # 이중 fork로 init(PID 1) reparent — 부모 프로세스 그룹 timeout/종료 영향 받지 않음
    (setsid bash "$BOOT_TARGET" run < /dev/null > /dev/null 2>&1 &)
    sleep 1
    AGENT_PID=$(cat "$PID_FILE" 2>/dev/null || echo unknown)
    sleep 1
    echo "✓ 실행 중 (PID $AGENT_PID)"
    echo ""
    echo "검증: adb shell cat $LOG"
    exit 0
fi

# ── Run: 폴링 루프 ──
# Singleton PID guard
if [ -f "$PID_FILE" ]; then
    OLD=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$OLD" ] && kill -0 "$OLD" 2>/dev/null; then
        echo "$(date): 이미 실행 중 (PID $OLD)" >> "$LOG"
        exit 0
    fi
fi
echo "$$" > "$PID_FILE"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') ctrl: $1" >> "$LOG"; }
log "started (PID $$, uid=$(id -u))"

trap 'log "stopping (SIGTERM)"; rm -f "$PID_FILE"; exit 0' TERM
trap 'log "stopping (SIGINT)"; rm -f "$PID_FILE"; exit 0' INT

# 폴링 루프
while true; do
    if [ -f "$REQ" ]; then
        REQ_ID=$(head -1 "$REQ" 2>/dev/null)
        CMD=$(tail -n +2 "$REQ" 2>/dev/null)
        rm -f "$REQ"

        log "exec req=$REQ_ID"

        START_TS=$(date +%s)
        RESULT=$(timeout 60 bash -c "$CMD" 2>&1)
        RC=$?
        END_TS=$(date +%s)
        DUR=$((END_TS - START_TS))

        {
            echo "$REQ_ID"
            echo "rc=$RC"
            echo "duration=${DUR}s"
            echo "--- output ---"
            echo "$RESULT"
            echo "--- end ---"
        } > "$RESP"

        log "done req=$REQ_ID rc=$RC dur=${DUR}s"
    fi
    sleep 1
done
