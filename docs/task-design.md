# 태스크 설계 방법론

멀티 에이전트 시스템에서 태스크 설계는 **에이전트에게 프롬프팅하는 것과 완전히 동일**하다.
잘 쪼개진 태스크 = 잘 작동하는 스웜.

---

## 4단계 설계 프로세스

### 1단계 — 작업 분해 (Task Decomposition)

PRD의 사용자 스토리 하나를 가져와, 이를 구현하기 위한 **모든 기술적 작업**을 나열한다.

**예시**: "소셜 로그인" 스토리

```
❌ 나쁜 분해 (너무 큼)
- [ ] 소셜 로그인 구현

✅ 좋은 분해 (에이전트 한 명이 처리 가능한 단위)
- [ ] 프론트엔드: Google OAuth 버튼 UI 작성
- [ ] 프론트엔드: OAuth 콜백 페이지 라우팅
- [ ] 백엔드: Google OAuth 콜백 API 엔드포인트
- [ ] 백엔드: JWT 발급 + 리프레시 토큰 로직
- [ ] DB: users 테이블에 social_id, provider 컬럼 추가
- [ ] 테스트: OAuth 플로우 통합 테스트
```

**분해 기준**:
- 태스크 하나 = 에이전트 한 명이 독립적으로 완료 가능
- 코드 변경량: 100~200줄 이하
- 완료 기준이 명확 (무엇을 만들면 "완료"인지)

---

### 2단계 — 기술 명세 (Technical Specification)

각 태스크에 **구체적인 기술 결정**을 내린다. 모호한 태스크는 에이전트가 잘못 구현한다.

```markdown
## Task: 백엔드 Google OAuth 콜백 API

### 엔드포인트
POST /auth/google/callback

### Request
{ "code": "string", "state": "string" }

### Response (성공)
{ "accessToken": "jwt...", "refreshToken": "...", "user": { "id", "email", "name" } }

### Response (실패)
{ "error": "invalid_code" }  // 401

### 라이브러리
- passport-google-oauth20 (OAuth 처리)
- jsonwebtoken (JWT 발급)
- express-rate-limit (rate limiting)

### 에러 처리
- 유효하지 않은 code → 401
- DB 오류 → 500 + Sentry 로깅
- state mismatch → 400 (CSRF 방지)

### 완료 기준
- [ ] curl로 정상 플로우 수동 테스트 통과
- [ ] 단위 테스트 3개 (정상, 코드 만료, DB 오류)
```

---

### 3단계 — 의존성 파악 (Dependencies)

벽을 세우기 전에 기초 공사. **선후 관계**를 정의해야 병렬 실행이 가능하다.

```
DB 마이그레이션
    │
    ├──→ 백엔드 OAuth API    ──→ 백엔드 테스트
    │                              │
    └──→ 프론트엔드 버튼 UI  ──→ 프론트엔드 통합 테스트
              (병렬 가능)
```

**ClawTeam으로 표현**:

```bash
# DB 마이그레이션 먼저
T1=$(clawteam --json task create my-team "DB: social_id 컬럼 추가" -o worker1 | jq -r '.id')

# DB 완료 후 진행 (자동 블록 해제)
T2=$(clawteam --json task create my-team "백엔드: OAuth API" -o worker2 --blocked-by $T1 | jq -r '.id')
T3=$(clawteam --json task create my-team "프론트엔드: 소셜 로그인 버튼" -o worker3 --blocked-by $T1 | jq -r '.id')

# 둘 다 완료 후 통합 테스트
clawteam task create my-team "통합 테스트" -o worker4 --blocked-by $T2,$T3
```

**의존성 유형**:

| 유형 | 예시 | 처리 |
|------|------|------|
| 순차 필수 | DB → API → 테스트 | `--blocked-by` |
| 병렬 가능 | 프론트 UI ↔ 백엔드 API | 동시 스폰 |
| 공유 인터페이스 | API 스펙 먼저 합의 | 명세 문서 선행 |

---

### 4단계 — 산출물 및 일정 (Deliverables & Timeline)

각 태스크가 **언제까지, 무엇을 만들어야** 하는지 명시한다.

```markdown
## 소셜 로그인 — 태스크 일정

| 태스크 | 담당 | 예상 시간 | 산출물 | 마감 |
|--------|------|-----------|--------|------|
| DB 마이그레이션 | worker1 | 30분 | migration file, 적용 완료 | Day 1 오전 |
| 백엔드 OAuth API | worker2 | 2시간 | /auth/google/callback 엔드포인트 | Day 1 오후 |
| 프론트엔드 버튼 | worker3 | 1시간 | GoogleLoginButton 컴포넌트 | Day 1 오후 |
| 백엔드 테스트 | worker2 | 1시간 | 테스트 3개 통과 | Day 2 오전 |
| 통합 테스트 | worker4 | 1시간 | E2E 플로우 통과 | Day 2 오전 |

전체 예상: 1.5일 (병렬 실행 기준)
```

**일정 수립 원칙**:
- 에이전트 병렬 실행을 고려한 **벽시계 시간(wall time)** 기준으로 산출
- 의존 태스크가 늦어지면 하위 태스크도 자동 밀림 → 크리티컬 패스 파악 필수
- 버퍼 20%: 에이전트 재시도, 리뷰 사이클 고려

---

## 태스크 템플릿

```markdown
## Task: [태스크명]

**담당**: [agent-name]
**예상 시간**: [X시간]
**의존**: [선행 태스크 ID 또는 없음]
**블록**: [후행 태스크 ID 또는 없음]

### 목표
[한 문장으로 무엇을 만드는지]

### 기술 명세
- 엔드포인트 / 컴포넌트명:
- 입력/출력 형식:
- 사용 라이브러리:
- 에러 처리:

### 완료 기준 (Definition of Done)
- [ ] [검증 조건 1]
- [ ] [검증 조건 2]
- [ ] 빌드/테스트 통과

### 산출물
- [파일 경로 또는 결과물]
```

---

## 안티패턴

| 패턴 | 문제 | 해결 |
|------|------|------|
| 태스크가 너무 큼 | 에이전트가 방향을 잃음 | 100줄 이하 단위로 분해 |
| 명세 없는 태스크 | 에이전트가 임의로 결정 | API 스펙, 파일명까지 명시 |
| 의존성 미파악 | 인터페이스 불일치, 재작업 | 공유 인터페이스 먼저 합의 |
| 완료 기준 없음 | 에이전트가 언제 멈춰야 할지 모름 | DoD 체크리스트 필수 |
