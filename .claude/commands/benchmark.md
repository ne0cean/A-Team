---
description: /benchmark — 성능 기준선 시스템
---

> Analytics: `node scripts/log-event.mjs command_start name=benchmark` — 실행 시작 시 반드시 호출

`benchmark` 서브에이전트(subagent_type="benchmark")를 호출하여 실행하세요.

- 사용자 인자(--baseline, --diff, --category)가 있으면 그대로 전달
- 에이전트 완료 후 성능 리포트를 사용자에게 요약 보고
- 회귀 감지 시 반드시 강조
