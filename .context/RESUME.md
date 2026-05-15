---
mode: normal
status: in_progress
created: 2026-05-15T20:30:00+09:00
task: PPT 모듈 컨설팅급 업그레이드 — 레드팀 갭 수정
---

# RESUME — PPT 엔진 레드팀 갭 수정

## 이전 세션 요약

PPT 모듈을 3단계로 업그레이드:
1. **generate_v2.py 재작성** — 18종 레이아웃, 8종 테마, 그라데이션/그림자/CJK/풋터/노트
2. **mckinsey_pptx 통합** — GitHub seulee26/mckinsey-pptx → `scripts/ppt/mckinsey_pptx/` 복사. 40종 슬라이드
3. **generate_consulting.py** — A-Team 스펙 → mckinsey_pptx 변환. --style mckinsey/bcg/bain

레드팀 결과: **Critical 1 + High 7 + Medium 4**. 엔진은 작동하지만 파이프라인이 끊겨 실제 사용자가 McKinsey급 PPT를 받을 수 없음.

## 수정 대상 (우선순위 순)

### 1. [CRITICAL] 라이선스 — 5분
- `scripts/ppt/mckinsey_pptx/`에 LICENSE 없음
- 원본: https://github.com/seulee26/mckinsey-pptx
- 수정: LICENSE 복사 + attribution

### 2. [HIGH] CJK 폰트 — 10분
- `mckinsey_pptx/base.py`의 `set_run()`이 `run.font.name`만 설정, `<a:ea>` XML 미삽입
- generate_v2.py의 `set_cjk_font()` 참고해서 base.py에 주입

### 3. [HIGH] convert_spec() 고급 타입 접근 불가 — 20분
- BCG 매트릭스, Harvey ball, 간트, 이슈 트리, 퍼넬, 조직도 매핑 없음
- ppt-strategist가 mckinsey_pptx 네이티브 스펙 직접 생성하도록 지시 추가

### 4. [HIGH] convert_spec() 데이터 손실 — 15분
- data_table: headers 소멸, target/actual 하드코딩
- bar_chart: 다중 시리즈 첫 번째만 (`break`), 나머지 버림
- timeline: `events[:4]`로 5번째 손실
- cover subtitle: pop-pop 버그 (항상 None)

### 5. [HIGH] 파이프라인 연결 — 30분
- server.py: consulting 모드 미지원 → POST body에 mode 추가, UI 분기
- ppt-strategist.md: consulting 모드 분기 + generate_consulting.py 실행 경로
- ppt.md: Q5에서 Consulting 선택 시 --style 질문

### 6. [HIGH] server.py 보안 — 15분
- slug `..` 미필터링 → regex sanitize
- _generated 메모리 누수 → UUID + 만료
- theme 미검증 → 화이트리스트

## 파일 위치

| 파일 | 역할 |
|------|------|
| `scripts/ppt/generate_v2.py` | Creative 엔진 (18종, 8테마) |
| `scripts/ppt/generate_consulting.py` | Consulting 어댑터 |
| `scripts/ppt/mckinsey_pptx/` | mckinsey-pptx 라이브러리 |
| `scripts/ppt/mckinsey_pptx/theme.py` | MCKINSEY/BCG/BAIN_THEME |
| `scripts/ppt/mckinsey_pptx/base.py` | 프리미티브 (CJK 수정 대상) |
| `scripts/ppt/mckinsey_pptx/builder.py` | 40종 타입 레지스트리 |
| `scripts/ppt/server.py` | 웹 UI (consulting 분기 필요) |
| `.claude/agents/ppt-strategist.md` | 전략 에이전트 (consulting 분기 필요) |
| `.claude/commands/ppt.md` | /ppt 커맨드 |

## 테스트 파일

```
/tmp/mckinsey-demo-korean.pptx    # 21장 한국어 데모
/tmp/ppt-mckinsey.pptx            # McKinsey 16장
/tmp/ppt-bcg.pptx                 # BCG 16장
/tmp/ppt-bain.pptx                # Bain 16장
```

## 다음 액션

1~6번 순서대로 수정 → 전체 재테스트 → /ppt E2E 검증
