# OneNote → Cortex HTML 마이그레이션 스펙

> **가이드 목적**: 모든 OneNote 문서를 Cortex HTML로 마이그레이션하는 기준 포맷.
> 이 문서가 SSOT. 편집 전 반드시 읽을 것.
>
> 핵심 파일:
> - `scripts/migrate-onenote-html.mjs` — 마이그레이션 스크립트
> - `scripts/cortex-dashboard/templates/board-template.html` — 무드보드 인터랙티브 템플릿
> - `scripts/verify-ui.mjs` — Playwright UI 검증 (사용자 보고 전 필수 실행)

---

## 문서 유형별 렌더링 전략

### 소스 우선순위

같은 .md 파일에 `.onenote.html`(Graph API raw HTML)이 존재하면 **항상 onenote.html 사용**. .md 본문은 무시.

### 3-Type 아키텍처 (detectPageType)

| Type | 조건 | 렌더링 방식 | 진입점 |
|------|------|------------|--------|
| **A — visionboard** | `data-absolute-enabled="true"` + `<table>` 안에 `<img>` | Board mode (interactive) + 테이블 이미지 컬럼 추출 | `extractTableImageCards()` → `board-template.html` |
| **B — twilight** | `data-absolute-enabled="true"` + 이미지 테이블 없음 | Board mode (interactive) + flow 기반 파싱 | `extractBoardCards()` → `board-template.html` |
| **C — doc** | `data-absolute-enabled` 없음 OR `docMode: true` | Linear doc (absolute 포지셔닝 제거) | 인라인 HTML 템플릿 |

### docMode 강제 오버라이드

`SECTION_MAP`에서 `docMode: true` 설정 시 HTML 내용과 무관하게 Type C (doc)로 강제 처리.

```js
// SECTION_MAP 예시
{ src: '3_Archive/skill', dst: 'archive/skill', docMode: true }
```

**docMode 적용 기준**: `data-absolute-enabled` 페이지지만 보드로 쓰지 않고 문서로 읽는 섹션.

### Markdown 전용 경로 (onenote.html 없을 때)

`.onenote.html` 없을 때만 사용. `extractBlocks()` → text/image/table 카드 → `generateHtml()` 인라인 HTML.

---

## Board Mode 필수 기능 목록 (전체 요건)

### 레이아웃
- **픽셀단위 좌표**: OneNote `position:absolute;left:Xpx;top:Ypx` → 그대로 card.x, card.y 사용
- **flow 기반 내부 좌표**: `<br>` 구분자로 이미지/텍스트 row 분리. 같은 row → 나란히(x 누적), 다른 row → 세로 쌓기
- **3열 그리드 금지**: 과거 extractBoardCards() 방식. 다시 도입 금지

### 카드 인터랙션
- **이미지 드래그/이동**: mousedown → mousemove → mouseup (card.x, card.y 갱신 + 저장)
- **이미지 리사이즈**: `.resize-handle` (우하단 코너), mousedown → mousemove로 card.w 갱신
- **Ctrl+Z 실행취소**: `snapshot()` → `undo()`, 최대 50단계
- **Shift+드래그**: 그리드 스냅 (20px), 인접 카드 밀기(`pushCards`)

### 텍스트 편집
- **contenteditable 텍스트 카드**: `card.type === 'text'`, `text.innerHTML` = `card.content`
- **floating 포맷 툴바**: 텍스트 선택 시 자동 표시 (`selectionchange` 감지)
  - B(굵게) / I(기울임) / U(밑줄) / 🔗(링크 삽입) / ✂(링크 제거)
  - 링크 삽입: `prompt('URL')` → `execCommand('createLink')` → `target="_blank"`
  - 버튼 mousedown에서 `preventDefault()` (blur 방지 필수)

### 표
- **표 삽입**: `+ 표` 버튼 → 열/행 수 입력 → `card.type === 'table'`
- **표 구조**: `card.rows` 2D 배열, 첫 행 = `<th>` 헤더
- **셀 편집**: 각 `<td>` contenteditable, blur 시 `card.rows[ri][ci]` 갱신 + 저장
- **행/열 추가**: `+ 행` / `+ 열` 버튼 (카드 하단)

### 이미지 캡션
- **캡션 소스**: OneNote `<img alt="...">` → `extractBoardCards()` → `card.caption`
- **필터 기준** (`isMeaningfulAlt()`): 한국어 포함 OR 20자 이상 깔끔한 ASCII
- **렌더링**: 이미지 아래 `font-size:11px;color:#8b949e` div

### 저장 / 상태
- **자동 저장**: 30초 인터벌 + 카드 변경 즉시
- **저장 위치**: `localStorage[SAVE_KEY]` + `localStorage[SAVE_KEY + ':hash']`
- **캐시 무효화**: 재생성 시 `CONTENT_HASH` (DEFAULT_CARDS의 md5 앞 8자리) 변경 → 구 캐시 자동 리셋
- **초기화 버튼**: `↺ 초기화` (빨간색) → localStorage 삭제 + DEFAULT_CARDS 복원

### 툴바 전체 구성
```
↩ 실행취소 | + 텍스트 | + 이미지 | + 이미지 URL | + 표 | 💾 저장 | 📤 내보내기 | ↺ 재배치 | ↺ 초기화(빨강)
```

---

## 마이그레이션 스크립트 핵심 규칙

### parseFrontmatter
- Windows CRLF 파일: `content.replace(/\r\n/g, '\n')` 선처리 필수
- 미처리 시: `meta.modified = undefined` → `formatDate(undefined)` → "Invalid Date"

### formatDate
- OneNote ISO 날짜에 7자리 소수초 가능: `2024-08-04T16:16:00.0000000`
- `.replace(/(\.\d{3})\d+/, '$1')` 로 3자리로 truncate 후 파싱

### extractBoardCards (board mode only)
- Pass 1: 독립 absolute `<img>` → 정확한 left/top 좌표로 image card 생성
- Pass 2: absolute `<div>` → `<table>` 포함 여부 먼저 확인
  - `<table>` 포함 → `type:'html'` card (html 통째 보존, parseFlowContent 금지)
  - `<table>` 없음 → `parseFlowContent()` 호출
- 중복 제거: Pass 1에서 잡힌 이미지는 Pass 2에서 skip

### parseFlowContent (flow 기반)
- `<br>` 구분자로 row 분리
- 같은 row 이미지 → x 누적 (나란히)
- 다른 row → y 누적 (세로)
- 텍스트 row → text card, `estimateTextHeight()` 기반 y 증가

### 이미지 src 처리
- Graph API URL → `graphUrlToFilename()` → md5 hash 기반 `.png` 파일명
- `__ATTACHMENT__` placeholder → `IMG_BASE + filename` (상대경로)

### parseFlowContent() — 연속 텍스트 row 병합

- 텍스트 전용 div 안의 `<br>`은 시각적 공백일 뿐 — 연속된 텍스트 row는 하나의 text 카드로 병합
- 이미지 row가 나타나면 `lastTextCard = null` → 이후 텍스트는 별개 카드
- 이미지 없는 연속 텍스트: `lastTextCard.content += '\n' + content` 병합 + curY 재계산

### extractBoardCards() — html 카드 너비

- html 카드는 card.w(=divW)로 고정하지 않음 → board-template에서 `min-width: card.w` 사용
- OneNote 절대 div의 stated width는 표 내용이 초과해도 클리핑 없이 렌더됨
- 표가 있는 html 카드: 카드 컨테이너를 `width: auto; min-width: card.w` 로 렌더 → 표가 필요한 만큼 확장

### loadBoard() — autoLayout 조건부 호출
- OneNote 좌표 있는 카드(`c.x !== undefined && c.y !== undefined`)가 하나라도 있으면 `autoLayout()` 호출 금지
- `renderCards()` 먼저 호출 후 `autoLayout()` 판단 (DOM 없으면 배치 불가)
- 로직:
  ```javascript
  renderCards();
  const hasCoords = cards.some(c => c.x !== undefined && c.y !== undefined);
  if (!hasCoords) autoLayout();
  ```

### renderCards() — html 카드 타입
- `card.type === 'html'`: `card.html.replace(/__ATTACHMENT__/g, IMG_BASE)` 인라인 렌더
- 표 셀: `border: 1px solid #444`, `padding: 4px 6px`
- 이미지: `maxWidth: 100%`, `height: auto`
- 링크: `target: '_blank'`

---

## UI 검증 의무 (사용자 보고 전 필수)

```bash
# 재생성 후 반드시 실행
node scripts/verify-ui.mjs "http://localhost:7700/<path>" --selector ".card" --min-count 5

# 스크린샷 Read로 시각 확인
# PASS + 스크린샷 확인 둘 다 통과해야 사용자 보고
```

- `.verify-screenshots/` 폴더에 timestamp 기반 저장
- 헤드리스 브라우저 = 캐시 없음 → 항상 기본 상태 검증
- **주의**: 헤드리스 통과 ≠ 사용자 브라우저 통과 (localStorage 캐시 차이)
  - CONTENT_HASH 무효화로 자동 해결됨

---

## 재생성 명령어

```bash
# 특정 섹션만
node scripts/migrate-onenote-html.mjs --apply --section "Zeroing"

# 전체
node scripts/migrate-onenote-html.mjs --apply

# 검증
node scripts/verify-ui.mjs "http://localhost:7700/cortex/2/zeroing/Twilight%20Mood%20board.html" --selector ".card" --min-count 5
```

---

## 금지 사항

| 금지 | 대신 |
|------|------|
| 3열 그리드 이미지 배치 | flow 기반 parseFlowContent() |
| parseFrontmatter CRLF 미처리 | replace(/\r\n/g, '\n') 선처리 |
| localStorage 버전 관리 없이 재생성 | CONTENT_HASH 필수 |
| 사용자에게 보고 전 verify-ui.mjs 미실행 | 반드시 PASS 확인 후 보고 |
| board-template에서 execCommand 버튼에 click 대신 mousedown | mousedown + preventDefault (blur 방지) |
| 표 포함 div를 parseFlowContent()로 처리 | `<table>` 감지 시 html 카드로 통째 보존 |
| loadBoard에서 autoLayout() 무조건 호출 | x,y 좌표 없는 경우에만 autoLayout() 호출 |
| 텍스트 div 안의 `<br>`를 카드 경계로 처리 | 연속 텍스트 row는 lastTextCard에 병합 |
| html 카드에 `width: card.w` 고정 | `min-width: card.w` (표가 자동 확장) |
| 이미지와 같은 `<br>` 블록 내 텍스트 버림 | `firstImgBefore` 텍스트 카드 생성 후 curY 증가 |
| html 카드 td 편집 불가 | `dblclick` → `contentEditable` + blur 시 역치환 저장 |

---

**Created**: 2026-06-08
**Last updated**: 2026-06-13 (3-type 아키텍처 A/B/C + detectPageType + docMode 강제 오버라이드 + 소스 우선순위 반영)
