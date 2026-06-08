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

Worker: `wrangler deploy --config wrangler.toml` (from `worker/` 디렉토리) — **반드시 --config 명시** (없으면 parent wrangler.jsonc가 override, cortex-dashboard static에 잘못 배포됨)
Assets: Cloudflare Workers static assets (`public/`)

---

## Service Worker 버전 bump — 사전 경고 필수 (절대 원칙)

`public/sw.js` 의 `CACHE` 버전을 올리면 **브라우저가 열린 모든 탭을 즉시 강제 리로드**한다.
(`skipWaiting()` + `clients.claim()` 콤보 → 새 SW가 모든 클라이언트 즉시 점유)

**bump 전 반드시 사용자에게 알릴 것:**
> "SW 버전을 올리면 현재 열린 모든 탭이 강제 새로고침됩니다. 진행할까요?"

사용자 확인 없이 bump + 배포 = 금지.

---

## 소스 구조
- `public/js/app.js` — 프론트엔드 (vanilla JS)
- `worker/src/index.js` — Cloudflare Worker
- `worker/schema.sql` — D1 스키마 (INSERT OR IGNORE 전용)
- `public/sw.js` — Service Worker (버전 bump = 탭 전체 리로드, 사전 경고 필수)

---

참조: [DECISIONS.md](DECISIONS.md)

---

## 로컬 백업 시스템 (필수 숙지)

`scripts/cortex-dashboard/backups/` — **14일치 daily snapshot** (Mac launchd 매일 18:00 KST 자동 실행)

| 파일 | 내용 |
|------|------|
| `backups/YYYY-MM-DD.json` | 전월~익익월 4개월 + standing-orders + day-frames + vision 전체 |
| `backups/backup.log` | 실행 이력 |

```bash
# 가용 백업 목록
node scripts/cortex-dashboard/backup-d1.mjs --list

# 특정 날짜 snapshot 확인
node scripts/cortex-dashboard/backup-d1.mjs --restore YYYY-MM-DD

# 특정 day/category 복원
node scripts/cortex-dashboard/backup-d1.mjs --restore-day YYYY-MM-DD day [category]
```

---

## "복구 불가" 선언 금지 조건 (절대 원칙)

다음 순서를 **전부** 확인하기 전 "복구 불가", "영구 소실", "백업 없음" 단언 금지:

1. `ls scripts/cortex-dashboard/backups/` — 로컬 daily snapshot 존재 여부 (14일치)
2. `GET /api/backups?key=YYYY-MM` — D1 recent 5개 + daily checkpoint 30개
3. `node scripts/cortex-dashboard/backup-d1.mjs --list` — 백업 파일 내용 직접 확인

위 3단계 모두 확인 후에도 해당 데이터가 없을 때만 "복구 불가"를 선언할 수 있다.
선언 시 반드시 각 단계 확인 결과를 함께 보고한다.
