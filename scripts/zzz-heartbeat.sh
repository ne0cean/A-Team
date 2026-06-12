#!/usr/bin/env bash
# zzz-heartbeat.sh — /zzz 자율 모드 Heartbeat 모니터 (Agent Farm 패턴)
#
# 동작:
#   1. /zzz 세션이 활성 상태인지 확인 (RESUME.md mode=zzz)
#   2. 마지막 활동 시각 확인 (analytics.jsonl or heartbeat stamp)
#   3. >2분 활동 없음 → stale 판정 → 재시작 시도
#
# 사용:
#   bash scripts/zzz-heartbeat.sh check    # 1회 체크
#   bash scripts/zzz-heartbeat.sh install  # launchd 등록 (1분마다)
#   bash scripts/zzz-heartbeat.sh status   # 현재 상태 출력
#   bash scripts/zzz-heartbeat.sh remove   # launchd 제거
#
# launchd 레이블: com.ateam.zzz-heartbeat

set -euo pipefail

ATEAM_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESUME_MD="$ATEAM_ROOT/RESUME.md"
ANALYTICS="$ATEAM_ROOT/.context/analytics.jsonl"
HEARTBEAT_STAMP="$ATEAM_ROOT/.context/zzz-heartbeat.ts"
HEARTBEAT_LOG="$ATEAM_ROOT/.context/zzz-heartbeat.log"
PLIST_LABEL="com.ateam.zzz-heartbeat"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"
STALE_SECONDS=120  # 2분
MAX_LOG_LINES=200

# ── 헬퍼 ──────────────────────────────────────────────────────────────────
log() {
  local ts
  ts=$(date '+%Y-%m-%dT%H:%M:%S')
  echo "[$ts] $*" | tee -a "$HEARTBEAT_LOG" >&2
  # 로그 파일 크기 관리
  if [ -f "$HEARTBEAT_LOG" ]; then
    local lines
    lines=$(wc -l < "$HEARTBEAT_LOG" 2>/dev/null || echo 0)
    if [ "$lines" -gt "$MAX_LOG_LINES" ]; then
      tail -$((MAX_LOG_LINES / 2)) "$HEARTBEAT_LOG" > "${HEARTBEAT_LOG}.tmp" && mv "${HEARTBEAT_LOG}.tmp" "$HEARTBEAT_LOG"
    fi
  fi
}

now_epoch() { date +%s; }

# ── zzz 활성 여부 확인 ────────────────────────────────────────────────────
is_zzz_active() {
  [ -f "$RESUME_MD" ] || return 1
  grep -q 'mode: zzz' "$RESUME_MD" 2>/dev/null || return 1
  grep -q 'status: in_progress\|status: active\|^entered_at:' "$RESUME_MD" 2>/dev/null || return 1
  return 0
}

# ── 마지막 활동 시각 (epoch) ──────────────────────────────────────────────
last_activity_epoch() {
  # 우선순위 1: heartbeat stamp 파일
  if [ -f "$HEARTBEAT_STAMP" ]; then
    cat "$HEARTBEAT_STAMP" 2>/dev/null && return
  fi
  # 우선순위 2: analytics.jsonl 마지막 수정 시각
  if [ -f "$ANALYTICS" ]; then
    stat -f '%m' "$ANALYTICS" 2>/dev/null && return
  fi
  # 폴백: RESUME.md 수정 시각
  if [ -f "$RESUME_MD" ]; then
    stat -f '%m' "$RESUME_MD" 2>/dev/null && return
  fi
  echo 0
}

# ── 활동 스탬프 업데이트 ──────────────────────────────────────────────────
update_heartbeat_stamp() {
  now_epoch > "$HEARTBEAT_STAMP"
}

# ── stale 감지 및 재시작 ──────────────────────────────────────────────────
check_stale() {
  local last_activity
  last_activity=$(last_activity_epoch)
  local current
  current=$(now_epoch)
  local elapsed=$(( current - last_activity ))

  if [ "$elapsed" -gt "$STALE_SECONDS" ]; then
    log "STALE: /zzz 세션 ${elapsed}초 활동 없음 (기준: ${STALE_SECONDS}초)"

    # stale 횟수 기록
    local stale_count_file="$ATEAM_ROOT/.context/zzz-stale-count.txt"
    local count=0
    [ -f "$stale_count_file" ] && count=$(cat "$stale_count_file" 2>/dev/null || echo 0)
    count=$(( count + 1 ))
    echo "$count" > "$stale_count_file"

    # 3회 연속 stale → 자동 재시작 포기, 알림만
    if [ "$count" -ge 3 ]; then
      log "ABORT: 연속 stale 3회. 수동 확인 필요. /zzz 세션 종료 권장."
      # governance/events.jsonl에 기록
      node "$ATEAM_ROOT/scripts/log-session-event.mjs" \
        observation observation=zzz_stale_abort \
        "details=stale ${elapsed}s, count=${count}" 2>/dev/null || true
      return 1
    fi

    log "RESTART: claude 프로세스 재시작 시도..."
    # governance/events.jsonl에 기록
    node "$ATEAM_ROOT/scripts/log-session-event.mjs" \
      observation observation=zzz_stale_detected \
      "details=stale ${elapsed}s, count=${count}" 2>/dev/null || true

    # 실제 재시작: sleep-resume.sh 활용
    if [ -f "$ATEAM_ROOT/scripts/sleep-resume.sh" ]; then
      bash "$ATEAM_ROOT/scripts/sleep-resume.sh" 2>/dev/null &
      log "RESTART: sleep-resume.sh 호출 완료"
      # 스탬프 리셋
      update_heartbeat_stamp
      echo 0 > "$stale_count_file"
    else
      log "WARN: sleep-resume.sh 없음 — 수동 재시작 필요"
    fi
  else
    log "OK: /zzz 세션 활성 (마지막 활동 ${elapsed}초 전)"
    # 연속 stale 카운트 리셋
    echo 0 > "$ATEAM_ROOT/.context/zzz-stale-count.txt" 2>/dev/null || true
  fi
}

# ── check 커맨드 ──────────────────────────────────────────────────────────
cmd_check() {
  if ! is_zzz_active; then
    log "SKIP: /zzz 세션 비활성 (RESUME.md mode=zzz 없음)"
    exit 0
  fi
  check_stale
}

# ── status 커맨드 ─────────────────────────────────────────────────────────
cmd_status() {
  echo "=== /zzz Heartbeat Status ==="
  if is_zzz_active; then
    echo "zzz_active: YES"
    local last
    last=$(last_activity_epoch)
    local elapsed=$(( $(now_epoch) - last ))
    echo "last_activity: ${elapsed}s ago"
    echo "stale_threshold: ${STALE_SECONDS}s"
    [ "$elapsed" -gt "$STALE_SECONDS" ] && echo "status: STALE" || echo "status: OK"
  else
    echo "zzz_active: NO"
  fi
  echo ""
  echo "launchd: $(launchctl list | grep "$PLIST_LABEL" | head -1 || echo 'not registered')"
  echo "log tail:"
  tail -5 "$HEARTBEAT_LOG" 2>/dev/null || echo "(no log)"
}

# ── install 커맨드 ────────────────────────────────────────────────────────
cmd_install() {
  if [[ "$(uname)" != "Darwin" ]]; then
    echo "ERROR: macOS 전용 (launchd)" >&2; exit 1
  fi

  # node 경로 탐지
  NODE_BIN=$(ls "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1)
  [ -z "$NODE_BIN" ] && NODE_BIN=$(which node 2>/dev/null || echo "node")

  cat > "$PLIST_PATH" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${ATEAM_ROOT}/scripts/zzz-heartbeat.sh</string>
        <string>check</string>
    </array>
    <key>StartInterval</key>
    <integer>60</integer>
    <key>StandardOutPath</key>
    <string>${ATEAM_ROOT}/.context/zzz-heartbeat.log</string>
    <key>StandardErrorPath</key>
    <string>${ATEAM_ROOT}/.context/zzz-heartbeat.log</string>
    <key>RunAtLoad</key>
    <false/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>
</dict>
</plist>
PLIST

  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  launchctl load "$PLIST_PATH"
  echo "✅ $PLIST_LABEL 등록 완료 (1분마다 실행)"
  echo "   상태 확인: bash scripts/zzz-heartbeat.sh status"
}

# ── remove 커맨드 ─────────────────────────────────────────────────────────
cmd_remove() {
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  rm -f "$PLIST_PATH"
  echo "✅ $PLIST_LABEL 제거 완료"
}

# ── 진입점 ────────────────────────────────────────────────────────────────
CMD="${1:-check}"
case "$CMD" in
  check)   cmd_check ;;
  status)  cmd_status ;;
  install) cmd_install ;;
  remove)  cmd_remove ;;
  *)
    echo "Usage: $0 {check|status|install|remove}" >&2
    exit 1
    ;;
esac
