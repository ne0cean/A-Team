#!/bin/bash
# A-Team Weekly Auto-Research — Eternal Growth Protocol
# Usage: bash scripts/weekly-research.sh
# Trigger: 매주 월요일 03:00 KST (cron 또는 GH Actions)
# Purpose: 자동으로 최신 프레임워크/워크플로우 조사 후보 PR 생성
# Governance: governance/workflows/eternal-growth.md

set -euo pipefail

ATEAM_ROOT="${HOME}/tools/A-Team"
WEEK_TAG="$(date +%Y-W%V)"
RESEARCH_DIR="${ATEAM_ROOT}/docs/research/${WEEK_TAG}"
LOG_FILE="${ATEAM_ROOT}/.research/weekly-${WEEK_TAG}.log"

mkdir -p "${ATEAM_ROOT}/.research"
mkdir -p "${RESEARCH_DIR}"

exec > >(tee -a "${LOG_FILE}") 2>&1

echo "=============================================="
echo " A-Team Weekly Auto-Research — ${WEEK_TAG}"
echo " Started: $(date -Iseconds)"
echo "=============================================="

cd "${ATEAM_ROOT}"

# Step 1: 최신 상태 pull
echo ""
echo "[1/6] Pulling latest A-Team master..."
git pull origin master

# Step 2: 이전 주 리서치 결과 참조 포인터 생성
echo ""
echo "[2/6] Linking previous week's research..."
PREV_WEEK=$(ls docs/research/ 2>/dev/null | grep -E '^[0-9]{4}-W[0-9]{2}$' | sort | tail -2 | head -1 || echo "")
if [ -n "$PREV_WEEK" ] && [ "$PREV_WEEK" != "$WEEK_TAG" ]; then
  echo "Previous: $PREV_WEEK" > "${RESEARCH_DIR}/PREVIOUS.md"
  echo "Path: docs/research/$PREV_WEEK/" >> "${RESEARCH_DIR}/PREVIOUS.md"
fi

# Step 3: 2026-04 템플릿 복사
echo ""
echo "[3/6] Bootstrapping week directory from template..."
if [ -f "docs/research/_template/MANIFEST_TEMPLATE.md" ]; then
  cp docs/research/_template/MANIFEST_TEMPLATE.md "${RESEARCH_DIR}/MANIFEST.md"
  cp docs/research/_template/RESUME_STATE_TEMPLATE.md "${RESEARCH_DIR}/RESUME_STATE.md" 2>/dev/null || true
else
  # Fallback: 이전 주 structure copy
  if [ -n "$PREV_WEEK" ]; then
    cp "docs/research/$PREV_WEEK/MANIFEST.md" "${RESEARCH_DIR}/MANIFEST.md"
  fi
fi

# Step 4: Research kickoff placeholder
echo ""
echo "[4/6] Research kickoff placeholder..."
cat > "${RESEARCH_DIR}/STATUS.md" <<EOF
# Week ${WEEK_TAG} Auto-Research Status

- Started: $(date -Iseconds)
- Mode: automated
- Phase: kickoff

## Next Actions (자동 실행)
1. Round 1 parallel researchers (14 categories)
2. Stage 2-3 filter + P1-P8 mapping
3. Stage 4 deep-dives (top candidates only)
4. Stage 5 RFC drafts
5. PR 자동 생성 (Gate G5 통과 후보만)

## Human Action Required
- PR 생성되면 리뷰 후 수동 머지 (자동 머지 금지)
- Drift detection: 이전 주 수용 후보와 충돌 시 alert
EOF

# Step 5: Drift detection — 이전 주 수용 후보와 충돌 검사
echo ""
echo "[5/6] Drift detection..."
DRIFT_FOUND=0
if [ -n "$PREV_WEEK" ] && [ -f "docs/research/$PREV_WEEK/final/EXECUTIVE_SUMMARY.md" ]; then
  # 이전 주 ACCEPT 후보 추출
  grep -c "ACCEPT" "docs/research/$PREV_WEEK/final/EXECUTIVE_SUMMARY.md" > /dev/null 2>&1 && {
    echo "Previous ACCEPT list: docs/research/$PREV_WEEK/final/EXECUTIVE_SUMMARY.md"
    # TODO: 실제 drift 감지 로직 (이번 주 survey 완료 후 실행)
    echo "  → drift check: scheduled at Stage 2-3"
  }
fi

# Step 6: 로그 기록
echo ""
echo "[6/6] Bootstrap complete."
echo "Research directory: ${RESEARCH_DIR}"
echo "Log: ${LOG_FILE}"
echo ""
echo "Next step: /ralph start 또는 수동 orchestrator 호출로 실제 리서치 시작"
echo "(이 스크립트는 bootstrap만 수행, 실제 AI 실행은 분리)"

# Optional: GitHub Actions에서 실행 시 자동 PR 생성 트리거
if [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo ""
  echo "[CI] GitHub Actions detected. Opening branch for this week..."
  git checkout -b "research/${WEEK_TAG}" 2>/dev/null || git checkout "research/${WEEK_TAG}"
  git add "docs/research/${WEEK_TAG}/"
  git commit -m "research: ${WEEK_TAG} auto-kickoff" || echo "nothing to commit yet"
fi

echo ""
echo "=============================================="
echo " Bootstrap complete: ${WEEK_TAG}"
echo "=============================================="
