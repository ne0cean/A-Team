# Task Spec: [태스크명]

> 이 템플릿을 PARALLEL_PLAN.md 또는 ClawTeam 태스크 설명에 붙여 쓴다.
> 에이전트에게 전달되는 "프롬프트"가 바로 이 명세다. 구체적일수록 결과가 좋다.

---

**담당**: [agent-name]
**모델**: [Claude Sonnet / Gemini Pro / 등]
**예상 시간**: [X분 / X시간]
**의존**: [선행 태스크 ID 또는 없음]
**블록**: [후행 태스크 ID 또는 없음]

---

## 목표

[한 문장. "무엇을 만드는가?"]

예: `POST /auth/google/callback` 엔드포인트를 구현해 Google OAuth 인증 플로우를 완성한다.

---

## 기술 명세

### 엔드포인트 / 컴포넌트 / 함수

```
[API라면]
메서드 + 경로: POST /auth/google/callback

Request:
  { "code": string, "state": string }

Response (성공, 200):
  { "accessToken": string, "refreshToken": string, "user": { id, email, name } }

Response (실패):
  401 → { "error": "invalid_code" }
  400 → { "error": "state_mismatch" }

[컴포넌트라면]
컴포넌트명: GoogleLoginButton
Props: { onSuccess: (token: string) => void, disabled?: boolean }
파일 경로: src/components/auth/GoogleLoginButton.tsx
```

### 사용 라이브러리

- [라이브러리명] — [용도]
- 예: `passport-google-oauth20` — OAuth 처리
- 예: `jsonwebtoken` — JWT 발급

### 에러 처리

| 케이스 | 처리 방식 |
|--------|----------|
| 유효하지 않은 code | 401 반환 |
| DB 연결 실패 | 500 + 로그 |
| state mismatch | 400 (CSRF 방지) |

### 파일 소유권

```
신규 생성:
- server/routes/auth.js

수정:
- server/app.js  (라우트 등록)

건드리지 않음:
- server/models/  (다른 에이전트 담당)
```

---

## 완료 기준 (Definition of Done)

아래를 모두 만족해야 "완료"다.

- [ ] [핵심 기능 동작 확인 방법]
  - 예: `curl -X POST http://localhost:3000/auth/google/callback -d '{"code":"..."}' → 200 OK`
- [ ] 단위 테스트 통과
  - 예: 정상 플로우 / 코드 만료 / DB 오류 케이스 3개
- [ ] `npm run build` (또는 해당 빌드 명령) 통과
- [ ] 관련 타입 오류 없음 (TypeScript 프로젝트)
- [ ] [추가 검증 조건]

---

## 산출물

완료 후 남겨야 하는 것들:

- `server/routes/auth.js` — OAuth 콜백 엔드포인트
- `tests/auth.test.js` — 단위 테스트 3개
- CURRENT.md "Last Completions" 갱신

---

## 참고 / 컨텍스트

[다른 에이전트가 먼저 만든 인터페이스나, 이 에이전트가 알아야 할 배경 정보]

예:
- DB 스키마는 Worker1이 완료 후 CURRENT.md에 기록함
- JWT 시크릿 키는 환경변수 `JWT_SECRET` 참조
- 프론트엔드와 합의한 API 스펙: `/docs/api-contract.md`

---

> 완료 시: CURRENT.md 갱신 + `clawteam task update {team} $TASK_ID --status completed`
