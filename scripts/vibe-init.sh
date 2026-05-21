#!/usr/bin/env bash
# vibe-init.sh — 세션 시작 체크 통합 (토큰 효율화)
# 모든 Step 0.x 체크를 한 번에 실행, JSON으로 결과 출력
# Usage: bash scripts/vibe-init.sh [--json]

set -o pipefail

JSON_MODE=false
[ "${1:-}" = "--json" ] && JSON_MODE=true

# === 결과 변수 ===
ATEAM_PATH=""
ATEAM_SYNCED=false
SYMLINK_OK=true
RESUME_ACTIVE=false
RESUME_MODE=""
LAUNCHD_ACTIVE=false
DESIGN_MD=""
ROADMAP_PHASE=""
ROADMAP_STATUS=""
CAPABILITY_SCORE=""
PENDING_IMP=0
PENDING_P0=0
GIT_BRANCH=""
GIT_DIRTY=0
GIT_LAST=""
IN_PROGRESS=""
COLD_REVIEW_DUE=false
MAJOR_INTEGRATION=false
ABSORB_SUGGESTED=false
ALERTS=""
ACTIONS=""

add_alert() { [ -n "$ALERTS" ] && ALERTS="$ALERTS|$1" || ALERTS="$1"; }
add_action() { [ -n "$ACTIONS" ] && ACTIONS="$ACTIONS|$1" || ACTIONS="$1"; }

# === Step 0.1: Analytics Emit ===
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
if [ -n "$REPO_ROOT" ] && [ -f "$REPO_ROOT/scripts/log-event.mjs" ]; then
  node "$REPO_ROOT/scripts/log-event.mjs" session_start \
    "branch=$(git branch --show-current 2>/dev/null || echo unknown)" 2>/dev/null || true
fi

# === Step 0.2: A-Team Sync ===
for candidate in "$HOME/Projects/a-team" "$HOME/tools/A-Team" "$HOME/A-Team" "$HOME/Desktop/Dev Projects/A-Team"; do
  [ -d "$candidate/.git" ] && ATEAM_PATH="$candidate" && break
done

if [ -n "$ATEAM_PATH" ]; then
  FETCH_FILE="$ATEAM_PATH/.git/FETCH_HEAD"
  FETCH_AGE=999999
  if [ -f "$FETCH_FILE" ]; then
    # Use GNU stat format %Y for modification time (Git Bash compatible)
    MOD_TIME=$(stat -c %Y "$FETCH_FILE" 2>/dev/null || stat -f %m "$FETCH_FILE" 2>/dev/null || echo 0)
    # Ensure MOD_TIME is a number
    [[ "$MOD_TIME" =~ ^[0-9]+$ ]] || MOD_TIME=0
    FETCH_AGE=$(($(date +%s) - MOD_TIME))
  fi

  if [ "$FETCH_AGE" -gt 21600 ]; then
    if (cd "$ATEAM_PATH" && git pull --rebase --autostash origin master >/dev/null 2>&1); then
      NEW_COMMITS=$(cd "$ATEAM_PATH" && git log --oneline HEAD@{1}..HEAD 2>/dev/null | wc -l | tr -d ' ')
      [ "$NEW_COMMITS" -gt 0 ] && add_alert "A-Team ${NEW_COMMITS} commits synced"
      ATEAM_SYNCED=true
    fi
  fi

  if ! readlink ~/.claude/commands/end.md 2>/dev/null | grep -qi a-team; then
    SYMLINK_OK=false
    add_alert "symlink broken"
  fi
fi

# === Step 0.55: Absorb 주간 스캔 ===
if [ -f "./.claude/commands/absorb.md" ] && [ "$(basename "$(pwd)")" = "a-team" ]; then
  if [ "$(date +%u)" = "7" ]; then
    LAST_SCAN=".last-absorb-scan"
    TODAY=$(date +%Y-%m-%d)
    if [ "$(cat "$LAST_SCAN" 2>/dev/null)" != "$TODAY" ]; then
      ABSORB_SUGGESTED=true
      add_action "/absorb"
    fi
  fi
fi

# === Step 0.5: 정기 검사 ===
if [ -f ".context/analytics.jsonl" ]; then
  COLD_DAYS=$(node -e "
  const fs=require('fs');
  try{
    const lines=fs.readFileSync('.context/analytics.jsonl','utf8').trim().split('\n').filter(Boolean);
    const last=lines.map(l=>{try{return JSON.parse(l);}catch{}}).filter(e=>e&&e.event==='cold_review').pop();
    if(!last){console.log('999');}
    else{console.log(Math.floor((Date.now()-new Date(last.ts))/86400000));}
  }catch{console.log('999');}
  " 2>/dev/null || echo "999")

  [ "$COLD_DAYS" -ge 30 ] && COLD_REVIEW_DUE=true && add_action "/cold-review"
fi

MAJOR_FILES=$(git diff --name-only HEAD~3..HEAD 2>/dev/null | grep -E '^(lib/.*\.ts|\.claude/agents/.*\.md|governance/)' | head -1 || true)
[ -n "$MAJOR_FILES" ] && MAJOR_INTEGRATION=true && add_action "/optimize"

# === Step 0.6: Resume 감지 ===
if [ -f ".context/RESUME.md" ]; then
  if ! grep -q "status:.*completed" ".context/RESUME.md"; then
    RESUME_ACTIVE=true
    RESUME_MODE=$(grep -E "^mode:" ".context/RESUME.md" 2>/dev/null | head -1 | sed 's/mode: *//' | tr -d '"' || echo "")
    add_action "/pickup"
  fi
fi

# === Step 0.6b: launchd 확인 ===
PROJ_NAME=$(basename "$(pwd -P)" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-')
LABEL="com.ateam.sleep-resume.${PROJ_NAME}"
[ "$(pwd -P)" = "$ATEAM_PATH" ] && LABEL="com.ateam.sleep-resume"
launchctl list 2>/dev/null | grep -q "$LABEL" && LAUNCHD_ACTIVE=true

# === Step 0.66: DESIGN.md ===
DESIGN_MD=$(ls DESIGN.md design.md 2>/dev/null | head -1 || true)

# === Step 0.67: Team Roadmap ===
if [ -f ".context/team-roadmap.md" ]; then
  ROADMAP_PHASE=$(grep -E '^current_phase:' ".context/team-roadmap.md" 2>/dev/null | head -1 | sed -E 's/.*: *//' | tr -d '"' || echo "")
  ROADMAP_STATUS=$(grep -E '^status:' ".context/team-roadmap.md" 2>/dev/null | head -1 | sed -E 's/.*: *//' | tr -d '"' || echo "")
fi

# === Step 0.69: Capability ===
if [ -f "lib/capability-map.json" ] && [ -f "scripts/capability.mjs" ]; then
  SCORES=$(node scripts/capability.mjs --json 2>/dev/null || echo "")
  [ -n "$SCORES" ] && CAPABILITY_SCORE=$(echo "$SCORES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('overall',''))" 2>/dev/null || echo "")
fi

# === Step 0.8: Pending Improvements ===
if [ -f "improvements/pending.md" ]; then
  PENDING_IMP=$(grep -c "⏳" "improvements/pending.md" 2>/dev/null || echo 0)
  PENDING_P0=$(grep "⏳.*P0" "improvements/pending.md" 2>/dev/null | wc -l | tr -d ' ' || echo 0)
  [ "$PENDING_P0" -gt 0 ] && add_alert "P0: ${PENDING_P0}"
fi

# === Git 상태 ===
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
GIT_DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ' || echo 0)
GIT_LAST=$(git log --oneline -1 2>/dev/null | cut -c1-50 || echo "")

# === In Progress ===
if [ -f ".context/CURRENT.md" ]; then
  IN_PROGRESS=$(awk '/^## In Progress Files/,/^## /' ".context/CURRENT.md" 2>/dev/null | grep -vE "^##|없음|\(없음\)|^-.*없음" | grep -v "^$" | head -1 | sed 's/^- //' || true)
fi

# === 출력 ===
if $JSON_MODE; then
  cat <<EOF
{
  "git_branch": "$GIT_BRANCH",
  "git_dirty": $GIT_DIRTY,
  "git_last": "$GIT_LAST",
  "in_progress": "$IN_PROGRESS",
  "resume_active": $RESUME_ACTIVE,
  "resume_mode": "$RESUME_MODE",
  "launchd_active": $LAUNCHD_ACTIVE,
  "roadmap_phase": "$ROADMAP_PHASE",
  "capability": "$CAPABILITY_SCORE",
  "design_md": "$DESIGN_MD",
  "pending_p0": $PENDING_P0,
  "cold_review_due": $COLD_REVIEW_DUE,
  "major_integration": $MAJOR_INTEGRATION,
  "alerts": "$ALERTS",
  "actions": "$ACTIONS"
}
EOF
else
  echo "━━━ vibe-init ━━━"
  [ -n "$GIT_BRANCH" ] && echo "📍 $GIT_BRANCH | $GIT_LAST"
  [ "$GIT_DIRTY" -gt 0 ] && echo "📝 uncommitted: $GIT_DIRTY files"
  [ -n "$IN_PROGRESS" ] && echo "🔧 in progress: $IN_PROGRESS"
  [ -n "$ROADMAP_PHASE" ] && echo "🎯 Phase $ROADMAP_PHASE ($ROADMAP_STATUS)"
  [ -n "$CAPABILITY_SCORE" ] && echo "📊 Capability: ${CAPABILITY_SCORE}%"
  [ -n "$DESIGN_MD" ] && echo "📐 $DESIGN_MD"
  [ "$LAUNCHD_ACTIVE" = "true" ] && echo "✅ auto-resume active"
  [ "$RESUME_ACTIVE" = "true" ] && echo "⚠️  RESUME.md active (mode: $RESUME_MODE)"

  IFS='|' read -ra ALERT_ARR <<< "$ALERTS"
  for a in "${ALERT_ARR[@]}"; do [ -n "$a" ] && echo "⚠️  $a"; done

  if [ -n "$ACTIONS" ]; then
    echo "━━━ actions ━━━"
    IFS='|' read -ra ACT_ARR <<< "$ACTIONS"
    for a in "${ACT_ARR[@]}"; do [ -n "$a" ] && echo "→ $a"; done
  fi
  echo "━━━━━━━━━━━━━━━"
fi
