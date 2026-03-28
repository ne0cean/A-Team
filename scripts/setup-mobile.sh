#!/usr/bin/env bash
# setup-mobile.sh — 모바일 접근을 위한 PC 환경 설정
# 사용법: bash A-Team/scripts/setup-mobile.sh
# Windows(Git Bash/PowerShell) / macOS / Linux 호환

set -e

echo "═══════════════════════════════════════════════"
echo "  📱 모바일 개발 환경 설정"
echo "═══════════════════════════════════════════════"
echo ""

OS_TYPE=$(uname -s)
PROJ_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# ── 1. SSH 서버 상태 확인 ─────────────────────────────
echo "🔍 [1/4] SSH 서버 상태 확인 중..."

check_ssh() {
  if [ "$OS_TYPE" = "Darwin" ]; then
    # macOS
    if systemsetup -getremotelogin 2>/dev/null | grep -q "On"; then
      echo "  ✅ SSH 서버 활성화됨 (macOS Remote Login)"
    else
      echo "  ⚠️  SSH 비활성화 상태"
      echo "  → 활성화: sudo systemsetup -setremotelogin on"
    fi
  elif echo "$OS_TYPE" | grep -qi "MINGW\|MSYS\|CYGWIN"; then
    # Windows (Git Bash)
    if sc.exe query sshd 2>/dev/null | grep -q "RUNNING"; then
      echo "  ✅ OpenSSH 서버 실행 중 (Windows)"
    else
      echo "  ⚠️  OpenSSH 서버 미실행"
      echo "  → PowerShell(관리자)에서 실행:"
      echo "    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0"
      echo "    Start-Service sshd"
      echo "    Set-Service -Name sshd -StartupType Automatic"
    fi
  else
    # Linux
    if systemctl is-active --quiet sshd 2>/dev/null || systemctl is-active --quiet ssh 2>/dev/null; then
      echo "  ✅ SSH 서버 실행 중 (Linux)"
    else
      echo "  ⚠️  SSH 서버 미실행"
      echo "  → 활성화: sudo systemctl enable --now sshd"
    fi
  fi
}
check_ssh

# ── 2. IP 주소 확인 ───────────────────────────────────
echo ""
echo "🌐 [2/4] 접속 정보 확인 중..."

get_ip() {
  if [ "$OS_TYPE" = "Darwin" ]; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "확인 불가")
  elif echo "$OS_TYPE" | grep -qi "MINGW\|MSYS\|CYGWIN"; then
    LOCAL_IP=$(ipconfig.exe 2>/dev/null | grep "IPv4" | head -1 | awk -F': ' '{print $2}' | tr -d '\r' || echo "확인 불가")
  else
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "확인 불가")
  fi
  echo "  📍 로컬 IP: $LOCAL_IP"
  
  # Tailscale IP 확인
  if command -v tailscale &>/dev/null; then
    TS_IP=$(tailscale ip -4 2>/dev/null || echo "")
    if [ -n "$TS_IP" ]; then
      echo "  🔒 Tailscale IP: $TS_IP (어디서든 접속 가능)"
    fi
  else
    echo "  ℹ️  Tailscale 미설치 (외부 접속 시 설치 권장: https://tailscale.com)"
  fi
}
get_ip

# ── 3. tmux 확인 ──────────────────────────────────────
echo ""
echo "🖥️  [3/4] tmux 세션 확인 중..."

if command -v tmux &>/dev/null; then
  EXISTING=$(tmux list-sessions 2>/dev/null || echo "")
  if [ -n "$EXISTING" ]; then
    echo "  ✅ 활성 tmux 세션:"
    echo "$EXISTING" | sed 's/^/     /'
  else
    echo "  ℹ️  활성 tmux 세션 없음"
    echo "  → 생성: tmux new -s dev -d \"cd '$PROJ_ROOT' && claude\""
  fi
else
  echo "  ⚠️  tmux 미설치"
  if [ "$OS_TYPE" = "Darwin" ]; then
    echo "  → 설치: brew install tmux"
  elif echo "$OS_TYPE" | grep -qi "MINGW\|MSYS\|CYGWIN"; then
    echo "  → Windows: WSL에서 apt install tmux"
  else
    echo "  → 설치: sudo apt install tmux"
  fi
fi

# ── 4. Auto-Sync 데몬 상태 ────────────────────────────
echo ""
echo "🔄 [4/4] Auto-Sync 데몬 상태 확인 중..."

SYNC_SCRIPT="$PROJ_ROOT/A-Team/scripts/auto-sync.sh"
if [ -f "$SYNC_SCRIPT" ]; then
  if pgrep -f "auto-sync.sh" >/dev/null 2>&1; then
    echo "  ✅ Auto-Sync 데몬 실행 중"
  else
    echo "  ⚠️  Auto-Sync 데몬 미실행"
    echo "  → 시작: bash $SYNC_SCRIPT &"
  fi
else
  echo "  ❌ auto-sync.sh 를 찾을 수 없음"
fi

# ── 결과 요약 ──────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  📱 모바일 접속 방법"
echo "═══════════════════════════════════════════════"
echo ""
echo "  [방법 1 — 가장 간단]"
echo "  PC에서: claude 실행 후 /rc 입력"
echo "  폰에서: QR 코드 스캔 → 끝"
echo ""
echo "  [방법 2 — 풀 터미널]"
echo "  폰에서: ssh $(whoami 2>/dev/null || echo 'user')@${LOCAL_IP:-IP} "
echo "          cd '$PROJ_ROOT' && claude"
echo ""
if [ -n "$TS_IP" ]; then
  echo "  [방법 3 — 어디서든]"
  echo "  폰에서: ssh $(whoami 2>/dev/null || echo 'user')@$TS_IP"
  echo ""
fi
echo "  상세 가이드: A-Team/docs/14-mobile-development.md"
echo "═══════════════════════════════════════════════"
