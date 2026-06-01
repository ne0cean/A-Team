# Cortex Dashboard — 필수 규칙

## 편집 전 반드시 읽을 것
**`DECISIONS.md` 먼저 읽기** — Feature Registry, PRE-EDIT 체크리스트, INTENTIONALLY REMOVED 목록 포함.

```bash
# 편집 전 필수 실행
grep -n "Preserve workout" worker/src/index.js
grep -n "!i._frame" worker/src/index.js
grep -n "capture: true" public/js/app.js
grep -n "window.fetch = " public/js/app.js
```

하나라도 없으면 **편집/배포 중단**.

---

## D1 데이터 무결성 (절대 원칙)

**D1이 SSOT.** 로컬 JSON 파일은 읽기 전용 백업.

| 금지 | 대신 |
|------|------|
| `POST /api/*` 전체 교체 | `PATCH` API 부분 수정 |
| 로컬 JSON → D1 직접 push | `node` HTTPS fetch → 수정 → 저장 |
| `curl` 로 D1 조작 | RTK hook이 output 가로챔, 반드시 `node` 사용 |
| `INSERT OR REPLACE` | `INSERT OR IGNORE` |
| 검증 없이 "완료" 선언 | 배포 후 GET API로 D1 상태 확인 |

### seed.sql/schema.sql 배포 시
- `INSERT OR IGNORE` 확인 필수 (`grep "INSERT OR" worker/schema.sql`)
- 배포 후 반드시 `curl https://cortex.feat-breeze.workers.dev/api/month?ym=$(date +%Y-%m)` 로 데이터 생존 확인

---

## 배포 URL (절대 변경 금지)
`https://cortex.feat-breeze.workers.dev`

Worker: `wrangler deploy` (from `worker/` 디렉토리)
Assets: Cloudflare Workers static assets (`public/`)

---

## 소스 구조
- `public/js/app.js` — 프론트엔드 (vanilla JS)
- `worker/src/index.js` — Cloudflare Worker
- `worker/schema.sql` — D1 스키마 (INSERT OR IGNORE 전용)
- `public/sw.js` — Service Worker (버전 bump 필수)

---

참조: [DECISIONS.md](DECISIONS.md)
