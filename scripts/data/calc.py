#!/usr/bin/env python3
"""최종 계산기 — 정제된 데이터에서 주문 수량, 합계, 피벗 등을 산출한다.
Usage: python3 calc.py <file.xlsx> <calc_spec.json>

calc_spec.json 예시:
{
  "sheet": "Sheet1",
  "operations": [
    {"type": "count_by", "by": ["부서"], "name": "부서별_인원"},
    {"type": "sum_by", "by": ["부서"], "value": "금액", "name": "부서별_총액"},
    {"type": "pivot", "index": "부서", "columns": "직급", "values": "인원", "aggfunc": "sum"},
    {"type": "formula", "expr": "df['총주문'] = (df['인원'] / 4).apply(lambda x: -(-x//1)).astype(int)", "name": "4인당1박스"},
    {"type": "total_sum", "column": "총주문", "name": "전체_주문수량"},
    {"type": "conditional_count", "column": "직급", "value": "임원", "name": "임원수"},
    {"type": "cross_tab", "row": "부서", "col": "알레르기", "name": "부서별_알레르기"}
  ]
}
"""
import sys
import json
import math
import pandas as pd

def calculate(path, spec_path):
    with open(spec_path) as f:
        spec = json.load(f)

    sheet = spec.get("sheet", 0)
    df = pd.read_excel(path, sheet_name=sheet)
    print(f"📥 데이터: {len(df)}행 × {len(df.columns)}열\n")

    results = {}

    for op in spec["operations"]:
        op_type = op["type"]
        name = op.get("name", op_type)
        print(f"{'─'*50}")
        print(f"🔢 {name} ({op_type})")

        if op_type == "count_by":
            r = df.groupby(op["by"]).size().reset_index(name="count")
            print(r.to_string(index=False))
            results[name] = r.to_dict('records')

        elif op_type == "sum_by":
            r = df.groupby(op["by"])[op["value"]].sum().reset_index()
            print(r.to_string(index=False))
            results[name] = r.to_dict('records')

        elif op_type == "mean_by":
            r = df.groupby(op["by"])[op["value"]].mean().round(1).reset_index()
            print(r.to_string(index=False))
            results[name] = r.to_dict('records')

        elif op_type == "pivot":
            r = pd.pivot_table(df, index=op["index"], columns=op["columns"],
                              values=op["values"], aggfunc=op.get("aggfunc", "sum"),
                              fill_value=0)
            print(r.to_string())
            results[name] = r.to_dict()

        elif op_type == "formula":
            exec(op["expr"])
            print(df.head(10).to_string(index=False))
            results[name] = "applied"

        elif op_type == "total_sum":
            total = df[op["column"]].sum()
            print(f"  합계: {total}")
            results[name] = int(total) if pd.notna(total) else 0

        elif op_type == "total_count":
            count = len(df)
            print(f"  총 행: {count}")
            results[name] = count

        elif op_type == "conditional_count":
            count = (df[op["column"]] == op["value"]).sum()
            print(f"  '{op['value']}' 수: {count}")
            results[name] = int(count)

        elif op_type == "cross_tab":
            r = pd.crosstab(df[op["row"]], df[op["col"]])
            print(r.to_string())
            results[name] = r.to_dict()

        elif op_type == "unique_values":
            vals = df[op["column"]].dropna().unique().tolist()
            print(f"  고유값 ({len(vals)}): {vals}")
            results[name] = vals

        elif op_type == "ceil_div":
            # 올림 나눗셈: column / divisor → 올림
            divisor = op["divisor"]
            col = op["column"]
            result_col = op.get("result_column", f"{col}_ceil")
            df[result_col] = df[col].apply(lambda x: math.ceil(x / divisor) if pd.notna(x) else 0)
            total = df[result_col].sum()
            print(f"  {col} / {divisor} 올림 합계: {total}")
            print(df[[col, result_col]].head(10).to_string(index=False))
            results[name] = int(total)

        print()

    # 최종 요약
    print(f"{'='*50}")
    print("📋 최종 결과 요약:")
    print(json.dumps(results, ensure_ascii=False, indent=2, default=str))
    return results

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 calc.py <file.xlsx> <calc_spec.json>")
        sys.exit(1)
    calculate(sys.argv[1], sys.argv[2])
