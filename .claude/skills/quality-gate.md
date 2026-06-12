---
name: quality-gate
description: 품질 게이트 패턴 — 4-Stage 검증, adversarial, CSO scan, UI 시각 검증
tags: [quality, gate, testing, security, verification]
---

# Quality Gate

## 언제 사용

- 변경 3+ 파일 커밋 전
- 보안 관련 코드 수정 시
- UI 배포 후
- `/end`, `/ship`, `/review` 커맨드 실행 시

## 패턴

### 4-Stage 검증 계단

| Stage | 이름 | 차단? | 트리거 |
|-------|------|-------|--------|
| 1 | Correctness | Block | 모든 자율 iteration |
| 2 | Quality | Block | 모든 커밋 전 |
| 3 | Security | Warn | UI/API/auth 변경 시 |
| 4 | Consistency | Advisory | PR/release 전 |

하위 stage 실패 → 상위 stage 실행 안 함.

### Stage 1 — Correctness

```bash
npm test                   # 테스트 통과 필수
npx tsc --noEmit           # 타입 에러 0
```

### Stage 2 — Quality (변경 3+ 파일)

```bash
# Haiku adversarial 자동 트리거
# governance/rules/quality-pipeline.md 상세
```

### Stage 3 — Security 자동 감지 패턴

다음 패턴이 변경 파일에 포함 시 CSO 경량 스캔 자동 트리거:

```
auth, login, session, token, jwt, oauth, password, credential
crypto, encrypt, decrypt, hash, secret, key, cert
payment, billing, stripe
sql, query, exec, eval, innerHTML, dangerouslySetInnerHTML
cors, cookie, csrf, xss, admin, role, permission
```

보안 관련 코드 수정 시 → `DONE_WITH_CONCERNS` + risks에 보안 검토 필요 명시.

### Post-Edit Quality Gate (매 파일 수정 후)

```
제거 대상:
- console.log / console.dir / console.debug
- debugger 문
- 의도치 않은 TODO/FIXME
```

### UI 시각 검증 (배포 후 필수)

```bash
# 최소 검증
curl https://<worker>.workers.dev/api/health

# 의무 검증 (curl 200 ≠ 완료)
# ui-inspector 에이전트 또는 브라우저 스크린샷 필수
```

### 테스트 증거 기준

| 상황 | 필요한 것 |
|------|----------|
| 기존 테스트 있음 | `npm test` 결과 |
| 새 로직 | 테스트 추가 + 결과 |
| 스크립트 | 실행 출력 첨부 |
| UI 변경 | 스크린샷 또는 검증 |
| 테스트 불가 | "테스트 없음: [이유]" 명시 |

## 주의사항

- "됐어 보여" = 품질 게이트 미통과
- 테스트 없이 완료 선언 금지
- 상세 규칙: `governance/rules/quality-pipeline.md`, `governance/rules/quality-gates.md`
