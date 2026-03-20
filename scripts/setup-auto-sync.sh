#!/bin/bash
# setup-auto-sync.sh — Register auto-sync cron job on macOS
# Runs auto-sync.sh every 30 minutes.

SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/auto-sync.sh"
chmod +x "$SCRIPT_PATH"

CRON_JOB="*/30 * * * * $SCRIPT_PATH >> /tmp/connectome-sync.log 2>&1"
LOG_FILE="/tmp/connectome-sync.log"

# Check if already registered
if crontab -l 2>/dev/null | grep -qF "auto-sync.sh"; then
  echo "[setup] auto-sync already registered in crontab."
else
  (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
  echo "[setup] Registered cron job: $CRON_JOB"
  echo "[setup] Logs → $LOG_FILE"
fi
