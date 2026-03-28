#!/bin/bash
# merge-dispatch.sh — 디스패치 에이전트 결과 머지 + 정리
#
# Usage:
#   merge-dispatch.sh --check     시그널 확인 → 완료/미완료 에이전트 목록
#   merge-dispatch.sh --merge     완료된 브랜치 순차 머지
#   merge-dispatch.sh --cleanup   worktree 제거 + 시그널 정리 + 브랜치 삭제
#   merge-dispatch.sh --all       check → merge → cleanup 전체 실행

set -euo pipefail

# ── 색상 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── 프로젝트 루트 ──
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [[ -z "$PROJECT_ROOT" ]]; then
  echo -e "${RED}Error: git 저장소가 아닙니다${NC}"
  exit 1
fi

SIGNAL_DIR="$PROJECT_ROOT/.context/signals"
WORKTREE_BASE="$PROJECT_ROOT/.claude/worktrees"

# ── dispatch 브랜치 목록 ──
get_dispatch_branches() {
  git branch --list "dispatch/*" 2>/dev/null | sed 's/^[* ]*//'
}

# ── 시그널 확인 ──
check_signals() {
  echo -e "${BOLD}═══ 디스패치 에이전트 상태 ═══${NC}"
  echo ""

  local branches=$(get_dispatch_branches)
  if [[ -z "$branches" ]]; then
    echo -e "${YELLOW}활성 dispatch 브랜치가 없습니다.${NC}"
    return 0
  fi

  local done_count=0
  local blocked_count=0
  local pending_count=0

  while IFS= read -r branch; do
    local name=$(echo "$branch" | sed 's|dispatch/||')

    if [[ -f "$SIGNAL_DIR/${name}.done" ]]; then
      echo -e "  ${GREEN}✓${NC} ${name} — 완료"
      done_count=$((done_count + 1))
    elif [[ -f "$SIGNAL_DIR/${name}.blocked" ]]; then
      local reason=$(cat "$SIGNAL_DIR/${name}.blocked" 2>/dev/null || echo "사유 불명")
      echo -e "  ${RED}✗${NC} ${name} — BLOCKED: $reason"
      blocked_count=$((blocked_count + 1))
    else
      # worktree 존재 여부로 실행 중인지 판단
      if [[ -d "$WORKTREE_BASE/dispatch-${name}" ]]; then
        echo -e "  ${YELLOW}…${NC} ${name} — 실행 중 (시그널 미수신)"
      else
        echo -e "  ${YELLOW}?${NC} ${name} — 상태 불명"
      fi
      pending_count=$((pending_count + 1))
    fi
  done <<< "$branches"

  echo ""
  echo -e "완료: ${GREEN}${done_count}${NC}  |  BLOCKED: ${RED}${blocked_count}${NC}  |  진행중: ${YELLOW}${pending_count}${NC}"

  if [[ $pending_count -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}아직 완료되지 않은 에이전트가 있습니다.${NC}"
    echo "모든 에이전트 완료 후 --merge를 실행하세요."
    return 1
  fi

  return 0
}

# ── 브랜치 머지 ──
merge_branches() {
  echo -e "${BOLD}═══ 디스패치 브랜치 머지 ═══${NC}"
  echo ""

  local branches=$(get_dispatch_branches)
  if [[ -z "$branches" ]]; then
    echo -e "${YELLOW}머지할 dispatch 브랜치가 없습니다.${NC}"
    return 0
  fi

  local current_branch=$(git rev-parse --abbrev-ref HEAD)
  local merge_count=0
  local conflict_count=0

  while IFS= read -r branch; do
    local name=$(echo "$branch" | sed 's|dispatch/||')

    # BLOCKED 에이전트 스킵
    if [[ -f "$SIGNAL_DIR/${name}.blocked" ]]; then
      echo -e "  ${YELLOW}⊘${NC} ${name} — BLOCKED (스킵)"
      continue
    fi

    # 커밋이 있는지 확인
    local commits=$(git log "${current_branch}..${branch}" --oneline 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$commits" == "0" ]]; then
      echo -e "  ${YELLOW}─${NC} ${name} — 변경사항 없음 (스킵)"
      continue
    fi

    echo -e "  ${CYAN}→${NC} ${name} 머지 중 (${commits}개 커밋)..."

    if git merge "$branch" --no-edit -m "merge: dispatch/${name} 결과 통합" 2>/dev/null; then
      echo -e "  ${GREEN}✓${NC} ${name} — 머지 성공"
      merge_count=$((merge_count + 1))
    else
      echo -e "  ${RED}✗${NC} ${name} — 머지 충돌!"
      echo ""
      echo -e "${RED}충돌 파일:${NC}"
      git diff --name-only --diff-filter=U 2>/dev/null | sed 's/^/    /'
      echo ""
      echo -e "${YELLOW}수동 해결이 필요합니다:${NC}"
      echo "  1. 충돌 파일 수정"
      echo "  2. git add <충돌 파일>"
      echo "  3. git commit"
      echo "  4. 다시 merge-dispatch.sh --merge 실행"
      echo ""
      conflict_count=$((conflict_count + 1))
      # 충돌 시 머지 중단
      git merge --abort 2>/dev/null || true
      break
    fi
  done <<< "$branches"

  echo ""
  echo -e "머지 완료: ${GREEN}${merge_count}${NC}  |  충돌: ${RED}${conflict_count}${NC}"

  if [[ $conflict_count -eq 0 && $merge_count -gt 0 ]]; then
    echo ""
    echo -e "${GREEN}모든 브랜치 머지 성공!${NC}"
    echo "정리하려면: merge-dispatch.sh --cleanup"
  fi
}

# ── 정리 ──
cleanup() {
  echo -e "${BOLD}═══ 디스패치 정리 ═══${NC}"
  echo ""

  local branches=$(get_dispatch_branches)

  # Worktree 제거
  if [[ -d "$WORKTREE_BASE" ]]; then
    for dir in "$WORKTREE_BASE"/dispatch-*; do
      if [[ -d "$dir" ]]; then
        local wt_name=$(basename "$dir")
        echo -e "  worktree 제거: $wt_name"
        git worktree remove "$dir" --force 2>/dev/null || rm -rf "$dir"
      fi
    done
  fi

  # 브랜치 삭제
  if [[ -n "$branches" ]]; then
    while IFS= read -r branch; do
      echo -e "  브랜치 삭제: $branch"
      git branch -D "$branch" 2>/dev/null || true
    done <<< "$branches"
  fi

  # 시그널 정리
  if [[ -d "$SIGNAL_DIR" ]]; then
    rm -f "$SIGNAL_DIR"/*.done "$SIGNAL_DIR"/*.blocked 2>/dev/null
    echo -e "  시그널 파일 정리 완료"
  fi

  # 프롬프트 정리
  local dispatch_dir="$PROJECT_ROOT/.context/dispatch"
  if [[ -d "$dispatch_dir" ]]; then
    rm -f "$dispatch_dir"/*.md 2>/dev/null
    echo -e "  디스패치 프롬프트 정리 완료"
  fi

  # worktree prune
  git worktree prune 2>/dev/null

  echo ""
  echo -e "${GREEN}정리 완료!${NC}"
}

# ── 메인 ──
case "${1:---help}" in
  --check)
    check_signals
    ;;
  --merge)
    merge_branches
    ;;
  --cleanup)
    cleanup
    ;;
  --all)
    check_signals && merge_branches && cleanup
    ;;
  --help|*)
    echo "Usage: merge-dispatch.sh [--check | --merge | --cleanup | --all]"
    echo ""
    echo "  --check    시그널 확인 → 완료/미완료 에이전트 목록"
    echo "  --merge    완료된 브랜치 순차 머지"
    echo "  --cleanup  worktree 제거 + 시그널 정리 + 브랜치 삭제"
    echo "  --all      check → merge → cleanup 전체 실행"
    ;;
esac
