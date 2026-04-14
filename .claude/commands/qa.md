---
description: /qa — 웹 앱 체계적 QA 테스트
---

`qa` 서브에이전트(subagent_type="qa")를 호출하여 실행하세요.

- 사용자 인자(URL, --pages, --category)가 있으면 그대로 전달
- 에이전트 완료 후 헬스 스코어와 이슈 목록을 사용자에게 요약 보고
- CRITICAL 이슈는 반드시 강조

## `--design` 플래그 (자동 체이닝)

인자에 `--design` 포함 또는 변경 파일이 `.tsx/.jsx/.vue/.svelte/.css/.scss` 중심이면 자동으로:
1. `qa` + `ui-inspector` + `design-auditor` 3개 서브에이전트를 **병렬** 호출
2. 결과 머지:
   - ui-inspector 시각 findings + design-auditor 점수/위반 + qa 헬스 스코어
   - a11y 위반은 최상위 우선순위 (비협상)
3. `lib/analytics.ts` `logDesignAudit()` 기록
4. 최종 리포트: `점수 N/100, A11y X건, AI Slop Y건, Layout Z건 → 종합 헬스 H/100`

`governance/design/gate.md` 의 opt-out 규칙 존중 — `design: off` 또는 `exemptions` 매치 시 design-auditor 스킵.
