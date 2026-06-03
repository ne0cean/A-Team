# Cortex Dashboard QA Issues — 복원본

> 복원 기준: git commit cf2426ed / cdd637d7 / 1585fade + qa-reports/2026-06-02-02.md + SESSIONS.md
> 원본 문서 미존재 (누락). 이 파일이 SSOT.
> 최종 갱신: 2026-06-03

---

## 범례

| 상태 | 의미 |
|------|------|
| FIXED | 코드 수정 + 배포 완료 |
| BROWSER | 코드상 구현됨, 브라우저 수동 확인 필요 |
| BUG | 미수정 버그 존재 |
| UNKNOWN | 원본 설명 소실 |

---

## QA 항목 전체 (26개)

| # | 항목 | 수정 내용 | 상태 | 커밋 |
|---|------|---------|------|------|
| 1 | EX 운동 태그 XOR | 전면/측면/후면 상호배타, 등/가슴 상호배타 구현 | FIXED | cf2426ed |
| 2 | EX 버튼 동작 방식 | 원본 설명 소실. SO 패널 del-btn display:inline 혼용 확인됨 (의도적 예외로 판단) | BROWSER | — |
| 3 | 기본 day type 시각 표시 | 토요일→FLOW 45% opacity, 일요일→BLOCK, 공휴일→FLOW | FIXED | cf2426ed |
| 4 | render() 스크롤 점프 | scroll restore를 requestAnimationFrame으로 래핑, race condition 해결 | FIXED | cdd637d7 |
| 5 | carry-over 이월 범위 | OUTCOME 카테고리만 이월 (기존 전체 이월 → 범위 축소). Worker 수정 | FIXED | cf2426ed |
| 6 | day-cell 스크롤 딜레이 | hover 300ms 후 scroll-active 클래스 추가, 즉시 스크롤 방지 | FIXED | cdd637d7 |
| 7 | day-cell 스크롤 rAF | #4와 연계 — render 후 셀 scrollTop 복원 rAF 처리 | FIXED | cdd637d7 |
| 8 | 진척률 badge 제거 | day-cell 헤더에서 done/total progress badge 삭제 | FIXED | cf2426ed |
| 9 | Standing Orders 날짜 컬럼 | 날짜 컬럼 너비 72px → 216px (3배 확장) | FIXED | cf2426ed |
| 10 | 공휴일 섹션 기본 접힘 | `<details>` 태그로 공휴일 섹션 기본 collapsed | FIXED | cf2426ed |
| 11 | 주간 탭 WORK/Activity 구분 | 주간 뷰에서 WORK/Activity 별도 섹션 렌더링 + Activity → 오늘 추가 버튼 | FIXED | cdd637d7 |
| 12 | Standing Orders linkify | SO 텍스트 필드에 URL 자동 하이퍼링크(linkify) 적용 | FIXED | cf2426ed |
| 13 | CTRL+K lowercase + 전파 차단 | CTRL+K 입력 시 소문자 처리 + stopPropagation 추가 | FIXED | cf2426ed |
| 14 | 이달 메모 bar | 날짜 없는 monthly 항목을 캘린더 상단에 별도 bar로 표시 | FIXED | cf2426ed |
| 15 | 정렬 순서 | Monthly Recurring 날짜 오름차순, Yearly 월/일 오름차순 | FIXED | cf2426ed |
| 16 | workout bar XOR 구조 | workout 운동부위 XOR 로직 — blue/green 그룹 분리, chip 색상 구분 | BROWSER | cf2426ed |
| 17 | 구분선(separator) | `text___` 자동변환 + 달력 렌더링 + 구분선 추가 버튼 | FIXED | cf2426ed |
| 18 | FLOW/BLOCK 카테고리 표시 | FLOW/BLOCK frame에서 outcome → INPUT 표시. 평일 frame에서 outcome/input 숨김 | FIXED | cdd637d7 |
| 19 | 6PILLARS 편집 싱크 | hexagonal(6PILLARS) 프레임 타입 간 인라인 편집 내용 동기화 | FIXED | cf2426ed |
| 20 | (원본 설명 소실) | 커밋 메시지에 언급 없음. 수정 여부 불명 | UNKNOWN | — |
| 21 | frame-text italic 제거 | 프레임 텍스트 이탤릭 스타일 제거 | FIXED | cf2426ed |
| 22 | day-cell 내부 스크롤 | overflow-y: auto + max-height: 320px (hover 시 scroll-active) | FIXED | cf2426ed |
| 23 | ONETHING CTRL+K | ONETHING 필드에서 CTRL+K 하이퍼링크 삽입 지원 | FIXED | cf2426ed |
| 24 | GET /api/workout 500 에러 | GET 핸들러 없음 → 500 반환. 클라이언트 기능은 /api/month 경유로 정상이나 직접 호출 시 500 | BUG | — |
| 25 | Arrow 키 카테고리 경계 통과 | ArrowUp/Down으로 카테고리 간 경계 통과 네비게이션 | FIXED | cf2426ed |
| 26 | /nonexistent 경로 → 500 | 존재하지 않는 경로가 404가 아닌 500 반환. env.ASSETS.fetch 에러 미처리 | BUG | — |

---

## QA 추가 항목 (T-시리즈, 세션 중 발견)

| # | 항목 | 수정 내용 | 상태 | 커밋 |
|---|------|---------|------|------|
| T1 | day-cell done/total 배지 | 1차/2차 커밋 base 문제로 누락됨 → 별도 커밋으로 복구. _frame/separator 제외 | FIXED | 1585fade |
| T2 | Pillar 균형 bar | renderStats() 내 catColorMap 기반 pillar 세그먼트 렌더링. done% 비례 opacity | FIXED | 30795473 |
| T3 | #lesson 태그 배지 | notes 필드에서 #lesson 매치 후 day-cell에 배지 표시 | FIXED | 30795473 |

---

## 미수정 버그 요약

### BUG (2개)

**B-1: #26 — /nonexistent → 500 (HIGH)**
- 재현: `curl https://cortex.feat-breeze.workers.dev/nonexistent`
- 원인: Worker catch 블록에서 env.ASSETS.fetch 실패 시 500 반환
- 수정: try/catch → 404 반환
  ```js
  try { return await env.ASSETS.fetch(request); }
  catch { return new Response('Not Found', { status: 404, headers }); }
  ```

**B-2: #24 — GET /api/workout → 500 (MEDIUM)**
- 원인: GET 핸들러 없음 (POST만 존재)
- 영향: 직접 GET 호출 시 500. 클라이언트 기능은 /api/month 통해 정상
- 수정: 405 Method Not Allowed 반환 또는 GET 핸들러 추가

### BROWSER CHECK (2개)

**C-1: #2 — EX 버튼 동작 방식**
- 원본 이슈 설명 소실. SO 패널 del-btn 혼용 패턴 확인됨 (의도적 예외)
- 다음 브라우저 세션에서 직접 확인 필요

**C-2: #16 — workout bar XOR**
- 코드상 XOR 로직 구현됨 (app.js line 1144-1153)
- 브라우저에서 실제 chip 색상/동작 시각 확인 필요

### UNKNOWN (1개)

**U-1: #20**
- 커밋 메시지, SESSIONS.md, qa-reports 어디에도 언급 없음
- 사용자가 기억하면 이 파일에 추가 요망

---

## 집계

| 상태 | 개수 |
|------|------|
| FIXED | 20 (1차 16 + 2차 4) + T1/T2/T3 3 = 23 |
| BROWSER | 2 (#2, #16) |
| BUG | 2 (#24, #26) |
| UNKNOWN | 1 (#20) |
| **전체** | **26 + 3(T) = 29** |
