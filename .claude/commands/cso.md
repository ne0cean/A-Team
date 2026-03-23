# /cso — Chief Security Officer 보안 감사

OWASP Top 10 + STRIDE 위협 모델링을 8단계로 실행한다.
코드를 수정하지 않고 발견 사항과 권고안만 생성한다.

## 호출 방법
- `/cso` — 전체 감사
- `/cso --diff` — 현재 브랜치 변경사항만
- `/cso --scope src/auth/` — 특정 범위만
- `/cso --owasp A03` — 특정 OWASP 카테고리만

---

## Phase 1: 공격 표면 매핑

```bash
# 엔드포인트 식별
grep -r "router\|app\.\(get\|post\|put\|delete\|patch\)" --include="*.{js,ts,py}" | head -50
# 인증 경계
grep -r "auth\|middleware\|guard\|jwt\|session" --include="*.{js,ts,py}" | head -30
# 외부 통합
grep -r "fetch\|axios\|http\|api\." --include="*.{js,ts,py}" | head -30
```

매핑 항목:
- [ ] 공개 엔드포인트 목록
- [ ] 인증 필요 엔드포인트 목록
- [ ] 파일 업로드 지점
- [ ] 외부 서비스 통합 지점
- [ ] 관리자 권한 경로

---

## Phase 2: OWASP Top 10 분석

각 카테고리를 코드에서 직접 찾아 분석:

| # | 카테고리 | 검토 대상 |
|---|---|---|
| A01 | 접근 제어 취약점 | 권한 체크 누락, IDOR |
| A02 | 암호화 실패 | 평문 저장, 약한 해시 |
| A03 | 인젝션 | SQL, NoSQL, Command, LDAP |
| A04 | 불안전한 설계 | 비즈니스 로직 결함 |
| A05 | 보안 설정 오류 | 기본 자격증명, 불필요한 기능 노출 |
| A06 | 취약한 컴포넌트 | 알려진 CVE 패키지 |
| A07 | 인증 실패 | 세션 관리, 브루트포스 |
| A08 | 무결성 실패 | 서명 없는 업데이트, 안전하지 않은 역직렬화 |
| A09 | 로깅 실패 | 민감 정보 로그 노출, 감사 추적 부재 |
| A10 | SSRF | 사용자 제공 URL 페치 |

**프레임워크 인식**: Rails CSRF 토큰, React XSS 이스케이핑 등 내장 보호는 발견에서 제외.

---

## Phase 3: STRIDE 위협 모델링

각 컴포넌트에 대해:

| 위협 | 설명 | 해당 컴포넌트 | 현재 완화 조치 |
|---|---|---|---|
| Spoofing | 신원 위조 | | |
| Tampering | 데이터 변조 | | |
| Repudiation | 부인 | | |
| Info Disclosure | 정보 노출 | | |
| DoS | 서비스 거부 | | |
| Privilege Escalation | 권한 상승 | | |

---

## Phase 4: 데이터 분류

발견된 데이터를 민감도별 분류:

| 레벨 | 예시 | 처리 방식 |
|---|---|---|
| 제한 (Restricted) | 비밀번호, 카드번호, SSN | 암호화 필수, 로그 금지 |
| 기밀 (Confidential) | 개인정보, 이메일 | 암호화 권장 |
| 내부 (Internal) | 사용자 ID, 타임스탬프 | 접근 제어 |
| 공개 (Public) | 공개 콘텐츠 | 제한 없음 |

---

## Phase 5: 오탐 필터링 (품질 게이트)

각 발견 사항에 신뢰도 점수 부여:
- **8/10 이상**: 보고서에 포함
- **8/10 미만**: 제외 (노이즈 방지)

**제외 기준:**
- 프레임워크가 자동으로 처리하는 것
- 내부 네트워크에만 노출된 것
- 이미 알려진 허용된 패턴

---

## Phase 6: 발견 사항 (익스플로잇 시나리오 필수)

각 발견에 구체적인 공격 경로 포함:

```markdown
### [CRITICAL] SQL Injection — src/api/users.ts:47

**익스플로잇 시나리오:**
공격자가 `username` 파라미터에 `' OR 1=1; DROP TABLE users; --`를 입력하면
users 테이블 전체가 삭제됩니다.

**근거:** `db.query("SELECT * FROM users WHERE name = '" + req.body.username + "'")`

**권고:** 파라미터화 쿼리 사용
`db.query("SELECT * FROM users WHERE name = ?", [req.body.username])`

**CVSS:** 9.8 (Critical)
```

---

## Phase 7: 수정 우선순위 제시

AskUserQuestion으로 Critical/High 항목 수정 방향 확인:
> "다음 Critical 보안 이슈 3개를 발견했습니다. 어떻게 처리할까요?
> A) 즉시 수정 요청 (coder 에이전트 호출)
> B) 리포트만 저장하고 나중에 처리
> C) 각 항목별로 개별 결정"

---

## Phase 8: 리포트 저장

```bash
mkdir -p .context/security-reports/
# 저장: .context/security-reports/YYYY-MM-DD.json
```

```json
{
  "date": "YYYY-MM-DD",
  "scope": "전체 | diff | 특정 경로",
  "critical": 0,
  "high": 0,
  "medium": 0,
  "low": 0,
  "findings": [],
  "owasp_coverage": ["A01", "A02", ...],
  "trend": "이전 리포트 대비 개선/악화/유지"
}
```

---

## 완료 출력
```json
{
  "status": "DONE | DONE_WITH_CONCERNS",
  "critical": 0,
  "high": 0,
  "report_path": ".context/security-reports/YYYY-MM-DD.json",
  "immediate_action_required": false
}
```

## 원칙
- **Read-only**: 코드 수정 절대 금지. 발견과 권고만.
- **노이즈 제로 우선**: 신뢰도 낮은 발견보다 정확한 발견이 중요
- **익스플로잇 필수**: "취약할 수 있음"이 아닌 "이렇게 공격된다"
- **면책 조항**: 이 도구는 전문 보안 회사 감사를 대체하지 않음
