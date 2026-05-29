# System Health Report — 2026-05-26

## Score: 70/100 🟡

## 모델 오케스트레이션 (2주)
- 세션 수: 14
- 에이전트 호출: 189건
- 모델 전환 이벤트: 0건 ⚠️ 미추적

### 에이전트 사용 분포
- unknown: 189회

## LaunchD 데몬 상태
- com.ateam.absorb-weekly: ✅
- com.ateam.auto-switch: ✅
- com.ateam.claude-remote-tunnel: ✅
- com.ateam.cortex-health: ✅
- com.ateam.daily-backup: ✅
- com.ateam.daily-brief-collect: ✅
- com.ateam.sleep-resume.longform: ✅
- com.ateam.sleep-resume: ✅
- com.ateam.sleep-resume.trading: ✅
- com.ateam.telegram-inbox: ✅
- com.ateam.weekly-dashboard: ✅
- com.ateam.weekly-security: ✅

## 통합 누락
- ⚠️ CLAUDE.md에 미언급 커맨드 44개
- ⚠️ 테스트 없는 신규 스크립트: scripts/cortex-access-log.mjs, scripts/cortex-catalog.mjs, scripts/cortex-health.mjs, scripts/cortex-tidy-apply.mjs, scripts/cortex-tidy-pick.mjs, scripts/telegram-inbox.mjs, scripts/migrate-ritual-data.mjs, scripts/classify-dashboard.mjs, scripts/reorganize-cortex.mjs, scripts/classify-staging.mjs, scripts/cortex-graph.mjs, scripts/portfolio-insights.mjs, scripts/wiki-ingest.mjs, scripts/wiki-lint.mjs, scripts/cortex-dashboard/server.mjs, scripts/check-scheduled-reviews.mjs, scripts/sync-agents.mjs, scripts/design-learn.mjs, scripts/design-score.mjs, scripts/design-drift-detect.mjs, scripts/daily-brief-collect.mjs, scripts/health-check.mjs

## 신규 스크립트 (2주)
- scripts/cortex-access-log.mjs ⚠️ 테스트 없음
- scripts/cortex-catalog.mjs ⚠️ 테스트 없음
- scripts/cortex-health.mjs ⚠️ 테스트 없음
- scripts/cortex-tidy-apply.mjs ⚠️ 테스트 없음
- scripts/cortex-tidy-pick.mjs ⚠️ 테스트 없음
- scripts/telegram-inbox.mjs ⚠️ 테스트 없음
- scripts/migrate-ritual-data.mjs ⚠️ 테스트 없음
- scripts/classify-dashboard.mjs ⚠️ 테스트 없음
- scripts/reorganize-cortex.mjs ⚠️ 테스트 없음
- scripts/classify-staging.mjs ⚠️ 테스트 없음
- scripts/cortex-graph.mjs ⚠️ 테스트 없음
- scripts/portfolio-insights.mjs ⚠️ 테스트 없음
- scripts/wiki-ingest.mjs ⚠️ 테스트 없음
- scripts/wiki-lint.mjs ⚠️ 테스트 없음
- scripts/cortex-dashboard/server.mjs ⚠️ 테스트 없음
- scripts/check-scheduled-reviews.mjs ⚠️ 테스트 없음
- scripts/ppt/benchmark-audit.mjs ✅
- scripts/ppt/benchmark-corpus.mjs ✅
- scripts/sync-agents.mjs ⚠️ 테스트 없음
- scripts/design-learn.mjs ⚠️ 테스트 없음
- scripts/design-score.mjs ⚠️ 테스트 없음
- scripts/design-drift-detect.mjs ⚠️ 테스트 없음
- scripts/daily-brief-collect.mjs ⚠️ 테스트 없음
- scripts/trajectory-eval.mjs ✅
- scripts/anomaly-detect.mjs ✅
- scripts/weekly-report.mjs ✅
- scripts/health-check.mjs ⚠️ 테스트 없음

## Cortex Tier 상태
- 접근 로그: 0건
- Tier 2 전환: 대기 중 (0/100)

## 이슈 요약
- 모델 전환 추적 미작동 (이벤트 0건)
- 테스트 없는 신규 스크립트 22개
- CLAUDE.md에 미언급 커맨드 44개
- 테스트 없는 신규 스크립트: scripts/cortex-access-log.mjs, scripts/cortex-catalog.mjs, scripts/cortex-health.mjs, scripts/cortex-tidy-apply.mjs, scripts/cortex-tidy-pick.mjs, scripts/telegram-inbox.mjs, scripts/migrate-ritual-data.mjs, scripts/classify-dashboard.mjs, scripts/reorganize-cortex.mjs, scripts/classify-staging.mjs, scripts/cortex-graph.mjs, scripts/portfolio-insights.mjs, scripts/wiki-ingest.mjs, scripts/wiki-lint.mjs, scripts/cortex-dashboard/server.mjs, scripts/check-scheduled-reviews.mjs, scripts/sync-agents.mjs, scripts/design-learn.mjs, scripts/design-score.mjs, scripts/design-drift-detect.mjs, scripts/daily-brief-collect.mjs, scripts/health-check.mjs

## 권고

- model_switch 이벤트 로깅 추가 필요
- 신규 스크립트 테스트 작성: scripts/cortex-access-log.mjs, scripts/cortex-catalog.mjs, scripts/cortex-health.mjs

