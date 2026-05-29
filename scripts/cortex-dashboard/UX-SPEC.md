# Cortex Dashboard — UX 명세서

> 전체 세션(2026-05-25~29)에서 사용자가 명시한 모든 요구사항.
> 이 문서가 구현의 SSOT. 여기 없는 건 만들지 않고, 여기 있는 건 빠뜨리지 않는다.

---

## 1. 앱 구조

### 1.1 레이아웃 (원노트 구조)
- 좌측 사이드바: cortex 노트 트리 (펼치고 닫을 수 있음)
- 메인 영역: 대시보드 (캘린더 스케줄러가 기본)
- 사이드바에서 노트 선택 → 메인이 노트 뷰어로 전환 (Back으로 대시보드 복귀)
- PC: 사이드바 기본 열림, 토글로 접기/펼치기 가능
- 모바일: 사이드바 기본 접힘, ☰으로 슬라이드 오버레이
- 하단: Capture 바 (고정)

### 1.2 URL
- **https://cortex.feat-breeze.workers.dev** — 절대 변경 금지
- Cloudflare Workers + D1 (APAC/ICN)

---

## 2. 스케줄러 (메인 화면)

### 2.1 캘린더 뷰
- 기본: Full Month (월간 그리드)
- 이번 달: 지나간 주는 접힘, 현재 주의 마지막 날에 ▲ 토글
- 다른 달: 전체 주 펼침 (접기 없음)
- 요일 헤더: 맨 위 한 줄만
- 이전/다음 달 날짜도 데이터와 함께 표시 (opacity 낮춤)
- 월 라벨 클릭 → 오늘로 이동

### 2.2 Day Cell
- 날짜 숫자 클릭 → Day Type 순환 (block/flow/hf/vacation/none)
- Day Type: 상단 얇은 바 (1.5px) — block 파랑, flow 초록, hf 금색, vacation 보라
- ONE THING: 녹색 영역, 클릭해서 편집
- 4 카테고리: R&R (금), Input (파랑), Work (초록), Outcome (보라) — 좌측 2px 컬러 바
- 카테고리 라벨 색상 매칭
- 체크박스: 커스텀 11px (체크 시 녹색 + 체크마크)
- 아이템 텍스트: contenteditable, Enter → 커서 위치에서 분기 (두 아이템으로)
- Backspace (빈 아이템) → 삭제
- **방향키로 아이템 간 이동 가능해야 함**
- 스크롤: 기본 숨김, hover 시에만 얇은 스크롤바 (3px), today만 항상 스크롤 가능
- **스크롤바 숨김 시 내용은 반드시 보여야 함 (overflow: hidden 금지)**
- 공휴일: 셀 배경 빨간 틴트 + 날짜 아래 빨간 텍스트
- 하이퍼링크 🔗 / 삭제 × : hover 시에만 표시, **텍스트 레이아웃 밀리지 않게 position absolute**
- 링크 있는 아이템은 🔗 상시 표시 (파란색)
- 드래그앤드롭: 같은 카테고리 내 순서 변경 + 다른 날짜로 이동
- 이월 아이템: ↩ 마크 표시 (_carried)
- 날짜 고정: 스크롤 시 날짜 숫자 sticky top

### 2.3 프레임 시스템
- Day Type별 프레임 (weekday/flow/block)
- 각 카테고리별 routine/todo 구분
- routine: 매일 리셋 (체크해도 다음날 다시)
- todo: 미완료 이월, 완료 시 다음날 사라짐
- Weekday: R&R=routine, Input/Work/Outcome=todo
- Flow/Block: R&R/Input/Work=routine, Outcome만 todo
- 프레임 아이템 상단, 수동 아이템 하단
- "Apply to remaining days" → 오늘~월말에 프레임 주입
- Day Type 변경 시 프레임 자동 재주입
- **routine/todo 모두 주입해야 함 (routine만 필터링 금지)**

### 2.4 상단 영역
- 좌측: Cortex 타이틀 + "Don't think, just do." 좌우명
- 중앙: Vision/Goal 텍스트 (편집 가능) + EX 운동 부위 칩
- 우측: Full Month 토글, ◀ ▶ 네비게이션, Undo, 검색
- 운동 부위: 하체(→전면/측면/후면), 어깨, 등, 가슴 — 하체 선택 시 서브칩 펼침
- 운동 칩은 오늘 날짜 기준, 최상단에 한 번만 (매 셀 반복 아님)

### 2.5 하단 패널 (접이식)
- Vision & Milestones: 5개년(2026-2030) × 7카테고리 테이블, 셀 편집 가능, Admin Notes
- Standing Orders: 4탭 (Standing / Weekly / Monthly / Yearly)
  - 모두 CRUD + 순서 변경 (▲▼) + 하이퍼링크
  - Monthly: MONTHLY RECURRING (매달 반복, 날짜 지정) + 이번달 ONLY (특정 월 한정)
  - Yearly: 월+일 드롭다운, 캘린더 자동 반영
  - Weekly: 요일 + 빈도(매주/격주), 캘린더 자동 반영
- Day Frames (Admin): 3컬럼 (Weekday/Flow/Block), 카테고리별 아이템 편집 + routine/todo 토글

### 2.6 캘린더 자동 반영
- 공휴일 33개 (2026 전체)
- Happy Friday 11개 (day_type=hf 자동)
- Weekly recurring → 해당 요일에 회색 텍스트
- Monthly recurring → 해당 날짜 (0=말일)에 보라색 텍스트
- Yearly → 해당 월+일에 금색 텍스트

---

## 3. 노트 (사이드바 + 뷰어)

### 3.1 사이드바 트리
- cortex/ 폴더 구조 표시 (GitHub API 프록시)
- 폴더 클릭 → 하위 열기, 파일 클릭 → 메인에 표시
- ⬆ .. 항목으로 상위 이동
- Breadcrumb 네비게이션
- 검색 입력 (Enter → 파일/폴더명 검색)
- "+" 버튼 → 새 노트 생성 (저장 위치 선택 가능)
- .으로 시작하는 파일 숨김
- 마우스 뒤로가기 (browser history) 지원

### 3.2 노트 뷰어
- 마크다운 렌더링 (h1-h3, bold, italic, code, link, list, hr)
- Edit 버튼 → textarea 편집 모드
- Save → GitHub API 커밋
- Back → 대시보드로 복귀
- 이미지 업로드: 파일 선택 + 클립보드 붙여넣기 → cortex/attachments/에 GitHub 업로드 → 마크다운 삽입

---

## 4. Capture (하단 바)

- 하단 고정 입력 바
- 텍스트 입력 → cortex/inbox/에 .md 저장
- `28 w 미팅` 단축 → 캘린더에 직접 추가 (Telegram과 동일 문법)
- 사진 버튼 → 이미지 업로드
- iOS 자동 줌 방지: font-size 16px

---

## 5. 검색

### 5.1 통합 검색 (🔍)
- 입력 즉시 두 영역 동시 표시:
  - **THIS PAGE**: 현재 화면 (캘린더 또는 열린 노트) 내 검색 — 즉시, 초록 헤더
  - **ALL**: D1 스케줄 + GitHub 노트 전체 — 비동기, 금/파랑 헤더
- 페이지 결과 클릭 → 해당 셀 스크롤 + 2초 하이라이트
- 전체 결과 클릭 → 해당 월 이동 또는 노트 열기
- 정규식 특수문자 이스케이프 필수
- API 에러 시 "Search failed" 표시 (먹통 금지)
- 오버레이 바깥 클릭 또는 Escape → 닫기

---

## 6. 모바일

- viewport: width=1200 (PC 동일 폭 유지 — 사용자 명시 결정)
- 사이드바: 기본 접힘, ☰으로 슬라이드
- safe-area: 상단 (OS UI 가림 방지) + 하단 (홈 인디케이터)
- pull-to-refresh 지원
- 체크/편집 → D1에 즉시 저장 (AUTH 토큰 포함)

---

## 7. 동기화 + 데이터

- D1 = SSOT (스케줄 데이터)
- GitHub = SSOT (노트/cortex 파일)
- PC와 모바일은 같은 D1 → 실시간 동기화 (추가 구현 불필요)
- Worker API에 Bearer 인증 (쓰기만)
- 빈 데이터 저장 방지 (프론트 + 서버)
- save() 실패 시 toast로 사용자 알림 (alert 금지)
- Undo: 직전 백업 복원

---

## 8. PWA

- manifest.json: name "Cortex", standalone, dark theme
- Service Worker: stale-while-revalidate (셸 캐시 + API 폴백)
- favicon: 뉴럴 네트워크 SVG 아이콘
- 홈화면 추가 가능

---

## 9. 절대 하지 말 것

- cortex/ 파일 삭제: 반드시 사용자 승인 후에만
- URL 변경: cortex.feat-breeze.workers.dev 고정
- alert() 사용 금지 → toast
- 배포 전 검증 없이 push 금지
- overflow: hidden으로 내용 숨기기 금지
- hover 시 레이아웃 밀림 금지 (absolute positioning 사용)
- 사용자가 이전에 지시한 것 되돌리기 금지

---

## 10. 키보드/인터랙션 (미구현 → 구현 필수)

- 아이템 간 방향키(↑↓) 이동
- Enter: 텍스트 분기
- Backspace (빈 아이템): 삭제
- Escape: 편집 취소, 오버레이 닫기
- Tab: 다음 아이템으로
- 모든 contenteditable에서 일관된 키보드 동작

---

## 11. Telegram 연동 (유지)

- @from_dean_bot → cortex/inbox/ 저장 (텍스트/사진/음성/파일)
- `28 w 미팅` → 캘린더 직접 추가
- `?키워드` → MeiliSearch + DDG + Groq 종합 검색
- tidy-inbox: 5분 cron, 규칙 기반 + Groq 폴백 자동 분류
- offset 영속화 (재시작 시 중복 방지) — 미구현

---

## 12. 프레임워크 결정

### 선택: Svelte (빌드 최소, 반응형 내장, 작은 번들)
- 이유: vanilla JS 1800줄이 한계 도달. React는 과하고 Svelte는 컴파일 타임에 최적화.
- Worker API 그대로 유지. 프론트만 교체.
- 키보드 네비게이션, 접근성, 반응형 컴포넌트화 가능.
- Vite + Svelte → dist/ 빌드 → Worker assets로 서빙.

### 대안 검토 필요 시
- Preact (3KB, React 호환)
- Lit (웹 컴포넌트)
- 순수 vanilla 유지 + 모듈 분리 강화

---

## 변경 이력
- 2026-05-29: 전체 세션 피드백 기반 초안 작성
