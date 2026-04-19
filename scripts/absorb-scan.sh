#!/bin/bash
# absorb-scan.sh — 다른 프로젝트의 A-Team 개선사항 역류 스캔 (순수 bash, LLM 호출 없음)
#
# 동작:
#   1. ~/Projects/*/ 스캔 (a-team, _archive, A-Team 자체 제외)
#   2. .claude/commands/, scripts/ 에서 master 대비 NEW/DIFF 파일 탐색
#   3. 헤당 파일 내용 heuristic 분류 (LOCAL/GLOBAL/UNCLEAR)
#   4. GLOBAL + UNCLEAR → improvements/pending.md append
#   5. LOCAL → absorb-scan.log 만 기록
#
# 호출 방식:
#   - 수동: bash scripts/absorb-scan.sh
#   - 주간 자동: launchd (scripts/install-absorb-cron.sh)
#   - /vibe Step 0.55 제안 (silent 모드)

set -u

ATEAM_MASTER="${ATEAM_MASTER:-$HOME/Projects/a-team}"
PENDING="$ATEAM_MASTER/improvements/pending.md"
LOG="$ATEAM_MASTER/improvements/absorb-scan.log"
LAST_SCAN_FILE="$ATEAM_MASTER/improvements/.last-absorb-scan"
REPORT_FILE="${ABSORB_REPORT:-/tmp/absorb-report-$(date +%Y%m%d-%H%M).md}"

mkdir -p "$(dirname "$PENDING")"
[ -f "$PENDING" ] || echo "# A-Team Improvements — Pending" > "$PENDING"
[ -f "$LOG" ] || touch "$LOG"

# 오늘 이미 스캔했으면 스킵 (manual override: FORCE=1)
TODAY=$(date +%Y-%m-%d)
if [ "${FORCE:-0}" != "1" ] && [ "$(cat "$LAST_SCAN_FILE" 2>/dev/null)" = "$TODAY" ]; then
  echo "[SKIP] 오늘 이미 스캔됨 ($TODAY). FORCE=1 로 재실행 가능."
  exit 0
fi

log_scan() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"
}

# Dedup: 동일 (proj_name, cmd_name) 이 PENDING에 ⏳ pending 또는 processed.md에 deferred 로 이미 있으면 스킵
PROCESSED="$ATEAM_MASTER/improvements/processed.md"
[ -f "$PROCESSED" ] || touch "$PROCESSED"

already_known() {
  local proj="$1" cmd="$2"
  local needle="command $cmd (from $proj)"
  # 1) PENDING 에 같은 항목이 ⏳ pending 으로 살아있으면 스킵
  #    grep -A 30 으로 헤더 뒤 30줄 수집 → 그 안에 ⏳ pending 있으면 살아있음
  if grep -F -A 30 "$needle" "$PENDING" 2>/dev/null | grep -qF "⏳ pending"; then
    return 0
  fi
  # 2) PROCESSED 에 deferred-no-value 등 종결 마커가 있으면 스킵 (source 변경 없으면 재등록 X)
  if grep -qF "$needle" "$PROCESSED" 2>/dev/null; then
    return 0
  fi
  return 1
}

# 헬퍼: 파일 내용 heuristic 분류
classify() {
  local file="$1"
  # LOCAL signal: 프로젝트명 / 경로 / 특정 스택
  if grep -qEi "vibe-toolkit|connectome|do-better-workspace|morning-rave|claude-remote|longform|hsc-clicker|ai-bubble|t33a-remapper|cross-pc-kit|auto-auth" "$file" 2>/dev/null; then
    echo "LOCAL:project-name-hardcoded"
    return
  fi
  if grep -qE "/Users/[a-z]+/Projects/[a-z0-9-]+/(?!a-team)" "$file" 2>/dev/null; then
    echo "LOCAL:path-hardcoded"
    return
  fi
  if grep -qEi "\b(rails|django|nextjs|unity|figma|godot|unreal|supabase|firebase)\b" "$file" 2>/dev/null; then
    echo "LOCAL:stack-specific"
    return
  fi
  # GLOBAL signal: A-Team 일반 패턴
  if grep -qE "A-Team|\.claude/commands|governance/rules|lib/" "$file" 2>/dev/null; then
    echo "GLOBAL"
    return
  fi
  echo "UNCLEAR"
}

# 리포트 헤더
cat > "$REPORT_FILE" <<EOF
# /absorb 스캔 리포트 — $(date '+%Y-%m-%d %H:%M:%S')

스캔 대상: \`$HOME/Projects/*/\`
master: \`$ATEAM_MASTER\`

## 후보 목록

EOF

SCAN_COUNT=0
NEW_COUNT=0
DIFF_COUNT=0
GLOBAL_COUNT=0
UNCLEAR_COUNT=0
LOCAL_COUNT=0

# ID 카운터 (오늘 기준)
DAILY_SEQ=0
YYYYMMDD=$(date +%Y%m%d)
LAST_ID=$(grep -oE "IMP-${YYYYMMDD}-[0-9]+" "$PENDING" 2>/dev/null | sort -V | tail -1 | sed -E 's/.*-//')
[ -n "$LAST_ID" ] && DAILY_SEQ=$((10#$LAST_ID))

# next_id: subshell 회피 위해 IMP_ID 를 global 변수로 쓴다 (command substitution 금지)
next_id() {
  DAILY_SEQ=$((DAILY_SEQ + 1))
  IMP_ID=$(printf "IMP-%s-%02d" "$YYYYMMDD" "$DAILY_SEQ")
}

# 스캔 루프
for proj_dir in "$HOME"/Projects/*/; do
  proj_name=$(basename "$proj_dir")
  case "$proj_name" in
    a-team|_archive|A-Team|node_modules|.*) continue ;;
  esac
  SCAN_COUNT=$((SCAN_COUNT + 1))

  # .claude/commands/*.md 검사
  if [ -d "$proj_dir.claude/commands" ]; then
    for cmd_file in "$proj_dir.claude/commands"/*.md; do
      [ -f "$cmd_file" ] || continue
      cmd_name=$(basename "$cmd_file")
      master_cmd="$ATEAM_MASTER/.claude/commands/$cmd_name"

      if [ ! -f "$master_cmd" ]; then
        # NEW
        NEW_COUNT=$((NEW_COUNT + 1))
        # Dedup 체크
        if already_known "$proj_name" "$cmd_name"; then
          log_scan "DEDUP-SKIP NEW $proj_name/$cmd_name (이미 pending/processed)"
          continue
        fi
        verdict=$(classify "$cmd_file")
        if [[ "$verdict" == LOCAL:* ]]; then
          LOCAL_COUNT=$((LOCAL_COUNT + 1))
          log_scan "LOCAL ($verdict) $proj_name/.claude/commands/$cmd_name"
        else
          if [ "$verdict" = "GLOBAL" ]; then
            GLOBAL_COUNT=$((GLOBAL_COUNT + 1))
          else
            UNCLEAR_COUNT=$((UNCLEAR_COUNT + 1))
          fi
          next_id
          FIRST_DESC=$(head -3 "$cmd_file" | grep -E "^description:|^# " | head -1 | sed 's/^description: //' | sed 's/^# //' | head -c 150)
          {
            echo ""
            echo "### $IMP_ID — NEW command $cmd_name (from $proj_name)"
            echo "- **날짜**: $TODAY"
            echo "- **출처**: /absorb 스캔 ($proj_name)"
            echo "- **타입**: NEW"
            echo "- **분류**: $verdict"
            echo "- **경로**: $proj_dir.claude/commands/$cmd_name"
            echo "- **설명**: $FIRST_DESC"
            echo "- **액션**: [ ] GLOBAL 확정 시 복사 | [ ] 일반화 후 추가 | [ ] 거부"
            echo "- **상태**: ⏳ pending"
          } >> "$PENDING"
          echo "- **$verdict** $proj_name/$cmd_name ($IMP_ID)" >> "$REPORT_FILE"
        fi
      elif ! diff -q "$cmd_file" "$master_cmd" >/dev/null 2>&1; then
        # DIFF
        DIFF_COUNT=$((DIFF_COUNT + 1))
        # Dedup 체크
        if already_known "$proj_name" "$cmd_name"; then
          log_scan "DEDUP-SKIP DIFF $proj_name/$cmd_name (이미 pending/processed)"
          continue
        fi
        verdict=$(classify "$cmd_file")
        if [[ "$verdict" == LOCAL:* ]]; then
          LOCAL_COUNT=$((LOCAL_COUNT + 1))
          log_scan "LOCAL-DIFF ($verdict) $proj_name/.claude/commands/$cmd_name"
        else
          if [ "$verdict" = "GLOBAL" ]; then
            GLOBAL_COUNT=$((GLOBAL_COUNT + 1))
          else
            UNCLEAR_COUNT=$((UNCLEAR_COUNT + 1))
          fi
          next_id
          DIFF_LINES=$(diff "$cmd_file" "$master_cmd" | wc -l | tr -d ' ')
          {
            echo ""
            echo "### $IMP_ID — DIFF command $cmd_name (from $proj_name)"
            echo "- **날짜**: $TODAY"
            echo "- **출처**: /absorb 스캔 ($proj_name)"
            echo "- **타입**: DIFF ($DIFF_LINES diff lines)"
            echo "- **분류**: $verdict"
            echo "- **경로**: $proj_dir.claude/commands/$cmd_name"
            echo "- **master 경로**: $master_cmd"
            echo "- **액션**: [ ] master 덮어쓰기 | [ ] 일부 머지 | [ ] 거부"
            echo "- **상태**: ⏳ pending"
          } >> "$PENDING"
          echo "- **$verdict** $proj_name/$cmd_name — DIFF $DIFF_LINES lines ($IMP_ID)" >> "$REPORT_FILE"
        fi
      fi
    done
  fi
done

# 리포트 요약
cat >> "$REPORT_FILE" <<EOF

## 요약

- 스캔: $SCAN_COUNT 프로젝트
- 발견: NEW $NEW_COUNT / DIFF $DIFF_COUNT
- 분류: GLOBAL $GLOBAL_COUNT / UNCLEAR $UNCLEAR_COUNT / LOCAL $LOCAL_COUNT
- pending 등록: $((GLOBAL_COUNT + UNCLEAR_COUNT))건
- LOCAL 로그만: $LOCAL_COUNT건

## 다음 액션

- 검토: \`cat $PENDING\`
- 반영: \`/improve apply <ID>\`
- LOCAL 로그: \`tail $LOG\`
EOF

echo "$TODAY" > "$LAST_SCAN_FILE"

# stdout 요약 (launchd 에서 StandardOutPath 로 캡처됨)
echo "────── /absorb scan ──────"
echo "Scan: $SCAN_COUNT projects | NEW $NEW_COUNT | DIFF $DIFF_COUNT"
echo "Pending: GLOBAL $GLOBAL_COUNT + UNCLEAR $UNCLEAR_COUNT | LOCAL skip $LOCAL_COUNT"
echo "Report: $REPORT_FILE"
echo "Pending log: $PENDING"
