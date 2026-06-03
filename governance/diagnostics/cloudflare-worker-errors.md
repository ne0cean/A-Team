# Diagnostic: Cloudflare Worker 에러 진단

## 빠른 진단

| 증상 | 섹션 |
|------|------|
| 정상 경로가 500 반환 | [A] |
| 존재하지 않는 경로가 500 반환 | [B] |
| D1 쿼리 실패 | [C] |
| API 데이터 수정 후 반영 안 됨 | [D] |
| CORS 에러 | [E] |

---

## [A] 정상 경로가 500 반환

**증상**: `/api/workout` 등 구현된 경로에서 500

```
원인 트리:
  1. 해당 HTTP 메서드가 핸들러에 구현됐는가?
     → GET-only인데 POST/DELETE 요청 → 405 핸들러 없음
     → YES: 2번으로
  2. D1 쿼리가 실패하는가?
     → C섹션 참조
  3. 미구현 로직에 도달했는가?
     → throw new Error() 또는 undefined 접근
```

**진단**:
```bash
# Worker 로그 확인
wrangler tail --format=pretty 2>&1 | grep -E "error|Error|500"

# 메서드별 테스트
curl -X GET https://worker.dev/api/endpoint
curl -X POST https://worker.dev/api/endpoint  # 405 반환해야 함
curl -X DELETE https://worker.dev/api/endpoint  # 405 반환해야 함
```

**수정 패턴**:
```typescript
// ✅ 메서드 가드 추가
if (!['GET', 'POST'].includes(request.method)) {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Allow': 'GET, POST', 'Content-Type': 'application/json' },
  });
}
```

**재발 방지**: `governance/patterns/api-error-handling.md` 체크리스트

---

## [B] 존재하지 않는 경로가 500 반환

**증상**: `/nonexistent`, `/typo` 등에서 500 (404여야 정상)

```
원인: ASSETS.fetch()가 throw할 때 catch 없어서 Worker가 500으로 처리
수정: ASSETS.fetch를 try/catch로 감싸고 404 반환
```

**수정 전/후**:
```typescript
// ❌ try/catch 없음 → 500
return await env.ASSETS.fetch(request);

// ✅ 올바른 처리 → 404
try {
  return await env.ASSETS.fetch(request);
} catch {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## [C] D1 쿼리 실패

**증상**: D1 관련 API가 500 반환, "D1_ERROR" 또는 "no such table" 메시지

```
원인 트리:
  1. 테이블이 존재하는가?
     → 마이그레이션 미실행: wrangler d1 migrations apply
  2. 쿼리 문법 오류인가?
     → wrangler d1 execute로 직접 테스트
  3. 바인딩 이름이 wrangler.toml과 일치하는가?
     → env.DB vs env.CORTEX_DB 등 이름 불일치
```

**진단**:
```bash
# 테이블 목록 확인
wrangler d1 execute cortex-ritual-db --command "SELECT name FROM sqlite_master WHERE type='table'"

# 마이그레이션 상태
wrangler d1 migrations list cortex-ritual-db

# 직접 쿼리 테스트
wrangler d1 execute cortex-ritual-db --command "SELECT * FROM standing_orders LIMIT 1"
```

**주의**: D1 직접 수정은 데이터 소실 위험. HTTPS API → Read-Modify-Write 강제.
→ `governance/patterns/data-mutation.md` 참조

---

## [D] API 수정 후 데이터 반영 안 됨

**증상**: PATCH/PUT 성공(200) 반환했는데 GET으로 조회 시 이전 값

```
원인 트리:
  1. D1 트랜잭션이 커밋됐는가?
     → D1 API는 명시적 commit 불필요, 바로 반영
  2. 캐시가 살아있는가?
     → Worker KV 또는 브라우저 캐시
  3. 실제로 다른 키를 수정하는 버그인가?
     → 요청 body와 D1 쿼리 파라미터 로그 확인
```

**검증 패턴**:
```bash
# 수정 직후 재조회
curl -X PATCH https://worker.dev/api/data -d '{"key":"value"}'
sleep 1
curl https://worker.dev/api/data | jq '.key'  # "value" 여야 함
```

**원칙**: "ok:true" 응답만으로 완료 선언 금지. 반드시 재조회 확인.

---

## [E] CORS 에러

**증상**: 브라우저 콘솔에 `CORS policy: No 'Access-Control-Allow-Origin'`

```
원인: Worker OPTIONS preflight 핸들러 없음 또는 헤더 누락
```

**수정 패턴**:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// OPTIONS preflight
if (request.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// 모든 응답에 CORS 헤더 추가
return new Response(body, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
```

---

## 공통 진단 체크리스트

```bash
# 1. Worker 배포 상태 확인
wrangler deployments list --name cortex | head -3

# 2. 최근 에러 로그
wrangler tail --format=json 2>&1 | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        d = json.loads(line)
        if d.get('level') == 'error':
            print(d.get('message', ''))
    except: pass
" | head -20

# 3. 로컬 개발 서버로 재현
wrangler dev --local
curl http://localhost:8787/api/endpoint
```
