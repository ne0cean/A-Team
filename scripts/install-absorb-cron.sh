#!/bin/bash
# install-absorb-cron.sh — /absorb 주간 launchd 설치/관리
#
# 사용법:
#   bash install-absorb-cron.sh install [HH:MM]   # 기본 일요일 11:07
#   bash install-absorb-cron.sh uninstall
#   bash install-absorb-cron.sh status
#   bash install-absorb-cron.sh run-now           # 즉시 1회 실행 (검증용)

set -eu

SERVICE_LABEL="com.ateam.absorb-weekly"
PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_LABEL}.plist"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCAN_SCRIPT="$PROJECT_ROOT/scripts/absorb-scan.sh"

ACTION="${1:-status}"
TIME="${2:-11:07}"

case "$ACTION" in
  install)
    HOUR="${TIME%:*}"
    MINUTE="${TIME#*:}"

    echo "Installing launchd plist → $PLIST_PATH"
    echo "Schedule: every Sunday at $HOUR:$MINUTE (Weekday=0)"
    echo "Script: $SCAN_SCRIPT"

    chmod +x "$SCAN_SCRIPT"

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
        <string>${SCAN_SCRIPT}</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>0</integer>
        <key>Hour</key>
        <integer>${HOUR}</integer>
        <key>Minute</key>
        <integer>${MINUTE}</integer>
    </dict>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>$HOME</string>
        <key>ATEAM_MASTER</key>
        <string>${PROJECT_ROOT}</string>
    </dict>
    <key>WorkingDirectory</key>
    <string>${PROJECT_ROOT}</string>
    <key>StandardOutPath</key>
    <string>${HOME}/Library/Logs/ateam-absorb.out.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/Library/Logs/ateam-absorb.err.log</string>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
    <key>AbandonProcessGroup</key>
    <true/>
</dict>
</plist>
PLIST

    launchctl unload "$PLIST_PATH" 2>/dev/null || true
    launchctl load "$PLIST_PATH"

    echo ""
    echo "✅ Installed."
    echo "   확인: launchctl list | grep $SERVICE_LABEL"
    echo "   즉시 실행: bash $0 run-now"
    echo "   로그: tail -f ~/Library/Logs/ateam-absorb.out.log"
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
      launchctl list 2>/dev/null | grep "$SERVICE_LABEL" && echo "Loaded: yes" || echo "Loaded: no"
      echo ""
      echo "Schedule:"
      plutil -p "$PLIST_PATH" | grep -A5 "StartCalendarInterval"
    else
      echo "Plist: not installed"
    fi
    echo ""
    echo "Last scan:"
    cat "$PROJECT_ROOT/improvements/.last-absorb-scan" 2>/dev/null || echo "  (never)"
    ;;

  run-now)
    echo "Running scan immediately..."
    FORCE=1 bash "$SCAN_SCRIPT"
    ;;

  *)
    echo "Usage: $0 {install [HH:MM] | uninstall | status | run-now}"
    echo "  install 11:07   # Sunday 11:07 (default)"
    echo "  run-now         # immediate scan (FORCE=1)"
    exit 1
    ;;
esac
