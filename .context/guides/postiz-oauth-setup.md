# Postiz OAuth 설정 가이드

> 소요 시간: 10-15분
> 목적: Phase 2, 3 발행 블로커 해소

---

## 사전 확인

### Postiz Docker 상태 확인
```bash
cd ~/Projects/postiz
docker compose ps
```

**기대 결과**: `postiz` 컨테이너가 `running` 상태

**문제 시**:
```bash
docker compose up -d
```

---

## OAuth 설정 단계

### Step 1: Postiz 대시보드 접속 & 계정 생성
브라우저에서 열기:
```
http://localhost:4007
```

**⚠️ 중요**: Postiz는 이메일/비밀번호 로그인을 사용합니다 (Google OAuth 아님)

**첫 접속 시 계정 생성**:
1. **"Sign Up"** 또는 **"Create Account"** 버튼 클릭
2. 다음 정보 입력:
   - Email: 원하는 이메일 (예: user@example.com)
   - Password: 안전한 비밀번호 (8자 이상 권장)
   - Organization: "A-Team" (또는 원하는 이름)
3. **"Create Account"** 클릭
4. 계정 생성 후 자동 로그인

---

### Step 2: Twitter OAuth 연결

1. **Settings** (좌측 메뉴) → **Integrations** → **Twitter**
2. **"Connect Twitter"** 클릭
3. Twitter OAuth flow:
   - Twitter 로그인
   - Postiz 앱 권한 승인
   - Redirect → Postiz 대시보드
4. **확인**: Twitter 계정이 "Connected" 상태

**필요한 권한**:
- Tweet 작성
- Tweet 읽기
- 사용자 정보 읽기

---

### Step 3: LinkedIn OAuth 연결

1. **Settings** → **Integrations** → **LinkedIn**
2. **"Connect LinkedIn"** 클릭
3. LinkedIn OAuth flow:
   - LinkedIn 로그인
   - Postiz 앱 권한 승인
   - Redirect → Postiz 대시보드
4. **확인**: LinkedIn 계정이 "Connected" 상태

**필요한 권한**:
- Share content
- Read profile

---

### Step 4: (선택) 추가 채널

**현재 캠페인에 필요한 최소 채널**:
- ✅ Twitter (필수)
- ✅ LinkedIn (필수)

**추가 가능한 채널** (나중에):
- Facebook
- Instagram
- Reddit
- Medium
- Dev.to

---

## 설정 검증

### 연결 확인
Postiz 대시보드에서:
1. **Settings** → **Integrations**
2. Twitter, LinkedIn 모두 "Connected" 상태 확인
3. 각 계정 옆에 **녹색 체크** 표시

### 테스트 포스팅
1. **Create Post** (좌측 메뉴)
2. 간단한 테스트 메시지 작성: "Test post from Postiz"
3. Twitter, LinkedIn 체크박스 선택
4. **"Schedule"** 또는 **"Post Now"**
5. 각 플랫폼에서 포스트 확인

**테스트 성공**:
- Twitter, LinkedIn 모두에 포스트 표시
- Postiz **"Posts"** 탭에서 "Published" 상태

---

## 문제 해결

### OAuth 리다이렉트 실패
**증상**: Twitter/LinkedIn 승인 후 Postiz로 돌아오지 않음

**원인**: Redirect URL 불일치

**해결**:
1. Postiz 환경변수 확인 (`~/Projects/postiz/.env`):
   ```
   NEXT_PUBLIC_BACKEND_URL=http://localhost:4007
   ```
2. Docker 재시작:
   ```bash
   docker compose down && docker compose up -d
   ```

---

### Twitter OAuth 에러: "App not approved"
**원인**: Twitter Developer Portal에서 앱 승인 필요 (Free tier는 Read-only)

**해결**:
- Twitter API v2 Essential access 신청 (무료)
- 또는 Postiz가 제공하는 OAuth app 사용 (설정에서 확인)

---

### LinkedIn "Invalid redirect_uri"
**원인**: LinkedIn Developer Portal에서 Redirect URI 미등록

**해결**:
1. LinkedIn Developer Portal → 앱 설정
2. Redirect URIs 추가: `http://localhost:4007/api/auth/linkedin/callback`
3. Save

---

## 완료 확인 체크리스트

- [ ] Postiz 대시보드 접속 가능 (localhost:4007)
- [ ] Twitter "Connected" 상태
- [ ] LinkedIn "Connected" 상태
- [ ] 테스트 포스팅 성공 (Twitter, LinkedIn 둘 다)
- [ ] Postiz "Posts" 탭에서 "Published" 확인

---

## 다음 단계

OAuth 설정 완료 후:

1. **이 가이드 창 열어둔 채로** A-Team 세션으로 돌아가기
2. "OAuth 설정 완료했습니다" 메시지 보내기
3. AI가 Phase 2 발행 자동 실행
4. Phase 2 Gate 통과 → Phase 3 발행 진행

---

## 참고

**API 키 관리** (선택):
- Postiz 자체 OAuth app 사용 중이면 추가 설정 불필요
- 자신의 Twitter/LinkedIn Developer 앱 사용 시:
  - `.env` 파일에 API key/secret 추가
  - Docker 재시작

**비용**:
- Postiz 자체: 무료 (로컬 Docker)
- Twitter API: 무료 (Essential tier)
- LinkedIn API: 무료 (개인 계정)

---

_이 가이드는 Phase 2, 3 발행 블로커 해소를 위한 것입니다. 설정 완료 후 A-Team으로 돌아오세요._
