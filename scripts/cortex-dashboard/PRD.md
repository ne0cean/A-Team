# Cortex Ritual Dashboard — PRD

**URL**: https://cortex.feat-breeze.workers.dev  
**Stack**: Cloudflare Workers + D1 (SQLite) + Vanilla JS SPA  
**Last updated**: 2026-05-29

---

## 1. 제품 개요

개인 일정·할 일·루틴을 하나의 월 달력 UI에서 관리하는 개인용 대시보드.
PC/모바일 브라우저에서 동일한 URL로 접근하며, D1(Cloudflare SQLite)을 공유 저장소로 사용한다.

---

## 2. 핵심 기능

### 2.1 월/주 뷰 (Calendar)
- **Month View** (기본): 월 전체 날짜를 그리드로 표시
- **Week View**: 현재 주 7일을 넓은 컬럼으로 표시
- 뷰 전환: 우상단 토글 버튼

### 2.2 Day Cell — 카테고리
각 날짜 칸에 4개 카테고리:

| 카테고리 | 키 | 설명 |
|---|---|---|
| Ritual | `ritual` | 아침/저녁 루틴 |
| Input | `input` | 정보 입력·메모 |
| Work | `work` | 업무 할 일 |
| Outcome | `outcome` | 결과·완료 |

### 2.3 항목 편집
- **인라인 편집**: contenteditable span — blur 시 자동 저장
- **Enter 분기**: 커서 위치에서 텍스트 분리 → 위/아래 2개 항목 생성
- **Backspace 삭제**: 빈 항목에서 Backspace → 항목 삭제 후 인접 항목으로 포커스 이동
- **체크박스**: 항목 완료 표시 (done 상태)
- **링크**: 항목에 URL 첨부 (긴 press 또는 링크 버튼)
- **드래그 앤 드롭**: 같은 날짜 내 항목 순서 변경, 날짜 간 이동

### 2.4 Day Type 배지
- `BLOCK` / `FLOW` / `HF` / `휴가` 4가지
- 날짜 클릭 사이클링으로 변경
- 일별 스타일 (배경색) 변경

### 2.5 One Thing
- 오늘 날짜 셀 상단 "오늘의 핵심 한 가지" 필드
- Enter 또는 blur 시 저장

### 2.6 Workout Bar (오늘 날짜만)
- 전면 / 측면 / 후면 / 등 / 가슴 — 운동 부위 체크
- PC/모바일 동시 체크 지원 (원자적 저장)

### 2.7 Frame 시스템
- day-frames.json: Day Type별 기본 프레임 항목 정의
- `/api/inject-frames`: 날짜별로 프레임 항목 자동 주입
- `_frame: true` 플래그로 사용자 항목과 구분

### 2.8 Standing Orders 패널
- 상시/주간/월간/연간/공휴일/비전 반복 항목 관리
- 좌측 사이드 패널에서 편집

### 2.9 검색
- 전체 항목 텍스트 검색 (`/api/search/unified`)

### 2.10 Undo
- 최근 작업 취소 (`/api/undo`)

### 2.11 스크롤바 UX
- day-cell, week-cell: 기본 숨김, hover 시 thin scrollbar 표시
- 오늘 날짜: 항상 thin scrollbar (amber 색상)

---

## 3. 데이터 아키텍처

### 3.1 D1 스키마

```sql
CREATE TABLE ritual_data (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### 3.2 주요 키

| 키 | 내용 |
|---|---|
| `2026-05` | 월별 데이터 JSON (days + goals) |
| `day-frames` | Day Type별 프레임 항목 |
| `standing-orders` | 반복 업무/비전 데이터 |
| `recurring-templates` | 반복 템플릿 |
| `vision-roadmap` | 5개년 비전 |

### 3.3 월 데이터 구조

```json
{
  "month": "2026-05",
  "goals": { "goal": "..." },
  "days": {
    "29": {
      "ritual": [{ "text": "...", "url": "", "done": false, "_frame": true }],
      "input": [{ "text": "...", "url": "", "done": false }],
      "work": [...],
      "outcome": [...],
      "one_thing": "...",
      "workout": ["전면", "등"],
      "day_type": "flow",
      "notes": "..."
    }
  }
}
```

---

## 4. API 엔드포인트

### 읽기
| 엔드포인트 | 설명 |
|---|---|
| `GET /api/month?ym=2026-05` | 월 데이터 조회 |
| `GET /api/standing-orders` | Standing orders 조회 |
| `GET /api/day-frames` | Day frames 조회 |
| `GET /api/search?q=...` | 항목 검색 |
| `GET /api/search/unified?q=...` | 통합 검색 |

### 쓰기 — 원자적 (read-modify-write, 멀티디바이스 안전)

| 엔드포인트 | 설명 |
|---|---|
| `POST /api/toggle` | 항목 done 토글 |
| `POST /api/add-item` | 항목 추가 (맨 끝) |
| `POST /api/insert-item` | 항목 삽입 (인덱스 지정) |
| `POST /api/split-item` | 항목 분리 (Enter 분기) |
| `POST /api/edit-item` | 항목 텍스트/URL 수정 |
| `POST /api/delete-item` | 항목 삭제 |
| `POST /api/one-thing` | One Thing 저장 |
| `POST /api/notes` | 노트 저장 |
| `POST /api/day-type` | Day Type 변경 |
| `POST /api/workout` | 운동 부위 토글 |
| `POST /api/reorder` | 항목 순서 변경 |
| `POST /api/move-item` | 항목 날짜 간 이동 |
| `POST /api/inject-frames` | 프레임 항목 주입 |
| `POST /api/undo` | 최근 작업 취소 |

### 쓰기 — 전체 replace (단일 사용자 조작, 저빈도)

| 엔드포인트 | 설명 | 이유 |
|---|---|---|
| `POST /api/month` | 전체 월 데이터 저장 | 목표 텍스트, 링크 수정 등 |
| `POST /api/standing-orders` | Standing orders 저장 | 복잡한 구조 전체 교체 |
| `POST /api/day-frames` | Day frames 저장 | 전체 프레임 편집 |

> **중요**: 전체 replace 엔드포인트는 멀티디바이스 동시 사용 시 race condition 발생 가능.
> 빈도가 낮아 허용 수준이나, 향후 원자적 엔드포인트로 교체 권장.

---

## 5. 멀티디바이스 동기화

### 현재 구현
- **항목 조작 (toggle/add/edit/delete/split 등)**: 원자적 엔드포인트 사용 → 동시 사용 안전
- **Workout**: 원자적 (`/api/workout`) → 동시 사용 안전
- **Visibility change**: 탭 활성화 시 workout 필드 자동 새로고침

### 제한 사항
- **실시간 push 없음**: WebSocket/SSE 미구현. 모바일에서 변경 후 데스크탑에서 보려면 수동 새로고침 필요
- **Workout만** visibility change 자동 갱신. 항목 변경은 수동 새로고침 필요

### 향후 개선 방향
- 30초 polling 또는 SSE 구현으로 실시간 동기화 지원

---

## 6. 알려진 데이터 안전 정책

### 절대 규칙
- **사용자 데이터 보호**: D1 write 시 frame 항목만 추가, 기존 사용자 항목 절대 삭제 금지
- **merge 정책**: day별 병합 시 `input` 등 사용자 카테고리는 before 기준, frame 항목만 after에서 추가
- **백업**: D1 대량 쓰기 전 반드시 현재 데이터 파일 저장

### Frame inject 규칙
- `_frame: true` 항목만 프레임으로 분류
- 기존 프레임 항목이 있는 날에는 재주입 금지 (중복 방지)
- `injected === 0`이면 D1 write 스킵

---

## 7. 인프라

| 항목 | 값 |
|---|---|
| Worker 이름 | `cortex` |
| 라이브 URL | https://cortex.feat-breeze.workers.dev |
| D1 DB | `cortex-ritual-db` |
| D1 ID | `9da16918-a422-4b75-b542-9a30eabd2c64` |
| 정적 에셋 | `scripts/cortex-dashboard/public/` |
| Worker 소스 | `scripts/cortex-dashboard/worker/src/index.js` |
| 인증 | Bearer `cortex-ritual-2026-fb` (write only) |
| 백업 Worker | `cortex-dashboard` (정적 문서용) |

### 배포 방법
```bash
cd scripts/cortex-dashboard/worker
npx wrangler deploy
```
> wrangler.toml은 untracked — 배포 전 위 인프라 값으로 재생성 필요

---

## 8. 버그 수정 이력 (2026-05-29)

| 버그 | 원인 | 수정 |
|---|---|---|
| 스크롤바 항상 표시 | CSS 미적용 | `scrollbar-width: none` + hover thin |
| Enter 커서 상단 이동 | text-content 검색으로 엉뚱한 항목 포커스 | `data-d/cat/idx` 속성 + data-attribute 쿼리 |
| Enter split 미동작 | `blur` 이벤트가 editItem 호출해 before/after 덮어씀 | render() 내 item-text blur 제거 + `onblur=null` |
| Backspace 후 포커스 사라짐 | delItem 후 포커스 복원 없음 | `delItem(refocus=true)` → idx-1 항목 포커스 |
| Workout 동기화 안됨 | toggleWorkout이 전체 monthData save() 사용 | `/api/workout` 원자적 엔드포인트 신설 |
| 항목 조작 멀티디바이스 race | 6개 operation이 전체 replace save() 사용 | 각각 원자적 엔드포인트로 교체 |
| 데이터 유실 (D1 병합 오류) | merge 시 day 단위 전체 replace | 카테고리별 증감 판단 + 사용자 항목 우선 복원 |
