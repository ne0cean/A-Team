#!/usr/bin/env bash
# subagent-dod.sh — SubagentStop 훅: 서브에이전트 종료 시 DoD 체크
# Exit 0 = 통과, Exit 2 = 차단 (에이전트 재실행 또는 에스컬레이션)
# JSON stdin으로 에이전트 출력 수신

PROJ_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
PLAN_FILE="$PROJ_ROOT/PARALLEL_PLAN.md"

# stdin에서 에이전트 JSON 출력 읽기
INPUT=$(cat)

# ── 1. 상태 코드 파싱 (preamble.md 표준: DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT) ──
STATUS=$(echo "$INPUT" | python3 -c "
import sys, json, re
try:
    d = json.load(sys.stdin)
    out = d.get('output', '')
    if isinstance(out, str):
        m = re.search(r'\"status\"\s*:\s*\"([^\"]+)\"', out)
        if m:
            print(m.group(1))
            sys.exit()
    print('')
except:
    print('')
" 2>/dev/null || echo "")

# BLOCKED 수신 시 오케스트레이터에게 에스컬레이션 경고
if [ "$STATUS" = "BLOCKED" ]; then
  BLOCKED_REASON=$(echo "$INPUT" | python3 -c "
import sys, json, re
try:
    d = json.load(sys.stdin)
    out = d.get('output', '')
    m = re.search(r'\"blocked_reason\"\s*:\s*\"([^\"]+)\"', str(out))
    print(m.group(1) if m else '상세 사유 없음')
except:
    print('상세 사유 없음')
" 2>/dev/null || echo "상세 사유 없음")
  printf '{"decision":"block","reason":"[BLOCKED] 에이전트가 진행 불가 상태를 반환했습니다.\\n사유: %s\\n\\n동일 에이전트 재호출 금지. orchestrator에게 사람 에스컬레이션 요청하세요."}\n' \
    "$BLOCKED_REASON" >&2
  exit 2
fi

# NEEDS_CONTEXT 수신 시 오케스트레이터에게 컨텍스트 요청 전달
if [ "$STATUS" = "NEEDS_CONTEXT" ]; then
  printf '{"systemMessage":"[NEEDS_CONTEXT] 에이전트가 추가 정보를 요청했습니다. 에이전트 출력의 missing 필드를 확인하고 필요한 정보를 제공하세요."}\n'
  exit 0
fi

# DONE_WITH_CONCERNS 수신 시 경고 메시지 (차단하지 않음)
if [ "$STATUS" = "DONE_WITH_CONCERNS" ]; then
  printf '{"systemMessage":"[DONE_WITH_CONCERNS] 에이전트가 완료했으나 주의사항이 있습니다. risks 필드를 확인하세요."}\n'
fi

# ── 2. PARALLEL_PLAN.md DoD 체크 (상태 코드 없는 구버전 에이전트 호환) ──
if [ -f "$PLAN_FILE" ] && [ -z "$STATUS" ]; then
  INCOMPLETE=$(grep -c "^\- \[ \]" "$PLAN_FILE" 2>/dev/null || echo "0")
  TOTAL=$(grep -c "^\- \[" "$PLAN_FILE" 2>/dev/null || echo "0")

  if [ "$INCOMPLETE" -gt 0 ] && [ "$TOTAL" -gt 0 ]; then
    INCOMPLETE_ITEMS=$(grep "^\- \[ \]" "$PLAN_FILE" | head -3)
    printf '{"systemMessage":"[SubagentDoD] 미완료 항목 %d/%d개:\\n%s\\n완료 후 /end 실행 권장"}\n' \
      "$INCOMPLETE" "$TOTAL" "$INCOMPLETE_ITEMS"
  fi
fi

exit 0
