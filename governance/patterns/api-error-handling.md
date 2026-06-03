# Pattern: API Error Handling (Cloudflare Workers)

## 언제 사용

Cloudflare Worker에서 **라우팅, API 엔드포인트, 에러 응답**을 설계할 때 이 문서를 먼저 읽는다.
대상: `src/index.ts`, `worker.ts`, 모든 Worker fetch handler.

---

## 핵심 원칙 (불변 규칙)

1. **모든 라우트에 405 핸들러** — GET-only 엔드포인트에 POST 오면 500이 아닌 405 반환.
2. **존재하지 않는 경로 = 404** — ASSETS.fetch 실패를 그냥 throw하면 500. try/catch 필수.
3. **API vs 정적 라우팅 명시적 분리** — `/api/*` 는 JSON, 그 외는 ASSETS. 분기를 명확히.
4. **에러 응답도 JSON** — API 경로에서 HTML 에러 반환 금지. `{ error: "..." }` 형식 유지.
5. **catch-all은 마지막에** — 라우트 순서: 정확한 경로 → 패턴 매칭 → catch-all.

---

## 설계 체크리스트 (구현 전 필수 확인)

```
[ ] 각 API 엔드포인트에 허용 메서드 목록이 있는가?
[ ] 허용되지 않은 메서드 → 405 + Allow 헤더 반환?
[ ] ASSETS.fetch가 try/catch로 감싸져 있는가?
[ ] 404 fallback이 500 대신 proper 404 JSON/HTML을 반환하는가?
[ ] /api/* 경로가 항상 application/json Content-Type 반환하는가?
[ ] 에러 메시지에 스택 트레이스가 노출되지 않는가?
```

---

## 표준 패턴

```typescript
// ✅ 메서드 체크
if (request.method !== 'GET') {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Allow': 'GET', 'Content-Type': 'application/json' },
  });
}

// ✅ 정적 에셋 404 처리
try {
  return await env.ASSETS.fetch(request);
} catch {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ✅ API vs 정적 분기
if (url.pathname.startsWith('/api/')) {
  return handleApi(request, env);
}
return handleStatic(request, env);
```

---

## 안티패턴

```typescript
// ❌ 메서드 체크 없음 → GET-only 엔드포인트에 POST 오면 500
export default { async fetch(request) { /* 메서드 체크 없이 바로 처리 */ } }

// ❌ ASSETS.fetch throw → 500
return await env.ASSETS.fetch(request);  // try/catch 없음

// ❌ API 경로에서 HTML 에러
return new Response('<h1>Error</h1>', { status: 500 });

// ❌ 에러에 스택 노출
return new Response(JSON.stringify({ error: err.stack }), { status: 500 });
```

---

## HTTP 상태 코드 결정 트리

```
요청 수신
  ├─ 경로 없음 → 404
  ├─ 경로 있음
  │    ├─ 메서드 불일치 → 405 (Allow 헤더 포함)
  │    ├─ 인증 없음 → 401
  │    ├─ 권한 없음 → 403
  │    ├─ 입력 오류 → 400 + 이유
  │    ├─ 서버 오류 → 500 (스택 비노출)
  │    └─ 성공 → 200/201/204
```

---

## 사고 사례

| 이슈 | 증상 | 원인 | 수정 |
|------|------|------|------|
| #24 (2026-06) | GET /api/workout → 500 | 메서드 체크 없이 존재하지 않는 로직 접근 | 405 핸들러 추가 |
| #26 (2026-06) | /nonexistent → 500 | ASSETS.fetch throw를 catch 안 함 | try/catch → 404 |
