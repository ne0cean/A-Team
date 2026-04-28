# /capability — 부서별 점수 + 런칭 시나리오 매핑

A-Team의 "회사" 역량을 정량 평가합니다.

## 실행

```bash
node scripts/capability.mjs        # 텍스트 출력
node scripts/capability.mjs --json  # JSON 출력
node scripts/gap-priority.mjs 10    # 갭 우선순위 top 10
```

## 출력 항목
1. **부서별 점수** — 7개 부서 × 가중평균 커버리지
2. **종합 점수** — 전체 weighted average
3. **런칭 시나리오** — 개발자 도구 / B2C SaaS / B2B 엔터프라이즈
4. **Top 3 갭** — gap-priority 엔진 기반

## 데이터 소스
- `lib/capability-map.json` — SSOT (60+ 항목 인벤토리)
- `.context/friction-log.jsonl` — 갭 센서 자동 기록
