---
description: /adversarial -- 적대적 코드 리뷰
---

> Analytics: `node scripts/log-event.mjs command_start name=adversarial` — 실행 시작 시 반드시 호출

`adversarial` 서브에이전트(subagent_type="adversarial")를 호출하여 실행하세요.

- 사용자 인자(경로, --depth, --full 등)가 있으면 그대로 전달
- Agent Teams 사용 시: Worker-Critic 패턴으로 실행 (Worker가 공격, Critic이 검증)
- 단독 실행 시: 기존 5관점 순차 + 자체 반박 1회
- 에이전트 완료 후 공격 시나리오와 발견 사항을 사용자에게 요약 보고
- `.context/red-team-history.jsonl`에 실행 결과 자동 append
- critical 발견 시 `/cso` 실행 권장
- `--full` 사용 시 5관점 + /cso 연동 풀 레드팀
