# Budgeting & Financial Planning Template

> 1인 + AI 회사를 위한 예산 계획 + 시나리오 분석.
> 서베이 검증: LightGBM, Claude API, Streamlit.

## 1인 회사 예산 구조

### 고정 비용 (월간)

| 항목 | 범위 | 비고 |
|------|------|------|
| Claude Pro/Max | $20-100 | 핵심 도구 |
| 호스팅 (Vercel/Railway) | $0-25 | 트래픽에 따라 |
| 도메인 | $1-2 | 연 $12-24 |
| 이메일 (Google Workspace) | $8 | |
| 도구 (SaaS) | $50-150 | 단계별 확장 |
| **합계** | **$80-285** | |

### 변동 비용

| 항목 | 범위 | 트리거 |
|------|------|--------|
| API 사용량 (Stripe 수수료) | 거래의 2.9%+30¢ | 매출 발생 시 |
| 광고비 | $0-500 | Growth 단계 |
| 프리랜서 | $0-2000 | 특수 작업 시 |

## 시나리오 분석

```javascript
// 3가지 시나리오 자동 생성
const scenarios = {
  conservative: { mrrGrowth: 0.05, churnRate: 0.08, adSpend: 0 },
  moderate:     { mrrGrowth: 0.15, churnRate: 0.05, adSpend: 200 },
  aggressive:   { mrrGrowth: 0.30, churnRate: 0.03, adSpend: 500 },
};

function forecast(scenario, months, startMRR) {
  let mrr = startMRR;
  const results = [];
  for (let m = 1; m <= months; m++) {
    mrr = mrr * (1 + scenario.mrrGrowth) * (1 - scenario.churnRate);
    const costs = 200 + scenario.adSpend; // 기본 비용 + 광고
    const profit = mrr - costs;
    results.push({ month: m, mrr: Math.round(mrr), costs, profit: Math.round(profit) });
  }
  return results;
}
```

## 런웨이 계산

```
런웨이 (개월) = 보유 현금 / 월간 순 지출

예: 현금 $5,000, 월 지출 $200, 월 수입 $0
    런웨이 = $5,000 / $200 = 25개월

예: 현금 $5,000, 월 지출 $500, 월 수입 $300
    런웨이 = $5,000 / ($500 - $300) = 25개월
```

## 자동화 가능 항목

| 항목 | 방법 | 주기 |
|------|------|------|
| Stripe 매출 집계 | Stripe API → Metabase | 일간 |
| 비용 추적 | 은행 CSV → Claude 분류 | 주간 |
| 시나리오 재계산 | scripts/ 자동 실행 | 월간 |
| 예산 대비 실적 | Metabase 대시보드 | 실시간 |

## 참고
- [DualEntry](https://www.dualentry.com/) — 에이전틱 예산 계획
- [QuickBooks Solopreneur](https://quickbooks.intuit.com/) — $20/월
- IBM 벤치마크: AI 예산 도구로 20-50% 예측 오차 감소
