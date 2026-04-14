#!/usr/bin/env bash
# RFC-007 Phase L — Git worktree speculative execution
# 고위험 편집을 격리 worktree에서 실행, 검증 후 main merge or discard
# Opt-in via A_TEAM_WORKTREE=1 or explicit call
# Usage: bash scripts/worktree-exec.sh <task-id> -- <command> [args...]

set -euo pipefail

TASK_ID="${1:-}"
shift || true
[ "${1:-}" = "--" ] && shift || true
CMD=("$@")

if [ -z "$TASK_ID" ]; then
  cat <<EOF >&2
RFC-007 Worktree Speculative Exec
Usage: $0 <task-id> -- <command> [args...]

Example:
  $0 refactor-auth -- npm run test

기능:
  1. .worktrees/<task-id> 격리 worktree 생성 (HEAD 기준)
  2. 해당 worktree에서 <command> 실행
  3. 성공 시 main에 merge --squash, 실패 시 .worktrees 브랜치만 보존
  4. 전부 cleanup (prune 포함)

Opt-in: 명시적 호출만 작동. 자동 트리거 없음.
EOF
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
WORKTREE_PATH="$REPO_ROOT/.worktrees/${TASK_ID}"
BRANCH="wt/${TASK_ID}-$(date +%s)"
SUCCESS_TAG="wt-success-${TASK_ID}"
FAILURE_BRANCH="failed/${BRANCH}"

cleanup() {
  local exit_code=$?
  if [ -d "$WORKTREE_PATH" ]; then
    cd "$REPO_ROOT"
    git worktree remove --force "$WORKTREE_PATH" 2>/dev/null || true
  fi
  git worktree prune --verbose 2>/dev/null || true
  exit $exit_code
}
trap cleanup EXIT INT TERM

echo "[worktree-exec] Creating $WORKTREE_PATH (branch: $BRANCH)"
git worktree add "$WORKTREE_PATH" -b "$BRANCH" HEAD 2>/dev/null || {
  echo "[worktree-exec] Failed to create worktree" >&2
  exit 1
}

cd "$WORKTREE_PATH"
export WORKTREE_EXEC=1 TASK_ID="$TASK_ID"

echo "[worktree-exec] Executing: ${CMD[*]:-<no command>}"
if [ "${#CMD[@]}" -eq 0 ]; then
  echo "[worktree-exec] No command given — dry run only (worktree will be cleaned up)"
  exit 0
fi

if "${CMD[@]}"; then
  echo "[worktree-exec] ✓ Command succeeded"
  # Stage + commit any changes in worktree
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "task: ${TASK_ID} (worktree validated)"
  fi
  # Switch back to main repo
  cd "$REPO_ROOT"
  # Merge squash (user review 전제)
  echo "[worktree-exec] ⚠ Merge to main 수동 승인 필요:"
  echo "  git merge --squash $BRANCH"
  echo "  git commit -m 'task: ${TASK_ID}'"
  echo "  git branch -d $BRANCH"
  # Auto-merge 금지 — 사용자가 승인해야 함 (Sovereignty + safety)
else
  echo "[worktree-exec] ✗ Command failed — preserving failure branch" >&2
  cd "$REPO_ROOT"
  git branch -m "$BRANCH" "$FAILURE_BRANCH" 2>/dev/null || true
  echo "[worktree-exec] Debug branch: $FAILURE_BRANCH"
  exit 1
fi
