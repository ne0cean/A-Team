---
name: data-calc
description: Excel/CSV 데이터에서 집계 연산 수행. count_by, sum_by, pivot, cross_tab, formula 등. "집계", "합계 계산", "피벗", "데이터 계산", "통계", "data calc" 등을 언급하면 자동 실행.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Data Calc — 집계 엔진

Excel/CSV 파일에서 JSON 스펙 기반으로 집계 연산을 수행한다.

## Script Location

`~/Projects/a-team/scripts/data/calc.py`

## Prerequisites

```bash
pip install pandas openpyxl
```

## Usage

```bash
python ~/Projects/a-team/scripts/data/calc.py <file.xlsx> <calc_spec.json>
```

## Workflow

### Step 1: 데이터 파일 확인

사용자로부터 Excel 또는 CSV 파일 경로를 확인한다.
CSV 파일의 경우 `pd.read_excel` 대신 `pd.read_csv`로 읽어야 하므로 필요 시 스펙에 `"csv": true` 추가.

### Step 2: calc_spec.json 작성

사용자의 요구를 분석하여 스펙 파일을 작성한다:

```json
{
  "sheet": "Sheet1",
  "operations": [
    {"type": "count_by", "by": ["부서"], "name": "부서별_인원"},
    {"type": "sum_by", "by": ["부서"], "value": "금액", "name": "부서별_총액"},
    {"type": "mean_by", "by": ["부서"], "value": "점수", "name": "부서별_평균"},
    {"type": "pivot", "index": "부서", "columns": "직급", "values": "인원", "aggfunc": "sum"},
    {"type": "formula", "expr": "df['총주문'] = (df['인원'] / 4).apply(lambda x: -(-x//1)).astype(int)", "name": "4인당1박스"},
    {"type": "total_sum", "column": "총주문", "name": "전체_주문수량"},
    {"type": "total_count", "name": "전체_행수"},
    {"type": "conditional_count", "column": "직급", "value": "임원", "name": "임원수"},
    {"type": "cross_tab", "row": "부서", "col": "항목", "name": "부서별_크로스탭"},
    {"type": "unique_values", "column": "지역", "name": "지역_목록"},
    {"type": "ceil_div", "column": "인원", "divisor": 4, "result_column": "박스수", "name": "박스_합계"}
  ]
}
```

### Step 3: 실행

```bash
python ~/Projects/a-team/scripts/data/calc.py data.xlsx spec.json
```

### Step 4: 결과 확인

출력:
- 각 operation 결과 테이블
- 최종 JSON 요약

## Supported Operations

| type | 설명 | 필수 필드 |
|------|------|----------|
| `count_by` | 그룹별 행 수 | `by` |
| `sum_by` | 그룹별 합계 | `by`, `value` |
| `mean_by` | 그룹별 평균 | `by`, `value` |
| `pivot` | 피벗 테이블 | `index`, `columns`, `values` |
| `formula` | 임의 pandas 수식 | `expr` |
| `total_sum` | 열 전체 합계 | `column` |
| `total_count` | 전체 행 수 | - |
| `conditional_count` | 조건부 행 수 | `column`, `value` |
| `cross_tab` | 교차표 | `row`, `col` |
| `unique_values` | 고유값 목록 | `column` |
| `ceil_div` | 올림 나눗셈 집계 | `column`, `divisor` |

## Pipeline with excel-to-csv

```bash
# Excel -> CSV 변환 후 calc
python ~/Projects/a-team/scripts/data/excel-to-csv.py data.xlsx --all
python ~/Projects/a-team/scripts/data/calc.py data.xlsx spec.json
```
