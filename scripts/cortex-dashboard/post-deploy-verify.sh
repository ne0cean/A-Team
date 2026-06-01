#!/usr/bin/env bash
# post-deploy-verify.sh — POST-DEPLOY D1 생존 확인 (Layer 3)
# wrangler deploy 후 수동 실행: bash scripts/cortex-dashboard/post-deploy-verify.sh
# 또는 pre-bash.sh에서 wrangler deploy 감지 시 자동 실행

set -uo pipefail

WORKER_URL="https://cortex.feat-breeze.workers.dev"
YM=$(date +%Y-%m)
PASS=0
FAIL=0
WARNS=()

check() {
  local label="$1"
  local url="$2"
  local expect_key="$3"   # jq 표현식 — 이 키가 null이 아니어야 함

  result=$(curl -sf --max-time 10 "$url" 2>/dev/null) || {
    WARNS+=("FAIL [$label] HTTP 오류 — $url")
    ((FAIL++)); return
  }

  if [ -n "$expect_key" ]; then
    val=$(echo "$result" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    keys = '$expect_key'.split('.')
    v = d
    for k in keys:
        if k: v = v.get(k)
    print('null' if v is None else 'ok')
except:
    print('parse_error')
" 2>/dev/null)
    if [ "$val" != "ok" ]; then
      WARNS+=("FAIL [$label] 응답에 '$expect_key' 없음 (val=$val)")
      ((FAIL++)); return
    fi
  fi

  echo "  ✅ $label"
  ((PASS++))
}

echo "━━━ POST-DEPLOY VERIFY ━━━"
echo "  Worker: $WORKER_URL"
echo "  YM: $YM"
echo ""

# 1. 월별 데이터 생존
check "month/$YM"         "$WORKER_URL/api/month?ym=$YM"          ""

# 2. Standing Orders 생존
check "standing-orders"   "$WORKER_URL/api/standing-orders"        "standing"

# 3. Day Frames 생존
check "day-frames"        "$WORKER_URL/api/day-frames"             ""

# 4. Vision Roadmap 생존
check "vision-roadmap"    "$WORKER_URL/api/vision-roadmap"         ""

echo ""
echo "━━━ 결과: PASS=$PASS FAIL=$FAIL ━━━"

if [ ${#WARNS[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  문제 발견:"
  for w in "${WARNS[@]}"; do
    echo "  $w"
  done
  echo ""
  echo "배포 직후 데이터 유실 가능성 있음. D1 콘솔에서 확인하세요."
  exit 1
fi

echo "배포 후 데이터 생존 확인 완료."
exit 0
