#!/usr/bin/env bash
# auto-sync.sh — 백그라운드 자동 저장 데몬
# 사용: ./scripts/auto-sync.sh [interval_seconds]
# 기본 30분(1800초). Windows(Git Bash) / macOS / Linux 호환

INTERVAL=${1:-1800}
PROJ_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
SESSIONS_FILE="$PROJ_ROOT/.context/SESSIONS.md"

notify_success() {
  local msg="$1"
  local os
  os=$(uname -s)
  if [ "$os" = "Darwin" ] && command -v osascript &>/dev/null; then
    osascript -e "display notification \"$msg\" with title \"Auto-Sync\"" 2>/dev/null || true
  elif command -v notify-send &>/dev/null; then
    # Linux
    notify-send "Auto-Sync" "$msg" 2>/dev/null || true
  fi
  # Windows: 터미널 출력으로 대체 (toast는 별도 도구 필요)
  echo "[$(date '+%H:%M:%S')] $msg" >&2
}

echo "🔄 Auto-Sync 데몬 시작 (간격: ${INTERVAL}초)" >&2
echo "   프로젝트: $PROJ_ROOT" >&2
echo "   중지: Ctrl+C" >&2

cd "$PROJ_ROOT"

while true; do
  sleep "$INTERVAL"

  # 변경 감지
  if git diff --quiet && git diff --cached --quiet; then
    echo "[$(date '+%H:%M:%S')] 변경 없음 — 스킵" >&2
    continue
  fi

  # SESSIONS.md에 자동 백업 항목 추가
  DIFF_SUMMARY=$(git diff --stat HEAD 2>/dev/null | tail -1 || echo "변경 있음")
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

  if [ -f "$SESSIONS_FILE" ]; then
    # 오늘 날짜 섹션이 있으면 추가, 없으면 생성
    TODAY=$(date '+%Y-%m-%d')
    if grep -q "## \[$TODAY\]" "$SESSIONS_FILE" 2>/dev/null; then
      # 오늘 섹션 맨 뒤에 추가
      sed -i "/## \[$TODAY\]/a\\- **[auto-sync $TIMESTAMP]**: $DIFF_SUMMARY" "$SESSIONS_FILE" 2>/dev/null || true
    fi
  fi

  # 커밋
  git add -A
  if git commit -m "sync: auto-commit $TIMESTAMP" 2>/dev/null; then
    notify_success "자동 저장 완료 ($DIFF_SUMMARY)"
  else
    echo "[$(date '+%H:%M:%S')] 커밋 실패 (충돌 또는 훅 차단)" >&2
  fi
done
