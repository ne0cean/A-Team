# Revenue Tracking Template

> SaaS/웹앱 프로젝트에서 사용하는 수익 추적 패턴.
> A-Team에서 검증된 외부 도구 + 구현 패턴.

## 추천 스택 (서베이 검증됨, 2026-05-11)

| 기능 | 도구 | 비용 | 근거 |
|------|------|------|------|
| 결제 | Stripe | 거래 수수료만 | 10M+ npm 주간 DL, 업계 표준 |
| Webhook 처리 | stripe npm | $0 | 공식 라이브러리, Node 18+ |
| 데이터 저장 | Supabase/PostgreSQL | $0-25/월 | 오픈소스, 실시간 |
| 대시보드 | Metabase (자체 호스팅) | $0 | AGPL, GitHub 활발 유지보수 |
| 대안 대시보드 | Grafana | $0 | Prometheus 사용 시 |

## MRR/ARR 공식

```javascript
// MRR (Monthly Recurring Revenue)
const MRR = activeSubscriptions.reduce((sum, sub) => sum + sub.monthlyAmount, 0);

// ARR (Annual Recurring Revenue)
const ARR = MRR * 12;

// Churn Rate
const churnRate = (canceledMRR / startingMRR) * 100;

// Net MRR Churn
const netMRRChurn = ((contractionMRR - expansionMRR) / startingMRR) * 100;

// LTV (Customer Lifetime Value)
const avgRevenuePerCustomer = MRR / activeCustomerCount;
const LTV = avgRevenuePerCustomer / (churnRate / 100);
```

## Stripe Webhook 패턴

```javascript
// 핵심: raw body 사용 (parsed JSON 아님)
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

  // 중요 이벤트
  switch (event.type) {
    case 'customer.subscription.created':    // 신규 구독
    case 'customer.subscription.updated':    // 업/다운그레이드
    case 'customer.subscription.deleted':    // 해지
    case 'invoice.payment_succeeded':        // 결제 성공
    case 'invoice.payment_failed':           // 결제 실패
  }

  // 멱등성: event.id로 중복 처리 방지
  res.json({received: true});
});
```

## 대시보드 SQL (Metabase용)

```sql
-- 월별 MRR 추이
SELECT
  date_trunc('month', created_at) AS month,
  SUM(amount) / 100 AS mrr_usd,
  COUNT(DISTINCT customer_id) AS customers
FROM subscriptions
WHERE status = 'active'
GROUP BY 1
ORDER BY 1;

-- 월별 Churn Rate
SELECT
  date_trunc('month', canceled_at) AS month,
  COUNT(*) AS churned,
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') AS total,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM subscriptions WHERE status = 'active'), 0), 2) AS churn_pct
FROM subscriptions
WHERE canceled_at IS NOT NULL
GROUP BY 1;
```

## 프로젝트 적용 방법

1. `npm install stripe` — Stripe SDK 설치
2. Stripe Dashboard에서 Webhook 엔드포인트 등록
3. 이벤트를 DB에 저장 (위 패턴 참고)
4. Metabase Docker 설치: `docker run -d -p 3000:3000 metabase/metabase`
5. DB 연결 후 위 SQL로 대시보드 생성

## 참고
- [Stripe Webhook Best Practices](https://docs.stripe.com/webhooks)
- [Stripe npm](https://www.npmjs.com/package/stripe) (10M+ weekly DL)
- [Metabase](https://www.metabase.com/) (오픈소스 BI)
- [MRR/ARR 계산법](https://www.quantledger.app/blog/how-to-track-revenue-stripe)
