#!/bin/bash
# install-sleep-cron.sh — launchd plist 설치/제거
#
# 사용법:
#   bash install-sleep-cron.sh install [HH:MM]   # 기본 03:02 KST
#   bash install-sleep-cron.sh uninstall
#   bash install-sleep-cron.sh status
#
# 설치 후 매일 지정 시각에 sleep-resume.sh 자동 실행.
# RESUME.md 부재 또는 status=completed면 no-op.

set -eu

SERVICE_LABEL="com.ateam.sleep-resume"
PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_LABEL}.plist"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESUME_SCRIPT="$PROJECT_ROOT/scripts/sleep-resume.sh"

ACTION="${1:-status}"
TIME="${2:-03:02}"

case "$ACTION" in
  install)
    # TIME 인자: "HH:MM" (1회) 또는 "every Nh" (매 N시간) 또는 기본값 "every 2h"
    INTERVAL_MODE="false"
    INTERVAL_SEC=120  # 기본 2분 (리셋 감지 거의 즉시)
    if [[ "$TIME" == every* ]]; then
      INTERVAL_MODE="true"
      N=${TIME#every }
      if [[ "$N" == *h ]]; then
        N=${N%h}
        INTERVAL_SEC=$((N * 3600))
        UNIT="h"
      elif [[ "$N" == *m ]]; then
        N=${N%m}
        INTERVAL_SEC=$((N * 60))
        UNIT="m"
      elif [[ "$N" == *s ]]; then
        N=${N%s}
        INTERVAL_SEC="$N"
        UNIT="s"
      else
        N="$N"
        INTERVAL_SEC=$((N * 60))  # 숫자만 주면 분 단위
        UNIT="m"
      fi
      echo "Installing launchd plist → $PLIST_PATH"
      echo "Schedule: every ${N}${UNIT} (StartInterval=${INTERVAL_SEC}s)"
    elif [[ "$TIME" == *:* ]]; then
      HOUR="${TIME%:*}"
      MINUTE="${TIME#*:}"
      echo "Installing launchd plist → $PLIST_PATH"
      echo "Schedule: daily at $HOUR:$MINUTE local time"
    else
      # 인자 없거나 모름 → 매 2시간
      INTERVAL_MODE="true"
      echo "Installing launchd plist → $PLIST_PATH"
      echo "Schedule: every 2h (StartInterval=${INTERVAL_SEC}s) — 토큰 리셋 사이클 커버"
    fi
    echo "Script: $RESUME_SCRIPT"

    # 스크립트 실행 권한
    chmod +x "$RESUME_SCRIPT"

    # plist 생성 (PATH에 claude CLI 경로 포함)
    if [ "$INTERVAL_MODE" = "true" ]; then
      SCHEDULE_BLOCK="    <key>StartInterval</key>
    <integer>${INTERVAL_SEC}</integer>"
    else
      SCHEDULE_BLOCK="    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>${HOUR}</integer>
        <key>Minute</key>
        <integer>${MINUTE}</integer>
    </dict>"
    fi

    cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${RESUME_SCRIPT}</string>
    </array>
${SCHEDULE_BLOCK}
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$HOME/.nvm/versions/node/v24.13.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>$HOME</string>
        <key>SLEEP_RESUME_PROJECT</key>
        <string>${PROJECT_ROOT}</string>
    </dict>
    <key>WorkingDirectory</key>
    <string>${PROJECT_ROOT}</string>
    <key>StandardOutPath</key>
    <string>${HOME}/Library/Logs/ateam-sleep-resume.out.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/Library/Logs/ateam-sleep-resume.err.log</string>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>ExitTimeOut</key>
    <integer>2760</integer>
    <key>AbandonProcessGroup</key>
    <true/>
</dict>
</plist>
PLIST

    # load (언로드 후 재로드 — idempotent)
    launchctl unload "$PLIST_PATH" 2>/dev/null || true
    launchctl load "$PLIST_PATH"

    echo ""
    echo "✅ Installed."
    echo "   확인: launchctl list | grep $SERVICE_LABEL"
    echo "   수동 실행 테스트: launchctl start $SERVICE_LABEL"
    echo "   로그: tail -f ~/Library/Logs/ateam-sleep-resume.log"
    ;;

  uninstall)
    if [ -f "$PLIST_PATH" ]; then
      launchctl unload "$PLIST_PATH" 2>/dev/null || true
      rm "$PLIST_PATH"
      echo "✅ Uninstalled $SERVICE_LABEL"
    else
      echo "Not installed."
    fi
    ;;

  status)
    echo "Service: $SERVICE_LABEL"
    if [ -f "$PLIST_PATH" ]; then
      echo "Plist: $PLIST_PATH (exists)"
      LOADED=$(launchctl list 2>/dev/null | grep "$SERVICE_LABEL" || echo "")
      if [ -n "$LOADED" ]; then
        echo "Loaded: yes"
        echo "$LOADED"
      else
        echo "Loaded: no"
      fi
      echo ""
      echo "Schedule (from plist):"
      grep -A3 "StartCalendarInterval" "$PLIST_PATH" | head -8
    else
      echo "Plist: not installed"
    fi
    echo ""
    echo "Recent log:"
    tail -20 "$HOME/Library/Logs/ateam-sleep-resume.log" 2>/dev/null || echo "  (no log yet)"
    ;;

  *)
    echo "Usage: $0 {install [HH:MM] | uninstall | status}"
    echo ""
    echo "Examples:"
    echo "  $0 install 03:02   # 매일 03:02 KST"
    echo "  $0 install 04:17   # 매일 04:17 KST (리셋 시각에 맞춤)"
    echo "  $0 uninstall"
    echo "  $0 status"
    exit 1
    ;;
esac
