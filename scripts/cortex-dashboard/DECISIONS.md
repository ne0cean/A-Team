# Cortex Dashboard — Intentional Design Decisions

> AI 에이전트 필독: 이 파일은 **편집 전 반드시** 읽어야 한다.
> 항목들은 누락이 아닌 **의도적 결정**이다. 복원하거나 "개선"으로 제안하는 것을 금지한다.

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

### 5. Workout Bar
- **함수**: `renderWorkoutBar()`, `toggleWorkout(part)` — `app.js:855`
- **칩 색상**: 전면/측면/후면 = `#58a6ff`(파랑), 등/가슴 = `#56d364`(초록). 두 그룹 사이 6px 이격
- **데이터**: `todayMonthData` 기반 (보는 월 아닌 오늘 날짜 월)
- **저장**: `/api/workout` 엔드포인트 (월 save와 분리)

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
- Last updated: 2026-06-01 (Feature Registry 추가, auth 체크 제거 반영, Bug fixes A1-A4, Arrow nav, Frame inline edit, Routine bleeding filter)
