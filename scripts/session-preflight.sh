#!/bin/bash
# A-Team Session Preflight — 세션 시작 시 자체 자원 덤프
# Usage: bash ~/tools/A-Team/scripts/session-preflight.sh
# Purpose: Claude가 A-Team 자원을 몰라서 발명하는 일 방지 (governance/rules/ateam-first.md)

ATEAM_ROOT="${HOME}/tools/A-Team"

if [ ! -d "$ATEAM_ROOT" ]; then
  echo "⚠️  A-Team 레포를 찾을 수 없음: $ATEAM_ROOT"
  exit 1
fi

echo "=============================================="
echo " A-Team Preflight Inventory ($(date +%Y-%m-%d))"
echo "=============================================="
echo ""

echo "## 1. Slash Commands (.claude/commands/)"
echo "---"
ls "$ATEAM_ROOT/.claude/commands/" 2>/dev/null | sed 's/\.md$//' | awk '{print "  /" $0}' || echo "  (없음)"
echo ""

echo "## 2. Skills (governance/skills/)"
echo "---"
if [ -d "$ATEAM_ROOT/governance/skills" ]; then
  ls "$ATEAM_ROOT/governance/skills/" 2>/dev/null | awk '{print "  " $0}'
else
  echo "  (없음)"
fi
echo ""

echo "## 3. Scripts (scripts/)"
echo "---"
ls "$ATEAM_ROOT/scripts/" 2>/dev/null | awk '{print "  " $0}' || echo "  (없음)"
echo ""

echo "## 4. Governance Rules (governance/rules/)"
echo "---"
ls "$ATEAM_ROOT/governance/rules/" 2>/dev/null | sed 's/\.md$//' | awk '{print "  " $0}' || echo "  (없음)"
echo ""

echo "## 5. Governance Workflows (governance/workflows/)"
echo "---"
ls "$ATEAM_ROOT/governance/workflows/" 2>/dev/null | sed 's/\.md$//' | awk '{print "  " $0}' || echo "  (없음)"
echo ""

echo "## 6. Lessons Learned Index (docs/INDEX.md)"
echo "---"
if [ -f "$ATEAM_ROOT/docs/INDEX.md" ]; then
  head -50 "$ATEAM_ROOT/docs/INDEX.md"
else
  echo "  (INDEX.md 없음 — docs/ 하위 검색 권장)"
fi
echo ""

echo "## 7. Concept Index (docs/CONCEPT-INDEX.md)"
echo "---"
if [ -f "$ATEAM_ROOT/docs/CONCEPT-INDEX.md" ]; then
  head -30 "$ATEAM_ROOT/docs/CONCEPT-INDEX.md"
else
  echo "  (CONCEPT-INDEX.md 없음)"
fi
echo ""

echo "## 8. Agents (.claude/agents/)"
echo "---"
if [ -d "$ATEAM_ROOT/.claude/agents" ]; then
  ls "$ATEAM_ROOT/.claude/agents/" 2>/dev/null | sed 's/\.md$//' | awk '{print "  " $0}'
else
  echo "  (프로젝트별 .claude/agents/ 에 있음)"
fi
echo ""

echo "## 9. 용어 매핑 (ateam-first.md 참고)"
echo "---"
cat <<'EOF'
  랄프/ralph        → /ralph + scripts/ralph-daemon.mjs
  vibe             → /vibe
  PIOP             → PROTOCOL.md + governance/
  mirror           → governance/rules/mirror-sync.md
  handoff          → /handoff
  end              → /end
  체크포인트        → governance/rules/checkpointing.md
EOF
echo ""

echo "## 10. 핵심 원칙"
echo "---"
cat <<'EOF'
  P1 9-subagent thin-wrapper (메인 컨텍스트 90%+ 절감)
  P2 bkit 4모듈 (circuit-breaker/state-machine/gate-manager/self-healing, 153 tests)
  P3 PIOP 프로토콜
  P4 Hooks 자동화 (pre/post tool use, UI Auto-Inspect)
  P5 .context/CURRENT.md 세션 연속성 + Mirror/Handoff
  P6 Sovereignty 모델 (governance/rules/ateam-sovereignty.md, 8원칙)
  P7 TDD discipline (153 tests)
  P8 Thin wrapper 슬래시 커맨드 (~350B/커맨드)
EOF
echo ""

echo "=============================================="
echo "  설계 전 이 목록을 확인하고 기존 자원 활용부터 고려하세요."
echo "  (governance/rules/ateam-first.md 참조)"
echo "=============================================="
