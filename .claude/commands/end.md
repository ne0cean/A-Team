---
description: 세션 종료 — 상태 갱신, 빌드 검증, 커밋, push (+ 선택: Research Mode)
---

다음 순서대로 세션을 마무리합니다.

## Step 0 — Pre-flight: 미완료 확인 (의무)

실행 전 다음 두 항목 확인:
1. `~/.claude/current-task-ac.txt` — pending `[ ]` AC 항목
2. `~/.claude/queue.txt` — 대기 중인 사용자 메시지

미완료 항목 발견 시:
- 항목 목록 표시
- "위 항목이 미완료입니다. 그냥 종료할까요? (y = 종료 / n = 계속 작업)"
- 사용자 'y' 응답 시에만 Step 1부터 진행
- 사용자 'n' 응답 시 /end 중단, 미완료 항목부터 처리

**면제:** 사용자가 "강제 종료", "그냥 닫아" 명시 시

## Step 1 — CURRENT.md 갱신
`.context/CURRENT.md`를 갱신한다 (없으면 스킵):
- `In Progress Files` → `(없음)` 으로 비우기
- `Last Completions` → 방금 완료한 작업 추가 (날짜 포함)
- `Next Tasks` → 다음 할 일 업데이트. **`[x]` 완료 항목은 삭제** (SESSIONS.md에 기록됨)
- `Blockers` → 현재 막힌 점 기록
- **위생 체크** (`governance/rules/document-hygiene.md`):
  - 200줄 초과 시 Last Completions 2주 이전 항목 → SESSIONS.md 이관
  - 완료된 Phase 체크리스트 → 1줄 요약으로 축약

## Step 1.5 — Idea Harvest (조건부, memory/idea-registry.md 존재 시만)

```bash
ls memory/idea-registry.md 2>/dev/null
```

**파일 없으면 → 즉시 스킵.**

**파일 있으면 → 아이데이션 세션 판별:**
- 이 세션에서 `/brainstorm`, `/office-hours`, `/idea`, `/prd` 등 아이데이션 커맨드를 사용했거나
- 대화에 새 기능/메커닉 제안, 전략 전환, 프레이밍 발견 등 아이디어 패턴이 있는 경우만 진행
- **코딩/버그 수정/리팩토링만 한 세션 → 스킵** (레지스트리 읽지 않음)

**진행 시:**

1. `memory/idea-registry.md`를 읽고, 세션 대화에서 감지된 아이디어 각각을 ID/이름 매칭:
   - **매칭 있음** → 상태/리뷰메모 업데이트 제안
   - **매칭 없음** → 레지스트리 카테고리 헤더(`## X. 카테고리명`) 파싱하여 자동 분류 + 해당 카테고리 마지막 ID+1 부여 + status=개념, Ph=-
   - **이미 이 세션에서 `/brainstorm` Step 4.5 또는 `/idea`로 반영된 건 제외**

2. 변경 사항을 테이블로 제시:
   ```
   | 액션 | ID | 이름 | 변경 내용 |
   |------|----|------|----------|
   | 신규 | B18 | ... | status=개념, Ph=1 |
   | 업데이트 | E06 | ... | status: 개념→설계됨 |
   ```

3. 사용자 승인 → idea-registry.md 수정. 스킵 → 그대로 진행 (강제 아님).

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

## Step 3.4 — Friction 자동 기록 (자동)

세션 중 사용자가 "안 돼", "수동으로", "불가능", "미지원" 등 키워드를 발화한 경우:
```bash
# gap-sensor의 autoLogFriction()이 이미 세션 중 자동 기록함
# 확인: .context/friction-log.jsonl 마지막 항목
tail -3 .context/friction-log.jsonl 2>/dev/null || true
```
새로 감지된 friction이 있으면 `.context/friction-log.jsonl`에 append됨.
감지 로직: `lib/gap-sensor.ts` `autoLogFriction()` 참조.

## Step 3.45 — PRD/Plan 동기화 (구조적 변화 시)

세션 중 다음 중 하나라도 해당하면 PRD/Plan 파일 갱신:
- 새 모듈/시스템 추가 (파일 10+ 신규)
- 아키텍처 변경 (데이터 모델, 배포 인프라, SSOT 변경)
- 핵심 기능 추가/삭제 (사용자 워크플로우 변경)
- Phase 전환

**감지**:
```bash
# 신규 파일 수 체크
NEW_FILES=$(git diff --cached --name-only --diff-filter=A 2>/dev/null | wc -l)
# 인프라 변경 체크
INFRA_CHANGE=$(git diff --cached --name-only 2>/dev/null | grep -E 'wrangler|Dockerfile|deploy|\.env|infra/' | head -1)
# PRD/Plan 파일 찾기
PLAN_FILE=$(find . .claude/plans -maxdepth 2 -name "*plan*" -o -name "*prd*" 2>/dev/null | grep -iE '\.md$' | head -1)
```

**해당 시**:
1. Plan 파일의 "구현 완료/미구현" 섹션 갱신
2. 새 아키텍처 결정 반영 (인프라, 데이터 모델 등)
3. Next Steps 업데이트

**미해당 시**: 스킵 (나레이션 없이).

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

## Step 6.5 — Analytics Emit (자동)
세션 종료 시 analytics.jsonl에 session_end 이벤트 기록:
```bash
CMDS=$(git log --oneline -1 --format="%s" 2>/dev/null | cut -c1-60 || echo "unknown")
node "$(git rev-parse --show-toplevel 2>/dev/null)/scripts/log-event.mjs" \
  session_end \
  "summary=$CMDS" \
  "branch=$(git branch --show-current 2>/dev/null || echo unknown)" \
  2>/dev/null || true
```
실패해도 세션 종료를 막지 않음 (|| true).

## Step 6.7 — Prompt Coaching (자동)

세션 프롬프트 분석 → 시행착오 원인 진단 + 개선안 제시.
**상세 (5가지 실패 유형 + 출력 템플릿)**: `Read governance/skills/prompt-coaching.md`

요약: 의도오해/스코프폭주/결과물불일치/컨텍스트단절/재작업루프 5유형 분석 → Before/After 예시 → analytics 저장.

## Step 6.75 — 레슨→훅 커버리지 체크 (자동)

이번 세션에서 MEMORY.md에 새 레슨이 추가됐으면:
1. 레슨 태그 확인 (`global`, `cortex`, `d1`, `api` 등)
2. 해당 레슨을 강제하는 훅/게이트가 settings.json에 있는지 체크
3. 없으면 1줄 제안:

```
⚙️ 레슨 '[레슨명]' — 강제 훅 없음
   제안: pre-bash.sh 또는 pre-edit-cortex.sh에 패턴 추가 검토
```

**체크 기준**: 레슨이 "이 실수를 반복하지 말라"는 내용이고, 코드/파일/명령 패턴으로 자동 감지 가능한 경우만 제안. 문서/프로세스 레슨은 스킵.

## Step 6.76 — 레슨→패턴 파일 커버리지 체크 (자동)

이번 세션에서 MEMORY.md에 새 레슨이 추가됐으면, 해당 레슨이 `governance/patterns/`에 반영됐는지 확인:

**태그 → 패턴 파일 매핑**:
| 레슨 태그 | 연결 패턴 파일 |
|----------|--------------|
| `playwright` `browser` `aria` `automation` | `governance/patterns/browser-automation.md` |
| `d1` `ssot` `data-loss` `patch` `read-modify-write` | `governance/patterns/data-mutation.md` |
| `worker` `cloudflare` `api` `405` `404` `500` | `governance/patterns/api-error-handling.md` |
| `qa` `screenshot` `glance` `visual-testing` `token` | `governance/patterns/visual-qa.md` |

**동작**:
1. 새 레슨 태그와 위 매핑을 대조
2. 매핑되는 패턴 파일이 있고, 이번 세션에서 해당 파일이 수정 안 됐으면:
   ```
   📐 패턴 업데이트 제안: '[레슨명]' → governance/patterns/[파일].md 갱신 권장
      (안티패턴 또는 체크리스트에 추가)
   ```
3. 이미 반영됐으면 스킵 (나레이션 없이)
4. 매핑 없는 레슨 (문서/프로세스성) → 스킵

**목적**: 레슨이 MEMORY.md(사후 기록)에만 머물지 않고, governance/patterns/(사전 예방)까지 진화되도록 보장.

## Step 6.8 — Command Usage Coaching (자동)

세션 중 사용된 커맨드 vs 사용 안 했지만 **썼으면 더 좋았을** 커맨드를 분석.

### 분석 기준

| 시나리오 | 놓친 커맨드 | 힌트 |
|----------|-----------|------|
| 복잡한 멀티파일 작업을 수동 진행 | `/blueprint` | 설계 문서 먼저 만들면 구현 품질 향상 |
| 큰 변경 후 wiring 확인 안 함 | `/pmi` | Post-integration 검사로 누락 방지 |
| 보안 민감 코드 수정 | `/cso` | OWASP/STRIDE 자동 감사 |
| 제품 아이디어 논의만 하고 문서화 안 함 | `/prd` 또는 `/office-hours` | 구조화된 검증 → PRD 저장 |
| 여러 접근법 고민 | `/thinking-partner` | 체계적 탐색 |
| 반복 수정 3회+ | `/tdd` | 테스트 먼저 → 재작업 방지 |
| 리뷰 없이 push | `/review` 또는 `/ship` | 품질 게이트 |
| 전략적 결정 없이 구현 | `/plan-ceo` | CEO 관점 검토 |
| 디버깅 30분+ | `/investigate` | 체계적 근본원인 분석 |
| 커버리지/성능 의문 | `/benchmark` | 기준선 측정 |

### 출력 형식

```
🎯 커맨드 활용 피드백
━━━━━━━━━━━━━━━━━━━━━
사용한 커맨드: /pickup, /prd, /plan-eng (3개)
놓친 기회:
  → /blueprint — 멀티파일 설계 선행했으면 구현 시행착오 줄었을 것
  → /pmi — 신규 파일 10개+ 추가됨, integration 검사 권장
```

3개 이하로 간결하게. 해당 없으면 생략.

### Analytics 저장

```bash
node scripts/log-event.mjs command_coaching \
  "used=pickup,prd,plan-eng" \
  "missed=blueprint,pmi" \
  2>/dev/null || true
```

## Step 7 — (선택) Research Mode
자리를 오래 비울 예정이면 "Research Mode를 시작할까요?" 질문.
원하면: `/re start`
