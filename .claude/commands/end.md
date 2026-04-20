---
description: 세션 종료 — 상태 갱신, 빌드 검증, 커밋, push (+ 선택: Research Mode)
---

다음 순서대로 세션을 마무리합니다.

## Step 1 — CURRENT.md 갱신
`.context/CURRENT.md`를 갱신한다 (없으면 스킵):
- `In Progress Files` → `(없음)` 으로 비우기
- `Last Completions` → 방금 완료한 작업 추가 (날짜 포함)
- `Next Tasks` → 다음 할 일 업데이트
- `Blockers` → 현재 막힌 점 기록

## Step 2 — SESSIONS.md 로그 추가
`.context/SESSIONS.md`에 오늘 세션 항목 추가 (없으면 스킵):
```
## [YYYY-MM-DD] 세션 제목

**완료**: ...
**이슈**: ...
**빌드**: ✅/❌
```

## Step 3 — 빌드 검증
프로젝트 타입을 자동 감지하여 실행:
```bash
[ -f package.json ]   && npm run build
[ -f Cargo.toml ]     && cargo test
[ -f pyproject.toml ] && pytest
[ -f go.mod ]         && go test ./...
[ -f Makefile ]       && make test
```
빌드 스크립트 없으면 eslint / tsc --noEmit 등 정적 분석 실행.
빌드 실패 시 → 수정 후 재시도 (최대 2회). 2회 실패 시 BLOCK에 기록 후 계속 진행.

## Step 3.5 — 세션 데이터 저장 (자동)
세션 중 발견된 학습/비용/사용 데이터를 자동 저장:
- **Learnings**: 세션 중 발견한 pattern/pitfall이 있으면 `lib/learnings.ts` logLearning()으로 기록
- **Cost + Analytics 통합**: 세션 비용 요약을 analytics에도 기록 (`lib/cost-tracker.ts` getSummary() → `lib/analytics.ts` logEvent() with event='session_cost'):
  ```
  summary = costTracker.getSummary()
  logEvent({ skill: 'session', event: 'session_cost', repo: projectSlug,
    totalCostUsd: summary.totalCostUsd, callCount: summary.callCount,
    preCheckSkipRate: summary.preCheckSkipRate,
    advisorCallAvg: summary.advisorCallAvg, cacheHitRate: summary.cacheHitRate }, analyticsFile)
  ```
- **Analytics**: 사용한 스킬 목록을 `lib/analytics.ts` logEvent()로 기록
- **Evals**: 세션 중 테스트/빌드 결과가 있으면 `lib/eval-store.ts` save()로 저장 (다음 세션에서 비교 가능)

## Step 3.7 — Post-Integration 검사 (자동)
이 세션 중 `lib/*.ts`, `.claude/agents/*.md`, `governance/` 에 새 파일이 생성되었는지 확인:
```bash
git diff --cached --name-only --diff-filter=A 2>/dev/null | grep -E '^(lib/.*\.ts|\.claude/agents/.*\.md|governance/)' || true
git diff --name-only --diff-filter=A 2>/dev/null | grep -E '^(lib/.*\.ts|\.claude/agents/.*\.md|governance/)' || true
```
감지되면: PIOP Phase 1 (Integration Map) 실행.
- 미연결 항목 발견 시: 즉시 Phase 2 연결 수행 (빌드 검증 포함)
- 또는 복잡하면: CURRENT.md의 Next Tasks에 `/optimize` TODO 등록

## Step 3.8 — A-Team Drift 감지 (자동)

현재 프로젝트가 a-team 자체가 **아닌데** a-team 하위 사본(`A-Team/`, `a-team/`, `.a-team/` 등)이 존재하거나, 프로젝트 내 `.claude/commands/`·`governance/`·`scripts/auto-switch/` 가 수정되었다면 drift 신호. `ateam-sovereignty.md` 제2/7원칙에 따라 **글로벌이 정본**.

```bash
CURRENT_REPO=$(git rev-parse --show-toplevel 2>/dev/null || echo '')
ATEAM_GLOBAL="$HOME/Projects/a-team"

if [ "$CURRENT_REPO" != "$ATEAM_GLOBAL" ]; then
  # 프로젝트 내 a-team 사본 수정 감지
  DRIFT_PATHS=$(git diff --name-only HEAD~20 HEAD 2>/dev/null | grep -E '^(\.?A-Team/|\.?a-team/|\.claude/commands/|governance/|scripts/auto-switch/)' || true)
  if [ -n "$DRIFT_PATHS" ]; then
    echo ""
    echo "⚠️  A-Team drift 감지 (ateam-sovereignty 제2원칙 위반 가능):"
    echo "$DRIFT_PATHS" | head -10
    echo ""
    echo "권장: 이 변경사항을 a-team 글로벌(~/Projects/a-team)로 역류하세요:"
    echo "  cd $ATEAM_GLOBAL && /absorb"
    echo ""
    echo "무시하려면 다음 세션에서 계속 진행. 단 drift가 누적되면 여러 프로젝트 간 분열 발생."
  fi
fi
```

감지 시 사용자에게 1회 보고 후 세션 종료는 정상 진행. **자동 머지 안 함** (`/absorb` 스킬이 인간 결정 대기 원칙 유지).

## Step 4 — 커밋
빌드 성공 시 커밋:
```
[type]: 요약

NOW: 방금 완료한 것
NEXT: 다음 할 일
BLOCK: 막힌 점 (없으면 없음)
```

## Step 5 — 시각적 검증 (프론트엔드 작업 시)
프론트엔드 파일 수정 있으면:
- 로컬 개발 서버 URL 제공 (예: http://localhost:5173)
- 프로덕션 URL 보고 (있으면)

## Step 6 — 원격 Push (remote 없으면 자동 생성)

커밋이 있으면 **항상 즉시 실행**. 3단계 자동 처리:

### 6.1 Remote 설정 확인
```bash
BRANCH=$(git branch --show-current)
REMOTE_URL=$(git remote get-url origin 2>/dev/null || true)

if [ -z "$REMOTE_URL" ]; then
  # Remote 미설정 → GitHub 레포 자동 생성 후 연결
  REPO_NAME=$(basename "$(pwd)")
  echo "⚠️ No 'origin' remote. Creating private GitHub repo '$REPO_NAME'..."
  gh repo create "$REPO_NAME" --private --source=. --remote=origin --push || {
    echo "❌ gh repo create 실패. 수동으로 remote 설정 후 재시도:"
    echo "   gh repo create $REPO_NAME --private --source=. --remote=origin --push"
    exit 1
  }
  echo "✅ Repo created + pushed"
  exit 0
fi
```

### 6.2 정상 Push + 에러 타입별 복구
```bash
if git push origin "$BRANCH" 2>&1 | tee /tmp/push.log; then
  echo "✅ Pushed: $BRANCH"
else
  # 에러 분류 + 자동 복구 시도
  if grep -qE "Repository not found|does not exist|not found" /tmp/push.log; then
    # Remote URL은 있지만 GitHub에 레포 없음 → 자동 생성
    REPO_NAME=$(basename "$REMOTE_URL" .git)
    ACCOUNT=$(echo "$REMOTE_URL" | sed -E 's|.*[:/]([^/]+)/[^/]+$|\1|')
    echo "⚠️ GitHub repo '$ACCOUNT/$REPO_NAME' 없음. 자동 생성..."
    gh repo create "$ACCOUNT/$REPO_NAME" --private --source=. --push || {
      echo "❌ gh repo create 실패. 수동 처리 필요"
      exit 1
    }
  elif grep -qE "rejected.*non-fast-forward|fetch first" /tmp/push.log; then
    # 원격이 앞서있음 → rebase 후 재시도
    echo "⚠️ Non-fast-forward. Rebasing..."
    git pull --rebase origin "$BRANCH" && git push origin "$BRANCH" || {
      echo "❌ Rebase 충돌. 수동 해결 필요"
      exit 1
    }
  elif grep -qE "src refspec .* does not match" /tmp/push.log; then
    echo "❌ 로컬 브랜치 '$BRANCH' 에 커밋 없음 — 비정상 상태"
    exit 1
  else
    # 네트워크/인증/기타 → 즉시 사용자 보고
    echo "❌ PUSH FAILED (unknown) — see /tmp/push.log"
    exit 1
  fi
fi
```

**원칙**: 실패 시 **절대 세션 "종료"로 처리하지 말 것** — 다른 머신에서 같은 착각 반복 금지.

## Step 7 — (선택) Research Mode
자리를 오래 비울 예정이면 "Research Mode를 시작할까요?" 질문.
원하면: `/re start`
