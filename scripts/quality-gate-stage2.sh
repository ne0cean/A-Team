#!/bin/bash
# quality-gate-stage2.sh — Quality 검증 (Diff sanity + JSON schema + Token budget)
#
# 사용법:
#   bash quality-gate-stage2.sh               # HEAD 검사
#   bash quality-gate-stage2.sh <commit_sha>  # 특정 커밋 검사
#   TARGET=staged bash quality-gate-stage2.sh # 스테이지된 변경만
#
# Exit code:
#   0 — PASS
#   1 — BLOCK (심각 위반)
#   2 — WARN (review 권장, 차단 안 함)

set -u

TARGET="${TARGET:-${1:-HEAD}}"
VIOLATIONS=()
WARNINGS=()

add_violation() { VIOLATIONS+=("$1"); }
add_warning() { WARNINGS+=("$1"); }

# ──────── 2A. Git Diff Sanity ────────

if [ "$TARGET" = "staged" ]; then
  DIFF_CMD="git diff --cached"
else
  DIFF_CMD="git diff $TARGET~1 $TARGET"
fi

DIFF_LINES=$($DIFF_CMD | wc -l | tr -d ' ')
CHANGED_FILES=$($DIFF_CMD --name-only)

# Huge diff 감지 (5000 lines 초과)
if [ "$DIFF_LINES" -gt 5000 ]; then
  add_warning "Huge diff: ${DIFF_LINES} lines (임계 5000 초과) — 의도된 리팩토링인지 확인"
fi

# Secret 파일 감지 (CRITICAL)
SECRET_FILES=$(echo "$CHANGED_FILES" | grep -E '^\.env$|\.env\.(local|production|staging)$|\.pem$|\.key$|id_rsa|\.p12$|\.pfx$|credentials\.json$' || true)
if [ -n "$SECRET_FILES" ]; then
  add_violation "Secret 파일 변경 감지: $SECRET_FILES"
fi

# Binary 파일 감지 (예외: assets/, public/)
BINARY_FILES=$(echo "$CHANGED_FILES" | while read f; do
  [ -z "$f" ] && continue
  [[ "$f" =~ ^(assets|public|static)/ ]] && continue
  if file "$f" 2>/dev/null | grep -qiE "binary|data"; then
    echo "$f"
  fi
done)
if [ -n "$BINARY_FILES" ]; then
  add_warning "Binary 파일 변경 (예외 경로 밖): $BINARY_FILES"
fi

# OS junk 파일 감지
JUNK_FILES=$(echo "$CHANGED_FILES" | grep -E '\.DS_Store$|Thumbs\.db$|desktop\.ini$|\.swp$' || true)
if [ -n "$JUNK_FILES" ]; then
  add_violation "OS junk 파일 커밋: $JUNK_FILES"
fi

# ──────── 2B. JSON/YAML Schema 검증 ────────

JSON_FILES=$(echo "$CHANGED_FILES" | grep '\.json$' || true)
for f in $JSON_FILES; do
  [ -f "$f" ] || continue
  if ! python3 -c "import json; json.load(open('$f'))" 2>/dev/null && ! node -e "JSON.parse(require('fs').readFileSync('$f', 'utf8'))" 2>/dev/null; then
    add_violation "Invalid JSON: $f"
  fi
done

# package.json 필수 필드
if echo "$CHANGED_FILES" | grep -q '^package\.json$'; then
  if ! node -e "const p=require('./package.json'); if(!p.name) process.exit(1)" 2>/dev/null; then
    add_violation "package.json missing 'name' field"
  fi
fi

# Agent frontmatter 검증
AGENT_FILES=$(echo "$CHANGED_FILES" | grep '^\.claude/agents/.*\.md$' || true)
for f in $AGENT_FILES; do
  [ -f "$f" ] || continue
  FRONTMATTER=$(awk '/^---$/{f=!f; next} f{print}' "$f" 2>/dev/null | head -20)
  for field in name description tools model; do
    if ! echo "$FRONTMATTER" | grep -qE "^${field}:"; then
      add_warning "Agent $f missing frontmatter field: $field"
    fi
  done
done

# ──────── 2C. Token/Size sanity ────────

AGENT_WORDS_LIMIT=1500
COMMAND_WORDS_LIMIT=1200
LIB_LINES_LIMIT=500

for f in $CHANGED_FILES; do
  [ -f "$f" ] || continue
  if [[ "$f" =~ ^\.claude/agents/.*\.md$ ]]; then
    WORDS=$(wc -w < "$f" | tr -d ' ')
    # orchestrator 예외
    if [[ "$f" =~ orchestrator\.md$ ]]; then continue; fi
    if [ "$WORDS" -gt "$AGENT_WORDS_LIMIT" ]; then
      add_warning "Agent $f: ${WORDS} words (> ${AGENT_WORDS_LIMIT} 임계)"
    fi
  elif [[ "$f" =~ ^\.claude/commands/.*\.md$ ]]; then
    WORDS=$(wc -w < "$f" | tr -d ' ')
    # sleep 예외 (meta-dispatcher)
    if [[ "$f" =~ sleep\.md$ ]]; then continue; fi
    if [ "$WORDS" -gt "$COMMAND_WORDS_LIMIT" ]; then
      add_warning "Command $f: ${WORDS} words (> ${COMMAND_WORDS_LIMIT} 임계)"
    fi
  elif [[ "$f" =~ ^lib/.*\.ts$ ]] && [ ! -f "${f%.ts}.test.ts" ]; then
    LINES=$(wc -l < "$f" | tr -d ' ')
    if [ "$LINES" -gt "$LIB_LINES_LIMIT" ]; then
      add_warning "Lib $f: ${LINES} lines (> ${LIB_LINES_LIMIT} — 분할 후보)"
    fi
  fi
done

# ──────── 2D. Test-to-Impl 비율 ────────

LIB_CHANGED=$(echo "$CHANGED_FILES" | grep '^lib/.*\.ts$' | grep -v '\.test\.ts$' || true)
for lib_f in $LIB_CHANGED; do
  base=$(basename "$lib_f" .ts)
  test_f="test/${base}.test.ts"
  if [ ! -f "$test_f" ]; then
    add_warning "Test 파일 없음: $lib_f → $test_f 필요"
  elif ! echo "$CHANGED_FILES" | grep -q "^$test_f$"; then
    add_warning "$lib_f 변경됐지만 $test_f 미변경 (의도한 것인지 확인)"
  fi
done

# ──────── 결과 보고 ────────

echo "────── Stage 2 Quality Gate ──────"
echo "Target: $TARGET"
echo "Diff lines: $DIFF_LINES"
echo "Files changed: $(echo "$CHANGED_FILES" | wc -l | tr -d ' ')"
echo ""

if [ ${#VIOLATIONS[@]} -gt 0 ]; then
  echo "❌ BLOCK (${#VIOLATIONS[@]}):"
  for v in "${VIOLATIONS[@]}"; do echo "  - $v"; done
  echo ""
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo "⚠️  WARN (${#WARNINGS[@]}):"
  for w in "${WARNINGS[@]}"; do echo "  - $w"; done
  echo ""
fi

if [ ${#VIOLATIONS[@]} -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ]; then
  echo "✅ PASS — no violations"
fi

# Exit code: VIOLATION 있으면 1, WARN만 있으면 2, 둘 다 없으면 0
if [ ${#VIOLATIONS[@]} -gt 0 ]; then exit 1; fi
if [ ${#WARNINGS[@]} -gt 0 ]; then exit 2; fi
exit 0
