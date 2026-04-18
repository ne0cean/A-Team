# WF-4: Analytics + Self-Improvement Loop (Make.com)

> 매주 월요일 09:00 KST 자동 실행.
> 성과 데이터 수집 → 패턴 분석 → 프롬프트 자동 개선 제안.

## 시나리오 구조

```
[Schedule: 매주 월 09:00]
    ↓
[GA4 API: 지난 7일 블로그 성과]
    ↓
[Postiz API: 지난 7일 SNS 성과]
    ↓
[ConvertKit API: 이메일 성과]
    ↓
[Aggregate: 통합 성과 데이터]
    ↓
[Save: content/analytics/YYYY-WW-weekly-data.json]
    ↓
[Claude API: 패턴 분석 + 프롬프트 개선 제안]
    ↓
[Compare: 이번주 vs 지난주]
    ↓
[Slack 알림: 주간 리포트 + 개선 제안]
    ↓
[Wait: 인간 승인 (개선 적용 여부)]
    ↓ (approved)
[Git: prompts/ 자동 업데이트 + commit]
    ↓
[Slack: 변경 로그 알림]
```

## 모듈 설정

### 1. Schedule
- Frequency: Weekly
- Day: Monday
- Time: 09:00 KST
- Timezone: Asia/Seoul

### 2. GA4 API 모듈
```
URL: https://analyticsdata.googleapis.com/v1beta/properties/{{GA4_PROPERTY_ID}}:runReport
Auth: Google Service Account (OAuth)
Body:
{
  "dateRanges": [{"startDate": "7daysAgo", "endDate": "yesterday"}],
  "dimensions": [{"name": "pagePath"}, {"name": "sessionMedium"}],
  "metrics": [
    {"name": "screenPageViews"},
    {"name": "averageSessionDuration"},
    {"name": "bounceRate"},
    {"name": "conversions"}
  ],
  "limit": 100
}
```

### 3. Postiz Analytics 모듈
```
URL: {{POSTIZ_API_URL}}/api/analytics/weekly
Method: GET
Headers:
  Authorization: Bearer {{POSTIZ_API_KEY}}
Query:
  start_date: {{7daysAgo}}
  end_date: {{yesterday}}
Response:
{
  "platforms": {
    "twitter": { "impressions": N, "engagements": N, "ctr": 0.xx },
    "linkedin": {...},
    "instagram": {...}
  }
}
```

### 4. Aggregate (Function)
```javascript
const aggregate = {
  week: getWeekNumber(new Date()),
  blog: {
    total_views: ga4_data.totalScreenPageViews,
    avg_session: ga4_data.avgDuration,
    top_pages: ga4_data.rows.slice(0, 5)
  },
  social: postiz_data.platforms,
  email: convertkit_data,
  comparison_vs_last_week: calculateDelta(this_week, last_week)
};

return aggregate;
```

### 5. Claude 패턴 분석 (Anthropic API)
```
Model: claude-opus-4-7  (인사이트 추출에 최고 모델)
System: |
  You are analyzing a content marketing system's weekly performance data.
  Identify:
  1. Top performer (specific content + why it won)
  2. Bottom performer (specific reason)
  3. 3 patterns in winning content
  4. 3 specific prompt improvements to test next week
  5. Any content type to KILL (consistently underperforming 4+ weeks)

User: |
  Weekly data:
  {{aggregate_json}}
  
  Previous 4 weeks for context:
  {{historical_data}}
```

### 6. Save Weekly Report
```
Path: content/analytics/2026-WW-weekly-report.md
Format:
---
# Weekly Report — Week NN, YYYY

## Summary
- Total content: N
- Top performer: {title} ({metric})
- Bottom performer: {title} ({metric})

## Patterns Detected
1. {pattern}
2. {pattern}
3. {pattern}

## Prompt Improvement Proposals
### blog.md
- Current: "{snippet}"
- Proposed: "{improved snippet}"
- Reason: {data-backed rationale}

### social-twitter.md
- Current: ...
- Proposed: ...

## Kill Recommendations
- {content type}: avg N% of benchmark for 4 weeks → KILL

## Approval
[ ] Apply all proposals
[ ] Apply selected only (specify)
[ ] Reject all
---
```

### 7. Slack 주간 알림
```
Channel: #weekly-review
Message:
📊 Week {{N}} 성과 리포트

전주 대비:
- 총 노출: {{delta_impressions}} ({{percentage}})
- 클릭률: {{delta_ctr}}
- 이메일 가입: {{delta_emails}}

🏆 베스트: {{top_title}}
💡 개선 제안: {{N}}건

리포트: {{report_url}}
승인: 👍 / 검토 필요: 🔍
```

### 8. Auto-update Prompts (Git)
```
승인 시:
1. content/analytics/YYYY-WW-weekly-report.md 의 "Approved" 섹션 파싱
2. 각 prompt 파일 업데이트
3. git commit:
   "prompt-improvement: Week NN — {summary}
   
   Based on analytics from {date_range}.
   Affected prompts: {list}
   Expected improvement: {N}%"
4. git push
```

### 9. Changelog 알림
```
Slack #content-pipeline:
✅ 프롬프트 자동 업데이트 완료
변경:
- blog.md: hook strategy 강화
- social-twitter.md: data-driven hook 패턴 추가

Commit: {git_hash}
다음 주 예상 효과: +{N}% engagement
```

## 안전 장치

- **자동 적용 금지**: 모든 변경은 인간 승인 필수
- **롤백 가능**: git history로 이전 프롬프트 복원 가능
- **A/B 테스트**: 새 프롬프트는 50% 트래픽으로 1주 운영 → 검증 후 100%

## 비용

- GA4 API: 무료 (할당량 충분)
- Postiz API: Postiz 구독에 포함
- Claude Opus 호출 (주 1회): ~$0.50
- Make.com ops: ~50/주
- 합계: ~$2/월
