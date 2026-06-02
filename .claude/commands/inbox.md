---
description: 빠른 캡처. 뭐든 일단 cortex inbox에 저장.
---

> Analytics: `node scripts/log-event.mjs command_start name=inbox`

`$ARGUMENTS`를 cortex inbox에 즉시 저장한다.

## 동작

1. 오늘 날짜 파일 확인: `cortex/inbox/YYYY-MM-DD.md`
2. **파일 있으면**: 하단에 append (`## HH:MM — {요약}` + 내용)
3. **파일 없으면**: 새로 생성 (frontmatter + 첫 항목)

```yaml
---
title: "YYYY-MM-DD 캡처"
para: inbox
created: YYYY-MM-DD
---
```

4. 1줄 확인: "inbox에 추가: YYYY-MM-DD.md (N번째 항목)"

## 규칙
- **당일 파일 1개에 모든 캡처 append.** 건별 파일 생성 금지.
- 분류하지 않는다. inbox는 임시 보관소.
- 2초 안에 끝낸다. 사용자 질문 없음.
- 인자 없으면 AskUserQuestion으로 "무엇을 캡처할까요?" 1회만.
