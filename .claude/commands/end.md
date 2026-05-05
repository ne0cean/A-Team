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

세션 종료 시 사용자 프롬프트를 분석하여 **시행착오 원인**을 진단하고 구체적 개선안 제시.

### 5가지 실패 유형

---

#### 1️⃣ 의도 오해 (Claude가 엉뚱한 작업 수행)

**감지 패턴**:
| 패턴 | 예시 | 문제 |
|------|------|------|
| 암묵적 기대 | "개선해줘" | 무엇을 어떻게? |
| 다의적 표현 | "이거", "저거", "그거" | 지시대상 불명확 |
| 추상적 목표 | "좋게 만들어", "최적화해" | 기준 없음 |
| 비유/은유 | "깔끔하게", "예쁘게" | 주관적 해석 |
| 생략된 주어 | "추가해" | 뭘 어디에? |

**자가 체크**: "Claude가 이 프롬프트만 보고 정확히 같은 결과물을 만들 수 있나?"

**개선 공식**:
```
[대상] + [행동] + [기대결과] + [제약]
예: "lib/auth.ts에 + Google OAuth 추가 + 로그인 버튼 동작 + 기존 API 유지"
```

**이번 세션 예시** (해당 시):
```
❌ "피드백 루프를 만들고 싶어"
   → Claude 해석: 메트릭 수집 시스템
   → 실제 의도: 구체적 프롬프트 개선 조언

✅ "프롬프트 작성법 개선 피드백을 /end에서 제공.
    기준: 토큰 효율, 의도 명확성, 재작업 방지.
    출력: Before/After 예시 포함."
```

---

#### 2️⃣ 스코프 폭주 (안 해도 될 작업까지 수행)

**감지 패턴**:
| 패턴 | 예시 | 결과 |
|------|------|------|
| 범위 미지정 | "auth 개선해" | 전체 리팩토링 시작 |
| 제약 미명시 | "OAuth 추가" | 기존 코드 변경 |
| 열린 요청 | "할 수 있는 것 다 해줘" | 과잉 작업 |
| 암묵적 경계 | "간단하게" | 해석 차이 |

**자가 체크**: "Claude가 '여기까지만'이라고 명확히 알 수 있나?"

**개선 공식**:
```
[작업] + [경계] + [제외항목]
예: "OAuth 추가 + auth.ts만 수정 + 기존 테스트/API 변경 금지"
```

**경계 명시 키워드**:
- "~만", "~에서만", "~파일만"
- "~는 건드리지 마", "~는 나중에"
- "1개만", "최소한으로", "~개 이내"

---

#### 3️⃣ 결과물 불일치 (원하는 형태가 아님)

**감지 패턴**:
| 패턴 | 예시 | 결과 |
|------|------|------|
| 형식 미지정 | "분석해줘" | 장문 텍스트 vs 표 vs JSON |
| 깊이 미지정 | "설명해줘" | 한 줄 vs 상세 문서 |
| 스타일 미지정 | "코드 작성해" | 함수형 vs 클래스 vs 스크립트 |
| 품질 기준 없음 | "테스트 추가" | 1개 vs 전체 커버리지 |

**자가 체크**: "결과물을 받았을 때 '이거 아닌데'라고 할 가능성이 있나?"

**개선 공식**:
```
[작업] + [출력형식] + [품질기준]
예: "API 분석 + 마크다운 표로 + 엔드포인트별 메서드/경로/설명"
```

**형식 명시 키워드**:
- 출력: "표로", "JSON으로", "코드블록으로", "1줄로", "bullet으로"
- 깊이: "요약만", "상세히", "예시 포함", "~줄 이내"
- 품질: "테스트 포함", "타입 완전", "lint 통과"

---

#### 4️⃣ 컨텍스트 단절 (기존 결정/패턴 무시)

**감지 패턴**:
| 패턴 | 예시 | 결과 |
|------|------|------|
| 히스토리 무시 | 이미 논의한 내용 재설명 | 토큰 낭비 |
| 기존 결정 무참조 | "어떻게 할까?" | 이미 결정된 것 재논의 |
| 아키텍처 무시 | 새 패턴 요청 | 기존 패턴과 불일치 |
| 파일 미참조 | 배경 인라인 설명 | 매번 반복 |

**자가 체크**: "이 정보가 이미 어딘가에 있나? CURRENT.md? 이전 대화?"

**개선 공식**:
```
[컨텍스트 참조] + [작업]
예: "CURRENT.md 다음 우선순위 기준으로 + 다음 작업 선택"
예: "위에서 설계한 구조 기반으로 + 구현 시작"
```

**컨텍스트 참조 키워드**:
- "CURRENT.md 참고", "위에서 말한", "방금 만든"
- "@파일명", "기존 패턴 따라서"
- "이전 세션에서", "DECISIONS.md 기준으로"

---

#### 5️⃣ 재작업 루프 (같은 작업 반복 수정)

**감지 패턴**:
| 패턴 | 예시 | 결과 |
|------|------|------|
| 검증 기준 없음 | "만들어줘" | 완료 판단 불가 → 수정 반복 |
| 종료 조건 없음 | "개선해줘" | 언제 멈춰야 하는지 모름 |
| 점진적 요청 | "이것도 해줘" 반복 | 처음부터 명시했으면 한 번에 |
| 되돌리기 | "아까 거로 돌려줘" | 방향 미확정 상태 작업 |

**자가 체크**: "이 작업의 '완료' 기준이 명확한가?"

**개선 공식**:
```
[작업] + [완료조건] + [검증방법]
예: "OAuth 추가 + 로그인 동작 확인 + 테스트 통과 + 빌드 성공"
```

**완료 조건 키워드**:
- "~하면 완료", "~까지만"
- "테스트 통과", "빌드 성공", "lint 0"
- "내가 확인 후 다음 단계"

---

### 세션 분석 출력

```
📝 프롬프트 코칭 리포트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 이번 세션 요약
   프롬프트 N개 | 재작업 M회 | 명확화 질문 K회

🔴 발생한 실패 유형:
   1️⃣ 의도 오해 — "피드백 루프" (정의 불명확)
   3️⃣ 결과물 불일치 — 메트릭 시스템 vs 구체적 조언

📝 개선 예시:
   Before: "피드백 루프를 만들고 싶어. /end에 넣는게 좋겠어"

   After:  "/end에 프롬프트 코칭 추가.
            분석 기준: 의도 명확성, 스코프 제어, 재작업 방지.
            출력: 실패 유형 + Before/After 예시.
            저장: analytics.jsonl에 패턴별 카운트."

   차이: 의도·형식·저장 모두 명시 → 재작업 0

💡 다음 세션 체크리스트:
   □ 대상 + 행동 + 기대결과 + 제약 구조 사용
   □ "~만", "~까지" 경계 키워드 포함
   □ 완료 조건 명시
```

### Analytics 저장

```bash
node "$(git rev-parse --show-toplevel 2>/dev/null)/scripts/log-event.mjs" \
  prompt_quality \
  "promptCount=N" \
  "reworkCount=M" \
  "clarificationCount=K" \
  "failureTypes=[\"의도오해\",\"결과물불일치\"]" \
  "topPattern=암묵적기대" \
  2>/dev/null || true
```

## Step 7 — (선택) Research Mode
자리를 오래 비울 예정이면 "Research Mode를 시작할까요?" 질문.
원하면: `/re start`
