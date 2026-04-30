---
description: 세션 시작 — 컨텍스트 로드 + Opus/Gemini 분류 + 즉시 실행 (Turbo One-Stop Start)
---

> **자동 트리거**: SessionStart 훅이 새 세션 시 Step 1~2를 자동 주입합니다.
> 수동 `/vibe`는 컨텍스트 강제 리로드 또는 태스크 재분류 시 사용.

## Step 0.2 — A-Team Sync (자동 최신 버전 pull)

A-Team 레포가 stale 하면 자동 pull → 새 커맨드/룰/스킬이 반영됨. symlink 구조라 pull만 하면 전체 머신에 전파.

```bash
# A-Team 레포 경로 탐색 (canonical: ~/Projects/a-team, fallback: ~/tools/A-Team)
ATEAM_PATH=""
for candidate in "$HOME/Projects/a-team" "$HOME/tools/A-Team" "$HOME/A-Team"; do
  [ -d "$candidate/.git" ] && ATEAM_PATH="$candidate" && break
done

if [ -n "$ATEAM_PATH" ]; then
  FETCH_FILE="$ATEAM_PATH/.git/FETCH_HEAD"
  # 마지막 fetch가 6시간 이상 지났으면 pull
  if [ ! -f "$FETCH_FILE" ] || [ $(($(date +%s) - $(stat -f %m "$FETCH_FILE" 2>/dev/null || echo 0))) -gt 21600 ]; then
    echo "🔄 A-Team 동기화 (마지막 fetch > 6h)..."
    (cd "$ATEAM_PATH" && git pull --rebase --autostash origin master 2>&1 | tail -5)
    NEW_COMMITS=$(cd "$ATEAM_PATH" && git log --oneline HEAD@{1}..HEAD 2>/dev/null | wc -l | tr -d ' ')
    if [ "$NEW_COMMITS" -gt 0 ] 2>/dev/null; then
      echo "✅ A-Team $NEW_COMMITS 신규 커밋 반영됨 (symlink 구조 — 재설치 불필요)"
      echo "📜 $(cd "$ATEAM_PATH" && git log --oneline HEAD@{1}..HEAD | head -3)"
    fi
  fi
fi
```

**실패 시 처리**:
- Network/auth 실패 → 경고만 표시하고 세션 진행 (blocking 금지)
- Merge conflict (로컬 수정 있음) → autostash가 처리, 그래도 실패 시 사용자에게 수동 해결 요청

**심볼릭링크 확인**:
```bash
readlink ~/.claude/commands/end.md 2>/dev/null | grep -q a-team && echo "✅ symlink 정상" || echo "⚠️ 복사본 — install-commands.sh 재실행 필요"
```

## Step 0.55 — 주간 /absorb 스캔 (일요일)

A-Team 레포 작업 중일 때만 실행. 다른 프로젝트의 로컬 커맨드/스크립트/규칙을 master 로 역류 흡수.

```bash
# A-Team 레포 작업 중인지 확인
if [ -f "./.claude/commands/absorb.md" ] && [ "$(basename $(pwd))" = "a-team" ]; then
  LAST_SCAN=".last-absorb-scan"
  TODAY=$(date +%Y-%m-%d)
  # 일요일 (7) + 오늘 아직 안 돌렸으면
  if [ "$(date +%u)" = "7" ] && [ "$(cat $LAST_SCAN 2>/dev/null)" != "$TODAY" ]; then
    echo "📥 /absorb 주간 스캔 제안 — 다른 프로젝트 개선사항 역류 흡수"
    echo "   실행: /absorb (수동) 또는 스킵"
  fi
fi
```

일요일 아니거나 이미 스캔한 날이면 스킵 (silent).

## Step 0.3 — Daily Tip (매일 2개 유용한 명령어 소개)

`governance/reference/daily-tips.md`에서 팁 목록을 읽고, 오늘 날짜 기반 2개를 순환 선택하여 소개.
인덱스 = (월 × 31 + 일) % (팁 수 / 2) × 2. 출력: `💡 오늘의 팁` + 2줄 요약.

## Step 0.5 — 정기/통합 검사 (자동)
1. **Biweekly Optimization (격주)**:
   - 마지막 `[biweekly-optimize]` 기록이 14일 경과했는지 `.context/SESSIONS.md` 빈도 체크
   - 14일 경과 시: `🔄 정기 7축 최적화(Biweekly) 시점입니다.` 표시 후 `/optimize --biweekly` 실행

2. **Post-Integration 감지 (상시)**:
   - 이전 세션 이후 메이저 통합 확인:
   ```bash
   git diff --name-only HEAD~3..HEAD 2>/dev/null | grep -E '^(lib/.*\.ts|\.claude/agents/.*\.md|governance/)' || true
   ```
   - 감지되면: "메이저 통합 감지. `/optimize` 자동 실행합니다." → PIOP Phase 1-5 수행.
   - 격주 최적화와 PIOP는 독립적으로 실행함 (동시 실행 가능).

## Step 0.6 — Resume 감지 (토큰 소진 후 자동 이어받기)
`.context/RESUME.md` 존재 여부 확인:
- `created_at` 이 24시간 이내이면: `🔄 이전 중단 세션 감지 ({created_at}). '/pickup' 실행 또는 아래 Next Tasks 확인 후 계속하세요.`
- `status: completed` 이면: stale 가능, 3일 경과 시 삭제 제안
- `mode: zzz` (또는 legacy `sleep`) + `status != completed` 이면: zzz mode 진행 중 → `/pickup` 강력 권장, `launchctl list | grep com.ateam.sleep-resume` 로 OS 크론 생존 확인
- 부재 시: 기본 vibe 흐름 진행
- `~/Library/Logs/ateam-sleep-resume.log` 최근 24h 엔트리 있으면 요약 표시

### Step 0.6b — 자동 재개 launchd 설치 (필수, 모든 프로젝트)

토큰 리셋 시 헤드리스 자동 재개를 보장. 현재 프로젝트별 launchd job 자동 설치/확인.

```bash
# A-Team 경로 탐색
ATEAM=""
for c in "$HOME/Projects/a-team" "$HOME/tools/A-Team" "$HOME/A-Team"; do
  [ -d "$c/.git" ] && ATEAM="$c" && break
done
if [ -z "$ATEAM" ]; then
  echo "⚠️ A-Team 미발견 — 자동 재개 설정 스킵"
else
  PROJ="$(pwd -P)"
  PROJ_NAME="$(basename "$PROJ" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-')"
  LABEL="com.ateam.sleep-resume.${PROJ_NAME}"
  if [ "$PROJ" = "$ATEAM" ]; then
    LABEL="com.ateam.sleep-resume"
  fi

  # launchd job 등록 여부 확인
  if launchctl list 2>/dev/null | grep -q "$LABEL"; then
    echo "✅ 자동 재개 설정됨 ($LABEL) — 토큰 리셋 시 OS 크론이 작업 재개"
  else
    # RESUME.md 가 있으면 자동 설치, 없으면 안내만
    if [ -f "$PROJ/.context/RESUME.md" ]; then
      echo "🔧 RESUME.md 감지 — 자동 재개 launchd 설치 (매 2h)..."
      bash "$ATEAM/scripts/install-sleep-cron.sh" --project "$PROJ" install "every 2h" 2>&1 | tail -5
    else
      echo "💡 자동 재개 미설정 — 장기 작업 시 다음 실행:"
      echo "   bash $ATEAM/scripts/install-sleep-cron.sh --project \"$PROJ\" install \"every 2h\""
    fi
  fi
fi
```

**원칙**:
- RESUME.md 작성하는 모든 자율 작업은 자동으로 OS-level launchd 가 백업
- 매 2h interval — 토큰 리셋 사이클을 거의 즉시 감지
- `sleep-resume.sh` 가 rate limit probe → 통과 시에만 본 작업 시작
- 프로젝트별 독립 (Trading 과 a-team 동시 가능)
- 종료: `bash $ATEAM/scripts/install-sleep-cron.sh --project "$PROJ" uninstall`

## Step 0.65 — 예약된 회고 감지
`CURRENT.md` Next Tasks 에 🗓️ 이모지 포함 + 날짜 매치 시:
- 오늘이 예약일이면: `📅 {task} 예약일 — 자동 실행 제안`
- 해당 라인에 명시된 스킬 (예: `/design-retro`) 제안

## Step 0.67 — Team Roadmap 거버넌스 로드 (필수, A-Team 프로젝트만)

`.context/team-roadmap.md` 가 있으면 SSOT 로 로드 → 이번 세션 작업이 거버넌스 룰을 위반하지 않는지 자동 검사.

```bash
ROADMAP=".context/team-roadmap.md"
if [ -f "$ROADMAP" ]; then
  CURRENT_PHASE=$(grep -E '^current_phase:' "$ROADMAP" | head -1 | sed -E 's/.*: *//' | tr -d '"')
  PHASE_STATUS=$(grep -E '^status:' "$ROADMAP" | head -1 | sed -E 's/.*: *//' | tr -d '"')
  echo "🎯 Team Roadmap — 현재 Phase $CURRENT_PHASE ($PHASE_STATUS)"
  echo "   거버넌스: 새 모듈 빌드 요청 시 현재 Phase Gate 검사 필수"
  echo "   To-Do: CURRENT.md 'Phase $CURRENT_PHASE To-Do' 섹션 참조"
fi
```

**거버넌스 룰** (사용자 새 모듈/기능 요청 시 Claude 자동 검사):

1. **Earned integration 검사**: 사용자가 새 모듈 빌드 요청 시:
   - 현재 Phase 의 Gate 충족 여부 확인
   - 미충족이면: "현재 Phase {N} Gate 미충족 ({이유}). 새 모듈 진행 전 Gate 통과 권장합니다. 진행하시겠습니까?" 한 번 confirm
   - 사용자가 강제로 진행하면 그대로 실행 (블로킹 X)

2. **미사용 모듈 회고 트리거**: 모듈 사용 데이터 0건 + 14일 경과 시:
   - 첫 응답에 알림: "⚠️ {모듈명} 14일간 사용 0회 — `.context/retros/_template.md` 회고 작성 권장"

3. **데이터 기반 우선순위 재조정**:
   - analytics.jsonl 누적 데이터 보고 다음 모듈 우선순위 변경 가능
   - 단, 사용자에게 근거(어떤 데이터·왜 바꾸는지) 명시 후 동의받음

**발화 예시**:
- 사용자: "이메일 자동 응답 모듈 만들어줘"
- Claude: "🎯 현재 Phase 0 (메타 인프라) — Gate 미충족. 그 모듈은 Phase 6 (운영) 영역입니다. Phase 0 분석 인프라 먼저 끝내는 게 거버넌스 권장입니다. 그래도 진행할까요? (Y/N)"

상세 룰: `.context/team-roadmap.md` "거버넌스 룰" 섹션

## Step 0.69 — Capability Lifecycle Gate (자동, A-Team 프로젝트만)

`lib/capability-map.json` + `scripts/capability.mjs` 가 있으면 자동 실행.

```bash
if [ -f "lib/capability-map.json" ] && [ -f "scripts/capability.mjs" ]; then
  # 종합 점수 + 런칭 준비도 (1줄 요약)
  SCORES=$(node scripts/capability.mjs --json 2>/dev/null)
  if [ -n "$SCORES" ]; then
    OVERALL=$(echo "$SCORES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['overall'])" 2>/dev/null)
    echo "📊 Capability: 종합 ${OVERALL}% — '/capability' 로 상세 확인"
  fi

  # 스테일 모듈 감지: analytics.jsonl에서 14일 이상 사용 0회 모듈
  if [ -f ".context/analytics.jsonl" ]; then
    CUTOFF=$(date -v-14d +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -d '14 days ago' +%Y-%m-%dT%H:%M:%S 2>/dev/null)
    RECENT_CMDS=$(awk -v cutoff="$CUTOFF" '$0 > cutoff' .context/analytics.jsonl 2>/dev/null | grep -o '"command":"[^"]*"' | sort -u | tr -d '"command":' | tr -d '"' || true)
    # 간단히 출력 (상세 감지는 /capability 커맨드에서)
    [ -z "$RECENT_CMDS" ] && echo "   ⚠️ analytics.jsonl 데이터 없음 — 모듈 사용 추적 미활성"
  fi
fi
```

**Lifecycle 룰** (새 모듈 요청 시 + 기존 모듈 스테일 감지):

1. **Gap-priority 검사**: 사용자가 새 기능 빌드 요청 시 → `scripts/gap-priority.mjs` top-5 조회
   - 요청 기능이 top-5 gap에 해당하면: 즉시 진행 (우선순위 정렬됨)
   - 해당 없으면: "현재 top 갭은 {X}입니다. 요청하신 {Y}는 우선순위 {N}위입니다. 진행할까요?"

2. **스테일 모듈 회고 트리거**: Step 0.67 거버넌스의 "미사용 모듈 회고" 자동 실행
   - analytics.jsonl에서 14일 이상 이벤트 0건인 모듈 감지 → `.context/retros/` 회고 제안

3. **abandoned 폐기 제안**: 30일 이상 사용 0건 + coverage 0% 모듈
   - "⚠️ {capability} 30일 미사용 — capability-map에서 제거하거나 coverage 갱신 권장"

## Step 0.8 — Pending Improvements 감지 (자동, A-Team 프로젝트만)
현재 프로젝트가 A-Team이면 `improvements/pending.md`에서 ⏳ pending 항목 수를 카운트:
- 1건 이상: `📬 미반영 개선사항 {N}건 대기 중 (P0: X / P1: Y / P2: Z). '/improve apply'로 반영.`
- P0이 있으면 강조: `🚨 P0 긴급 개선사항 {X}건 — 즉시 반영 권장`
- 0건이면 스킵

## Step 0.7 — 학습/Instinct + 비용 통계 로드 (자동, 저비용)
프로젝트에 학습/비용 데이터가 있으면 세션 시작 시 로드:
- `lib/learnings.ts` searchLearnings() → 최근 학습 5건 요약 표시
- `lib/instinct.ts` shouldApply() → 이 프로젝트에 적용할 instinct 목록 표시
- **Pre-check 통계**: analytics JSONL에서 `event='session_cost'` 최근 5건 평균 → pre-check skip rate 표시
  - skip rate ≥ 15%면: "Pre-Check 효율적 (skip {N}%)" 표시
  - skip rate < 5%이고 50+ 세션이면: "Pre-Check skip rate 낮음 — threshold 조정 고려"
- **Advisor 비용**: 최근 세션 `advisorCallAvg` + `cacheHitRate` 표시 (useSdkPath=true 사용 시)
- 없으면 무시 (비용 0)

## Step 1 — 컨텍스트 로드 (SessionStart 훅이 자동 수행)
새 세션이면 이미 주입됨 → 확인만. 수동 호출이면 아래 실행:

**1. 프로젝트 레포 동기화 (필수, 가장 먼저)**
```bash
# 다른 PC/세션에서 커밋한 내용을 받아야 push 충돌 방지
BRANCH=$(git branch --show-current 2>/dev/null)
if [ -n "$BRANCH" ] && git remote get-url origin >/dev/null 2>&1; then
  echo "🔄 프로젝트 레포 동기화 ($BRANCH)..."
  git pull --rebase --autostash origin "$BRANCH" 2>&1 | tail -5 || \
    echo "⚠️ pull 실패 (네트워크/충돌) — 계속 진행, 나중에 수동 처리 필요"
fi
```
- 실패해도 blocking 금지 (네트워크 끊김 등 대응)
- merge conflict 발생 시 사용자에게 즉시 보고

**2. 컨텍스트 파일 로드**
- `.context/CURRENT.md` / `.context/DECISIONS.md` / `memory/MEMORY.md`
- `git status && git log --oneline -5`
- 새 리서치 노트: `.research/notes/` 에서 CURRENT.md 이후 파일 확인

## Step 2 — 태스크 분류 (Opus / Gemini)
CURRENT.md의 Next Tasks를 분류하고 `.context/GEMINI_TASKS.md` 갱신.

**🔵 Opus (고난이도):** 아키텍처 설계, 복잡한 리팩토링, 멀티파일 연쇄, 보안, 신규 핵심 기능, 디버깅(원인 불명), 오케스트레이션, 성능 최적화
**🟡 Gemini (위임):** 문서/README, CSS/스타일, 설정 파일, 테스트 추가, 단순 CRUD, 번역, 린팅, 마이너 버그(원인 명확), 리서치

## Step 3 — 실행 모드 + 모델 결정
최우선 Opus 태스크를 분석:

```
에이전트 1-2 + 독립     → 🟢 단일 터미널
에이전트 3-5 + 파일 분리 → 🟡 A-Team 오케스트레이션
에이전트 5+ / 대규모     → 🔴 멀티터미널 디스패치
설계 결정 / 옵션 비교    → 🟣 MoA 모드
```

**모델 추천** (현재 세션 모델과 다르면 안내):
- 아키텍처/설계 결정 → `opus` 권장
- 구현/리팩토링 → `sonnet` 권장
- 리서치/문서 → `haiku` 권장 (또는 Gemini 위임)
- 현재 모델이 적합하지 않으면: "이 태스크는 [모델] 추천. `/model [모델]`로 전환하세요."

**판정 출력**:
- 🟢 → 즉시 진행
- 🟡 → "A-Team 오케스트레이션 추천. 진행?" → orchestrator 호출
- 🔴 → "멀티터미널 디스패치 추천. 진행?" → orchestrator + dispatch.sh
- 🟣 → "MoA 모드 추천. 진행?" → MoA 활성화

## Step 3.5 — Ralph Loop 야간 태스크 제안
CURRENT.md의 Next Tasks 중 **기계 검증 가능한** 항목을 골라 야간 Ralph Loop 후보로 제안.

**선정 기준:**
- `--check` 명령을 만들 수 있는가? (빌드, 테스트, 린트 등)
- 단독 반복으로 완료 가능한가? (다른 작업에 의존 X)
- 별도 브랜치에서 안전하게 돌릴 수 있는가?

**출력 형식:**
```
🌙 오늘 밤 Ralph Loop 후보:
  1. "[태스크]" --check "[cmd]" --model [모델] --max [N]
  2. "[태스크]" --check "[cmd]" --model [모델] --max [N]
  돌릴까요? (번호 선택 or 패스)
```

사용자가 선택하면 `/ralph start` 또는 `/re pipeline`으로 등록.
패스하면 야간에 Research Mode만 실행됨.

## Step 3.7 — Auto Mode 활성화 안내
현재 퍼미션 모드를 확인하고 auto mode 전환을 안내:
- **auto mode 사용 가능**: "🔓 Auto mode 활성 — 분류기가 안전한 액션 자동 승인"
- **미사용 시**: "`Shift+Tab`으로 auto mode 전환 권장 (승인 피로↓ + 안전장치 유지)"
- **자율 데몬**(Ralph/Research): auto mode 자동 적용 (bypassPermissions 폴백)

> **주의**: 프로덕션 배포, force push, IAM 변경은 auto mode에서도 차단됨.
> `CLAUDE_PERMISSION_MODE=bypassPermissions` 환경변수로 오버라이드 가능.

## Step 4 — 실행
브리핑: "마지막 [X] 상태. Opus [N]개 / Gemini [M]개. [모드] + [모델] + [퍼미션]. 시작."

**오늘 관련 명령어** — Step 2 분류 결과 기반, 해당 줄만 출력 (없으면 전체 생략):
- 구현·리팩토링 Opus 있음 → `/tdd` → `/craft` → `/ship`
- 설계·아이디어 검토 → `/blueprint` → `/plan-eng` → `/office-hours`
- 리뷰·머지 예정 → `/review` → `/adversarial` → `/ship`
- 품질·보안 점검 → `/cso` → `/qa` → `/land`
- 분석·인사이트 필요 → `/insights` → `/dashboard` → `/retro`
- 최적화·유지보수 → `/optimize` → `/doc-sync` → `/improve`
- 야간·장기 자율 → `/zzz` → `/ralph` → `/re`
- 컨텍스트 이동 → `/rc` → `/handoff` → `/pickup`

전체 목록 보기: `ls ~/.claude/commands/` | 카테고리별 참조: `docs/commands/CHEATSHEET.md`

- **Opus 태스크**: 선택된 모드로 즉시 실행
- **Gemini 태스크**: GEMINI_TASKS.md에 기록만. 토큰 소진 시 Gemini가 이어받음
- 리서치 노트 적용 원하면 해당 태스크 우선
- **디스패치/Ralph**: auto mode가 기본 (분류기 기반 안전 실행)

## 자율 작업 원칙
- 안전한 탐색/읽기는 승인 없이 진행
- [분석 → 수정 → 검증] 한 번에 묶어 실행
- 실패 시 원인 파악 후 재시도 (최대 2회), 모호한 부분만 최소 질문
- auto mode 폴백: 분류기 3회 연속 차단 시 수동 승인으로 에스컬레이션
