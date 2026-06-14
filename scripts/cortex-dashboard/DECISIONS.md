# Cortex Dashboard — Intentional Design Decisions

> AI 에이전트 필독: 이 파일은 **편집 전 반드시** 읽어야 한다.
> 항목들은 누락이 아닌 **의도적 결정**이다. 복원하거나 "개선"으로 제안하는 것을 금지한다.

---

## 🚀 배포 절차 (2026-06-04 사고 후 강제화)

```bash
# 반드시 worker/ 에서 --config 명시
cd scripts/cortex-dashboard/worker
npx wrangler deploy --config wrangler.toml

# 배포 후 즉시 검증 (이것까지 해야 "완료")
curl -s -w "\n%{http_code}" "https://cortex.feat-breeze.workers.dev/api/day-frames" | tail -1
# → 반드시 200

# 데이터 무결성 검증 (worker 변경 시 추가 필수)
node scripts/cortex-dashboard/verify-data.mjs --all
# → PASS만 허용. FAIL 시 배포 롤백 후 원인 조사
```

**절대 금지**:
- `npx wrangler deploy` (--config 없이) → parent `wrangler.jsonc` 읽혀 cortex-dashboard worker에 배포됨
- `npx wrangler deploy --name cortex` → worker JS 누락으로 API 전체 404
- root `cortex-dashboard/` 에서 `npx wrangler deploy` → 동일 문제

**UI 변경 시 "완료" 기준**: curl 200 + ui-inspector 에이전트로 화면 실제 확인까지

---

## 🔒 데이터 무결성 아키텍처 (2026-06-08 확정)

### Merge 로직
- **파일**: `worker/src/merge.js` — 순수 함수, D1 의존성 없음
- **테스트**: `worker/src/__tests__/merge.test.js` (18개 케이스)
- **원칙**: ARRAY_FIELDS 하드코딩 화이트리스트 절대 금지
  - 동적 감지: 서버 데이터에서 array-valued 키를 자동 탐지
  - `_` 프리픽스 내부 필드(예: `_dismissed`)는 병합 제외
  - 새 체크리스트 카테고리 추가 시 코드 변경 불필요

### 복구 워크플로우 (오늘 이후 표준)
```bash
# 1. 가용 백업 확인
node scripts/cortex-dashboard/backup-d1.mjs --list

# 2. 내용 확인 (dry-run, D1 변경 없음)
node scripts/cortex-dashboard/backup-d1.mjs --restore YYYY-MM-DD

# 3. 실제 복구 (D1에 PUT)
node scripts/cortex-dashboard/backup-d1.mjs --restore YYYY-MM-DD --apply

# 4. 특정 day/category만 복구
node scripts/cortex-dashboard/backup-d1.mjs --restore-day YYYY-MM-DD <day> [category] --apply
```

**SQL 스크립트 수동 생성 금지** — --apply 플래그로만 복구할 것.

### Worker 수정 시 TDD 의무
- merge 로직 변경 → `npx vitest run` (worker/ 디렉토리에서) GREEN 확인 후 배포
- 새 카테고리 추가 → 테스트 불필요 (동적 감지가 자동 처리)

### Carry-over 로직 (2026-06-13 구조 리팩터링 — 6월→7월 통째 복제 사고 후)
- **순수 함수**: `worker/src/carry.js` `computeCarry()` — 부작용 없음(전역/ensureDay/save 미사용).
  앱은 `public/js/carry.js`(deploy.sh가 worker 소스에서 자동 생성, **직접 편집 금지**)로 로드.
- **테스트**: `worker/src/__tests__/carry.test.js` (12케이스, 멱등성 포함). carry 로직 변경 = 이 테스트 GREEN 필수.
- **렌더는 순수해야 한다**: carry 변이는 `getCatItemsForRender`에서 `persist && owner===monthData.days`
  일 때만 현재월에 기록. **인접월 셀은 표시만, 저장 금지** (이게 cross-month 복제를 막는 핵심).
- **월 정체성 가드**: `save()`는 `monthData.month !== ym()` 이면 차단(프론트), worker는 POST `/api/month`
  에서 `isCrossMonthClobber(data.month, ym)` 시 409 (`worker/src/monthGuard.js`).
- **day 범위**: 모든 day 루프는 `new Date(y, m, 0).getDate()`로 bound. `<= 31` 하드코딩 금지(phantom day 원인).

### 무결성 게이트 = 배포 완료 조건 (마이그레이션 verify 게이트와 동급)
- `verify-data.mjs`가 검사: `.month === key` / day key ∈ [1, daysInMonth] / 카테고리 화이트리스트.
- **`node verify-data.mjs --all` PASS 후에만 "배포 완료" 선언.** FAIL = cross-month 복제 또는 phantom day 신호 → 복구.

---

## ⚠️ PRE-EDIT 필수 체크리스트 (편집 전 매번 실행)

app.js 또는 main.css 편집 전, 아래를 grep으로 검증하고 **모두 존재 확인 후** 편집 시작:

```bash
# app.js 필수 함수
grep -n "parseSoDate\|setSoDate" public/js/app.js          # Standing 날짜 입력
grep -n "showToast" public/js/app.js                       # Toast 알림
grep -n "window.fetch = " public/js/app.js                 # fetch 인터셉터
grep -n "capture: true" public/js/app.js                   # CTRL+S 캡처
grep -n "renderWorkoutBar\|toggleWorkout" public/js/app.js # Workout 바
grep -n "so-date-input" public/css/main.css                # Standing 날짜 input CSS
grep -n "visibility:hidden\|visibility: hidden" public/css/main.css  # del-btn 레이아웃 fix

# worker 필수 로직 (worker/src/index.js 편집 또는 복원 시)
grep -n "Preserve workout" worker/src/index.js             # ⚠️ workout 보존 — 절대 누락 금지
grep -n "!i._frame" worker/src/index.js                    # ⚠️ carry 시 routine 제외
grep -n "saveStandingData\|_version" public/js/app.js      # 409 충돌 처리
```

하나라도 없으면 → **편집/배포 중단, 사용자에게 보고**.

**worker 복원/교체 후 반드시 위 worker 항목 재확인. 원격 버전에는 이 패치들이 없음.**

---

## FEATURE REGISTRY (반드시 존재해야 할 기능 목록)

### 1. Standing Orders 날짜 입력
- **함수**: `parseSoDate(raw)`, `setSoDate(i, raw)` — `app.js:1277~1312`
- **CSS**: `.so-date-input` — `main.css`
- **동작**: Standing 항목 우측 72px 입력칸. `6월 11일` / `6/11` / `6.11` / `6-11` / `11`(당월) 자동 인식 → 해당 날짜 `outcome`에 주입
- **저장**: `standingData.standing[i].date` 문자열
- **다른 월**: 즉시 주입 불가 → 토스트만 표시

### 2. Toast 알림
- **함수**: `showToast(msg)` — `app.js:1782`
- **CSS**: `#toast`, `.toast.show` — `main.css`
- **사용처**: save(), CTRL+S, setSoDate(), Standing 항목 이동 등

### 3. CTRL+S 저장
- **코드**: `document.addEventListener('keydown', ..., { capture: true })` — `app.js` 상단
- **동작**: `e.preventDefault()` → `save()` → `showToast('저장됨')`
- **`capture: true` 필수**: 없으면 브라우저 Save As 다이얼로그가 먼저 가로챔

### 4. fetch 인터셉터
- **코드**: `window.fetch = async (input, init) => {...}` — `app.js:564`
- **동작**: 모든 `/api/` 호출에 자동 auth 헤더 주입. 401 시 토큰 재입력 프롬프트
- **주의**: Worker에서 auth 체크 제거됨 (2026-06-01). 인터셉터는 유지하되 실제 검증은 서버에서 하지 않음

### 5. Workout Bar (EX 바) — STICKY carry-forward (2026-06-14 근본 수정)
- **순수 로직**: `worker/src/workout.js` `resolveCurrentWorkout(log, today)` + `toggleWorkoutPart(parts, part)`. 앱은 `public/js/workout.js`(deploy.sh 자동 생성, **직접 편집 금지**)로 로드. 테스트 `worker/src/__tests__/workout.test.js` (13케이스).
- **함수**: `renderWorkoutBar()`, `toggleWorkout(part)` — `app.js`
- **칩 색상**: 전면/측면/후면 = 파랑, 등/가슴 = 초록. 같은 색 그룹은 라디오(상호배타).
- **⚠️ STICKY 불변식 (절대 원칙)**: EX 바는 날짜별 기록이 아니라 **"한 번 정하면 바꿀 때까지 영구 유지"**. `renderWorkoutBar`는 `workoutLog[오늘]`을 직접 읽지 말 것 — 반드시 `resolveCurrentWorkout`으로 **오늘 키 없으면 가장 최근 선택을 carry-forward**. (날짜별 키만 읽으면 자정 넘어 빈 칸 = "체크 사라짐" 수십 번 재발의 원인.)
- **저장**: `/api/workout-log` (date별 배열, 월 save와 분리). 토글은 carry된 현재값에서 출발 → 오늘 키로 기록.
- **진단 규칙**: "체크 사라진다" 신고 = 저장 코드 보기 전에 GET `/api/workout-log`로 서버 데이터 존재 먼저 확인. 있으면 손실 아님 → 표시 모델(carry-forward) 의심. 상세: memory `lesson_workout_bar_sticky`.

### 6. del-btn hover 레이아웃 고정
- **CSS**: `del-btn`에 `visibility: hidden` / hover 시 `visibility: visible`
- **금지**: `display: none` / `display: inline` — 레이아웃 시프트 발생

### 7b. goToDay data-day 속성
- **코드**: `data-day="${d}"` on `.day-cell` — `app.js renderDayCell`
- **이유**: goToDay()가 `[data-day]` 셀렉터로 해당 날짜로 스크롤. 없으면 항상 실패

### 7c. Arrow 키 아이템 탐색
- **함수**: `handleItemKey` ArrowUp/ArrowDown 핸들러
- **동작**: 같은 day+cat에서 위/아래 인덱스 항목으로 포커스 이동

### 7d. Frame 인라인 편집 + 루틴 bleeding 필터
- **함수**: `editFrameItemFromCalendar(d, cat, idx, newText)` — 달력에서 `_frame` 항목 편집 → 프레임 템플릿 수정 → 오늘~월말 자동 재주입
- **함수**: `toggleEl(id)` — 미래 날짜 루틴 뱃지 토글
- **CSS**: `.frame-group-hdr`, `.frame-group-body`, `.frame-text`
- **렌더 규칙**: 미래 날짜의 `_frame` 항목은 "루틴 N▸" 접힌 뱃지로만 표시 (데이터 유지, 표시만 숨김)

### 7. getMonthlyRecurring() string 가드
- **함수**: `getMonthlyRecurring(d)` — `app.js:303`
- **필수 코드**: `if (typeof text !== 'string') return;` (또는 continue)
- **이유**: `standingData.monthly[ym]` 배열에 object 항목 혼재. 없으면 `.match()` TypeError → render() 크래시 → 스케쥴러 전체 공백

---

## 재발 금지 패턴 (2026-06-08 등록)

### [D-WEEKFIX] This Week 버튼은 항상 오늘 주로 이동
`toggleView()`에서 `viewMode='week'` 전환 시 반드시 `currentWeekStart = getWeekStart(new Date())` 리셋.
navigate 후 남은 currentWeekStart를 그대로 쓰면 14일 버그 재발.

### [D-MONTHLYINJECT] standingData.monthly[ym] 아이템은 사이드바 전용
날짜 prefix 있는 monthly 텍스트(e.g. "11일(목) 코딩...")를 `getMonthlyRecurring()`에서 파싱해
day cell에 주입 금지. 사이드바 스케줄러 전용.
`monthly_recurring` 구조화 데이터({day, text})만 day cell에 허용.

### [D-RENDER-GUARD] render()는 monthData 로드 전 호출 불가
`render()` 진입부에 `if (!monthData) return;` 가드 필수.
`loadFrames()`가 `loadMonth()`보다 먼저 완료되면 monthData=undefined 상태에서 render() 호출 → crash → 검은 화면.
race condition 근본 원인: init()에서 모든 async 함수를 await 없이 호출.

### [D-LOADMONTH-TRYCATCH] loadMonth()는 반드시 try/catch
API 실패 시 showToast 표시 후 return. monthData가 null인 채로 render()까지 도달 금지.

### [D-WORKOUT-ATOMIC] workout 저장은 반드시 atomic /api/workout
`save()`에서 workout strip 확인: `grep -n "Strip workout" public/js/app.js`
worker에서 Preserve workout 확인: `grep -n "Preserve workout" worker/src/index.js`
배포 시 반드시: `cd worker && npx wrangler deploy --config wrangler.toml`

---

## INTENTIONALLY REMOVED (복원 금지 목록)

| 항목 | 제거 날짜 | 이유 | 복원 금지 |
|------|----------|------|----------|
| `cursor: grab` / `cursor: grabbing` CSS | 2026-05 | 드래그 UX 완전 제거 결정. long-press 300ms 후에만 grab 상태 | YES |
| Sidebar auto-open on desktop | 2026-05 | 사용자 명시적 요청. 사이드바는 항상 닫힌 상태로 시작 | YES |
| `scrollbar-width: auto` | 2026-05 | 사용자가 명시적으로 제거. 기본 hidden, hover 시만 2px 반투명 | YES |
| Vision text in `monthData.goals.goal` | 2026-05 | `standingData.vision`으로 이전. monthData는 fallback 목적으로만 | YES |
| Worker auth 체크 (`API_SECRET`) | 2026-06-01 | 개인 도구라 URL 비공개로 충분. API_SECRET 의존 제거 | YES |

---

## INTENTIONAL DESIGN DECISIONS

### 뷰 모드

- **당월(오늘 날짜 포함 월)**: 기본 뷰 = `This Week` (week mode)
- **타월(다른 월 탐색 시)**: 기본 뷰 = `Full Month` (month mode)
- 월 이동(`prevPeriod`/`nextPeriod`)마다 자동 전환됨

### Full-Month 인접월 셀 = 편집 가능 (2026-06-14)

- **Full Month 뷰의 월 경계 주(week)에서 인접월 셀(전월 말일·다음달 초)은 빈 stub이 아니라 전체 내용을 렌더하고 편집 가능**하다. 평소 `opacity:0.5`(dim), 호버 시 `opacity:1`. (`main.css .day-cell.other-month` + `:hover`)
- **owner 토큰 모델**: 셀은 `owner ∈ {cur,prev,next}`를 가지며(`renderMonthView` 셀 빌드 → `renderDayCell`/`renderDayCellContent` → 모든 핸들러로 전달), 편집은 **owner 월**(`prevMonthData`/`nextMonthData`)에 저장된다. `dayCtx(d, owner)` → `{data, ym, year, month}`. `resolveOwnerYm`은 `worker/src/monthUtil.js`(테스트됨, deploy.sh가 `public/js/monthUtil.js` 생성, **직접 편집 금지**).
- **저장 라우팅**: `saveMonthData(data)`가 `data.month`(SSOT) 키로 POST → 워커 `isCrossMonthClobber`가 그대로 통과(가드 약화 아님). `save()` = `saveMonthData(monthData)`. `ensureDay(d, data)`로 owner 데이터 변이.
- **날짜 helper 인자화**: `getEffectiveDayType/getFrameTypeForDay/getDayCatType/getHoliday/getSoEvents/getYearlyEvents/getMonthlyRecurring/getWeeklyRecurring/getCatItemsForRender`는 owner의 `(yr, mo)`를 받는다(기본=전역). 인접월 셀에서 요일/타입 오판 방지.
- **carry는 인접월에서 표시 전용**: `getCatItemsForRender` persist 가드(`persist && owner===monthData.days`) 유지. `toggleItem` d+1 carry, `delItem` 미래 cleanup은 `owner==='cur'`에서만 실행 → cross-month 복제 재발 방지.
- **DOM 충돌 방지**: 셀에 `data-owner`, id는 `new-${owner}-${d}-${cat}`/`notes-${owner}-${d}`/`ft-${owner}-${d}-${cat}`. 네비/검색(`goToDay` 등)은 `[data-owner="cur"]`로 스코프. 아이템 탐색은 owner 셀 스코프(`cellEl(d,owner)`).
- **월 간 이동 미지원**: drag/drop(데스크탑·터치)에서 src/target owner가 다르면 토스트 후 차단(백엔드 move-item이 단일 ym).
- **복원/개선 금지**: 인접월 셀을 다시 빈 stub으로 되돌리거나 carry를 인접월에 persist하지 말 것.

### 레이아웃 / UX

- **사이드바**: 기본값 닫힘. `toggleSidebar()`로만 열림. `isDesktop()` 자동 열기 없음
- **패널 순서**: Standing Orders → Day Frames (Admin) → Vision & Milestones
- **패널 기본 상태**: `soPanel`, `framesPanel`은 `open` 기본. `visionPanel`은 기본 접힘
- **드래그**: hover 즉시 드래그 금지. `pointerdown` 300ms 유지 후에만 활성화
- **스크롤바**: 기본 `scrollbar-width: none`. hover 시 `width: 2px; background: rgba(255,255,255,0.08)`

### 데이터 아키텍처

- **`API = ''`**: 항상 same-origin. 절대 외부 URL로 바꾸지 않음
- **`todayMonthData` 캐시**: 오늘 날짜 월 데이터 캐시. 다른 월 탐색 시에도 오늘 기준 데이터는 항상 `todayMonthData` 사용
- **Vision text SSOT**: `standingData.vision`. `monthData.goals.goal`은 fallback만
- **`daily_mantra` 폐기**: `standingData.vision`이 SSOT. `daily_mantra` 부활 금지

### ⚠️ 데이터 무결성 원칙 (절대 위반 금지)

> 사용자가 입력한 모든 변경사항은 아무리 작아도 즉시 반영되어야 하며, 사용자 허가 없이 절대 삭제/유실되어선 안 된다.

**서버 저장 규칙**:
- **`/api/month` POST**: `INSERT OR REPLACE` 전에 기존 `workout` 필드 보존 (클라이언트가 strip하기 때문)
- **`/api/standing-orders` POST**: full replace 금지. `{ ...existing, ...incoming }` merge 후 저장
- **`/api/day-frames` POST**: 동일. merge 방식
- **새 KV 엔드포인트 추가 시**: 반드시 merge 방식으로 구현. full replace는 허용하지 않음

**절대 금지**:
- `setKey(key, data)` 직접 호출 (merge 없이) — 항상 merge 선행
- 클라이언트에서 일부 필드만 전송하는 POST (서버 merge 없으면 data loss)
- 필드명 변경 시 마이그레이션 없이 코드만 수정

### Recurring Items — Outcome 카테고리 귀속

- **모든 recurring items (yearly/monthly/weekly)는 Out(come) 카테고리 안에 렌더링** — 별도 블록 표시 금지
- 컬러 코딩 유지: 노랑=yearly, 보라=monthly, 회색=weekly
- `standingData.monthly[ym]` string 항목도 파싱해서 day cell 주입 (`N~M일` prefix 제거 후 표시)

### monthly[] 데이터 타입 혼재

- `standingData.monthly[ym]` 배열은 **string과 object가 혼재** 가능
- string: `"N일 이벤트명"` — day cell 주입 대상
- object: `{text, category}` — day-triggered items → **주입 금지, skip**
- `getMonthlyRecurring()`에서 반드시 `typeof text !== 'string'` 체크로 skip

### Auth 구조

- **Worker**: auth 체크 없음 (2026-06-01 제거). URL 비공개로 접근 제어
- **클라이언트 `authHeaders()`**: 유지 (레거시 + 미래 재활성화 가능). localStorage → sessionStorage → window.CORTEX_AUTH_TOKEN 순
- **`window.fetch` 인터셉터**: 유지. 현재는 auth 헤더 주입하지만 서버에서 검증 안 함

### 링크 삽입 방식

- **마크다운 인라인**: `[텍스트](URL)` 형식으로 항목 text 내 특정 단어에 링크 삽입
- `linkify()` 함수가 `<a>` 태그로 렌더링
- `item.url` (항목 전체 URL) 방식은 legacy

### SW 캐싱 전략

- **캐시 버전**: `cortex-v9` (`public/sw.js`)
- **SHELL (stale-while-revalidate)**: `/`, `/css/main.css`, `/favicon.svg`, `/manifest.json`
- **Network-first**: `/api/*`, `/js/app.js` — 항상 최신 코드 로드
- **버전 변경 시**: sw.js의 `CACHE` 상수 bump + `wrangler deploy`

---

## HOW TO MODIFY (수정 시 프로세스)

1. **이 파일을 먼저 읽는다**
2. **PRE-EDIT 체크리스트 실행** (상단 grep 명령어)
3. 변경하려는 항목이 "INTENTIONALLY REMOVED"에 있는지 확인
4. 있으면 → 수정 금지. 사용자에게 명시적으로 물어본다
5. 없으면 → 수정 후 이 파일 FEATURE REGISTRY / DECISIONS 섹션 갱신

---

## VERSION

- Created: 2026-06-01
- Last updated: 2026-06-02 (QA 1차 수정: EX XOR, default day types, carry-over OUTCOME only, 진척률 제거, 날짜컬럼, 공휴일 접힘, linkify SO, CTRL+K fix, 이달메모, 정렬, 구분선, 6PILLARS sync, italic 제거, cell scroll, ONETHING CTRL+K, arrow nav cross-cat)
