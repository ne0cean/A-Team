---
description: GitHub PR 리뷰 — 변경사항 분석 후 reviewer 에이전트 리뷰 + GitHub 코멘트 게시
---

GitHub PR 코드 리뷰를 자동화합니다. 인수로 PR 번호를 전달하거나, 없으면 가장 최근 열린 PR을 대상으로 합니다.

## 실행 흐름

### 1. PR 식별
```bash
# 인수가 있으면 해당 PR, 없으면 최신 열린 PR
PR_NUM="${1:-}"
if [ -z "$PR_NUM" ]; then
  gh pr list --state open --limit 1 --json number,title,author
else
  gh pr view "$PR_NUM" --json number,title,author,files,additions,deletions
fi
```

### 2. 변경사항 추출
```bash
gh pr diff "$PR_NUM"
gh pr view "$PR_NUM" --json files --jq '.files[].path'
```
변경 파일이 20개 초과 시 경고 메시지 포함해서 reviewer 에이전트에 전달.

### 3. Reviewer 에이전트 호출
다음 구조화 JSON을 reviewer 에이전트에 전달:
```json
{
  "task_id": "PR-REVIEW-{pr_number}",
  "pr_title": "{제목}",
  "changed_files": ["파일 목록"],
  "diff_summary": "핵심 변경사항 요약",
  "review_focus": [
    "보안 취약점 (인증/권한/입력검증/XSS/SQL injection)",
    "비즈니스 로직 오류",
    "성능 이슈 (N+1, 불필요한 재렌더링 등)",
    "코딩 컨벤션 위반"
  ]
}
```

### 4. 리뷰 결과 처리
reviewer 에이전트 출력을 요약하여 사용자에게 보고한 후, GitHub 게시 여부를 확인합니다.

```bash
# 승인 후 실행 (자동 APPROVE 금지)
gh pr review "$PR_NUM" --comment --body "[리뷰 내용]"
# 수정 요청 시:
gh pr review "$PR_NUM" --request-changes --body "[수정 요청 내용]"
```

**주의**: GitHub 게시는 반드시 사용자 승인 후 실행. 자동 APPROVE 절대 금지.

### 5. CURRENT.md 업데이트
리뷰 완료 내역을 `.context/CURRENT.md` Last Completions에 추가합니다.

## 전제 조건
- `gh` CLI 설치 및 인증 완료 (`gh auth status`)
- GitHub MCP 서버: settings.json `mcpServers.github` 설정
