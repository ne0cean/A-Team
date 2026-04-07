---
description: /review — Pre-Landing PR 리뷰 파이프라인
---

`review-pr` 서브에이전트(subagent_type="review-pr")를 호출하여 실행하세요.

- 사용자 인자가 있으면 그대로 전달
- 에이전트 완료 후 결과를 사용자에게 요약 보고
- CRITICAL/HIGH 이슈가 있으면 반드시 강조
