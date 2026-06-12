---
name: cloudflare-deploy
description: Cloudflare Workers 배포 패턴 — wrangler deploy, D1 마이그레이션, 시각 검증
tags: [cloudflare, workers, wrangler, d1, deploy, production]
---

# Cloudflare Deploy

## 언제 사용

- Workers / Pages 배포 시
- D1 데이터베이스 스키마 변경 시
- `sw.js` Service Worker 버전 업데이트 시
- 배포 후 완료 여부 확인 시

## 패턴

### Workers 배포

```bash
# 배포
npx wrangler deploy --config wrangler.toml

# 특정 환경
npx wrangler deploy --config wrangler.toml --env production
```

### 배포 후 시각 검증 (필수)

`curl 200` / `ok: true` = 완료 증거 아님. 화면에 기능이 작동해야 완료.

```bash
# API 동작 확인 (최소)
curl https://<your-worker>.workers.dev/api/health

# UI 실제 확인 (의무)
# ui-inspector 에이전트 또는 브라우저 스크린샷
```

### D1 배포 흐름

```bash
# 1. 스키마 마이그레이션
npx wrangler d1 execute <DB_NAME> --remote --file=migrations/001_init.sql

# 2. 데이터 검증
node scripts/verify-data.mjs

# 3. 검색 인덱스 재빌드 (필요 시)
node scripts/build-search-index.mjs
```

### sw.js 버전 bump 규칙

배포마다 `sw.js` 캐시 버전 증가 (현재: v34):

```javascript
const CACHE_NAME = 'cortex-v35';  // +1 bump
```

bump 없으면 클라이언트가 구버전 캐시 계속 사용.

### Cortex Dashboard 배포 체크리스트

```bash
# 1. D1 검색 인덱스 최신 상태 확인
node scripts/build-search-index.mjs --dry-run

# 2. wrangler.toml D1 binding 확인
grep "database_name" wrangler.toml

# 3. 배포
npx wrangler deploy --config scripts/cortex-dashboard/wrangler.toml

# 4. 검색 작동 확인
curl 'https://cortex.feat-breeze.workers.dev/api/cortex/search?q=테스트'
```

## 주의사항

- 배포 완료 선언 전 UI 시각 확인 필수 (CLAUDE.md 의무)
- D1 배포 후 `verify-data.mjs` 실행 필수
- `wrangler.toml`에 secrets 직접 기입 금지 → `wrangler secret put` 사용
- Workers URL: `https://cortex.feat-breeze.workers.dev`
