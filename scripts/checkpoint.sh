#!/usr/bin/env bash
# checkpoint.sh — 태스크 체크포인트 저장/로드/아카이브
# 출처: LangGraph 체크포인팅 패턴 A-Team 네이티브 구현
#
# 사용법:
#   bash scripts/checkpoint.sh save   <task_id> <agent> <status> "<resume_prompt>"
#   bash scripts/checkpoint.sh load   <task_id>
#   bash scripts/checkpoint.sh list
#   bash scripts/checkpoint.sh archive <task_id>

set -e

CHECKPOINT_DIR="${CHECKPOINT_DIR:-.context/checkpoints}"
ARCHIVE_DIR="$CHECKPOINT_DIR/archive"

mkdir -p "$CHECKPOINT_DIR" "$ARCHIVE_DIR"

case "$1" in
  save)
    TASK_ID="${2:?task_id 필요}"
    AGENT="${3:?agent 필요}"
    STATUS="${4:-in_progress}"
    RESUME_PROMPT="${5:-}"
    TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
    OUTFILE="$CHECKPOINT_DIR/${TASK_ID}-$(date +%s).json"

    cat > "$OUTFILE" <<JSON
{
  "task_id": "$TASK_ID",
  "agent": "$AGENT",
  "status": "$STATUS",
  "resume_prompt": "$RESUME_PROMPT",
  "timestamp": "$TIMESTAMP"
}
JSON
    echo "체크포인트 저장: $OUTFILE"
    ;;

  load)
    TASK_ID="${2:?task_id 필요}"
    LATEST=$(ls -t "$CHECKPOINT_DIR/${TASK_ID}"-*.json 2>/dev/null | head -1)
    if [ -z "$LATEST" ]; then
      echo "체크포인트 없음: $TASK_ID" >&2
      exit 1
    fi
    cat "$LATEST"
    ;;

  list)
    echo "활성 체크포인트:"
    ls "$CHECKPOINT_DIR"/*.json 2>/dev/null | while read f; do
      TASK=$(basename "$f" | cut -d'-' -f1)
      STATUS=$(grep -o '"status": "[^"]*"' "$f" | cut -d'"' -f4)
      AGENT=$(grep -o '"agent": "[^"]*"' "$f" | cut -d'"' -f4)
      echo "  $TASK — $AGENT ($STATUS)"
    done
    ;;

  archive)
    TASK_ID="${2:?task_id 필요}"
    FILES=$(ls "$CHECKPOINT_DIR/${TASK_ID}"-*.json 2>/dev/null)
    if [ -z "$FILES" ]; then
      echo "아카이브할 체크포인트 없음: $TASK_ID" >&2
      exit 0
    fi
    for f in $FILES; do
      mv "$f" "$ARCHIVE_DIR/"
      echo "아카이브: $(basename $f)"
    done
    ;;

  *)
    echo "사용법: $0 {save|load|list|archive} [task_id] [agent] [status] [resume_prompt]"
    exit 1
    ;;
esac
