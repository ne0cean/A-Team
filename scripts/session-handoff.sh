#!/usr/bin/env bash
# session-handoff.sh — 범용 세션 pickup/end 스크립트
# Usage:
#   bash ~/Projects/a-team/scripts/session-handoff.sh pickup
#   bash ~/Projects/a-team/scripts/session-handoff.sh end [commit_message]
#
# 동작: PWD 기반 프로젝트 루트 자동 감지. .context/ 없는 프로젝트도 graceful 처리.
# a-team 전용 기능(check-scheduled-reviews, log-event 등)은 a-team 프로젝트에서만 실행.

set -euo pipefail

# ─── 상수 ─────────────────────────────────────────────────────────────────────
ATEAM_ROOT="${HOME}/Projects/a-team"
MODE="${1:-pickup}"
COMMIT_MSG="${2:-}"

# ─── 프로젝트 루트 감지 ────────────────────────────────────────────────────────
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "${PWD}")
PROJECT_NAME=$(basename "${PROJECT_ROOT}")
CONTEXT_DIR="${PROJECT_ROOT}/.context"
CURRENT_MD="${CONTEXT_DIR}/CURRENT.md"
RESUME_MD="${CONTEXT_DIR}/RESUME.md"
SESSIONS_MD="${CONTEXT_DIR}/SESSIONS.md"
IS_ATEAM=0
[ "${PROJECT_ROOT}" = "${ATEAM_ROOT}" ] && IS_ATEAM=1

TODAY=$(date +%Y-%m-%d)
NOW=$(date +%Y-%m-%d\ %H:%M)

# ─── 색상 (터미널 지원 시만) ───────────────────────────────────────────────────
if [ -t 1 ]; then
  C_BOLD='\033[1m'
  C_DIM='\033[2m'
  C_GREEN='\033[0;32m'
  C_YELLOW='\033[0;33m'
  C_RED='\033[0;31m'
  C_CYAN='\033[0;36m'
  C_RESET='\033[0m'
else
  C_BOLD='' C_DIM='' C_GREEN='' C_YELLOW='' C_RED='' C_CYAN='' C_RESET=''
fi

# ─── 헬퍼 ─────────────────────────────────────────────────────────────────────
hr()   { echo -e "${C_DIM}──────────────────────────────────────────${C_RESET}"; }
hdr()  { echo -e "\n${C_BOLD}${C_CYAN}$*${C_RESET}"; hr; }
ok()   { echo -e "${C_GREEN}  $*${C_RESET}"; }
warn() { echo -e "${C_YELLOW}  $*${C_RESET}"; }
err()  { echo -e "${C_RED}  $*${C_RESET}"; }
info() { echo -e "  $*"; }

# ─── 빌드 타입 감지 ───────────────────────────────────────────────────────────
detect_build() {
  local root="${1:-${PROJECT_ROOT}}"
  if [ -f "${root}/package.json" ]; then
    # build 스크립트 있으면 build, 없으면 lint/tsc 폴백
    if node -e "const p=require('${root}/package.json'); process.exit(p.scripts&&p.scripts.build?0:1)" 2>/dev/null; then
      echo "npm:build"
    elif node -e "const p=require('${root}/package.json'); process.exit(p.scripts&&p.scripts.lint?0:1)" 2>/dev/null; then
      echo "npm:lint"
    else
      echo "none"
    fi
  elif [ -f "${root}/Cargo.toml" ]; then
    echo "cargo"
  elif [ -f "${root}/pyproject.toml" ] || [ -f "${root}/setup.py" ]; then
    echo "pytest"
  elif [ -f "${root}/go.mod" ]; then
    echo "go"
  elif [ -f "${root}/Makefile" ]; then
    echo "make"
  else
    echo "none"
  fi
}

run_build() {
  local build_type
  build_type=$(detect_build)
  case "${build_type}" in
    npm:build) cd "${PROJECT_ROOT}" && npm run build ;;
    npm:lint)  cd "${PROJECT_ROOT}" && npm run lint ;;
    cargo)     cd "${PROJECT_ROOT}" && cargo test 2>&1 | tail -5 ;;
    pytest)    cd "${PROJECT_ROOT}" && python -m pytest --tb=short -q 2>&1 | tail -10 ;;
    go)        cd "${PROJECT_ROOT}" && go test ./... 2>&1 | tail -10 ;;
    make)      cd "${PROJECT_ROOT}" && make test 2>&1 | tail -10 ;;
    none)
      # 정적 분석 폴백
      if command -v tsc &>/dev/null && [ -f "${PROJECT_ROOT}/tsconfig.json" ]; then
        cd "${PROJECT_ROOT}" && tsc --noEmit
      else
        warn "빌드 시스템 없음 — 스킵"
        return 0
      fi
      ;;
  esac
}

# ─── CURRENT.md 섹션 읽기 ─────────────────────────────────────────────────────
read_section() {
  local file="$1" section="$2"
  awk "/^## ${section}/,/^## [^${section}]/" "${file}" 2>/dev/null \
    | grep -v "^## " | grep -v "^$" | head -10 || true
}

# ─── CURRENT.md In Progress Files 갱신 ────────────────────────────────────────
clear_in_progress() {
  if [ ! -f "${CURRENT_MD}" ]; then return; fi
  # "## In Progress Files" 섹션 내용을 (없음)으로 교체
  # macOS sed -i 호환
  perl -i -0pe \
    's|(## In Progress Files\n)(.*?)(\n## |\z)|\1(없음)\n\3|s' \
    "${CURRENT_MD}" 2>/dev/null || true
}

append_last_completion() {
  local msg="$1"
  if [ ! -f "${CURRENT_MD}" ]; then return; fi
  # Last Completions 섹션 첫 줄 아래에 삽입
  perl -i -pe \
    "s|^(## Last Completions.*\n)|\${1}- [${TODAY}] ${msg}\n|" \
    "${CURRENT_MD}" 2>/dev/null || true
}

# ─── SESSIONS.md 로그 추가 ────────────────────────────────────────────────────
append_session_log() {
  local title="$1" completed="$2" build_status="$3"
  [ ! -d "${CONTEXT_DIR}" ] && return
  local entry
  entry="## [${TODAY}] ${title}

**완료**: ${completed}
**빌드**: ${build_status}
"
  if [ -f "${SESSIONS_MD}" ]; then
    # 파일 상단에 새 항목 추가
    local tmp
    tmp=$(mktemp)
    echo "${entry}" > "${tmp}"
    cat "${SESSIONS_MD}" >> "${tmp}"
    mv "${tmp}" "${SESSIONS_MD}"
  else
    echo "${entry}" > "${SESSIONS_MD}"
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
# PICKUP 모드
# ══════════════════════════════════════════════════════════════════════════════
cmd_pickup() {
  echo -e "\n${C_BOLD}session-handoff pickup${C_RESET} — ${C_CYAN}${PROJECT_NAME}${C_RESET} (${PROJECT_ROOT})"
  hr

  # Step 0 — 작업 흔적 감지
  hdr "Step 0 — 작업 흔적 감지"

  local RESUME_ACTIVE="" GIT_DIRTY="" IN_PROGRESS=""

  if [ -f "${RESUME_MD}" ] && ! grep -q "status:.*completed" "${RESUME_MD}" 2>/dev/null; then
    RESUME_ACTIVE="1"
    ok "RESUME.md — 미완료 상태"
  fi

  GIT_DIRTY=$(git -C "${PROJECT_ROOT}" status --porcelain 2>/dev/null | head -1 || true)
  [ -n "${GIT_DIRTY}" ] && ok "git — uncommitted 변경 감지"

  if [ -f "${CURRENT_MD}" ]; then
    IN_PROGRESS=$(awk '/^## In Progress Files/,/^## /' "${CURRENT_MD}" 2>/dev/null \
      | grep -vE "^##|없음|\(없음\)" | grep -v "^$" | head -1 || true)
    [ -n "${IN_PROGRESS}" ] && ok "CURRENT.md — In Progress Files 존재"
  fi

  if [ -z "${RESUME_ACTIVE}" ] && [ -z "${GIT_DIRTY}" ] && [ -z "${IN_PROGRESS}" ]; then
    warn "작업 흔적 없음 — 새 세션입니다."
    info "새 작업을 시작하려면 /vibe 실행하세요."
  fi

  # Step 0.5 — a-team 전용: 예약 리뷰
  if [ "${IS_ATEAM}" = "1" ] && [ -f "${ATEAM_ROOT}/scripts/check-scheduled-reviews.mjs" ]; then
    hdr "Step 0.5 — Scheduled Reviews"
    node "${ATEAM_ROOT}/scripts/check-scheduled-reviews.mjs" 2>/dev/null || true
  fi

  # Step 1 — git 상태
  hdr "Step 1 — Git 상태"
  git -C "${PROJECT_ROOT}" log --oneline -5 2>/dev/null || warn "git log 없음"
  echo ""
  git -C "${PROJECT_ROOT}" status --short 2>/dev/null || true

  # Step 2 — 컨텍스트 로드
  hdr "Step 2 — 컨텍스트"

  # RESUME.md
  if [ -f "${RESUME_MD}" ]; then
    info "${C_BOLD}RESUME.md${C_RESET}"
    head -40 "${RESUME_MD}"
    echo ""
  fi

  # CURRENT.md
  if [ -f "${CURRENT_MD}" ]; then
    info "${C_BOLD}CURRENT.md${C_RESET}"
    local in_prog next_tasks blockers
    in_prog=$(read_section "${CURRENT_MD}" "In Progress Files")
    next_tasks=$(read_section "${CURRENT_MD}" "Next Tasks")
    blockers=$(read_section "${CURRENT_MD}" "Blockers")

    echo -e "  ${C_YELLOW}In Progress Files${C_RESET}"
    [ -n "${in_prog}" ] && echo "${in_prog}" | sed 's/^/    /' || info "    (없음)"

    echo -e "  ${C_YELLOW}Next Tasks${C_RESET}"
    [ -n "${next_tasks}" ] && echo "${next_tasks}" | sed 's/^/    /' || info "    (없음)"

    if [ -n "${blockers}" ]; then
      echo -e "  ${C_RED}Blockers${C_RESET}"
      echo "${blockers}" | sed 's/^/    /'
    fi
  else
    warn ".context/CURRENT.md 없음 — 컨텍스트 파일 미초기화 프로젝트"
  fi

  # Step 2.7 — Daily brief 확인 (a-team 외 프로젝트도 간단 체크)
  if [ -f "${CONTEXT_DIR}/briefs/${TODAY}-brief.md" ]; then
    hdr "오늘의 브리핑"
    head -5 "${CONTEXT_DIR}/briefs/${TODAY}-brief.md"
  fi

  # Step 3 — In Progress 파일 힌트
  if [ -n "${IN_PROGRESS}" ]; then
    hdr "Step 3 — 중단된 작업"
    info "다음 파일에서 작업이 중단되었습니다:"
    echo "${IN_PROGRESS}" | sed 's/^/  /'
    info "해당 파일을 읽고 작업을 이어가세요."
  fi

  hr
  echo -e "${C_GREEN}pickup 완료 — ${NOW}${C_RESET}\n"

  # a-team: log-event
  if [ "${IS_ATEAM}" = "1" ] && [ -f "${ATEAM_ROOT}/scripts/log-event.mjs" ]; then
    node "${ATEAM_ROOT}/scripts/log-event.mjs" command_start name=pickup 2>/dev/null || true
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
# END 모드
# ══════════════════════════════════════════════════════════════════════════════
cmd_end() {
  echo -e "\n${C_BOLD}session-handoff end${C_RESET} — ${C_CYAN}${PROJECT_NAME}${C_RESET} (${PROJECT_ROOT})"
  hr

  # Step 1 — CURRENT.md 갱신
  hdr "Step 1 — CURRENT.md 갱신"
  if [ -f "${CURRENT_MD}" ]; then
    clear_in_progress
    ok "In Progress Files → (없음)"
    if [ -n "${COMMIT_MSG}" ]; then
      append_last_completion "${COMMIT_MSG}"
      ok "Last Completions에 추가: ${COMMIT_MSG}"
    fi
  else
    warn ".context/CURRENT.md 없음 — 스킵"
  fi

  # Step 2 — SESSIONS.md 로그 (후에 빌드 결과 알면 채움)
  # (빌드 후 append)

  # Step 3 — 빌드 검증
  hdr "Step 3 — 빌드 검증"
  local build_ok=0 build_label="❌"
  local attempt=0
  while [ ${attempt} -lt 2 ]; do
    attempt=$((attempt + 1))
    if run_build 2>&1; then
      build_ok=1
      build_label="passed"
      ok "빌드 성공"
      break
    else
      err "빌드 실패 (${attempt}/2)"
      [ ${attempt} -lt 2 ] && warn "재시도..."
    fi
  done
  [ ${build_ok} -eq 0 ] && warn "빌드 2회 실패 — BLOCK에 기록 권장"

  # Step 2 (후처리) — SESSIONS.md 로그 추가
  local session_title="${COMMIT_MSG:-세션 종료}"
  append_session_log "${session_title}" "${COMMIT_MSG:-(내용 없음)}" "${build_label}"
  ok "SESSIONS.md 업데이트"

  # Step 4 — 커밋
  hdr "Step 4 — Git 커밋"
  local git_dirty
  git_dirty=$(git -C "${PROJECT_ROOT}" status --porcelain 2>/dev/null | head -1 || true)

  if [ -z "${git_dirty}" ]; then
    info "변경 없음 — 커밋 스킵"
  else
    # CURRENT.md, SESSIONS.md 스테이징
    git -C "${PROJECT_ROOT}" add \
      "${CONTEXT_DIR}/CURRENT.md" \
      "${CONTEXT_DIR}/SESSIONS.md" \
      2>/dev/null || true

    # 그 외 수정된 tracked 파일 스테이징 (untracked 제외)
    git -C "${PROJECT_ROOT}" add -u 2>/dev/null || true

    local msg_body
    if [ -n "${COMMIT_MSG}" ]; then
      msg_body="${COMMIT_MSG}"
    else
      msg_body="세션 종료"
    fi

    git -C "${PROJECT_ROOT}" commit -m "$(cat <<EOF
[session]: ${msg_body}

NOW: ${msg_body}
NEXT: .context/CURRENT.md 참조
BLOCK: 없음

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)" 2>/dev/null && ok "커밋 완료" || warn "커밋 실패 (충돌 또는 변경 없음)"
  fi

  # Step 5 — A-Team drift 감지 (end.md Step 3.8 대응)
  if [ "${IS_ATEAM}" != "1" ]; then
    hdr "Step 5 — A-Team Drift 감지"
    local drift
    drift=$(git -C "${PROJECT_ROOT}" diff --name-only HEAD~5 HEAD 2>/dev/null \
      | grep -E '^(\.?[Aa]-[Tt]eam/|\.claude/commands/|governance/|scripts/auto-switch/)' || true)
    if [ -n "${drift}" ]; then
      warn "A-Team drift 감지:"
      echo "${drift}" | head -5 | sed 's/^/    /'
      warn "변경사항을 ~/Projects/a-team 글로벌로 역류하세요 (/absorb)"
    else
      ok "A-Team drift 없음"
    fi
  fi

  # Step 6 — Push
  hdr "Step 6 — Push"
  local branch
  branch=$(git -C "${PROJECT_ROOT}" branch --show-current 2>/dev/null || echo "")
  if [ -z "${branch}" ]; then
    warn "브랜치 없음 — push 스킵"
  else
    local remote_url
    remote_url=$(git -C "${PROJECT_ROOT}" remote get-url origin 2>/dev/null || true)
    if [ -z "${remote_url}" ]; then
      warn "origin remote 없음 — push 스킵"
      info "remote 추가 후 수동 push: git push -u origin ${branch}"
    else
      if git -C "${PROJECT_ROOT}" push origin "${branch}" 2>/tmp/sh-push.log; then
        ok "pushed → ${branch}"
      else
        local push_log
        push_log=$(cat /tmp/sh-push.log 2>/dev/null || true)
        if echo "${push_log}" | grep -qE "rejected.*non-fast-forward|fetch first"; then
          warn "non-fast-forward — rebase 후 재시도"
          git -C "${PROJECT_ROOT}" pull --rebase origin "${branch}" \
            && git -C "${PROJECT_ROOT}" push origin "${branch}" \
            && ok "rebase 후 push 성공" \
            || err "rebase 충돌 — 수동 해결 필요"
        else
          err "push 실패: ${push_log}"
        fi
      fi
    fi
  fi

  # a-team: log-event
  if [ "${IS_ATEAM}" = "1" ] && [ -f "${ATEAM_ROOT}/scripts/log-event.mjs" ]; then
    node "${ATEAM_ROOT}/scripts/log-event.mjs" session_end \
      "summary=${COMMIT_MSG:-session_end}" \
      "branch=${branch:-unknown}" \
      2>/dev/null || true
  fi

  hr
  echo -e "${C_GREEN}end 완료 — ${NOW}${C_RESET}\n"
}

# ──────────────────────────────────────────────────────────────────────────────
case "${MODE}" in
  pickup|start|resume) cmd_pickup ;;
  end|finish|done)     cmd_end ;;
  *)
    echo "Usage: $0 <pickup|end> [commit_message]"
    echo ""
    echo "  pickup  — 세션 재개 (RESUME.md + CURRENT.md + git status 요약)"
    echo "  end     — 세션 종료 (CURRENT.md 갱신 + 빌드 + commit + push)"
    echo ""
    echo "Examples:"
    echo "  bash ~/Projects/a-team/scripts/session-handoff.sh pickup"
    echo "  bash ~/Projects/a-team/scripts/session-handoff.sh end \"auth 버그 수정\""
    exit 1
    ;;
esac
