# Impact Analysis — 구현 전 영향도 분석

> **Source**: nx affected + dependency-cruiser 패턴 (2026-06-04 외부 리서치)
> **목적**: AI 에이전트가 구현 전 "이 파일을 바꾸면 무엇이 깨지는가"를 자동으로 파악.

## 트리거 조건

수정 대상 파일이 다음에 해당하면 구현 전 의무 실행:
- `lib/*.ts` — 공유 라이브러리 (전체 레포 영향 가능)
- `scripts/*.mjs` — 다른 스크립트가 import하는 핵심 모듈
- `governance/rules/*.md` — 다른 규칙이 참조하는 근간 규칙
- 수정 예상 파일 3개 이상

## 실행 방법

```bash
node scripts/impact.mjs <수정할-파일-경로>
```

예시:
```bash
node scripts/impact.mjs scripts/log-event.mjs
# → [impact] 영향받는 파일 5개:
#   → scripts/vibe-init.sh (간접 참조)
#   → .claude/commands/end.md (import 없지만 참조)
```

## 결과 해석

| 영향 파일 수 | 위험 등급 | 조치 |
|------------|---------|------|
| 0개 | LOW | 바로 구현 |
| 1-3개 | MEDIUM | AC에 영향 파일 목록 포함 |
| 4-9개 | HIGH | 구현 전 사용자 확인 + AC 필수 |
| 10개+ | CRITICAL | orchestrator 위임, 사용자 명시 승인 필수 |

## AC 통합

영향 파일 발견 시 AC에 추가:
```
IMPACT: [영향받는 파일 목록]
AC:
  - [ ] 영향받는 파일들이 여전히 정상 동작하는가?
VERIFY CMD: npm test -- --reporter=verbose | grep -E "영향파일명"
```

## 연관 규칙
- `task-ac.md` — AC 작성 의무
- `risk-tier.md` — 위험 등급 정의
- `coding-safety.md` — 파일 전체 읽고 수정

**Last updated**: 2026-06-04 (nx/turborepo/dependency-cruiser 리서치 기반)
