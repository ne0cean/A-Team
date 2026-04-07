---
description: /browse — 브라우저 자동화
---

`browse` 관련 작업을 실행하세요.

browse 바이너리 확인:
```bash
ls ~/.claude/skills/gstack/browse/dist/browse 2>/dev/null || echo "browse 미설치 — https://github.com/anthropics/anthropic-tools 참조"
```

browse가 설치되어 있으면 사용자 요청에 따라 브라우저 자동화를 실행하세요.
사용자 인자(URL, 액션)를 그대로 전달합니다.
