#!/usr/bin/env bash
# careful-check.sh — PreToolUse 훅: 지능형 리스크 스코어러
#
# pre-bash.sh와의 차이:
#   pre-bash.sh  = 명확한 위험 명령 즉시 차단 (block)
#   careful-check.sh = 모호한 위험 명령을 리스크 점수로 평가 → ask/warn/allow
#
# 활성화: CAREFUL_MODE=1 환경변수 설정 또는 .careful 파일 존재 시
# 비활성화: CAREFUL_MODE 미설정 (기본값 — 무조건 통과)
#
# settings.json에 추가하면 PreToolUse에서 자동 실행:
#   {"matcher": "Bash", "hooks": [{"type": "command",
#    "command": "bash \".claude/hooks/careful-check.sh\"", "timeout": 5}]}

# ── 활성화 여부 확인 ──────────────────────────────────────
PROJ_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CAREFUL_FILE="$PROJ_ROOT/.careful"

if [ -z "$CAREFUL_MODE" ] && [ ! -f "$CAREFUL_FILE" ]; then
  # 비활성화 상태 — 통과
  exit 0
fi

# ── stdin에서 커맨드 읽기 ─────────────────────────────────
INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('input', {}).get('command', ''))
except:
    print('')
" 2>/dev/null || echo "")

[ -z "$CMD" ] && exit 0

# ── 리스크 스코어 계산 ───────────────────────────────────
SCORE=0
REASONS=()

# +30: 프로덕션 환경 키워드
if echo "$CMD" | grep -qiE "prod|production|live"; then
  SCORE=$((SCORE + 30))
  REASONS+=("프로덕션 환경 관련")
fi

# +25: 데이터 삭제/변경
if echo "$CMD" | grep -qE "DELETE|TRUNCATE|DROP|rm -rf|rmdir"; then
  SCORE=$((SCORE + 25))
  REASONS+=("데이터 삭제 작업")
fi

# +20: 배포/퍼블리시
if echo "$CMD" | grep -qiE "deploy|publish|release|npm publish|docker push"; then
  SCORE=$((SCORE + 20))
  REASONS+=("배포/퍼블리시")
fi

# +20: DB 마이그레이션
if echo "$CMD" | grep -qiE "migrate|migration|schema"; then
  SCORE=$((SCORE + 20))
  REASONS+=("DB 스키마 변경")
fi

# +15: 환경변수/시크릿 조작
if echo "$CMD" | grep -qiE "\.env|secret|credential|password|token" | grep -vq "grep"; then
  SCORE=$((SCORE + 15))
  REASONS+=("환경변수/시크릿 관련")
fi

# +15: kubectl/클라우드 리소스 삭제
if echo "$CMD" | grep -qiE "kubectl delete|aws.*delete|gcloud.*delete"; then
  SCORE=$((SCORE + 15))
  REASONS+=("클라우드 리소스 삭제")
fi

# +10: force 플래그
if echo "$CMD" | grep -qE "\-\-force|\-f "; then
  SCORE=$((SCORE + 10))
  REASONS+=("--force 플래그 사용")
fi

# +10: 다수 파일 일괄 처리
if echo "$CMD" | grep -qE "\*\*|\.\.\.|xargs|find.*exec"; then
  SCORE=$((SCORE + 10))
  REASONS+=("다수 파일 일괄 처리")
fi

# ── 판정 ────────────────────────────────────────────────
REASON_STR=$(IFS=", "; echo "${REASONS[*]}")

if [ ${#REASONS[@]} -eq 0 ]; then
  # 위험 요소 없음 — 통과
  exit 0
fi

if [ $SCORE -ge 40 ]; then
  # 고위험 → ask (사용자 확인 요청)
  printf '{
  "hookSpecificOutput": {
    "permissionDecision": "ask",
    "updateUserMessage": "[CAREFUL] 리스크 점수: %d/100\n사유: %s\n\n명령어: %s\n\n계속 진행할까요?"
  }
}\n' "$SCORE" "$REASON_STR" "$CMD"
  exit 0
elif [ $SCORE -ge 20 ]; then
  # 중위험 → allow + 경고 메시지
  printf '{"systemMessage":"[CAREFUL ⚠️] 리스크 점수 %d/100 (%s). 의도한 명령인지 확인하세요."}\n' \
    "$SCORE" "$REASON_STR"
  exit 0
else
  # 저위험 → 통과 (로그만)
  exit 0
fi
