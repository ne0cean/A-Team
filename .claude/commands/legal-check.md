---
description: /legal-check — 프로젝트 법률 문서 컴플라이언스 검사
---

> Analytics: `node scripts/log-event.mjs command_start name=legal-check` — 실행 시작 시 반드시 호출

현재 프로젝트의 법률/컴플라이언스 상태를 검사한다.

## Step 1 — 라이선스 컴플라이언스

```bash
npm run license:check 2>&1
```

결과 분석:
- Exit 0 → 모든 의존성 승인된 라이선스 (MIT/Apache/BSD/ISC)
- Exit 1 → 비승인 라이선스 발견 → 패키지명 + 라이선스 타입 보고

## Step 2 — 필수 법률 문서 존재 여부

다음 파일 존재 여부 확인:

| 파일 | 필수 조건 | 확인 방법 |
|------|----------|----------|
| `LICENSE` | 항상 | 파일 존재 |
| `NOTICE` 또는 `THIRD_PARTY_NOTICES` | npm 의존성 있으면 | 파일 존재 |
| `PRIVACY.md` 또는 privacy policy URL | 사용자 데이터 수집 시 | 파일 또는 README 내 링크 |
| `TERMS.md` 또는 terms URL | 웹 서비스 제공 시 | 파일 또는 README 내 링크 |

## Step 3 — 보고

결과를 표로 정리:

```
Legal Compliance Report
━━━━━━━━━━━━━━━━━━━━━━

License Check:     [PASS/FAIL] (N packages checked)
LICENSE file:      [EXISTS/MISSING]
NOTICE file:       [EXISTS/MISSING/NOT_NEEDED]
Privacy Policy:    [EXISTS/MISSING/NOT_NEEDED]
Terms of Service:  [EXISTS/MISSING/NOT_NEEDED]

Recommendations:
- [해당 사항 있으면 구체적 조치 안내]
```

## 참고

템플릿 출처: `governance/legal/README.md`
- Common Paper (CC BY 4.0): ToS, CSA, SLA
- Y Combinator: NDA, Sales Agreement
- Orrick/Cooley: Startup 법률 문서
