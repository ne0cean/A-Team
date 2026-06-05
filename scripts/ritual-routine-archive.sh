#!/usr/bin/env bash
# ritual-routine-archive.sh — 지난 주 섹션을 archive/로 이동
# Usage: bash scripts/ritual-routine-archive.sh [month-file]
# Example: bash scripts/ritual-routine-archive.sh cortex/areas/life/ritual-routine/2026-05.md

set -euo pipefail

RITUAL_DIR="cortex/areas/life/ritual-routine"
ARCHIVE_DIR="$RITUAL_DIR/archive"
MONTH_FILE="${1:-$RITUAL_DIR/$(date +%Y-%m).md}"

if [ ! -f "$MONTH_FILE" ]; then
  echo "[error] File not found: $MONTH_FILE"
  exit 1
fi

# Get current ISO week number
CURRENT_WEEK=$(date +%V)
CURRENT_YEAR=$(date +%Y)

# Extract year-month from filename
BASENAME=$(basename "$MONTH_FILE" .md)

mkdir -p "$ARCHIVE_DIR"

# Find all week sections in the file
# Format: ## Week 21 (5/17 - 5/23)
WEEKS=$(grep -n '^## Week [0-9]' "$MONTH_FILE" | head -20)

if [ -z "$WEEKS" ]; then
  echo "[info] No week sections found in $MONTH_FILE"
  exit 0
fi

ARCHIVED=0

while IFS= read -r line; do
  LINE_NUM=$(echo "$line" | cut -d: -f1)
  WEEK_NUM=$(echo "$line" | sed -n 's/.*Week \([0-9]*\).*/\1/p')
  WEEK_TITLE=$(echo "$line" | cut -d: -f2-)

  # Skip current and future weeks
  if [ "$WEEK_NUM" -ge "$CURRENT_WEEK" ]; then
    continue
  fi

  # Find the end of this week section (next ## or end of file)
  NEXT_SECTION=$(tail -n +"$((LINE_NUM + 1))" "$MONTH_FILE" | grep -n '^## ' | head -1 | cut -d: -f1)

  if [ -n "$NEXT_SECTION" ]; then
    END_LINE=$((LINE_NUM + NEXT_SECTION - 1))
  else
    # Last section — find end before 상시 업무 or EOF
    CONST_SECTION=$(tail -n +"$((LINE_NUM + 1))" "$MONTH_FILE" | grep -n '^## 상시' | head -1 | cut -d: -f1)
    if [ -n "$CONST_SECTION" ]; then
      END_LINE=$((LINE_NUM + CONST_SECTION - 1))
    else
      END_LINE=$(wc -l < "$MONTH_FILE")
    fi
  fi

  # Extract week content to archive file
  ARCHIVE_FILE="$ARCHIVE_DIR/${BASENAME}-W${WEEK_NUM}.md"
  sed -n "${LINE_NUM},${END_LINE}p" "$MONTH_FILE" > "$ARCHIVE_FILE"
  echo "[archived] Week $WEEK_NUM → $ARCHIVE_FILE (lines $LINE_NUM-$END_LINE)"
  ARCHIVED=$((ARCHIVED + 1))

done <<< "$WEEKS"

if [ "$ARCHIVED" -eq 0 ]; then
  echo "[info] No past weeks to archive (current: Week $CURRENT_WEEK)"
else
  echo "[done] $ARCHIVED week(s) archived to $ARCHIVE_DIR/"
  echo "[note] 원본 파일에서 해당 섹션 삭제는 수동으로 확인 후 진행하세요"
fi
