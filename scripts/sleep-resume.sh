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

# 병렬 실행 방지 — 프로젝트별 PID 락 (다른 프로젝트 간 간섭 방지)
PROJ_SLUG="$(basename "$PROJECT_ROOT" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-')"
PID_LOCK="$LOCK_DIR/running-${PROJ_SLUG}.pid"
if [ -f "$PID_LOCK" ]; then
  EXISTING_PID=$(cat "$PID_LOCK" 2>/dev/null || echo "")
  if [ -n "$EXISTING_PID" ] && ps -p "$EXISTING_PID" > /dev/null 2>&1; then
    log "SKIP: 기존 instance 실행 중 (pid $EXISTING_PID)"
    exit 0
  fi
fi
echo "$$" > "$PID_LOCK"

log "────── sleep-resume.sh start ──────"
log "PROJECT_ROOT=$PROJECT_ROOT"
log "MAX_BUDGET=$MAX_BUDGET_USD MODEL=$MODEL"

# EXIT 시 반드시 exit code 로그 + pid lock 제거
FINAL_EXIT=0
trap 'log "[trap EXIT] final=$FINAL_EXIT"; rm -f "$PID_LOCK"' EXIT

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

# 성공 실행 간격 제어 — 본작업 성공 직후 30분 내엔 skip (크레딧 한 번에 다 쓰는 것 방지)
SUCCESS_LOCK="$LOCK_DIR/last-success-${PROJ_SLUG}"
MIN_SUCCESS_INTERVAL_SEC="${SLEEP_RESUME_MIN_INTERVAL:-1800}"  # 30분
if [ -f "$SUCCESS_LOCK" ]; then
  LAST_RUN=$(cat "$SUCCESS_LOCK" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  DIFF=$((NOW - LAST_RUN))
  if [ "$DIFF" -lt "$MIN_SUCCESS_INTERVAL_SEC" ]; then
    log "SKIP: last success ${DIFF}s ago (< ${MIN_SUCCESS_INTERVAL_SEC}s)"
    exit 0
  fi
fi

# ──────── Probe: 토큰 리셋 감지 (rate limit 생존 확인) + exponential backoff ────────
# frankbria + Anthropic SDK + LiteLLM 패턴: 3-tier priority
#   1. Retry-After 헤더 파싱 (있으면 정확한 대기)
#   2. Rate limit 메시지 감지 (실제 reset 전)
#   3. Exponential backoff 5s → 25s → 125s (연결/일시 오류)

probe_once() {
  claude -p --model haiku --max-budget-usd 0.02 "ok" 2>&1
}

# Rate-limit 메시지 패턴 (whitelist 기반 — false positive 방지)
is_rate_limit_error() {
  local out="$1"
  echo "$out" | grep -qiE "rate.?limit|quota|429|budget.*exceeded|too many requests|hit your limit|hit the rate|limit.*resets?|5-?hour limit|weekly limit|usage.*limit|credits? exhausted"
}

# Retry-After 헤더에서 초 단위 값 추출 (있으면)
extract_retry_after() {
  local out="$1"
  echo "$out" | grep -ioE "Retry-After:\s*[0-9]+" | head -1 | grep -oE "[0-9]+"
}

log "Probing rate limit (Haiku minimal call, exponential backoff)..."

BACKOFF_SEQ=(5 25 125)
ATTEMPT=0
PROBE_OUT=""
PROBE_EXIT=0
PROBE_SUCCESS=0

for BACKOFF in "${BACKOFF_SEQ[@]}"; do
  ATTEMPT=$((ATTEMPT + 1))
  PROBE_OUT=$(probe_once)
  PROBE_EXIT=$?

  if [ $PROBE_EXIT -eq 0 ]; then
    PROBE_SUCCESS=1
    log "Probe SUCCESS on attempt $ATTEMPT"
    break
  fi

  # Rate limit 이면 backoff 없이 즉시 종료 (cron 2분 후 재시도)
  if is_rate_limit_error "$PROBE_OUT"; then
    RETRY_AFTER=$(extract_retry_after "$PROBE_OUT")
    if [ -n "$RETRY_AFTER" ]; then
      log "STILL RATE-LIMITED — Retry-After: ${RETRY_AFTER}s detected. Exit (cron 2min 또는 ${RETRY_AFTER}s 중 빠른 것)."
    else
      log "STILL RATE-LIMITED — token not reset yet. Exit (cron 2min 후 재시도)."
    fi
    log "probe snippet: $(echo "$PROBE_OUT" | head -2)"
    FINAL_EXIT=0
    exit 0
  fi

  # 기타 오류 (네트워크/인증/일시 장애) → exponential backoff
  if [ $ATTEMPT -lt ${#BACKOFF_SEQ[@]} ]; then
    log "Probe attempt $ATTEMPT failed (exit $PROBE_EXIT). Backoff ${BACKOFF}s..."
    sleep "$BACKOFF"
  fi
done

if [ $PROBE_SUCCESS -ne 1 ]; then
  log "ERROR: probe failed after $ATTEMPT attempts. Last exit: $PROBE_EXIT"
  log "probe output (last): $(echo "$PROBE_OUT" | head -10)"
  FINAL_EXIT=1
  exit 1
fi

log "Probe SUCCESS — rate limit reset detected. Proceeding with main task."

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

ERR_LOG="${LOG_FILE%.log}.err.${PROJ_SLUG}.log"
OUT_LOG="${LOG_FILE%.log}.out.${PROJ_SLUG}.log"

log "Invoking claude -p with max-budget=\$${MAX_BUDGET_USD} (timeout 45min)..."

# --permission-mode bypassPermissions: cron 환경에서 permission prompt 회피
# --model: 기본 sonnet (비용 균형). 필요 시 opus (high-quality) / haiku (저비용)
# --max-budget-usd: 실행 중 최대 지출 한도
# NOTE: --add-dir 는 --print 모드와 호환 불가 (2026-04-28 발견). cd로 대체.
# gtimeout (brew coreutils) 또는 perl alarm 으로 45분 타임아웃 강제 (hang 방지)
TIMEOUT_CMD=""
if command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT_CMD="gtimeout 2700"
elif command -v timeout >/dev/null 2>&1; then
  TIMEOUT_CMD="timeout 2700"
fi

if [ -n "$TIMEOUT_CMD" ]; then
  $TIMEOUT_CMD claude \
    -p \
    --permission-mode bypassPermissions \
    --model "$MODEL" \
    --max-budget-usd "$MAX_BUDGET_USD" \
    "$PROMPT" \
    >> "$OUT_LOG" 2>"$ERR_LOG"
  EXIT_CODE=$?
else
  perl -e 'alarm 2700; exec @ARGV' \
    claude -p --permission-mode bypassPermissions \
    --model "$MODEL" \
    --max-budget-usd "$MAX_BUDGET_USD" \
    "$PROMPT" \
    >> "$OUT_LOG" 2>"$ERR_LOG"
  EXIT_CODE=$?
fi

# 에러 로그가 있으면 메인 로그에도 기록
if [ -s "$ERR_LOG" ]; then
  log "STDERR (last 5 lines):"
  tail -5 "$ERR_LOG" >> "$LOG_FILE"
fi
# 산출물 로그 요약
if [ -s "$OUT_LOG" ]; then
  LINES=$(wc -l < "$OUT_LOG" | tr -d ' ')
  log "OUTPUT: ${LINES} lines written to ${OUT_LOG}"
else
  log "WARNING: claude produced no output"
fi

FINAL_EXIT=$EXIT_CODE
log "claude exited with code $EXIT_CODE"
if [ $EXIT_CODE -eq 124 ] || [ $EXIT_CODE -eq 142 ]; then
  log "TIMEOUT: claude --print exceeded 45min. Resource may need manual review."
fi

# ──────── Post ────────

# 성공 시에만 success lock 갱신 (실패 시엔 즉시 재시도 가능)
if [ $EXIT_CODE -eq 0 ]; then
  date +%s > "$SUCCESS_LOCK"
fi

# 만약 RESUME.md가 completed로 바뀌었으면 lock 파일 제거 (다음 sleep 세션 허용)
if grep -q "^status:\s*completed" "$RESUME_FILE" 2>/dev/null; then
  log "RESUME.md now completed — cycle finished"
fi

log "────── sleep-resume.sh end (exit $EXIT_CODE) ──────"
exit $EXIT_CODE
