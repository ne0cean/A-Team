---
description: 오늘 Daily Note 생성 또는 열기.
---

> Analytics: `node scripts/log-event.mjs command_start name=daily-note`

## 동작

1. 오늘 날짜 확인 (YYYY-MM-DD, 요일)
2. 파일 경로: `cortex/daily/YYYY-MM-DD.md`
3. 파일 없으면 생성:

```markdown
# YYYY-MM-DD (요일)

## One Thing
-

## 오늘 할 일
- [ ]

## 메모
-

## 회고
-
```

4. 파일 있으면 현재 내용 표시
5. Serendipity: cortex/archive/interstellar-onenote/에서 랜덤 노트 1개 제목 표시
   - "오늘의 과거 노트: {제목} ({날짜})"
