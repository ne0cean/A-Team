#!/usr/bin/env bash
# ritual-routine-new-month.sh — 새 월 파일 생성
# Usage: bash scripts/ritual-routine-new-month.sh [YYYY-MM]
# Example: bash scripts/ritual-routine-new-month.sh 2026-06

set -euo pipefail

RITUAL_DIR="cortex/areas/life/ritual-routine"
TARGET_MONTH="${1:-$(date -v+1m +%Y-%m 2>/dev/null || date -d '+1 month' +%Y-%m)}"
TARGET_FILE="$RITUAL_DIR/${TARGET_MONTH}.md"

if [ -f "$TARGET_FILE" ]; then
  echo "[exists] $TARGET_FILE already exists"
  exit 0
fi

YEAR=$(echo "$TARGET_MONTH" | cut -d- -f1)
MONTH=$(echo "$TARGET_MONTH" | cut -d- -f2)
MONTH_NAME=$(date -j -f "%Y-%m" "$TARGET_MONTH" "+%B" 2>/dev/null || date -d "${TARGET_MONTH}-01" "+%B")

# Get all days in the month
DAYS_IN_MONTH=$(cal "$MONTH" "$YEAR" | awk 'NF {DAYS = $NF}; END {print DAYS}')

# Korean day names
declare -a KR_DAYS=("일" "월" "화" "수" "목" "금" "토")

cat > "$TARGET_FILE" << 'HEADER'
<style>
table { border-collapse: collapse; width: 100%; font-size: 13px; }
th, td { border: 1px solid #444; padding: 6px 8px; vertical-align: top; }
th { background: #1a1a2e; color: #e0e0e0; text-align: center; min-width: 80px; }
td:first-child { font-weight: bold; min-width: 90px; background: #16213e; color: #e0e0e0; text-align: center; }
.goal { background: #0d1117; padding: 12px; margin-bottom: 16px; border-left: 3px solid #f0c040; }
</style>

HEADER

echo "# ${MONTH_NAME} ${YEAR}" >> "$TARGET_FILE"
echo "" >> "$TARGET_FILE"

cat >> "$TARGET_FILE" << 'GOAL'
<div class="goal">

**Palette**: Ritual & Routine / Stratum / Baklava / Crepe Cake

**Goal**: 일정 관리가 아닌, 집중력 배분. 로봇이 되자, 두려워 말라. 태도가 시사처.

**Don't think, just do** | H & A | One note refresh / Traffic & Banking

</div>

---

GOAL

# Generate weeks
CURRENT_DAY=1
WEEK_NUM=$(date -j -f "%Y-%m-%d" "${YEAR}-${MONTH}-01" "+%V" 2>/dev/null || date -d "${YEAR}-${MONTH}-01" "+%V")

while [ "$CURRENT_DAY" -le "$DAYS_IN_MONTH" ]; do
  # Find the end of this week (next Saturday or end of month)
  WEEK_START=$CURRENT_DAY
  DOW=$(date -j -f "%Y-%m-%d" "${YEAR}-${MONTH}-$(printf '%02d' $CURRENT_DAY)" "+%w" 2>/dev/null || date -d "${YEAR}-${MONTH}-$(printf '%02d' $CURRENT_DAY)" "+%w")

  # End of week = days until Saturday (6)
  DAYS_LEFT=$((6 - DOW))
  WEEK_END=$((CURRENT_DAY + DAYS_LEFT))
  if [ "$WEEK_END" -gt "$DAYS_IN_MONTH" ]; then
    WEEK_END=$DAYS_IN_MONTH
  fi

  echo "## Week ${WEEK_NUM} (${MONTH}/${WEEK_START} - ${MONTH}/${WEEK_END})" >> "$TARGET_FILE"
  echo "" >> "$TARGET_FILE"
  echo '<table>' >> "$TARGET_FILE"
  echo '<tr>' >> "$TARGET_FILE"
  echo '  <th>날짜</th>' >> "$TARGET_FILE"
  echo '  <th>Ritual & Routine</th>' >> "$TARGET_FILE"
  echo '  <th>출근전 - Input/R&D</th>' >> "$TARGET_FILE"
  echo '  <th>Work - 1H Blocks</th>' >> "$TARGET_FILE"
  echo '  <th>퇴근후 - Outcome, Mode Severance</th>' >> "$TARGET_FILE"
  echo '</tr>' >> "$TARGET_FILE"

  for DAY in $(seq "$WEEK_START" "$WEEK_END"); do
    PADDED=$(printf '%02d' "$DAY")
    DOW=$(date -j -f "%Y-%m-%d" "${YEAR}-${MONTH}-${PADDED}" "+%w" 2>/dev/null || date -d "${YEAR}-${MONTH}-${PADDED}" "+%w")
    KR_DAY=${KR_DAYS[$DOW]}

    echo "" >> "$TARGET_FILE"
    echo "<tr><td>" >> "$TARGET_FILE"
    echo "" >> "$TARGET_FILE"
    echo "**${DAY} (${KR_DAY})**" >> "$TARGET_FILE"
    echo "" >> "$TARGET_FILE"
    echo "</td><td>" >> "$TARGET_FILE"
    echo "" >> "$TARGET_FILE"

    # Weekday template
    if [ "$DOW" -ge 1 ] && [ "$DOW" -le 5 ]; then
      echo "- [ ] Zone2 40min/HIIT+스픽" >> "$TARGET_FILE"
      echo "- [ ] 10분 묵상" >> "$TARGET_FILE"
      echo "- [ ] Commit" >> "$TARGET_FILE"
    else
      echo "- [ ] Zone2 1H + 스픽&보카" >> "$TARGET_FILE"
      echo "- [ ] 10분 묵상 챌린지" >> "$TARGET_FILE"
      echo "- [ ] 4H Flow Block" >> "$TARGET_FILE"
      echo "- [ ] Vision Board" >> "$TARGET_FILE"
    fi

    echo "" >> "$TARGET_FILE"
    echo "</td><td>" >> "$TARGET_FILE"
    echo "" >> "$TARGET_FILE"
    echo "- [ ] Python" >> "$TARGET_FILE"
    echo "- [ ] figma" >> "$TARGET_FILE"
    echo "- [ ] Transcription" >> "$TARGET_FILE"
    echo "- [ ] Speaking" >> "$TARGET_FILE"
    echo "" >> "$TARGET_FILE"
    echo "</td><td>" >> "$TARGET_FILE"
    echo "" >> "$TARGET_FILE"

    if [ "$DOW" -ge 1 ] && [ "$DOW" -le 5 ]; then
      echo "- [ ] AX/SCM" >> "$TARGET_FILE"
      echo "- [ ] 통계 Dashboard" >> "$TARGET_FILE"
    fi

    echo "" >> "$TARGET_FILE"
    echo "</td><td>" >> "$TARGET_FILE"
    echo "" >> "$TARGET_FILE"
    echo "- [ ] 임장 매물 검색" >> "$TARGET_FILE"
    echo "- [ ] 8:30 취침 w/Podcast" >> "$TARGET_FILE"
    echo "" >> "$TARGET_FILE"
    echo "</td></tr>" >> "$TARGET_FILE"
  done

  echo '</table>' >> "$TARGET_FILE"
  echo "" >> "$TARGET_FILE"
  echo "---" >> "$TARGET_FILE"
  echo "" >> "$TARGET_FILE"

  CURRENT_DAY=$((WEEK_END + 1))
  WEEK_NUM=$((WEEK_NUM + 1))
done

# Append recurring sections
cat >> "$TARGET_FILE" << 'RECURRING'
## 상시 업무

- Swimming/ Golf / 테니스/ Surfing/ 스키&보드?
- 리더의 서재(금) · 해프랑 맞으면?
- Small Question, BIG TALK

## Monthly

- (이달 목표 및 이벤트 기입)

RECURRING

echo "[created] $TARGET_FILE ($DAYS_IN_MONTH days)"
