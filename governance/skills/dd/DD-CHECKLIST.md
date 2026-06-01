# DD (Due Diligence) 상세 체크리스트

> 참조: `.claude/commands/dd.md` — 6단계 워크플로우 원본
> 이 파일은 각 단계의 세부 체크 항목을 정의한다.

---

## Step 1 — Line-by-line 전수 실사 체크리스트

### 필수 항목
- [ ] README 존재 + 내용 확인 (기능 목록 추출 가능한가)
- [ ] 전체 파일 수 + 총 라인 수 집계
- [ ] 주요 언어 분포 파악 (top 5)
- [ ] 의존성 파일 전수 확인 (package.json / requirements.txt / go.mod 등)
- [ ] 기능 목록 완전 작성 (README + 소스 코드 양쪽 기반)
- [ ] 아키텍처 맵: 디렉토리 → 레이어 분류
- [ ] 라이선스 파일 읽기 + 유형 판정

### 라이선스 차단 규칙 (CRITICAL)
```
GPL v3 / AGPL    → 즉시 REJECT 플래그 → Step 6 이전에 중단
GPL v2 / LGPL    → 법적 검토 경고 플래그 (진행은 가능, judge가 최종 판정)
SSPL / BSL       → REJECT 검토 권고
MIT / Apache 2.0 / BSD 2-Clause / BSD 3-Clause → PASS
ISC / CC0        → PASS
라이선스 없음      → CAUTION 플래그 (저작권 불명확)
```

### 커뮤니티 건강도 체크
- [ ] 커밋 빈도: 최근 6개월 커밋 수 (< 5 → 방치 위험)
- [ ] 이슈 응답률: 열린 이슈 vs 닫힌 이슈 비율
- [ ] 메인테이너 수 (1명 → 버스 팩터 위험)
- [ ] Stars/Forks 추이 (감소 중이면 주의)

**산출물**: `.dd/<slug>/01-linebylne-report.md`

---

## Step 2 — 시너지 검토 체크리스트

### A-Team 현황 파악
- [ ] `.claude/agents/` 목록 읽기 (에이전트 기능 파악)
- [ ] `.claude/commands/` 목록 읽기 (커맨드 기능 파악)
- [ ] `lib/` 목록 읽기 (라이브러리 파악)
- [ ] `governance/skills/` 읽기 (거버넌스 파악)

### 시너지 매트릭스
각 대상 컴포넌트에 대해:
- [ ] A-Team에 동등 기능 있는가? → 있으면 LOW 가치
- [ ] A-Team에 없는 핵심 기능인가? → 없으면 HIGH 가치
- [ ] 아키텍처 충돌 있는가? → 있으면 위험 플래그

**산출물**: `.dd/<slug>/02-synergy-matrix.md`

---

## Step 3 — 실무 레드팀 리뷰 체크리스트

### 5축 공격 관점
- [ ] **인증/인가 우회**: 인증 로직, 권한 상승 경로, 토큰/세션 처리
- [ ] **인젝션**: SQL injection 패턴, command injection, path traversal, SSRF
- [ ] **데이터 경계**: API key/password/secret 하드코딩, PII 노출
- [ ] **의존성 체인**: 취약한 패키지 버전, 악성 의존성, typosquatting 위험
- [ ] **로직 버그**: 레이스 컨디션, 정수 오버플로우, 예외 처리 누락

### 실증 가능 여부
- [ ] 이론적 위험 vs 실제 PoC 가능 여부 구분해서 보고

**산출물**: `.dd/<slug>/03-redteam-report.md`

---

## Step 4 — Tech DD 체크리스트

### 기술 부채 정량화
- [ ] TODO/FIXME 밀도 (`grep -r "TODO\|FIXME" | wc -l`)
- [ ] 하드코딩된 매직 넘버/문자열 수
- [ ] 평균 파일 길이 + 최대 파일 길이
- [ ] 중첩 깊이 (if/for 3단 이상 파일 수)

### 테스트 커버리지
- [ ] 테스트 파일 존재 여부
- [ ] 테스트 파일 수 / 전체 소스 파일 수 비율
- [ ] 테스트 프레임워크 식별 (jest / pytest / go test 등)

### 유지보수성
- [ ] CHANGELOG 존재 여부
- [ ] 기여자 가이드(CONTRIBUTING.md) 존재 여부
- [ ] API 문서화 수준
- [ ] 의존성 노후도: 마지막 업데이트 날짜 (> 1년 → 주의)

**산출물**: `.dd/<slug>/04-tech-dd-report.md`

---

## Step 5 — 보안 감사 체크리스트

> **필수 게이트**: PASS 없이 Step 6 진행 불가. FAIL 시 즉시 REJECT.

### OWASP Top 10 체크
- [ ] A01 Broken Access Control
- [ ] A02 Cryptographic Failures (평문 비밀번호, 약한 알고리즘)
- [ ] A03 Injection (SQL, OS, LDAP)
- [ ] A04 Insecure Design (설계 수준 결함)
- [ ] A05 Security Misconfiguration (기본값 비밀번호, 불필요 기능 노출)
- [ ] A06 Vulnerable and Outdated Components (CVE 확인)
- [ ] A07 Identification and Authentication Failures
- [ ] A08 Software and Data Integrity Failures (CI/CD 파이프라인 무결성)
- [ ] A09 Security Logging and Monitoring Failures
- [ ] A10 SSRF

### 추가 항목
- [ ] `.env` 또는 secrets 하드코딩 여부
- [ ] private key, API key 소스 코드 내 포함 여부
- [ ] Step 3 레드팀 미해결 항목 재검증

### 판정 헤더 (파일 첫 줄 필수)
```
SECURITY_AUDIT: PASS
```
또는
```
SECURITY_AUDIT: FAIL
FAIL_REASON: <이유>
```

**산출물**: `.dd/<slug>/05-security-audit.md`

---

## Step 6 — 이사회 보고 체크리스트

### Judge 실행 전 사전 차단 조건
다음 중 하나라도 해당하면 judge 호출 전 즉시 REJECT:
- [ ] Step 5 `SECURITY_AUDIT: FAIL`
- [ ] Step 1에서 GPL v3 / AGPL 감지

### Verdict 3종
- `ADOPT`: 전체 레포 흡수. Full approval 필요.
- `PARTIAL`: 선별 cherry-pick. Fast-track 목록 포함.
- `REJECT`: 흡수 불가. 사유 명시.

**산출물**: `.dd/<slug>/06-board-report.md` + `VERDICT.md`

---

## Fast-track 판단 기준

이사회 승인 없이 즉시 흡수 가능한 조건:
1. Step 3-4에서 "필수 요소"로 판정됨
2. A-Team 현재 기능에 없는 핵심 기능
3. Step 5 보안 감사 **PASS**
4. 라이선스 MIT / Apache 2.0 / BSD

Fast-track 불가:
- 전체 레포 흡수
- 아키텍처 변경 수반 항목
- GPL v2 이상 라이선스 항목

---

## 보안 주의사항 (모든 단계 공통)

```
대상 레포 코드 절대 실행 금지
  - npm install / pip install / make / ./install.sh 금지
  - 정적 분석(Read, Grep, Glob)만 허용
  - 의심 파일은 Read로만 열람, 실행 금지

민감 발견 사항 저장:
  - .dd/<slug>/ 로컬에만 저장
  - git commit 권장하지 않음 (민감 정보 포함 가능)
```
