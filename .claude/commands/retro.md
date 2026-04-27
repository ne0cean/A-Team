# /retro — 엔지니어링 회고 (Parallel-Consolidate)

git 히스토리와 세션 로그를 4개 분석 차원에서 **병렬**로 분석하고 중복을 제거해 회고 보고서를 생성한다. 역사 스냅샷을 `.context/retros/`에 저장해 트렌드 비교가 가능하다.

> **패턴**: jangpm-meta-skills/reflect 에서 차용한 **Parallel Analysis → Duplicate Checker → Dynamic Options** (IMP-20260415-01).
> 4 Agent tool call 을 한 응답에 동시 호출 → consolidator 에이전트로 dedup → 비어있지 않은 차원만 출력에 포함.

## 호출 방법
- `/retro` — 기본 7일
- `/retro 14d` — 14일
- `/retro 30d` — 30일
- `/retro compare` — 현재 기간 vs 직전 동일 기간 비교

---

## Phase 1 — 기간 결정 + **Raw 데이터 사전 추출**

```bash
PERIOD="${1:-7d}"  # 7d / 14d / 30d / compare

case "$PERIOD" in
  7d) SINCE="7 days ago" ;;
  14d) SINCE="14 days ago" ;;
  30d) SINCE="30 days ago" ;;
  *) SINCE="7 days ago" ;;
esac

# ⚠️ 핵심 (2026-04-27 IMP-01 자기-검증 결과 추가):
# researcher 서브에이전트는 read-only — Bash 도구 없음. git 명령을 prompt 에
# 그냥 적어놓으면 에이전트가 실행 못 하고 'BLOCKED' 또는 추측 응답.
# 호출자(retro 사용 Claude)가 **여기서 미리 git 데이터를 추출**해 4개 에이전트
# prompt 에 raw 데이터를 직접 주입해야 함.

# 호출자가 사전 실행해 변수에 담을 데이터 (Phase 2A 각 prompt 에 inline 주입):
git log --since="$SINCE" --oneline --shortstat                     # → COMMIT_STATS_RAW
git log --since="$SINCE" --pretty=format:'%ai'                     # → SESSION_TIMESTAMPS
git log --since="$SINCE" --name-only --format='' | sort | uniq -c | sort -rn | head -20  # → HOTSPOT_RAW
git log --since="$SINCE" --pretty=format:'%ae'                     # → AUTHORS_RAW
git log --since="$SINCE" --pretty=format:'%H%n%s%n%b%n---'         # → COMMIT_BODIES (Co-Authored-By 추출용)
cat .context/SESSIONS.md 2>/dev/null | head -100                   # → SESSIONS_NOTES (있으면)
cat GEMINI_TASKS.md 2>/dev/null | head -30                         # → AI_TASKS (있으면)
```

---

## Phase 2A — 4개 분석 차원 **동시 호출**

**핵심**: 4 Agent tool call 을 **단일 응답**에 동시 발행. 순차 호출 금지 (이전 sequential 버전 대비 4배 wall-clock 단축).

각 에이전트는 `researcher` 서브에이전트로 호출. **모든 git 데이터는 Phase 1 에서 추출한 raw 텍스트를 prompt 안에 직접 inline 으로 박을 것**. 에이전트에 'git 명령을 실행하라' 식 지시 금지 (실행 못 함, 검증 2026-04-27).

### 차원 A1 — commit-stats
```
Agent({ subagent_type: 'researcher', prompt:
  "다음 raw 커밋 데이터를 분석해 통계를 추출.

  === COMMIT_STATS_RAW (git log --oneline --shortstat) ===
  {{ Phase 1 의 COMMIT_STATS_RAW 텍스트 inline }}

  추출:
  1. 커밋 수 (총 수)
  2. 변경 라인 수 (insertions/deletions 합계 — shortstat 합산)
  3. 커밋 유형 분포 (feat/fix/refactor/docs/test/chore/perf 비율 — `:` 앞 prefix 카운트)
  4. 가장 큰 커밋 Top 3 (라인 수 기준 — files changed × |+ - -| 합산)
  5. 컨벤션 위반 (no-prefix 커밋, vague messages 'wip', 'misc' 등)

  출력 200 단어 이하, 숫자 우선. 입력 데이터 외 git 실행 금지 (도구 없음)." })
```

### 차원 A2 — session-pattern
```
Agent({ subagent_type: 'researcher', prompt:
  "다음 raw 데이터로 세션 패턴 분석.

  === SESSION_TIMESTAMPS (git log --pretty=format:'%ai', 정렬됨) ===
  {{ Phase 1 의 SESSION_TIMESTAMPS 텍스트 inline }}

  === SESSIONS_NOTES (.context/SESSIONS.md head 100, 있으면) ===
  {{ Phase 1 의 SESSIONS_NOTES inline 또는 'NO_DATA' }}

  추출:
  1. 세션 수 (인접 타임스탬프 차이 ≥ 45min = 세션 구분)
  2. 세션 유형 분포: 깊은 집중(2h+) / 일반(30m~2h) / 마이크로(<30m)
  3. 생산성 피크 시간대 (커밋 시간 분포 — 시간대별 카운트)
  4. 가장 긴 단일 세션 (시작·끝·duration)
  5. 무 커밋 시간대 (가장 큰 gap)

  출력 200 단어 이하. SESSIONS_NOTES 가 NO_DATA 면 git 타임스탬프만 활용.
  입력 데이터 외 외부 명령 실행 금지." })
```

### 차원 A3 — hotspot
```
Agent({ subagent_type: 'researcher', prompt:
  "다음 raw 빈도 데이터로 핫스팟 분석.

  === HOTSPOT_RAW (count + filepath, 빈도 내림차순 top 20) ===
  {{ Phase 1 의 HOTSPOT_RAW 텍스트 inline }}

  추출:
  1. 변경 빈도 Top 10 파일 + 변경 횟수
  2. 위험 신호 (하나의 파일이 전체 변경의 30%+ 차지 시 명시)
  3. churn 패턴 (같은 파일이 5+ 커밋 반복 — 재작업 신호)
  4. 디렉토리 단위 분포 (lib/ scripts/ governance/ .claude/ test/ .context/ 비율)
  5. 핫스팟 분류 — 의도된 (CURRENT.md 같은 메타 파일) vs 위험 (lib/ 안정성 신호)

  출력 200 단어 이하, 파일경로 명시.
  입력 데이터 외 외부 명령 실행 금지." })
```

### 차원 A4 — contributor + 모드
```
Agent({ subagent_type: 'researcher', prompt:
  "다음 raw 데이터로 기여자 + 모드 분석.

  === AUTHORS_RAW (git log --pretty=format:'%ae') ===
  {{ Phase 1 의 AUTHORS_RAW inline }}

  === COMMIT_BODIES (Co-Authored-By 추출용, --- 로 구분) ===
  {{ Phase 1 의 COMMIT_BODIES inline (대용량이면 Co-Authored-By 라인만 추출 후 inject) }}

  === AI_TASKS (GEMINI_TASKS.md 있으면) ===
  {{ Phase 1 의 AI_TASKS inline 또는 'NO_DATA' }}

  추출:
  1. solo (단일 author) vs collaborative (≥2 author) 판정
  2. solo + AI 페어 — Co-Authored-By 비율 명시 (X/Y 커밋, %). solo 단순 표기 금지.
  3. solo 면 자기 분석: 잘한 점 (커밋 SHA 인용) + 성장 기회 (레벨업, 비판 금지)
  4. collaborative 면 author 별 커밋 수·주요 영역
  5. AI 모델 위임 가능성 (AI_TASKS 있으면 Opus 만 vs 위임 가능 비율)

  출력 250 단어 이하.
  입력 데이터 외 외부 명령 실행 금지." })
```

→ **단일 응답에 4개 Agent tool call 동시 발행** (반드시 parallel, sequential 금지).

---

## Phase 2B — Consolidator (dedup)

4 결과를 받아 1개 dedup 에이전트에 전달:

```
Agent({ subagent_type: 'researcher', prompt:
  "다음 4개 분석 결과에서 중복/충돌을 제거하고 통합 회고 데이터를 생성.

  === A1 (commit-stats) ===
  {{ A1 결과 }}

  === A2 (session-pattern) ===
  {{ A2 결과 }}

  === A3 (hotspot) ===
  {{ A3 결과 }}

  === A4 (contributor) ===
  {{ A4 결과 }}

  작업:
  1. 중복 (예: A1 의 'feat 비율' 과 A4 의 '기여자별 작업 영역' 이 같은 사실 다른 각도)
     → 가장 정량적인 표현 1개 유지
  2. 충돌 (예: 두 에이전트가 다른 숫자 보고)
     → 원본 git 명령으로 검증, 정답 선택, 충돌 사실 기록
  3. 비어있는 차원 (예: SESSIONS.md 부재로 A2 비어있음)
     → 'NO_DATA' 마커. 출력에서 해당 카테고리 제외 신호.
  4. cross-pattern 발견 (예: A1 의 'fix 비율 60%' + A3 의 'cost-tracker.ts 5번 변경' = 'cost-tracker 안정화 중')
     → 'cross-insight' 항목으로 추가

  출력 (JSON):
  {
    'commit_stats': {...},     // A1 정제
    'session_pattern': {...},  // A2 정제 또는 'NO_DATA'
    'hotspot': {...},          // A3 정제
    'contributor': {...},      // A4 정제
    'cross_insights': [...],   // 새 발견
    'conflicts': [...]         // 해결된 충돌 기록 (감사용)
  }" })
```

---

## Phase 3 — 출력 (Dynamic Options)

consolidator JSON 받아 출력 생성. **`NO_DATA` 카테고리는 섹션 자체 생략** (jangpm reflect 의 Dynamic Options 패턴).

```
## 📊 [N]일 회고 — [시작일] ~ [종료일]

### 한 줄 요약
[cross_insights 의 가장 의미 있는 1건 또는 commit_stats 의 핵심]

### 주요 성과
- [commit_stats Top 3 + 큰 커밋]

### 활동 지표
- 커밋: [N]개 | 변경: +[N]/-[N] 라인
- 세션: (session_pattern 이 NO_DATA 면 이 라인 생략)
- 핫스팟: (hotspot Top 3)

### 기여자 분석
[contributor.mode 가 solo 면 자기 분석 / collaborative 면 팀 분석]

### Cross Insights
[consolidator 가 발견한 cross_insights — 단일 차원에서 안 보이는 패턴]

### 개선 기회
[consolidator 의 추천. 비판 금지, 레벨업 관점]

### 다음 주 포커스
[CURRENT.md Next Tasks 와 연계]
```

`compare` 모드면 위 보고서를 두 번 (현재/직전) 생성 후 delta 표.

---

## Phase 4 — 스냅샷 저장
```bash
mkdir -p .context/retros/
DATE=$(date +%Y-%m-%d)
# 위 출력을 .context/retros/${DATE}.md 에 저장
# compare 모드면 .context/retros/${DATE}-compare.md
```

---

## 원칙

1. **모든 관찰은 실제 git/SESSIONS 데이터 기반** — 추측 금지
2. **비판 → 레벨업 관점** — 솔로 모드에서 자기 비판 방지
3. **NO_DATA 차원은 출력 생략** — jangpm dynamic options 패턴
4. **4 Agent tool call 단일 응답에 동시 발행** — sequential 금지 (성능 4x)
5. **dedup 거치지 않은 raw 4 결과 출력 금지** — 중복/충돌 노출 방지

---

## 변경 이력

- 2026-04-26 — IMP-20260415-01 적용. 6개 sequential 분석 → 4 parallel + 1 consolidator 패턴 (jangpm/reflect 차용)
- 2026-04-27 — Phase 1 Raw 데이터 사전 추출 강제. IMP-01 자기-검증 (.context/retros/2026-04-27.md) 결과 researcher 서브에이전트가 git 명령 실행 못함이 발견됨. Phase 2A 의 에이전트들은 이제 inline raw text 만 분석.
