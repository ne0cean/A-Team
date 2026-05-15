# Weekly Report — 2026-W19
Generated: 2026-05-15T10:13:29Z

## Overview
| Metric | This Week | Prev Week | Delta |
|--------|-----------|-----------|-------|
| Events | 192 | 168 | +24 |
| Sessions | 5 | 3 | +2 |
| Design Audits | 125 | 160 | -35 |
| Design Avg Score | 45 | 55 | -10 |
| Design Pass Rate | 42% | 53% | -11p |

## Event Breakdown
| Event | Count |
|-------|-------|
| design_audit | 125 |
| agent_stop | 29 |
| agent_start | 26 |
| session_start | 5 |
| session_end | 5 |
| skill_used | 1 |
| prompt_quality | 1 |

## Business KPIs
*No revenue data yet. Create `.context/revenue.json` when first revenue arrives:*
```json
{"mrr":0,"arr":0,"customers":0,"churn_rate":null,"prev_mrr":0,"prev_customers":0,"published_content":0}
```

## Anomalies
Found 2 (0 critical, 1 warning, 1 info)

- [INFO] 최대 이벤트 공백 3.8일 (2026-04-21 이후)
- [WARN] 2026-05-13: 520건 (z=3.5, 평균=65.8)

## Capability Coverage
**Weighted Average: 44%**

| Department | Avg | Weight | Top Gaps |
|------------|-----|--------|----------|
| engineering | 69% | 20% | - |
| marketing | 30% | 20% | publishing, performance-marketing, crm-lifecycle |
| design | 45% | 15% | ux-research, prototyping |
| qa | 43% | 10% | usability-testing |
| analytics | 51% | 15% | external-bi |
| operations | 47% | 10% | pr-cs |
| sales-cs | 8% | 10% | lead-generation, sales-automation, onboarding |

## Recommendations
- Weakest department: **sales-cs** (8%) — prioritize gaps: lead-generation, sales-automation
