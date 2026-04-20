#!/usr/bin/env bash
# zzz-permission-toggle.sh — /zzz 진입 시 권한 프롬프트 일시 비활성화, 깨어날 때 원복.
# Usage: bash zzz-permission-toggle.sh {on|off|status}

set -e
SETTINGS="$HOME/.claude/settings.local.json"
BACKUP="$HOME/.ateam/zzz-permission-backup.json"

ensure_jq() {
  command -v jq >/dev/null 2>&1 || { echo "jq required (brew install jq)" >&2; exit 1; }
}

case "${1:-}" in
  on)
    ensure_jq
    mkdir -p "$(dirname "$BACKUP")"
    [ -f "$SETTINGS" ] || echo "{}" > "$SETTINGS"
    CURRENT=$(jq -r '.permissions.defaultMode // "default"' "$SETTINGS")
    echo "{\"defaultMode\":\"$CURRENT\",\"backedUpAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$BACKUP"
    TMP=$(mktemp)
    jq '(.permissions //= {}) | .permissions.defaultMode = "bypassPermissions"' "$SETTINGS" > "$TMP"
    mv "$TMP" "$SETTINGS"
    echo "zzz permission: bypass (was $CURRENT)"
    ;;
  off)
    ensure_jq
    [ -f "$BACKUP" ] || { echo "no backup, skip"; exit 0; }
    ORIG=$(jq -r '.defaultMode' "$BACKUP")
    TMP=$(mktemp)
    if [ "$ORIG" = "default" ] || [ -z "$ORIG" ] || [ "$ORIG" = "null" ]; then
      jq 'if .permissions then .permissions |= del(.defaultMode) else . end' "$SETTINGS" > "$TMP"
    else
      jq --arg m "$ORIG" '.permissions.defaultMode = $m' "$SETTINGS" > "$TMP"
    fi
    mv "$TMP" "$SETTINGS"
    rm -f "$BACKUP"
    echo "zzz permission: restored to $ORIG"
    ;;
  status)
    ensure_jq
    CURRENT=$(jq -r '.permissions.defaultMode // "(default)"' "$SETTINGS" 2>/dev/null || echo "(no settings)")
    echo "Current defaultMode: $CURRENT"
    if [ -f "$BACKUP" ]; then
      echo "zzz active, will restore to: $(jq -r '.defaultMode' "$BACKUP")"
    else
      echo "zzz inactive"
    fi
    ;;
  *)
    echo "Usage: $0 {on|off|status}"; exit 2 ;;
esac
