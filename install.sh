#!/usr/bin/env bash
# A-Team Installer — The AI team that works while you sleep.
# Usage: bash install.sh [--minimal|--full] [--force]
#
# --minimal  Install core 8 commands only (~/.claude/commands/)
# --full     Install all commands + agents + governance + hooks (default)
# --force    Overwrite existing files

set -euo pipefail

# ---------------------------------------------------------------------------
# ANSI colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info()    { echo -e "${BLUE}[A-Team]${RESET} $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
die()     { error "$*"; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}==>${RESET}${BOLD} $*${RESET}"; }

# ---------------------------------------------------------------------------
# Parse args
# ---------------------------------------------------------------------------
MODE="full"
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --minimal) MODE="minimal" ;;
    --full)    MODE="full"    ;;
    --force)   FORCE=1        ;;
    --help|-h)
      echo "Usage: bash install.sh [--minimal|--full] [--force]"
      echo ""
      echo "  --minimal   Install core 8 commands only"
      echo "  --full      Install all 74 commands + 28 agents (default)"
      echo "  --force     Overwrite existing files without prompting"
      exit 0
      ;;
    *) die "Unknown option: $arg  (use --help for usage)" ;;
  esac
done

# ---------------------------------------------------------------------------
# Resolve script directory (works even when called as: bash install.sh)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}${CYAN}"
echo "  ___  _____"
echo " / _ \|_   _|___  __ _ _ __ ___"
echo "| |_| | | |/ _ \/ _\` | '_ \` _ \\"
echo " \__,_| |_|\___/\__,_|_| |_| |_|"
echo -e "${RESET}"
echo -e "  ${BOLD}A-Team${RESET} — The AI team that works while you sleep."
echo -e "  Mode: ${CYAN}${MODE}${RESET}"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Requirements
# ---------------------------------------------------------------------------
step "Checking requirements"

# Claude Code
if command -v claude &>/dev/null; then
  CLAUDE_VER="$(claude --version 2>/dev/null | head -1 || echo 'unknown')"
  success "Claude Code found: ${CLAUDE_VER}"
else
  die "Claude Code is not installed. Install it from https://claude.ai/code and re-run."
fi

# Node.js 16+
if command -v node &>/dev/null; then
  NODE_VER="$(node --version | tr -d 'v')"
  NODE_MAJOR="${NODE_VER%%.*}"
  if [[ "${NODE_MAJOR}" -lt 16 ]]; then
    die "Node.js 16+ required (found v${NODE_VER}). Please upgrade: https://nodejs.org"
  fi
  success "Node.js v${NODE_VER} found"
else
  die "Node.js is not installed. Install v16+ from https://nodejs.org and re-run."
fi

# Git
if command -v git &>/dev/null; then
  success "Git found: $(git --version)"
else
  die "Git is not installed. Install it from https://git-scm.com and re-run."
fi

# ---------------------------------------------------------------------------
# Step 2: Destination directories
# ---------------------------------------------------------------------------
step "Preparing destination directories"

CLAUDE_DIR="${HOME}/.claude"
COMMANDS_DST="${CLAUDE_DIR}/commands"
AGENTS_DST="${CLAUDE_DIR}/agents"

mkdir -p "${COMMANDS_DST}" "${AGENTS_DST}"
success "~/.claude/commands/ ready"
success "~/.claude/agents/ ready"

# ---------------------------------------------------------------------------
# Minimal command list (core 8)
# ---------------------------------------------------------------------------
MINIMAL_COMMANDS=(
  vibe.md
  pickup.md
  end.md
  zzz.md
  review.md
  ship.md
  blueprint.md
  prd.md
)

# ---------------------------------------------------------------------------
# Copy helper — skips existing unless --force
# ---------------------------------------------------------------------------
copy_file() {
  local src="$1"
  local dst="$2"
  local name
  name="$(basename "${src}")"

  if [[ -e "${dst}" && "${FORCE}" -eq 0 ]]; then
    warn "Skipping (already exists): ${dst}  (use --force to overwrite)"
    return
  fi
  cp "${src}" "${dst}"
}

copy_dir_contents() {
  local src_dir="$1"
  local dst_dir="$2"
  local count=0
  local skipped=0

  if [[ ! -d "${src_dir}" ]]; then
    warn "Source directory not found: ${src_dir} — skipping"
    return
  fi

  while IFS= read -r -d '' file; do
    local rel="${file#${src_dir}/}"
    local dst_file="${dst_dir}/${rel}"
    local dst_parent
    dst_parent="$(dirname "${dst_file}")"
    mkdir -p "${dst_parent}"
    if [[ -e "${dst_file}" && "${FORCE}" -eq 0 ]]; then
      (( skipped++ )) || true
    else
      cp "${file}" "${dst_file}"
      (( count++ )) || true
    fi
  done < <(find "${src_dir}" -type f -print0)

  echo "${count} ${skipped}"
}

# ---------------------------------------------------------------------------
# Step 3: Install commands
# ---------------------------------------------------------------------------
step "Installing commands"

COMMANDS_SRC="${SCRIPT_DIR}/.claude/commands"

if [[ "${MODE}" == "minimal" ]]; then
  installed=0
  skipped=0
  for cmd in "${MINIMAL_COMMANDS[@]}"; do
    src="${COMMANDS_SRC}/${cmd}"
    dst="${COMMANDS_DST}/${cmd}"
    if [[ ! -f "${src}" ]]; then
      warn "Core command not found in source: ${cmd}"
      continue
    fi
    if [[ -e "${dst}" && "${FORCE}" -eq 0 ]]; then
      (( skipped++ )) || true
    else
      cp "${src}" "${dst}"
      (( installed++ )) || true
    fi
  done
  success "Commands: ${installed} installed, ${skipped} skipped (already existed)"
else
  # full mode — copy all non-symlink files
  installed=0
  skipped=0
  while IFS= read -r -d '' file; do
    name="$(basename "${file}")"
    dst="${COMMANDS_DST}/${name}"
    if [[ -e "${dst}" && "${FORCE}" -eq 0 ]]; then
      (( skipped++ )) || true
    else
      cp "${file}" "${dst}"
      (( installed++ )) || true
    fi
  done < <(find "${COMMANDS_SRC}" -maxdepth 1 -type f -name "*.md" -print0)
  success "Commands: ${installed} installed, ${skipped} skipped (already existed)"
fi

# ---------------------------------------------------------------------------
# Step 4: Install agents (full mode only)
# ---------------------------------------------------------------------------
if [[ "${MODE}" == "full" ]]; then
  step "Installing agents"

  AGENTS_SRC="${SCRIPT_DIR}/.claude/agents"
  installed=0
  skipped=0
  while IFS= read -r -d '' file; do
    name="$(basename "${file}")"
    dst="${AGENTS_DST}/${name}"
    if [[ -e "${dst}" && "${FORCE}" -eq 0 ]]; then
      (( skipped++ )) || true
    else
      cp "${file}" "${dst}"
      (( installed++ )) || true
    fi
  done < <(find "${AGENTS_SRC}" -maxdepth 1 -type f -name "*.md" -print0 2>/dev/null || true)
  success "Agents: ${installed} installed, ${skipped} skipped"
fi

# ---------------------------------------------------------------------------
# Step 5: Optional hooks setup
# ---------------------------------------------------------------------------
step "Hooks setup (optional)"

SETTINGS_FILE="${CLAUDE_DIR}/settings.json"

if [[ -f "${SETTINGS_FILE}" ]]; then
  warn "~/.claude/settings.json already exists — skipping hooks setup to avoid overwriting."
  info "To configure RTK token optimization hooks manually, see:"
  info "  ${SCRIPT_DIR}/governance/rules/hooks.md"
else
  echo -e "${YELLOW}Would you like to configure RTK token optimization hooks?${RESET}"
  echo "  This writes a minimal ~/.claude/settings.json with hook definitions."
  echo -n "  Set up hooks? (y/n): "
  read -r HOOKS_ANSWER </dev/tty || HOOKS_ANSWER="n"
  if [[ "${HOOKS_ANSWER,,}" == "y" ]]; then
    HOOKS_SRC="${SCRIPT_DIR}/.claude/settings.json"
    if [[ -f "${HOOKS_SRC}" ]]; then
      # Copy only if it doesn't contain personal data (basic check)
      if grep -q "auto-switch\|personal\|oauth\|token" "${HOOKS_SRC}" 2>/dev/null; then
        warn "Source settings.json may contain personal data — skipping automatic copy."
        info "Review ${HOOKS_SRC} and copy manually if desired."
      else
        cp "${HOOKS_SRC}" "${SETTINGS_FILE}"
        success "settings.json installed"
      fi
    else
      # Write minimal hooks-only settings
      cat > "${SETTINGS_FILE}" << 'EOF'
{
  "hooks": {}
}
EOF
      success "Minimal settings.json created at ~/.claude/settings.json"
      info "Add hook definitions per: https://docs.anthropic.com/claude-code/hooks"
    fi
  else
    info "Skipping hooks setup. You can configure manually later."
  fi
fi

# ---------------------------------------------------------------------------
# Step 6: Verify
# ---------------------------------------------------------------------------
step "Verifying installation"

cmd_count=$(find "${COMMANDS_DST}" -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')
agent_count=$(find "${AGENTS_DST}" -maxdepth 1 -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

success "Commands installed: ${cmd_count}"
if [[ "${MODE}" == "full" ]]; then
  success "Agents installed:   ${agent_count}"
fi

# ---------------------------------------------------------------------------
# Step 7: Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}${GREEN}Installation complete!${RESET}"
echo ""
echo -e "  ${CYAN}Try this to start your first session:${RESET}"
echo -e "  ${BOLD}/vibe${RESET}      — Start a new session"
echo -e "  ${BOLD}/pickup${RESET}    — Resume an interrupted session"
echo -e "  ${BOLD}/blueprint${RESET} — Design a multi-file implementation"
echo ""
echo -e "  ${BLUE}Docs:${RESET} https://github.com/ne0cean/A-Team"
echo ""
