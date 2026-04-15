#!/bin/bash
# overnight-queue.sh — RESUME.md 자동 큐잉 + infra 검증 + 요약 출력
#
# 사용법:
#   bash overnight-queue.sh "<task description>"
#   bash overnight-queue.sh auto       # CURRENT.md Next Tasks 에서 안전 항목 자동 선별
#   bash overnight-queue.sh auto --force  # 기존 in_progress 덮어쓰기
#
# 호출처: /overnight 스킬의 Step 2-4 핵심 로직
# 설계: /sleep.md 와 분리된 경량 entry point

set -u

# 배열 사전 초기화 (set -u 안전)
TASKS=()
SKIPPED=()

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESUME="$PROJECT_ROOT/.context/RESUME.md"
CURRENT="$PROJECT_ROOT/.context/CURRENT.md"
LOCK_DIR="$HOME/.ateam-sleep-locks"

TASK_ARG="${1:-auto}"
FORCE="${2:-}"

# ──────── Pre-checks ────────

if [ ! -d "$PROJECT_ROOT/.git" ]; then
  echo "❌ Not a git repo: $PROJECT_ROOT"
  exit 1
fi

if [ -z "$TASK_ARG" ]; then
  echo "Usage: $0 '<task description>' | auto [--force]"
  exit 1
fi

# 기존 RESUME.md in_progress 체크
if [ -f "$RESUME" ] && grep -q "^status: in_progress" "$RESUME" 2>/dev/null; then
  if [ "$FORCE" != "--force" ]; then
    echo "⚠️ RESUME.md 이미 in_progress 상태. 덮어쓰려면 --force 추가."
    echo "   현재 상태: $(grep -E '^(status|session_goal):' "$RESUME" | head -2)"
    exit 2
  fi
  echo "[FORCE] 기존 in_progress 덮어씀"
fi

# ──────── Step 1: Task 수집 ────────

if [ "$TASK_ARG" = "auto" ]; then
  # CURRENT.md Next Tasks 파싱
  # - [ ] 로 시작하는 라인만
  # - 안전 키워드 포함, 불안전 키워드 제외
  UNSAFE_RE="prod|deploy|force|drop|migrate|설계|decision|선택|파일럿|실전|UI 샘플|승인"
  SAFE_RE="rule|구현|test|문서|doc|refactor|lint|cleanup|압축|정리"

  while IFS= read -r line; do
    # - [ ] 시작 + 미체크
    [[ ! "$line" =~ ^-\ \[\ \] ]] && continue
    # 이모지 🗓️/📅 있으면 날짜 scheduled 태스크 — 제외
    [[ "$line" =~ 🗓️|📅 ]] && SKIPPED+=("scheduled: ${line:0:80}") && continue
    # 불안전 키워드
    if echo "$line" | grep -qiE "$UNSAFE_RE"; then
      SKIPPED+=("unsafe: ${line:0:80}")
      continue
    fi
    # 안전 키워드 매치 (없으면 보수적으로 제외)
    if ! echo "$line" | grep -qiE "$SAFE_RE"; then
      SKIPPED+=("no-safe-signal: ${line:0:80}")
      continue
    fi
    TASKS+=("$line")
  done < <(awk '/^## Next Tasks/{flag++; if(flag>1)exit; next} flag && /^## / && !/^## Next/{exit} flag' "$CURRENT" 2>/dev/null | head -50)

  if [ ${#TASKS[@]} -eq 0 ]; then
    echo "❌ 안전한 태스크 없음. 명시 태스크 필요: $0 '<설명>'"
    echo ""
    SKIPPED_COUNT=${#SKIPPED[@]}
    echo "Skipped ($SKIPPED_COUNT):"
    if [ $SKIPPED_COUNT -gt 0 ]; then
      for s in "${SKIPPED[@]}"; do echo "  - $s"; done
    fi
    exit 3
  fi
else
  # 명시 태스크 1개
  TASKS+=("- [ ] $TASK_ARG")
fi

# ──────── Step 2: RESUME.md 작성 ────────

TODAY=$(date +%Y-%m-%dT%H:%M:%S%z)
GOAL="${TASK_ARG:0:80}"

cat > "$RESUME" <<EOF
---
created_at: $TODAY
reason: overnight-queue
status: in_progress
mode: sleep
contract: governance/rules/autonomous-loop.md v2026-04-15 (조항 1-7)
narration_budget_bytes: 500
session_goal: "$GOAL"
next_reset_at: "unknown (probe 기반 자동 감지)"
---

## 실행 계약

launchd 가 2분마다 probe. 리셋 감지 시 자동 실행.

**의무**:
1. \`governance/rules/autonomous-loop.md\` Read (조항 1-7, 특히 6/7)
2. 질문 금지, 나레이션 금지
3. 각 태스크 완료 = commit + push + Completed 섹션 update
4. \`npm test\` + \`tsc --noEmit\` 미통과 시 revert, 다음 태스크
5. 모든 태스크 완료 시 \`status: completed\`

## ❌ 금지 사항

- 설계 결정 필요 태스크 → defer
- \`/sleep.md\`, \`orchestrator.md\` 등 핵심 인프라 수정
- 파괴적 작업 (force push, branch delete, prod deploy, migration)
- \`--dangerously-skip-permissions\` 플래그 (2026-04-15 사건)
- \`/autoresearch\` 실행 (사용자 판단)
- 실 UI 프로젝트 파일럿 (사용자 확인 필요)

## ✅ Tasks

EOF

for i in "${!TASKS[@]}"; do
  N=$((i + 1))
  echo "### T$N" >> "$RESUME"
  echo "${TASKS[$i]}" >> "$RESUME"
  echo "" >> "$RESUME"
done

cat >> "$RESUME" <<'EOF'
## Completed (launchd 재개 시 중복 금지)
(비어있음)

## Commits This Cycle
(비어있음)

## Resume Command

launchd 자동 fire 실패 시 수동:
```
/pickup
```
EOF

# ──────── Step 3: Infra 검증 ────────

echo "────── /overnight 세팅 ──────"
echo ""
echo "📋 큐잉된 태스크: ${#TASKS[@]}건"
for i in "${!TASKS[@]}"; do
  N=$((i + 1))
  TASK_SUMMARY="${TASKS[$i]}"
  echo "  T$N. ${TASK_SUMMARY:0:100}"
done

SKIPPED_COUNT=${#SKIPPED[@]}
if [ $SKIPPED_COUNT -gt 0 ]; then
  echo ""
  echo "⚠️ Skipped: ${SKIPPED_COUNT}건"
  for s in "${SKIPPED[@]}"; do echo "  - $s"; done
fi

echo ""
echo "🔧 Infra 검증:"

# launchd 상태
if launchctl list 2>/dev/null | grep -q "com.ateam.sleep-resume"; then
  echo "  ✅ launchd loaded (매 2분 probe)"
else
  echo "  ⚠️ launchd not loaded — 설치 중..."
  bash "$PROJECT_ROOT/scripts/install-sleep-cron.sh" install "every 2m" > /dev/null 2>&1
  if launchctl list 2>/dev/null | grep -q "com.ateam.sleep-resume"; then
    echo "     ✅ 설치 완료"
  else
    echo "     ❌ 설치 실패. 수동: bash scripts/install-sleep-cron.sh install 'every 2m'"
  fi
fi

# Lock 파일 정리
mkdir -p "$LOCK_DIR"
rm -f "$LOCK_DIR/last-success" "$LOCK_DIR/running.pid"
echo "  ✅ Lock 정리됨"

# Claude CLI 인증 확인 (3초 timeout)
AUTH_OK=0
if command -v gtimeout >/dev/null 2>&1; then
  CHECK=$(gtimeout 15 claude -p --model haiku --max-budget-usd 0.02 "ok" 2>&1 | head -3)
else
  CHECK=$(claude -p --model haiku --max-budget-usd 0.02 "ok" 2>&1 | head -3)
fi
if echo "$CHECK" | grep -qiE "hit your limit|rate.?limit|not authenticated"; then
  echo "  ⚠️ Claude CLI: rate-limit 또는 인증 이슈"
  echo "     snippet: ${CHECK:0:120}"
elif [ -n "$CHECK" ]; then
  echo "  ✅ Claude CLI 인증 OK (reset 감지 probe 준비됨)"
  AUTH_OK=1
else
  echo "  ⚠️ Claude CLI 응답 없음"
fi

# Git 상태
UNCOMMITTED=$(git -C "$PROJECT_ROOT" status --short | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt 0 ]; then
  echo "  ⚠️ Uncommitted changes: ${UNCOMMITTED}개 파일 — 야간 세션이 덮어쓸 수 있음"
  echo "     (원하면 먼저 commit 또는 stash)"
else
  echo "  ✅ Git 워킹트리 깨끗함"
fi

echo ""
echo "⏰ 예상 동작:"
echo "  - 토큰 리셋 2분 이내 자동 감지 (exponential backoff)"
echo "  - 각 태스크 완료마다 commit+push"
echo "  - 연속 timeout 2회 or stall 2회 시 자동 중단 (조항 7)"
echo "  - 병렬 실행 차단 (pid lock)"
echo ""
echo "🌅 아침에:"
echo "  - /vibe (Step 0.6 가 RESUME.md 자동 감지)"
echo "  - git log --oneline HEAD@{12.hours.ago}..HEAD"
echo "  - tail ~/Library/Logs/ateam-sleep-resume.log"
echo ""
echo "안전히 다녀오세요. 🌙"
