---
description: 빠른 캡처. 뭐든 일단 cortex inbox에 저장.
---

> Analytics: `node scripts/log-event.mjs command_start name=inbox`

`$ARGUMENTS`를 cortex inbox에 즉시 저장한다.

## 동작

1. 오늘 날짜 + slug 생성: `cortex/inbox/YYYY-MM-DD-{slug}.md`
2. frontmatter 포함:
```yaml
---
title: "{사용자 입력 요약}"
para: inbox
tags: []
created: YYYY-MM-DD
source: capture
---
```
3. `$ARGUMENTS` 내용을 본문에 기록
4. 1줄 확인: "inbox에 저장: {파일명}"

## 규칙
- 분류하지 않는다. inbox는 임시 보관소.
- 2초 안에 끝낸다. 사용자 질문 없음.
- 인자 없으면 AskUserQuestion으로 "무엇을 캡처할까요?" 1회만.
