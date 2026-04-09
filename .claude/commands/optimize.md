---
description: /optimize — Post-Integration Optimization (PIOP 자동 최적화 실행)
---

`governance/workflows/post-integration.md` 워크플로우를 읽은 뒤 Phase 1~5를 순서대로 실행하세요.

**매개변수 라우팅**:
- `--biweekly` 인자가 있으면 `governance/workflows/biweekly-optimize.md` (격주 7축 최적화 프로토콜) 전체를 실행하세요.
- `--phase N` 인자가 있으면 PIOP의 해당 Phase만 실행
- 인자 없으면 기본 PIOP (`governance/workflows/post-integration.md`) 전 과정 실행

**기록**:
- PIOP Phase 5 완료 후 `.context/CURRENT.md`에 결과 기록
- 발견된 패턴은 `lib/learnings.ts` logLearning()으로 축적

$ARGUMENTS
