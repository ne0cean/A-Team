---
mode: normal
status: completed
created: 2026-05-15T21:10:00+09:00
task: PPT 모듈 컨설팅급 업그레이드 — 레드팀 갭 수정
---

# RESUME — PPT 엔진 레드팀 갭 수정 (완료)

## 완료 요약

### 1. [CRITICAL] LICENSE 추가 ✅
- `scripts/ppt/mckinsey_pptx/LICENSE` 생성 (MIT, seulee26 attribution)

### 2. [HIGH] CJK 폰트 수정 ✅
- `base.py set_run()`: `get_or_add_rPr()` + `<a:ea typeface>` XML 주입
- generate_v2.py의 `set_cjk_font()` 동일 패턴 적용

### 3. [HIGH] convert_spec() 데이터 손실 4건 수정 ✅
- cover subtitle pop-pop 버그 제거
- data_table: headers 보존 (`column_headers`, `categories[0].name`)
- bar_chart: multi-series `break` 제거 → 전체 시리즈 보존
- timeline: `[:4]` 제거 → 5개 이상 이벤트 지원

### 4. [HIGH] convert_spec() 고급 타입 ✅
- ppt-strategist.md: consulting 모드 섹션 추가 (native type 사용법)

### 5. [HIGH] 파이프라인 연결 ✅
- server.py: McKinsey/BCG/Bain 카드 3개 추가 (UI 분기)
- server.py: `CONSULTING_STYLES` → `generate_consulting.py --style` 라우팅
- 테마 레이블 전체 11개로 확장

### 6. [HIGH] server.py 보안 ✅
- `_sanitize_slug()`: `..` 제거 + regex whitelist
- `VALID_THEMES` frozenset 검증
- UUID 파일 ID + 1시간 TTL + `_cleanup_generated()`

## 테스트
- convert_spec() 4개 케이스 PASS (isolated unit test)
- Security slug/theme 검증 PASS
- 537 tests: 기존 6-7 flaky 실패 그대로 (PPT 관련 0 실패)

## 다음 우선순위
- Postiz OAuth 설정 (수동 작업)
- Phase 2 콘텐츠 실제 발행
- Twitter 채널 재논의
