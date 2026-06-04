# Risk Tier — 변경 위험 등급 체계

> **Source**: LangGraph human-in-the-loop + CrewAI guardrail_max_retries 패턴 (2026-06-04 외부 리서치)
> **목적**: 모든 작업에 동일한 검증 흐름을 적용하지 않고, 위험도에 따라 검증 강도를 차등화.

## 등급 정의

| 등급 | 기준 | 검증 강도 | 예시 |
|------|------|---------|------|
| **LOW** | 수정 1파일, 30줄 미만, 테스트/문서만 | AC 생략 가능, vigil 스킵 | 주석 수정, 오타 수정 |
| **MEDIUM** | 수정 2-5파일 또는 기능 변경 | AC 필수, vigil 선택 | 버그 수정, 단순 기능 추가 |
| **HIGH** | 수정 6-9파일 또는 공유 라이브러리 | AC + vigil + reviewer 필수 | 공유 모듈 변경, API 수정 |
| **CRITICAL** | 수정 10+파일, 아키텍처 변경, 데이터 스키마, 보안 | 사용자 명시 승인 필수 | DB 스키마, 인증 로직, governance 규칙 근간 변경 |

## 등급 자동 판정 기준

```bash
# AC 작성 전 자동 판정
git diff --name-only | wc -l  # 변경 예상 파일 수
node scripts/impact.mjs <파일> | grep "→" | wc -l  # 영향 파일 수
```

- 영향 파일 0개 + 수정 1파일 → LOW
- 영향 파일 1-3개 또는 수정 2-5파일 → MEDIUM
- 영향 파일 4-9개 또는 수정 6-9파일 → HIGH
- 영향 파일 10개+ 또는 아키텍처/데이터/보안 → CRITICAL

## 등급별 실행 프로토콜

### LOW
1. 파일 전체 읽기 → 수정 → 빌드 확인

### MEDIUM
1. `scripts/impact.mjs` 실행
2. AC 작성 (`task-ac.md`)
3. 구현 → vigil 선택 실행

### HIGH
1. `scripts/impact.mjs` 실행
2. AC 작성 (영향 파일 목록 포함)
3. 구현 → vigil 자동 실행 → reviewer 필수

### CRITICAL
1. 사용자에게 먼저 보고: "이 작업은 CRITICAL 등급입니다. 영향: N개 파일"
2. 사용자 명시 승인 후에만 진행
3. AC + vigil + reviewer + orchestrator 위임

## Human-in-the-Loop 자동 트리거 조건

> LangGraph `interrupt()` 패턴 기반

다음 중 하나라도 해당하면 사람에게 에스컬레이션 (자동 판단 금지):
- 비가역적 데이터 작업 (삭제, 스키마 변경)
- 보안/인증 관련 코드 수정
- reviewer REJECTED 2회 이상
- 모든 에이전트가 상충하는 결과를 3회 반환
- CRITICAL 등급 작업

## 연관 규칙
- `impact-analysis.md` — 영향도 측정
- `task-ac.md` — AC 작성
- `coding-safety.md` — 파일 전체 읽기
- `guardrails.md` — 위험 명령 차단

**Last updated**: 2026-06-04 (LangGraph human-in-the-loop + CrewAI guardrail 리서치 기반)
