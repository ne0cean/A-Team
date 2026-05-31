#!/bin/bash
# D1 → 로컬 단방향 동기화
# 용도: D1이 SSOT, 로컬 파일은 백업용
# 사용: bash scripts/sync-local.sh

DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_DIR="/Users/noir/Projects/a-team/cortex/data/ritual-routine"
BACKUP_DIR="/Users/noir/Projects/a-team/cortex/areas/life/ritual-routine"
API="https://cortex.feat-breeze.workers.dev"

echo "=== D1 → Local Sync ==="

for endpoint in standing-orders day-frames; do
  echo -n "$endpoint: "
  DATA=$(curl -s "$API/api/$endpoint")
  if [ -z "$DATA" ] || [ "$DATA" = "{}" ]; then
    echo "SKIP (empty)"
    continue
  fi

  # Remove _version before saving locally
  CLEAN=$(echo "$DATA" | python3 -c "import sys,json; d=json.loads(sys.stdin.read(),strict=False); d.pop('_version',None); print(json.dumps(d,ensure_ascii=False,indent=2))")

  # Backup existing
  [ -f "$LOCAL_DIR/$endpoint.json" ] && cp "$LOCAL_DIR/$endpoint.json" "$LOCAL_DIR/$endpoint.json.bak"
  [ -f "$BACKUP_DIR/$endpoint.json" ] && cp "$BACKUP_DIR/$endpoint.json" "$BACKUP_DIR/$endpoint.json.bak"

  # Write
  echo "$CLEAN" > "$LOCAL_DIR/$endpoint.json"
  echo "$CLEAN" > "$BACKUP_DIR/$endpoint.json"
  echo "OK ($(echo "$CLEAN" | wc -c | tr -d ' ') bytes)"
done

echo "Done."
