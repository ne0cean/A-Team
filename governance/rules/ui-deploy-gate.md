# UI Deploy Gate (의무)

> UI/프론트엔드 기능 완료 선언 전 반드시 통과.
> 미통과 시 배포 금지. /ship, /end에서 자동 체크.

## 배경
2026-05-25~29 Cortex Dashboard 세션에서 미검증 배포 반복 → 사용자가 QA 대행.
근본 원인: 코드 완성 = 동작 완성 착각. 검증 게이트 없음.

## 필수 체크 (ALL PASS 필요)

### 동작 확인
- [ ] PC 브라우저에서 해당 기능 직접 확인 (스크린샷 불필요, 눈으로 확인)
- [ ] 모바일 확인 (DevTools 에뮬 또는 실기기)
- [ ] 이전 동작하던 핵심 기능 3개 회귀 확인
- [ ] browser console에 에러 없음 (WebFetch 또는 curl로 JS syntax check)

### 환경
- [ ] Service Worker 캐시 우회 상태에서 확인 (SW 버전 올리기만으론 부족)
- [ ] API 엔드포인트 200 응답 확인 (curl 1회)

### 데이터 안전
- [ ] 보호 대상 JSON 수정 시 .bak 존재 확인
- [ ] 빈 데이터로 덮어쓰는 경로 없음 확인

### 금지 패턴 (자동 감지 가능)
- `alert()` 사용 금지 → toast UI
- `overflow: hidden`으로 스크롤 가능 내용 숨기기 금지
- hover 시 레이아웃 밀림 (flex → absolute) 금지
- `const API`/인증 상수 누락 → JS syntax 이상 없어도 런타임 크래시

## 속도 제한
- 세션당 주요 UI 기능 3개 초과 시 검증 세션 분리 의무
- 기능 N 동작 확인 없이 기능 N+1 시작 금지

## 적용 시점
- `/end` Step 5 (시각적 검증)에서 이 체크리스트 강제 참조
- `/ship`에서 UI 변경 감지 시 자동 삽입
