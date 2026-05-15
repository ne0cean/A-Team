#!/bin/bash
# Verification Gate Check — PreToolUse Bash 훅
#
# git commit 명령 감지 시 직전 npm test / tsc 실행 여부를 확인한다.
# 미실행이면 additionalContext로 경고 주입 (advisory 모드 — 차단하지 않음).
#
# 참조: governance/rules/verification-gate.md
#
# 훅 등록 방법 (.claude/settings.json):
#   "hooks": {
#     "PreToolUse": [
#       {"matcher": "Bash", "hooks": [{"type": "command", "command": "bash scripts/orchestration/verification-gate-check.sh"}]}
#     ]
#   }

set -uo pipefail

INPUT=$(cat)

# Bash 도구의 command 필드 추출
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)

# git commit 명령이 아니면 즉시 통과
if ! echo "$CMD" | grep -qE '(^|\|[[:space:]]*)git[[:space:]]+commit'; then
  echo '{}'
  exit 0
fi

# --allow-empty 또는 docs-only 커밋은 gate 제외
if echo "$CMD" | grep -qE '(--allow-empty|\[docs-only\])'; then
  echo '{}'
  exit 0
fi

# ─── 테스트 실행 기록 확인 ───────────────────────────────────────────────
# 전략: 현재 쉘 세션의 shell history 또는 analytics.jsonl에서 확인.
# analytics.jsonl이 있으면 최근 1시간 내 test/build 이벤트 조회.

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || pwd)"
ANALYTICS="$REPO_ROOT/.context/analytics.jsonl"

TEST_FOUND=false
CUTOFF=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u --date='1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")

if [ -f "$ANALYTICS" ] && [ -n "$CUTOFF" ]; then
  # 최근 1시간 내 test/build 이벤트 검색
  if jq -e --arg cutoff "$CUTOFF" '
    select(.ts >= $cutoff) |
    select(
      .event == "test_pass" or
      .event == "build_pass" or
      (.event == "command_end" and (.name // "" | test("test|build|tsc"; "i")))
    )
  ' "$ANALYTICS" 2>/dev/null | grep -q .; then
    TEST_FOUND=true
  fi
fi

# shell history fallback: history 파일에서 npm test / tsc 검색 (최근 50줄)
if [ "$TEST_FOUND" = false ]; then
  HISTFILE="${HISTFILE:-$HOME/.zsh_history}"
  if [ -f "$HISTFILE" ]; then
    if tail -50 "$HISTFILE" 2>/dev/null | grep -qE '(npm test|npx vitest|npx tsc|yarn test|pnpm test)'; then
      TEST_FOUND=true
    fi
  fi
fi

# ─── 결과 출력 ───────────────────────────────────────────────────────────

if [ "$TEST_FOUND" = true ]; then
  # 테스트 확인됨 — 통과
  echo '{}'
  exit 0
fi

# 테스트 미확인 — 경고 주입 (advisory, 차단 아님)
jq -n '{
  hookSpecificOutput: {
    additionalContext: "⚠️  Verification Gate: 테스트 미실행 상태에서 커밋 시도.\n\nFSM 상태: DRAFT → COMMITTED (TESTED 단계 누락)\n\n권장 순서:\n  1. npm test  (또는 npx tsc --noEmit)\n  2. 의도-결과 일치 확인 (VERIFIED)\n  3. git commit\n\n순수 문서 변경이면 커밋 메시지에 [docs-only] 추가하면 이 경고가 생략됩니다.\n참조: governance/rules/verification-gate.md"
  }
}'
