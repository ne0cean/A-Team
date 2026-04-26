#!/usr/bin/env bash
# zzz-permission-toggle.sh — /zzz 진입 시 권한 프롬프트 일시 비활성화, 깨어날 때 원복.
# Usage: bash zzz-permission-toggle.sh {on|off|status}
#
# v2 (2026-04-20): 글로벌 ~/.claude/settings.local.json 뿐 아니라
# ~/Projects/*/.claude/settings.local.json 도 동시 토글. Claude Code 는
# 프로젝트 로컬 settings 가 있으면 글로벌 defaultMode 를 덮어쓰므로,
# 모든 대상 파일에 직접 주입해야 실제 bypass 가 동작.
#
# 또한 zzz 활성 여부는 별도 마커 ~/.ateam/zzz-active 로 판단. SessionStart hook
# 은 backup 존재만으로 원복하면 다른 프로젝트 새 세션이 진행 중 zzz 를 꺼버림.

set -e
GLOBAL="$HOME/.claude/settings.local.json"
BACKUP="$HOME/.ateam/zzz-permission-backup.json"
ACTIVE_MARKER="$HOME/.ateam/zzz-active"
PROJECTS_ROOT="$HOME/Projects"

ensure_jq() {
  command -v jq >/dev/null 2>&1 || { echo "jq required (brew install jq)" >&2; exit 1; }
}

# 대상 파일 목록: 글로벌 + 활성 프로젝트별 로컬 (.claude/settings.local.json 존재하는 것만)
list_targets() {
  echo "$GLOBAL"
  [ -d "$PROJECTS_ROOT" ] || return 0
  find "$PROJECTS_ROOT" -maxdepth 3 -type f -path "*/.claude/settings.local.json" 2>/dev/null | while read -r f; do
    [ "$f" = "$GLOBAL" ] && continue
    echo "$f"
  done
}

case "${1:-}" in
  on)
    ensure_jq
    mkdir -p "$(dirname "$BACKUP")"

    # Reentry guard: 이미 active 면 backup 덮어쓰기 금지 (자기-자신 오염 방지).
    # 새로 발견된 프로젝트(이전 ON 이후 생긴 .claude/settings.local.json)는
    # 추가 등록만 하고, 기존 entry 의 원본 모드는 보존.
    if [ -f "$ACTIVE_MARKER" ] && [ -f "$BACKUP" ]; then
      ADDED=0
      while IFS= read -r f; do
        [ -f "$f" ] || { [ "$f" = "$GLOBAL" ] && echo "{}" > "$GLOBAL"; }
        [ -f "$f" ] || continue
        EXISTS=$(jq -r --arg k "$f" '.files | has($k)' "$BACKUP" 2>/dev/null || echo "false")
        if [ "$EXISTS" != "true" ]; then
          ORIG=$(jq -r '.permissions.defaultMode // "default"' "$f" 2>/dev/null || echo "default")
          # 새 file 이 이미 bypass 라면 default 로 backup (사용자 의도 가정)
          [ "$ORIG" = "bypassPermissions" ] && ORIG="default"
          TMP=$(mktemp)
          jq --arg k "$f" --arg v "$ORIG" '.files[$k] = $v' "$BACKUP" > "$TMP" && mv "$TMP" "$BACKUP"
          ADDED=$((ADDED+1))
        fi
        TMP=$(mktemp)
        jq '(.permissions //= {}) | .permissions.defaultMode = "bypassPermissions"' "$f" > "$TMP"
        mv "$TMP" "$f"
      done < <(list_targets)
      COUNT=$(jq '.files | length' "$BACKUP")
      echo "zzz permission: already active ($COUNT files tracked, +$ADDED new). backup preserved."
      exit 0
    fi

    # 첫 활성화: 각 파일의 원래 defaultMode 기록 → backup.json
    BACKUP_JSON='{"backedUpAt":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","files":{}}'
    while IFS= read -r f; do
      [ -f "$f" ] || { [ "$f" = "$GLOBAL" ] && echo "{}" > "$GLOBAL"; }
      [ -f "$f" ] || continue
      ORIG=$(jq -r '.permissions.defaultMode // "default"' "$f" 2>/dev/null || echo "default")
      # Defensive: 이미 bypass 인 파일은 default 로 backup (이전 비정상 종료 가능성)
      [ "$ORIG" = "bypassPermissions" ] && ORIG="default"
      BACKUP_JSON=$(echo "$BACKUP_JSON" | jq --arg k "$f" --arg v "$ORIG" '.files[$k] = $v')
      TMP=$(mktemp)
      jq '(.permissions //= {}) | .permissions.defaultMode = "bypassPermissions"' "$f" > "$TMP"
      mv "$TMP" "$f"
    done < <(list_targets)
    echo "$BACKUP_JSON" > "$BACKUP"
    touch "$ACTIVE_MARKER"
    COUNT=$(echo "$BACKUP_JSON" | jq '.files | length')
    echo "zzz permission: bypass applied to $COUNT files (global + project locals)"
    ;;
  off)
    ensure_jq
    [ -f "$BACKUP" ] || { rm -f "$ACTIVE_MARKER"; echo "no backup, skip"; exit 0; }
    jq -r '.files | to_entries[] | "\(.key)\t\(.value)"' "$BACKUP" | while IFS=$'\t' read -r f orig; do
      [ -f "$f" ] || continue
      TMP=$(mktemp)
      if [ "$orig" = "default" ] || [ -z "$orig" ] || [ "$orig" = "null" ]; then
        jq 'if .permissions then .permissions |= del(.defaultMode) else . end' "$f" > "$TMP"
      else
        jq --arg m "$orig" '.permissions.defaultMode = $m' "$f" > "$TMP"
      fi
      mv "$TMP" "$f"
    done
    rm -f "$BACKUP" "$ACTIVE_MARKER"
    echo "zzz permission: restored all files"
    ;;
  status)
    ensure_jq
    echo "Active marker: $([ -f "$ACTIVE_MARKER" ] && echo "present (zzz active)" || echo "absent")"
    echo "Global defaultMode: $(jq -r '.permissions.defaultMode // "(default)"' "$GLOBAL" 2>/dev/null || echo "(no settings)")"
    echo ""
    echo "Project-local defaultModes:"
    find "$PROJECTS_ROOT" -maxdepth 3 -type f -path "*/.claude/settings.local.json" 2>/dev/null | while read -r f; do
      proj=$(echo "$f" | sed "s|$PROJECTS_ROOT/||" | sed 's|/.claude/settings.local.json||')
      mode=$(jq -r '.permissions.defaultMode // "(none)"' "$f" 2>/dev/null)
      echo "  $proj: $mode"
    done
    if [ -f "$BACKUP" ]; then
      echo ""
      echo "Backup files (will restore on off):"
      jq -r '.files | to_entries[] | "  \(.key) → \(.value)"' "$BACKUP"
    fi
    ;;
  *)
    echo "Usage: $0 {on|off|status}"; exit 2 ;;
esac
