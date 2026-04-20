#!/usr/bin/env bash
# install-auto-switch-cron.sh — Install/manage the a-team auto-switch launchd job.
set -e

LABEL="com.ateam.auto-switch"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
ATEAM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TRIGGER_SCRIPT="${ATEAM_DIR}/scripts/auto-switch/trigger.mjs"
LOG_OUT="$HOME/Library/Logs/ateam-auto-switch.log"
LOG_ERR="$HOME/Library/Logs/ateam-auto-switch.err"

case "${1:-}" in
  install)
    [ -f "$TRIGGER_SCRIPT" ] || { echo "❌ trigger.mjs not found" >&2; exit 1; }
    NODE_BIN=""
    for c in "$HOME/.nvm/versions/node"/*/bin/node; do [ -x "$c" ] && NODE_BIN="$c" && break; done
    [ -z "$NODE_BIN" ] && NODE_BIN="$(which node)"
    [ -x "$NODE_BIN" ] || { echo "❌ node not found" >&2; exit 1; }

    mkdir -p "$(dirname "$PLIST_PATH")" "$(dirname "$LOG_OUT")"
    cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${TRIGGER_SCRIPT}</string>
  </array>
  <key>StartInterval</key><integer>60</integer>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>${LOG_OUT}</string>
  <key>StandardErrorPath</key><string>${LOG_ERR}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    <key>HOME</key><string>${HOME}</string>
  </dict>
</dict>
</plist>
EOF
    launchctl unload "$PLIST_PATH" 2>/dev/null || true
    launchctl load "$PLIST_PATH"
    echo "✅ Installed: $LABEL (60s interval)"
    ;;
  uninstall)
    [ -f "$PLIST_PATH" ] && { launchctl unload "$PLIST_PATH" 2>/dev/null || true; rm -f "$PLIST_PATH"; echo "✅ Uninstalled"; } || echo "ℹ️ Not installed"
    ;;
  status)
    launchctl list 2>/dev/null | grep -q "$LABEL" && { echo "✅ Loaded"; launchctl list | grep "$LABEL"; } || echo "❌ Not loaded"
    echo ""; echo "Recent log:"
    [ -f "$LOG_OUT" ] && tail -20 "$LOG_OUT" || echo "(no log)"
    [ -s "$LOG_ERR" ] && { echo ""; echo "Recent errors:"; tail -10 "$LOG_ERR"; }
    ;;
  run-once)
    NODE_BIN=""
    for c in "$HOME/.nvm/versions/node"/*/bin/node; do [ -x "$c" ] && NODE_BIN="$c" && break; done
    [ -z "$NODE_BIN" ] && NODE_BIN="$(which node)"
    "$NODE_BIN" "$TRIGGER_SCRIPT"
    ;;
  *)
    echo "Usage: $0 {install|uninstall|status|run-once}"; exit 2
    ;;
esac
