---
description: /dashboard — analytics.jsonl 시각화 + Module Health (team-roadmap Phase 0 산출물)
---

# /dashboard — Analytics & Module Health

`scripts/dashboard.mjs` 호출. 모든 모듈의 사용 빈도, 마지막 사용 시점, team-roadmap.md 기준 헬스 표시.

## 사용

```bash
# 전체 (기본 30d)
npx tsx scripts/dashboard.mjs

# 7일
npx tsx scripts/dashboard.mjs --period=7d

# 모듈 필터
npx tsx scripts/dashboard.mjs --module=marketing
npx tsx scripts/dashboard.mjs --module=design

# Module Health 표만
npx tsx scripts/dashboard.mjs --health

# JSON 출력 (다른 도구에 파이프)
npx tsx scripts/dashboard.mjs --json
```

## 출력 섹션

1. **By Skill** — skill 별 호출 횟수
2. **By Event** — event type 별 분포
3. **By Repo** — repo 별 분포
4. **🎯 Module Health** — team-roadmap.md 모듈 인벤토리
   - ✅ active (24h 내) / 🟡 weekly / 🟠 stale (14d) / 🔴 abandoned / ❌ unused
5. **Unused / Stale 알림** — 회고 트리거 또는 Gate 통과 권장

## 거버넌스 연동

- ❌ unused 모듈: 만든 지 14일 미만이면 Gate 미충족, ≥14일이면 회고 강제
- 🔴 abandoned: 모듈 폐기/축소 검토
- 🟡 weekly 이상: 정상 작동, 진척 누적 중

## 데이터 소스

- 기본 파일: `.context/analytics.jsonl`
- 스키마: `lib/analytics-schema.json`
- Helper 함수: `lib/analytics.ts` `logEvent()` / `logMarketingEvent()` / `logDesignAudit()`

## Phase 0 Gate 평가

`/dashboard` 호출이 다음을 보여주면 Phase 0 Gate 통과:
- ≥ 2개 모듈에서 실 사용 데이터 누적
- 마케팅 OR 디자인 모듈 ✅ active 또는 🟡 weekly
- 회고 1건 이상 작성됨 (`.context/retros/`)
