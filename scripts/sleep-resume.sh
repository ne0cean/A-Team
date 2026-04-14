#!/bin/bash
# sleep-resume.sh — OS-level 자동 재개 (launchd/cron에서 호출)
#
# 용도: Claude Code REPL이 토큰 리셋 시점 자동으로 헤드리스 실행되어
#       .context/RESUME.md 읽고 작업 이어받음.
#
# 설치: launchd plist (scripts/install-sleep-cron.sh) 또는 crontab -e
#
# 안전장치:
#   - 동일 날짜 2회 실행 방지 (lockfile)
#   - 프로젝트 디렉토리 존재 확인
#   - RESUME.md 존재 + status != 'completed' 확인
#   - 실행 로그 ~/Library/Logs/ateam-sleep-resume.log
#
# Requires: claude CLI v2+ (--print, --max-budget-usd flags)

set -u

PROJECT_ROOT="${SLEEP_RESUME_PROJECT:-/Users/noir/Projects/a-team}"
LOG_FILE="${SLEEP_RESUME_LOG:-$HOME/Library/Logs/ateam-sleep-resume.log}"
LOCK_DIR="${SLEEP_RESUME_LOCK:-$HOME/.ateam-sleep-locks}"
MAX_BUDGET_USD="${SLEEP_RESUME_BUDGET:-5.00}"
MODEL="${SLEEP_RESUME_MODEL:-sonnet}"

# ──────── Setup ────────

mkdir -p "$(dirname "$LOG_FILE")" "$LOCK_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*" >> "$LOG_FILE"
}

log "────── sleep-resume.sh start ──────"
log "PROJECT_ROOT=$PROJECT_ROOT"
log "MAX_BUDGET=$MAX_BUDGET_USD MODEL=$MODEL"

# ──────── Pre-checks ────────

if [ ! -d "$PROJECT_ROOT" ]; then
  log "ERROR: project not found: $PROJECT_ROOT"
  exit 1
fi

cd "$PROJECT_ROOT" || { log "ERROR: cd failed"; exit 1; }

RESUME_FILE="$PROJECT_ROOT/.context/RESUME.md"
if [ ! -f "$RESUME_FILE" ]; then
  log "SKIP: RESUME.md not found — no pending work"
  exit 0
fi

# RESUME.md의 status 확인
if grep -q "^status:\s*completed" "$RESUME_FILE" 2>/dev/null; then
  log "SKIP: RESUME.md status=completed"
  exit 0
fi

# 동일 날짜 중복 실행 차단
TODAY_LOCK="$LOCK_DIR/$(date +%Y-%m-%d)"
if [ -f "$TODAY_LOCK" ]; then
  log "SKIP: already ran today ($(cat "$TODAY_LOCK"))"
  exit 0
fi
echo "$(date '+%H:%M:%S')" > "$TODAY_LOCK"

# claude CLI 존재 확인
if ! command -v claude >/dev/null 2>&1; then
  log "ERROR: claude CLI not found in PATH"
  log "PATH=$PATH"
  exit 1
fi

# ──────── Build prompt ────────

PROMPT=$(cat <<'EOF'
자동 재개 (토큰 리셋 — OS-level launchd/cron 트리거).

실행 계약 (governance/rules/autonomous-loop.md 강제 조항 1-6 준수):
1. .context/RESUME.md 읽기 → Completed 섹션 확인 (중복 금지)
2. In Progress → Next Tasks 순차 실행
3. 각 태스크 완료마다 commit + push + RESUME.md 갱신
4. **나레이션 금지** (조항 6): 경계 선언/인사/상태 요약 전부 금지
5. 도구 에러 시 ≤5줄 대응, 최종 세션 종료 시 ≤10줄 요약만
6. 토큰 한계 근접 시: commit/push → RESUME.md update → 종료 (다음 날 cron이 이어받음)
7. 모든 태스크 완료 시 RESUME.md status=completed + CURRENT.md 갱신

제약:
- 설계 결정/파괴적 작업/외부 승인 필요 태스크 → defer (스킵, RESUME.md에 deferred 표시)
- 질문 금지 — 확신 없으면 skip
- 파일 소유권 위반 금지 (PARALLEL_PLAN.md 존재 시)

태스크 분류 후 수행 자체는 Ralph/Research 데몬 위임 가능.
Claude 세션은 디스패처 + 상태 관리 역할.
EOF
)

# ──────── Execute (headless) ────────

log "Invoking claude --print with max-budget=\$${MAX_BUDGET_USD}..."

# --dangerously-skip-permissions: cron 환경에서 permission prompt 회피
# --model: 기본 sonnet (비용 균형). 필요 시 opus (high-quality) / haiku (저비용)
# --max-budget-usd: 실행 중 최대 지출 한도
# --add-dir: 작업 디렉토리 명시적 허용
claude \
  --print \
  --dangerously-skip-permissions \
  --model "$MODEL" \
  --max-budget-usd "$MAX_BUDGET_USD" \
  --add-dir "$PROJECT_ROOT" \
  "$PROMPT" \
  >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
log "claude exited with code $EXIT_CODE"

# ──────── Post ────────

# 만약 RESUME.md가 completed로 바뀌었으면 lock 파일 제거 (다음 sleep 세션 허용)
if grep -q "^status:\s*completed" "$RESUME_FILE" 2>/dev/null; then
  log "RESUME.md now completed — cycle finished"
fi

log "────── sleep-resume.sh end (exit $EXIT_CODE) ──────"
exit $EXIT_CODE
