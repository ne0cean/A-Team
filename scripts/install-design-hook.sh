#!/usr/bin/env bash
# install-design-hook.sh — design-audit PostToolUse 훅 설치
# .claude/settings.json 은 gitignored (머신별 설정) — 이 스크립트가 자동 등록
#
# 사용:
#   bash scripts/install-design-hook.sh                 # 현재 디렉터리($PWD)에 설치
#   bash scripts/install-design-hook.sh --target=PATH   # 외부 repo에 설치 (예: ~/Projects/connectome)
#   bash scripts/install-design-hook.sh --dry           # 변경 미리보기
#   bash scripts/install-design-hook.sh --uninstall     # 제거
#
# 동작:
# 1. TARGET/.claude/hooks/ 디렉터리 생성 (없으면)
# 2. A-Team의 templates/hooks/post-design-audit.sh → TARGET/.claude/hooks/ 복사
# 3. TARGET/.claude/settings.json PostToolUse[Edit|Write] 에 훅 추가 (중복 등록 방지)
# 4. dry-run 검증 (a-team self-host인 경우만)
#
# TARGET이 a-team 자체가 아닐 때 훅은 audit-design.mjs를 ~/Projects/a-team/scripts/
# 또는 TARGET/A-Team/scripts/ 에서 자동 fallback (templates/hooks/post-design-audit.sh:47-49).

set -e

# A-Team 본체 위치 (이 스크립트가 있는 디렉터리의 부모)
ATEAM_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_HOOK="$ATEAM_ROOT/templates/hooks/post-design-audit.sh"

# 설치 타겟 (기본: 현재 디렉터리, --target= 으로 override)
TARGET="$PWD"
DRY=0
UNINSTALL=0
for arg in "$@"; do
  case "$arg" in
    --target=*) TARGET="${arg#*=}" ;;
    --dry|--dry-run) DRY=1 ;;
    --uninstall|--remove) UNINSTALL=1 ;;
  esac
done

# Resolve target to absolute path
TARGET="$(cd "$TARGET" 2>/dev/null && pwd || echo "$TARGET")"
[ ! -d "$TARGET" ] && { echo "ERROR: target dir not found: $TARGET"; exit 2; }

REPO_ROOT="$TARGET"
SETTINGS="$REPO_ROOT/.claude/settings.json"
HOOKS_DIR="$REPO_ROOT/.claude/hooks"
DST_HOOK="$HOOKS_DIR/post-design-audit.sh"
HOOK_CMD="bash \".claude/hooks/post-design-audit.sh\""

echo "[install-design-hook] target = $TARGET"
echo "[install-design-hook] source = $ATEAM_ROOT (templates + scripts)"

cd "$REPO_ROOT"

[ ! -f "$SRC_HOOK" ] && { echo "ERROR: source hook not found: $SRC_HOOK"; exit 2; }

mkdir -p "$HOOKS_DIR"

if [ $UNINSTALL -eq 1 ]; then
  echo "[uninstall] removing $DST_HOOK"
  [ $DRY -eq 0 ] && rm -f "$DST_HOOK"
  if [ -f "$SETTINGS" ]; then
    echo "[uninstall] removing hook from $SETTINGS PostToolUse"
    if [ $DRY -eq 0 ]; then
      python3 - "$SETTINGS" "$HOOK_CMD" <<'PY'
import json, sys, pathlib
path = pathlib.Path(sys.argv[1])
target = sys.argv[2]
data = json.loads(path.read_text())
hooks = data.get("hooks", {})
post = hooks.get("PostToolUse", [])
for entry in post:
    entry["hooks"] = [h for h in entry.get("hooks", []) if h.get("command") != target]
hooks["PostToolUse"] = [e for e in post if e.get("hooks")]
data["hooks"] = hooks
path.write_text(json.dumps(data, indent=2) + "\n")
print(f"removed hook from {path}")
PY
    fi
  fi
  echo "[uninstall] done"
  exit 0
fi

# ── 1. 훅 스크립트 복사 ─────────────────────────────────────────
if [ $DRY -eq 1 ]; then
  echo "[dry] would copy $SRC_HOOK → $DST_HOOK (chmod +x)"
else
  cp "$SRC_HOOK" "$DST_HOOK"
  chmod +x "$DST_HOOK"
  echo "[install] $DST_HOOK installed (executable)"
fi

# ── 2. settings.json 패치 ───────────────────────────────────────
if [ ! -f "$SETTINGS" ]; then
  echo "[install] $SETTINGS not found — creating minimal settings.json"
  if [ $DRY -eq 0 ]; then
    cat > "$SETTINGS" <<EOF
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": $HOOK_CMD_QUOTED, "timeout": 30 }
        ]
      }
    ]
  }
}
EOF
    HOOK_CMD_QUOTED="\"$HOOK_CMD\""
    # rewrite with proper json
    python3 - "$SETTINGS" "$HOOK_CMD" <<'PY'
import json, sys, pathlib
path = pathlib.Path(sys.argv[1])
cmd = sys.argv[2]
data = {
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [{"type": "command", "command": cmd, "timeout": 30}] }
    ]
  }
}
path.write_text(json.dumps(data, indent=2) + "\n")
PY
    echo "[install] created $SETTINGS"
  fi
else
  echo "[install] patching $SETTINGS PostToolUse[Edit|Write]"
  if [ $DRY -eq 0 ]; then
    python3 - "$SETTINGS" "$HOOK_CMD" <<'PY'
import json, sys, pathlib
path = pathlib.Path(sys.argv[1])
target = sys.argv[2]
data = json.loads(path.read_text())
hooks = data.setdefault("hooks", {})
post = hooks.setdefault("PostToolUse", [])

# find matcher Edit|Write entry
entry = None
for e in post:
    if e.get("matcher") == "Edit|Write":
        entry = e
        break
if entry is None:
    entry = {"matcher": "Edit|Write", "hooks": []}
    post.append(entry)

# de-dup
existing = [h.get("command") for h in entry.get("hooks", [])]
if target in existing:
    print("[install] hook already registered — no change")
else:
    entry.setdefault("hooks", []).append({
        "type": "command",
        "command": target,
        "timeout": 30
    })
    path.write_text(json.dumps(data, indent=2) + "\n")
    print(f"[install] hook registered in {path}")
PY
  else
    echo "[dry] would add { type: command, command: $HOOK_CMD, timeout: 30 } to PostToolUse[Edit|Write]"
  fi
fi

# ── 3. dry-run 검증 ─────────────────────────────────────────────
# audit-design.mjs는 항상 ATEAM_ROOT 에 있음 — TARGET 의 .ts 파일 하나로 sanity check
if [ $DRY -eq 0 ]; then
  SAMPLE=""
  if [ -f "$REPO_ROOT/lib/design-smell-detector.ts" ]; then
    SAMPLE="$REPO_ROOT/lib/design-smell-detector.ts"  # a-team self-host
  else
    # 외부 repo: 첫 .tsx/.css 파일을 찾아 sanity check
    SAMPLE=$(find "$REPO_ROOT" -maxdepth 4 \
      \( -name "*.tsx" -o -name "*.css" \) \
      -not -path "*/node_modules/*" \
      -not -path "*/dist/*" \
      -not -path "*/.next/*" \
      2>/dev/null | head -1)
  fi
  if [ -n "$SAMPLE" ] && [ -f "$ATEAM_ROOT/scripts/audit-design.mjs" ]; then
    echo "[verify] running 1 audit on $SAMPLE (sanity check)"
    npx tsx "$ATEAM_ROOT/scripts/audit-design.mjs" "$SAMPLE" --gate=default >/dev/null 2>&1 && \
      echo "[verify] PASS — audit-design.mjs callable" || \
      echo "[verify] WARN — audit-design.mjs returned non-zero (may be normal if violations exist)"
  else
    echo "[verify] skipped (no sample file or audit-design.mjs missing)"
  fi
fi

echo
echo "Done. To enable/disable temporarily without uninstall:"
echo "  export DESIGN_AUDIT_ENABLED=false   # disable for this shell"
echo "  echo 'design: off' > .design-override.md   # disable for this repo"
