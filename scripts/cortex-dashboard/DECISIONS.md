# Cortex Dashboard — Intentional Design Decisions

> AI 에이전트 필독: 이 파일의 항목들은 누락이 아닌 **의도적 결정**이다.
> 복원하거나 "개선"으로 제안하는 것을 금지한다.

---

## INTENTIONALLY REMOVED (복원 금지 목록)

| 항목 | 제거 날짜 | 이유 | 복원 금지 |
|------|----------|------|----------|
| `cursor: grab` / `cursor: grabbing` CSS | 2026-05 | 드래그 UX 완전 제거 결정. 항목은 long-press 300ms 후에만 grab 상태 | YES |
| Sidebar auto-open on desktop | 2026-05 | 사용자 명시적 요청. 사이드바는 항상 닫힌 상태로 시작 | YES |
| `scrollbar-width: auto` (항상 보이는 스크롤바) | 2026-05 | 사용자가 명시적으로 제거. 기본 hidden, hover 시만 2px 반투명으로 표시 | YES |
| Vision text in `monthData.goals.goal` | 2026-05 | `standingData.daily_mantra`로 이전. monthData는 fallback 목적으로만 | YES |

---

## INTENTIONAL DESIGN DECISIONS

### 뷰 모드 (IMPORTANT)

- **당월(오늘 날짜 포함 월)**: 기본 뷰 = `This Week` (week mode)
- **타월(다른 월 탐색 시)**: 기본 뷰 = `Full Month` (month mode)
- 월 이동(`prevPeriod`/`nextPeriod`)마다 자동 전환됨
- 사용자가 수동 토글해도 월 이동 시 다시 자동 적용

### 레이아웃 / UX

- **사이드바**: 기본값 닫힘. `toggleSidebar()`로만 열림. `isDesktop()` 자동 열기 없음
- **패널 순서**: Standing Orders → Day Frames (Admin) → Vision & Milestones (Vision은 맨 아래)
- **패널 기본 상태**: `soPanel`, `framesPanel`은 `open` 클래스 포함 (기본 펼침). `visionPanel`은 기본 접힘
- **드래그**: hover 즉시 드래그 금지. `pointerdown` 300ms 유지 후에만 활성화
- **스크롤바**: 기본 `scrollbar-width: none`. hover 시 `width: 2px; background: rgba(255,255,255,0.08)` 반투명 thin 스타일

### 데이터 아키텍처

- **`API = ''`**: 항상 same-origin. 절대 외부 URL로 바꾸지 않음
- **`AUTH` 헤더**: 모든 POST 요청에 필수. `saveStandingData()`를 포함한 모든 write API
- **`todayMonthData` 캐시**: 오늘 날짜 월 데이터를 캐시. 다른 월 탐색 시에도 오늘 날짜 기준 데이터는 항상 `todayMonthData` 사용
- **Vision text SSOT**: `standingData.daily_mantra` (standing-orders API). `monthData.goals.goal`은 레거시 fallback만

### 링크 삽입 방식

- **마크다운 인라인**: `[텍스트](URL)` 형식으로 항목 text 내 특정 단어에 링크 삽입 가능
- `linkify()` 함수가 이를 `<a>` 태그로 렌더링
- `item.url` (항목 전체 URL) 방식은 legacy — 새 링크는 마크다운 방식 사용
- 모바일: `ontouchend` 이벤트로 링크 버튼 처리 (`onclick`만으로는 모바일 터치 누락)

### CSS 규칙

- 헤더 텍스트 영역(`visionText2`): 월 변경과 독립적. `standingData.daily_mantra`에서만 로드
- `workoutBar`: `todayMonthData` 기반. 보는 월이 아닌 오늘 날짜 월에 저장
- 항목 `draggable` 속성: 기본 `false`. long-press 후에만 `true`로 전환

---

## HOW TO MODIFY (수정 시 프로세스)

1. 이 파일을 먼저 읽는다
2. 변경하려는 항목이 "INTENTIONALLY REMOVED"에 있는지 확인
3. 있으면 → 수정 금지. 사용자에게 명시적으로 물어본다
4. 없으면 → 수정 후 이 파일에 결정 사항 추가

---

## VERSION

- Created: 2026-06-01
- Last updated: 2026-06-01
