---
name: git-workflow
description: A-Team 표준 git 워크플로우 — 커밋 형식, 브랜치 전략, 커밋 전 체크
tags: [git, commit, workflow, version-control]
---

# Git Workflow

## 언제 사용

- 커밋 메시지를 작성할 때
- 브랜치 전략을 결정할 때
- `git commit` 전 체크리스트가 필요할 때

## 패턴

### 커밋 메시지 형식

```
[type]: 요약 (50자 이내)

NOW: 이번에 한 것
NEXT: 다음에 할 것
BLOCK: 막힌 것 (있으면)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**type 목록**: `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `auto`

### HEREDOC으로 커밋 (필수)

```bash
git commit -m "$(cat <<'EOF'
feat: 새 기능 요약

NOW: X 기능 구현 완료
NEXT: Y 테스트 추가
BLOCK: 없음

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### 브랜치 전략

| 상황 | 전략 |
|------|------|
| 소규모 수정 (1-2 파일) | master 직접 커밋 |
| 기능 추가 / 5+ 파일 변경 | feature 브랜치 → PR |
| 자율 모드 (`/zzz`) | master 직접 (RESUME.md에 기록) |
| 고위험 리팩토링 | `scripts/worktree-exec.sh` 사용 |

### 커밋 전 필수 체크

```bash
# 1. Analytics 로깅 (슬래시 커맨드면 필수)
node scripts/log-event.mjs command_end name=X success=true

# 2. 테스트 (있으면)
npm test

# 3. 스테이징 (특정 파일만, git add -A 금지)
git add src/foo.ts src/bar.ts

# 4. git fetch origin 먼저 → git log origin/master 확인
git fetch origin && git log origin/master --oneline -5
```

## 예시

```bash
# 일반 기능 커밋
git add scripts/new-feature.mjs
git commit -m "$(cat <<'EOF'
feat: OneNote 페이지 누락 감지 스크립트 추가

NOW: audit-onenote-pages.mjs 구현, 451개 누락 페이지 발견
NEXT: migrate-onenote-html.mjs SECTION_MAP 업데이트
BLOCK: 없음

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## 주의사항

- `git add -A` / `git add .` 금지 — .env, 민감 파일 실수 포함 위험
- `--no-verify` / `--no-gpg-sign` 금지 — 명시적 요청 시에만
- `git reset --hard` 금지 — 명시적 요청 시에만
- 로컬 `git log`만 보고 완료 보고 금지 → `git fetch origin` 후 원격 확인 필수
- force push to master 금지
