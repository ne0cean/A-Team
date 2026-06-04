#!/usr/bin/env bash
# ac-impact-injector.sh — current-task-ac.txt 저장 시 impact.mjs 결과 자동 주입
# PostToolUse:Write|Edit 훅으로 설치됨 (~/.claude/settings.json)
#
# 동작:
#   1. current-task-ac.txt 수정 감지
#   2. FILES: 필드에서 대상 파일 목록 파싱
#   3. 각 파일에 대해 scripts/impact.mjs 실행 → 영향 파일 수 집계
#   4. risk-tier.md 기준으로 RISK 등급 자동 판정
#   5. AC 파일에 RISK: 필드 주입 (누락 또는 placeholder인 경우만)
#
# 참조: governance/rules/task-ac.md, governance/rules/risk-tier.md

set -uo pipefail

ATEAM_ROOT="$HOME/Projects/a-team"
IMPACT_SCRIPT="$ATEAM_ROOT/scripts/impact.mjs"
AC_FILE="$HOME/.claude/current-task-ac.txt"

# stdin에서 tool event JSON 읽기
INPUT=$(cat)

# file_path 추출
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    p = d.get('tool_input', {})
    print(p.get('file_path', ''))
except:
    print('')
" 2>/dev/null || echo "")

# current-task-ac.txt 수정인지 확인
[[ "$FILE_PATH" != *"current-task-ac.txt"* ]] && { echo '{}'; exit 0; }

# AC 파일 없으면 스킵
[ ! -f "$AC_FILE" ] && { echo '{}'; exit 0; }
[ ! -f "$IMPACT_SCRIPT" ] && { echo '{}'; exit 0; }

# 이미 유효한 RISK 명시된 경우 스킵 (placeholder/미지정만 재계산)
if grep -qE "^RISK:[[:space:]]*(LOW|MEDIUM|HIGH|CRITICAL)([[:space:]]|$)" "$AC_FILE" 2>/dev/null; then
  echo '{}'
  exit 0
fi

# FILES: 필드 파싱 — 단일행 또는 멀티행 지원
# 예: FILES: lib/foo.ts lib/bar.ts
# 예: FILES: [lib/foo.ts, lib/bar.ts]
FILES_LINE=$(awk '/^FILES:/{found=1; sub(/^FILES:[[:space:]]*/,""); print; next}
                  found && /^[A-Z_]+:/{exit}
                  found{print}' "$AC_FILE" 2>/dev/null | \
  tr ',' ' ' | tr '\n' ' ' | sed 's/\[//g; s/\]//g' | xargs 2>/dev/null || echo "")

[ -z "$FILES_LINE" ] && { echo '{}'; exit 0; }

# 파일 목록 배열로 변환
declare -a FILE_LIST=()
for f in $FILES_LINE; do
  f=$(echo "$f" | tr -d '[:space:]')
  [ -n "$f" ] && FILE_LIST+=("$f")
done

FILE_COUNT=${#FILE_LIST[@]}
[ "$FILE_COUNT" -eq 0 ] && { echo '{}'; exit 0; }

# 각 파일에 대해 impact.mjs 실행 → 총 영향 파일 수 집계
TOTAL_IMPACT=0
IMPACT_DETAILS=""

for f in "${FILE_LIST[@]}"; do
  # 절대경로라면 a-team root 기준 상대경로로 변환
  if [[ "$f" = /* ]]; then
    REL_F="${f#$ATEAM_ROOT/}"
    # a-team 외부 파일이면 스킵
    [[ "$REL_F" = /* ]] && continue
    TARGET_F="$REL_F"
  else
    TARGET_F="$f"
  fi

  COUNT=$(cd "$ATEAM_ROOT" && node "$IMPACT_SCRIPT" "$TARGET_F" 2>/dev/null | grep "→" | wc -l | tr -d ' ')
  COUNT="${COUNT:-0}"
  # 숫자만 추출
  COUNT=$(echo "$COUNT" | grep -oE '[0-9]+' | head -1 || echo "0")
  COUNT="${COUNT:-0}"
  TOTAL_IMPACT=$((TOTAL_IMPACT + COUNT))
  [ "$COUNT" -gt 0 ] && IMPACT_DETAILS="$IMPACT_DETAILS $TARGET_F(+$COUNT)"
done

IMPACT_DETAILS=$(echo "$IMPACT_DETAILS" | xargs 2>/dev/null || echo "")

# Risk tier 계산 (task-ac.md + risk-tier.md 기준)
if [ "$TOTAL_IMPACT" -ge 10 ] || [ "$FILE_COUNT" -ge 10 ]; then
  TIER="CRITICAL"
elif [ "$TOTAL_IMPACT" -ge 4 ] || [ "$FILE_COUNT" -ge 6 ]; then
  TIER="HIGH"
elif [ "$TOTAL_IMPACT" -ge 1 ] || [ "$FILE_COUNT" -ge 2 ]; then
  TIER="MEDIUM"
else
  TIER="LOW"
fi

RISK_LINE="RISK: $TIER  # auto-injected: impact=${TOTAL_IMPACT} files=${FILE_COUNT}"

# RISK 필드 삽입 또는 placeholder 갱신
if grep -q "^RISK:" "$AC_FILE"; then
  # 기존 RISK 라인 업데이트 (placeholder 교체)
  sed -i '' "s|^RISK:.*$|$RISK_LINE|" "$AC_FILE"
else
  # awk로 TASK: 줄 다음에 RISK 삽입 (macOS sed 개행 이슈 우회)
  awk -v risk="$RISK_LINE" '
    /^TASK:/{print; print risk; next}
    {print}
  ' "$AC_FILE" > /tmp/ac-injector-tmp.txt && mv /tmp/ac-injector-tmp.txt "$AC_FILE"
fi

# Claude에게 결과 주입
MSG="[ac-impact-injector] RISK 자동 주입: ${TIER}"
[ -n "$IMPACT_DETAILS" ] && MSG="$MSG | 영향: $IMPACT_DETAILS"
MSG="$MSG | 수정 ${FILE_COUNT}파일"

jq -n --arg ctx "$MSG" \
  '{hookSpecificOutput:{additionalContext:$ctx}}'
