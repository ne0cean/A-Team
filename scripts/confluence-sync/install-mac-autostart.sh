#!/usr/bin/env bash
# Cortex ↔ Confluence 동기화 데몬 Mac 자동시작 설치
# 사용: bash scripts/confluence-sync/install-mac-autostart.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PLIST_SRC="$REPO_DIR/scripts/confluence-sync/com.cortex.confluence-sync.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.cortex.confluence-sync.plist"
LABEL="com.cortex.confluence-sync"

echo "설치 경로: $REPO_DIR"

# 1. WorkingDirectory를 실제 경로로 교체
sed "s|REPLACED_BY_INSTALL_SCRIPT|$REPO_DIR|g" "$PLIST_SRC" > "$PLIST_DST"
echo "plist 설치: $PLIST_DST"

# 2. 기존 데몬 중지 (있으면)
launchctl unload "$PLIST_DST" 2>/dev/null || true

# 3. 로드 (즉시 시작)
launchctl load "$PLIST_DST"
echo "launchd 등록 완료: $LABEL"

# 4. 상태 확인
sleep 2
if launchctl list | grep -q "$LABEL"; then
  echo "데몬 실행 중 — 로그: /tmp/confluence-sync.log"
else
  echo "경고: 데몬이 시작되지 않았습니다. 로그를 확인하세요: /tmp/confluence-sync.log"
fi
