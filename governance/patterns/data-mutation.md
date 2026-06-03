# Pattern: Data Mutation (D1 / 외부 데이터)

## 언제 사용

D1 데이터베이스, 외부 API, 또는 사용자가 실시간으로 편집하는 데이터를 **수정할 때** 이 문서를 먼저 읽는다.
대상: Cortex Dashboard standing-orders, ritual-routine JSON, 모든 PUT/PATCH/DELETE 작업.

---

## 핵심 원칙 (불변 규칙)

1. **Read-Modify-Write** — 수정 전 반드시 현재 값을 먼저 읽는다. 전제 교체는 없다.
2. **로컬 파일 → 원격 push 절대 금지** — 로컬 JSON을 D1에 통째로 push하면 사용자 편집이 소실된다.
3. **PATCH 우선** — PUT/전체 교체가 아닌 PATCH(부분 수정)를 우선 설계한다.
4. **백업 먼저** — 수정 전 `.bak` 파일 생성 또는 트랜잭션 사용.
5. **"ok: true" 만으로 완료 선언 금지** — API 응답 후 반드시 실제 DB 조회로 반영 확인.

---

## 설계 체크리스트 (구현 전 필수 확인)

```
[ ] 수정 전 현재 데이터를 READ 하는 코드가 있는가?
[ ] 전체 교체(replace all) 대신 부분 수정(patch/merge)인가?
[ ] 수정 후 DB 재조회로 반영 확인하는가?
[ ] 실패 시 롤백 또는 사용자에게 에러 알림이 있는가?
[ ] 로컬 파일을 원격에 직접 push하는 코드가 없는가?
[ ] curl 대신 Node.js fetch를 사용하는가? (RTK hook으로 curl 깨짐)
```

---

## Cortex D1 강제 규칙 (특수)

```
D1 데이터 수정 = 반드시 HTTPS API → Read → Modify → Write
```

```js
// ✅ 올바른 패턴
const current = await fetch('https://cortex.feat-breeze.workers.dev/api/standing-orders').then(r => r.json());
const updated = { ...current, [key]: newValue };  // 부분 수정
await fetch('https://cortex.feat-breeze.workers.dev/api/standing-orders', {
  method: 'PATCH',
  body: JSON.stringify({ [key]: newValue }),
});
// 반영 확인
const verify = await fetch('https://cortex.feat-breeze.workers.dev/api/standing-orders').then(r => r.json());

// ❌ 절대 금지
// wrangler d1 execute cortex-ritual-db --command "DELETE FROM ..."  (직접 SQL)
// wrangler d1 execute cortex-ritual-db --file local.sql             (로컬 파일 push)
```

---

## 안티패턴

```
❌ 로컬 JSON 파일을 D1에 통째로 업로드
❌ wrangler d1 execute로 데이터 직접 조작 (D1 SSOT 위반)
❌ API 응답 ok:true만 보고 완료 선언
❌ 수정 전 백업 없이 destructive 작업
❌ 여러 필드를 한 번에 교체하는 PUT (사용자 동시 편집 소실)
```

---

## 사고 사례 (재발 방지)

| 날짜 | 사건 | 원인 | 결과 |
|------|------|------|------|
| 2026-05-31 | standing-orders 3회 소실 | 로컬 파일로 D1 전체 교체 | 사용자 편집 반복 소실 |
| 이전 | worker array check 차단 | replace 액션을 배열 여부 체크가 막음 | API 에러 |

---

## 참조

- `lesson_d1_ssot_read_modify_write.md` (memory/)
- `lesson_never_overwrite_live_data.md` (memory/)
- A-Team CLAUDE.md "Cortex Ritual Dashboard (SSOT)" 섹션
