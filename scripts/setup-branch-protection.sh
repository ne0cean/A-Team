#!/usr/bin/env bash
# Branch protection 설정 — master 브랜치 보호
# 실행: bash scripts/setup-branch-protection.sh
#
# 설정 내용:
#   - PR 없이 직접 push 차단
#   - CI (test job) 통과 필수
#   - force push 차단
#   - branch 삭제 차단

set -euo pipefail

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)
if [ -z "$REPO" ]; then
  echo "ERROR: gh repo view 실패. gh auth login 먼저 실행하세요."
  exit 1
fi

BRANCH="master"

echo "Setting branch protection for $REPO:$BRANCH ..."

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/branches/$BRANCH/protection" \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=test' \
  -f 'enforce_admins=false' \
  -f 'required_pull_request_reviews[required_approving_review_count]=0' \
  -f 'required_pull_request_reviews[dismiss_stale_reviews]=false' \
  -F 'restrictions=null' \
  -F 'allow_force_pushes=false' \
  -F 'allow_deletions=false' \
  --silent

echo "Done. Branch protection enabled:"
echo "  - PR required for merge to $BRANCH"
echo "  - CI 'test' job must pass"
echo "  - Force push blocked"
echo "  - Branch deletion blocked"
echo ""
echo "NOTE: required_approving_review_count=0 (1인 팀 — self-merge 허용)"
echo "      CI mutation job은 선택 (실패해도 머지 가능, 경고만)"
