#!/usr/bin/env bash
# monthly-cascade-create.sh — 다음 달 Goal Cascade 월간 파일 자동 생성
# Usage: bash scripts/maintenance/monthly-cascade-create.sh
# scheduled-reviews.json에서 완료 처리 후 다음 달 entry도 자동 추가

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
VISION_DIR="$ROOT/cortex/areas/life/vision"

# 다음 달 계산
NEXT_YEAR=$(date -v+1m +%Y 2>/dev/null || date -d "next month" +%Y)
NEXT_MONTH=$(date -v+1m +%m 2>/dev/null || date -d "next month" +%m)
NEXT_YM="${NEXT_YEAR}-${NEXT_MONTH}"
TARGET="$VISION_DIR/monthly-${NEXT_YM}.md"

if [ -f "$TARGET" ]; then
  echo "✅ already exists: monthly-${NEXT_YM}.md"
  exit 0
fi

cat > "$TARGET" <<EOF
# 월간 포커스 — ${NEXT_YEAR}년 ${NEXT_MONTH}월

## 이 달의 3가지
1.
2.
3.

## Cascade 체크
annual-$(date -v+1m +%Y 2>/dev/null || date -d "next month" +%Y).md 이번 달 진전시킬 카테고리:
- [ ] Character:
- [ ] Interstellar:
- [ ] A-Team:

## 이번 달 완료
- (기록용)

---
← [annual-${NEXT_YEAR}.md](annual-${NEXT_YEAR}.md)
EOF

echo "✅ created: monthly-${NEXT_YM}.md"

# scheduled-reviews.json에 다음 달+1 entry 추가 (롤링)
REVIEWS="$ROOT/.context/scheduled-reviews.json"
NEXT_NEXT_YEAR=$(date -v+2m +%Y 2>/dev/null || date -d "+2 months" +%Y)
NEXT_NEXT_MONTH=$(date -v+2m +%m 2>/dev/null || date -d "+2 months" +%m)
NEXT_NEXT_YM="${NEXT_NEXT_YEAR}-${NEXT_NEXT_MONTH}"
NEW_ID="goal-cascade-monthly-${NEXT_NEXT_YM/-/}"

# 이미 있으면 스킵
if grep -q "$NEW_ID" "$REVIEWS" 2>/dev/null; then
  echo "ℹ️  next entry already exists: $NEW_ID"
  exit 0
fi

# 현재 entry를 done으로 + 다음 entry 추가
node -e "
const fs = require('fs');
const path = '$REVIEWS';
const data = JSON.parse(fs.readFileSync(path, 'utf-8'));

// 현재 달 entry done 처리
data.forEach(r => {
  if (r.id.includes('goal-cascade-monthly') && r.status === 'pending') {
    r.status = 'done';
  }
});

// 다음 달+1 entry 추가
data.push({
  id: '$NEW_ID',
  due: '${NEXT_NEXT_YM}-01',
  title: 'Goal Cascade: monthly-${NEXT_NEXT_YM}.md 생성',
  status: 'pending',
  context: 'bash scripts/maintenance/monthly-cascade-create.sh'
});

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log('✅ scheduled-reviews.json updated');
"
