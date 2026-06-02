---
name: data-race
description: Excel/CSV 파일을 받아 복잡도 자동 판정 후 병렬 에이전트로 즉시 분석·계산. "데이터 대회", "엑셀 분석", "data race", "race", "빠르게 분석", "시트 분석", "조건 계산" 등을 언급하거나 .xlsx/.xls/.csv 파일과 문제 설명을 함께 제시하면 자동 실행.
allowed-tools:
  - Bash
  - Read
  - Write
  - Task
  - Glob
---

> Analytics: `node scripts/log-event.mjs command_start name=data-race` — 실행 시작 시 반드시 호출 (경로: ~/Projects/a-team/scripts/log-event.mjs)

# /data-race — Excel/CSV 블리츠 파이프라인

엑셀·CSV 파일을 받는 즉시 복잡도를 판정하고, 분기에 따라 다른 에이전트 조합을 투입해 답을 산출한다.

## 사용법

```
/data-race <file.xlsx> "<문제 설명>"
/data-race turbo <file.xlsx>          # 질문 없이 자동 추론
/data-race <file.xlsx>                # 문제 설명 없음 → 패턴 자동 추론
```

## 전제 조건

```bash
pip install pandas openpyxl
```

## Phase 0: 인수 파싱

- `turbo` 키워드 → TURBO 모드 (ASK 단계 생략)
- 첫 번째 `.xlsx/.xls/.csv` 경로 → 대상 파일
- 나머지 텍스트 → 문제 설명 (없으면 자동 추론)

---

## Phase 1: 복잡도 판정 (자동, 30초)

`data-racer` 서브에이전트를 호출하여 파일 구조를 스캔한다.

```
Task(
  subagent_type="data-racer",
  prompt="SCAN: <file경로>"
)
```

판정 기준:

| 등급 | 시트 수 | 조건 컬럼 | 특징 |
|------|--------|----------|------|
| SIMPLE | 1~2 | ≤3 | 단일 집계·필터 |
| MEDIUM | ≤4 | ≤8 | 멀티시트, 복합 조건 |
| HARD | 5+ 또는 조인 필요 | 9+ 또는 암묵 조건 | 배치·최적화·교차 검증 |

---

## Phase 2: 분기 실행

### SIMPLE — 단일 에이전트 (목표: 2분)

`data-racer`가 blitz 결과에서 바로 답 산출.

```
Task(
  subagent_type="data-racer",
  prompt="BLITZ_SOLVE: <file경로> / 문제: <문제설명>"
)
```

완료 후 Phase 4(크로스체크)로 이동.

---

### MEDIUM — 2-에이전트 병렬 (목표: 4분)

Phase 1 결과를 받은 후, 병렬로 두 에이전트 투입:

```
# 동시 실행
Task(subagent_type="data-racer", prompt="CLEAN_SOLVE: <file경로> / 문제: <문제설명> / recon: <Phase1결과>")
Task(subagent_type="data-racer", prompt="CROSS_CHECK: <file경로> / 다른 각도에서 동일 문제 풀기 / recon: <Phase1결과>")
```

두 결과 합류 → 불일치 시 재계산 → Phase 4.

---

### HARD — 풀 A-Team 4-에이전트 (목표: 6분)

**Phase 2a (병렬, 90초)**:

```
Task(subagent_type="data-racer", prompt="RECON: <file> / 구조+시트분류+조인키 정찰")
Task(subagent_type="data-racer", prompt="CONSTRAINT_PARSE: <file> / 조건 컬럼 추출·구조화")
```

**Phase 2b (Phase 2a 완료 후, 병렬, 120초)**:

```
Task(subagent_type="data-racer", prompt="PLACEMENT_SOLVE: <file> / recon+constraint 결과 기반 최적 배치·계산")
Task(subagent_type="data-racer", prompt="VERIFY: <file> / solver 답 교차검증, 다른 pandas 쿼리로 재확인")
```

---

## Phase 3: ASK 단계 (NORMAL 모드만, TURBO 시 생략)

복잡도 판정 결과와 감지된 데이터 이슈를 기반으로 **최소 핵심 질문**만 생성.

질문 전략:
- 가설 검증형: "재직자만 대상이 맞나요?"
- 한 번에 묶기: "A는 X 기준, B는 Y 기준이 맞나요?"
- 예/아니오로 답할 수 있도록

질문 후 사용자 답변을 받아 Phase 2 결과에 반영 → 재계산.

---

## Phase 4: 크로스체크 (필수)

모든 경로에서 공통 실행:

1. 합계 검증: 부분합 합산 = 전체합
2. 인원 검증: 정제 전 - 제외 = 정제 후
3. 역산: 답에서 역방향 계산 → 원본과 대조
4. 다른 쿼리: 동일 답을 다른 pandas 표현으로 재확인

---

## Phase 5: 결과 출력

```
최종 답:
─────────────────────────────
[시나리오 A (기본): 답]
[시나리오 B (파견제외): 답]   ← TURBO 모드: 여러 시나리오 동시 제시
─────────────────────────────
검증: [크로스체크 방법 + 결과]
신뢰도: HIGH | MEDIUM | LOW
경과: [N분 M초]
```

TURBO 모드에서는 가능한 모든 시나리오를 미리 계산해 한 번에 출력.
사용자가 정답을 지목하면 해당 시나리오만 확정.

---

## 기존 스킬과의 역할 분리

| 스킬 | 역할 |
|------|------|
| `/excel-to-csv` | 구조 변환만 (분석 없음) |
| `/csv-clean` | 데이터 품질 정제만 |
| `/data-calc` | 집계 스펙 실행만 |
| `/data-race` | 위 3개를 자동 조합 + 복잡도 판정 + 병렬 에이전트 투입 + 답 산출 |

복잡도 SIMPLE이라도 데이터 품질 이슈가 있으면 `/csv-clean` 로직을 내부에서 자동 적용한다.

---

## 스크립트 경로 (a-team 글로벌)

- `~/Projects/a-team/scripts/data/excel-to-csv.py` — 구조 분석 + CSV 변환
- `~/Projects/a-team/scripts/data/csv-clean.py` — 데이터 정제
- `~/Projects/a-team/scripts/data/calc.py` — 집계 계산

morning-rave의 `race/scripts/blitz.py` 등은 해당 프로젝트 전용이다. a-team에서는 위 스크립트를 조합해 동일 파이프라인을 구성한다.

---

## 핵심 원칙

1. **속도 > 완벽** — 80% 확신이면 진행, 나중에 검증
2. **TURBO에서는 질문 ZERO** — 모든 시나리오를 미리 계산해서 보여줌
3. **가설 선행** — 데이터 패턴에서 기준을 추론하고 검증만 받기
4. **크로스체크 필수** — 답 산출 후 반드시 다른 방법으로 검증
5. **원본 보호** — 정제 결과는 항상 새 파일로 출력, 원본 덮어쓰기 금지
