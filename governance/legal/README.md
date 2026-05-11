# Legal Templates & Compliance

> A-Team 프로젝트에서 사용하는 법률 문서 템플릿 레퍼런스.
> 모든 템플릿은 변호사 검토 후 사용 권장 (참고용, 법률 자문 대체 불가).

## Source: 검증된 외부 출처

| 출처 | 유형 | 라이선스 | URL |
|------|------|---------|-----|
| **Common Paper** | SaaS 계약서 (CSA/ToS/SLA) | CC BY 4.0 | https://commonpaper.com/standards/ |
| **Y Combinator** | 세일즈 계약, 표준 약관 | Free | https://www.ycombinator.com/documents |
| **Orrick** | 직원/컨설턴트/어드바이저 계약 | Free | https://www.orrick.com/en/Total-Access/Tool-Kit |
| **Cooley** | 스타트업 법률 문서 | Free | https://www.cooleygo.com/documents/ |
| **awesome-legal** | 큐레이션 목록 | CC | https://github.com/ankane/awesome-legal |

## 프로젝트별 필수 문서

### SaaS/웹앱 출시 시

| 문서 | 출처 | 비고 |
|------|------|------|
| Terms of Service | Common Paper Standard ToS | https://commonpaper.com/standards/terms-of-service/ |
| Privacy Policy | 프로젝트별 생성 | GDPR/개인정보보호법 준수 필요 |
| Cloud Service Agreement | Common Paper CSA 2.0 | B2B SaaS용 |
| SLA | Common Paper Standard SLA | 가동률 보장 필요 시 |
| OSS Notice | `npm run license:report` | 오픈소스 라이선스 고지 |

### 비즈니스 계약

| 문서 | 출처 | 비고 |
|------|------|------|
| 프리랜서 계약 | Orrick Consulting Agreement | 외주 개발 시 |
| NDA | Y Combinator NDA | 파트너/고객 비밀유지 |
| Advisor Agreement | Orrick Advisor Agreement | 자문위원 계약 |

## 자동화

### 라이선스 컴플라이언스 (자동)
```bash
npm run license:check   # 프로덕션 의존성 라이선스 검증
npm run license:report  # JSON 리포트 → coverage/licenses.json
```

### CI 파이프라인
- GitHub Actions에서 PR마다 라이선스 검증 자동 실행
- GPL/AGPL 감지 시 빌드 실패

### npm install 시 자동 감사
- PreToolUse 훅이 패키지 설치 시 자동 트리거
- 라이선스, 유지보수자 수, npm registry 존재 여부 검사

## Privacy Policy 생성 가이드

프로젝트에 개인정보처리방침이 필요할 때:

1. **수집 데이터 목록 작성** — 이메일, 이름, 결제 정보, 사용 로그 등
2. **법적 근거 확인** — 동의, 계약 이행, 정당한 이해 중 해당 항목
3. **Common Paper ToS를 기반으로 커스텀** — CC BY 4.0이므로 자유 수정 가능
4. **GDPR 체크리스트** (EU 대상 서비스):
   - 데이터 처리 목적 명시
   - 보존 기간 명시
   - 삭제 요청 절차 명시
   - DPO 연락처 (소규모는 면제 가능)
5. **한국 개인정보보호법 체크리스트**:
   - 개인정보 수집/이용 동의
   - 제3자 제공 동의 (해당 시)
   - 개인정보 처리방침 공개
   - 개인정보 파기 절차

## 참고
- 이 문서는 법률 자문이 아닙니다
- 실제 서비스 출시 전 변호사 검토 권장
- Common Paper 계약서는 미국법 기준 — 한국법 적용 시 수정 필요
