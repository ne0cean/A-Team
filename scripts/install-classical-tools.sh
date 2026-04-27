#!/bin/bash
# RFC-004 Classical Toolchain — ripgrep + fd + jq 설치 스크립트
# Usage: bash scripts/install-classical-tools.sh [--with-ast-grep]
# Governance: governance/rules/tool-search.md (X-ref), rfc/RFC-004-classical-tools.md
# Opt-in: 사용자가 명시적으로 실행 (자동 실행 아님)

set -uo pipefail   # -e 제거: tool 설치 실패 graceful handle

WITH_AST_GREP="${1:-}"
OS="$(uname -s)"

echo "=============================================="
echo " RFC-004 Classical Tools Install — ${OS}"
echo "=============================================="

MISSING=()
INSTALLED=()
FAILED=()

check_and_install() {
  local tool="$1"
  local install_cmd="$2"

  if command -v "$tool" &>/dev/null; then
    local version=$("$tool" --version 2>/dev/null | head -1 || echo "unknown")
    echo "  ✓ $tool already installed: $version"
    INSTALLED+=("$tool")
    return 0
  fi

  echo "  → Installing $tool..."
  if eval "$install_cmd" 2>&1 | tail -3; then
    if command -v "$tool" &>/dev/null; then
      INSTALLED+=("$tool")
      echo "  ✓ $tool installed successfully"
    else
      FAILED+=("$tool (post-install not in PATH)")
      echo "  ✗ $tool installed but not in PATH"
    fi
  else
    FAILED+=("$tool")
    echo "  ✗ $tool install failed"
  fi
}

case "$OS" in
  Linux)
    mkdir -p "$HOME/.local/bin"
    check_and_install "rg" "curl -sL https://github.com/BurntSushi/ripgrep/releases/download/14.1.0/ripgrep-14.1.0-x86_64-unknown-linux-musl.tar.gz 2>/dev/null | tar -xz -C /tmp && mv /tmp/ripgrep-14.1.0-x86_64-unknown-linux-musl/rg \"\$HOME/.local/bin/\""
    check_and_install "fd" "curl -sL https://github.com/sharkdp/fd/releases/download/v10.1.0/fd-v10.1.0-x86_64-unknown-linux-musl.tar.gz 2>/dev/null | tar -xz -C /tmp && mv /tmp/fd-v10.1.0-x86_64-unknown-linux-musl/fd \"\$HOME/.local/bin/\""
    check_and_install "jq" "curl -sL https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux64 -o \"\$HOME/.local/bin/jq\" && chmod +x \"\$HOME/.local/bin/jq\""
    ;;

  Darwin)
    if command -v brew &>/dev/null; then
      check_and_install "rg" "brew install ripgrep"
      check_and_install "fd" "brew install fd"
      check_and_install "jq" "brew install jq"
    else
      FAILED+=("Homebrew not found — install from https://brew.sh")
    fi
    ;;

  MINGW64_NT*|MSYS_NT*|CYGWIN_NT*)
    # Windows Git Bash / MSYS / Cygwin
    echo "  ℹ Windows (Git Bash) 감지"
    if command -v scoop &>/dev/null; then
      check_and_install "rg" "scoop install ripgrep"
      check_and_install "fd" "scoop install fd"
      check_and_install "jq" "scoop install jq"
    elif command -v choco &>/dev/null; then
      check_and_install "rg" "choco install ripgrep -y"
      check_and_install "fd" "choco install fd -y"
      check_and_install "jq" "choco install jq -y"
    else
      echo "  ⚠ scoop/choco 없음. 수동 설치 필요:"
      echo "     scoop: https://scoop.sh"
      echo "     choco: https://chocolatey.org/install"
      echo "     또는 GitHub Releases 직접 다운로드 후 PATH 추가"
      FAILED+=("Package manager needed (scoop or choco)")
    fi
    ;;

  *)
    echo "  ✗ 지원되지 않는 OS: $OS"
    exit 2
    ;;
esac

# Phase 2: ast-grep (opt-in)
if [ "$WITH_AST_GREP" = "--with-ast-grep" ]; then
  echo ""
  echo "=============================================="
  echo " Phase 2 — ast-grep (opt-in)"
  echo "=============================================="
  check_and_install "sg" "npm install -g @ast-grep/cli"
fi

# 결과 보고
echo ""
echo "=============================================="
echo " Summary"
echo "=============================================="
echo "  Installed/Present: ${INSTALLED[*]:-(none)}"
echo "  Failed:            ${FAILED[*]:-(none)}"

# PATH 안내 (Linux)
if [ "$OS" = "Linux" ] && ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
  echo ""
  echo "  ⚠ Add to ~/.bashrc:"
  echo "     export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

# Exit code
if [ ${#FAILED[@]} -eq 0 ]; then
  echo ""
  echo "  ✓ All tools ready. Activation (opt-in):"
  echo "     export A_TEAM_CLASSICAL_TOOLS=1"
  exit 0
elif [[ " ${FAILED[*]} " =~ " jq " ]] && [ ${#FAILED[@]} -eq 1 ]; then
  # Only jq failed — non-critical
  exit 1
else
  # Critical (rg/fd) failed
  exit 2
fi
