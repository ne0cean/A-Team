---
description: cortex inbox 파일들을 PARA + 6기둥으로 자동 분류 → 승인 후 이동.
---

> Analytics: `node scripts/log-event.mjs command_start name=tidy-inbox`

`cortex/inbox/` 파일을 스캔하고 적절한 위치로 분류 이동한다.

## 동작

1. `cortex/inbox/*.md` 파일 목록 확인
2. 비어있으면: "inbox가 비어있습니다." 종료
3. 각 파일에 대해:
   a. 내용 읽기
   b. PARA 판정 (Projects / Areas / Resources)
   c. Areas면 6기둥 자동 분류
   d. 태그 생성
   e. 기존 cortex 노트와 관련 있으면 `[[wikilink]]` 삽입
4. 분류 결과 표로 제시:

```
| 파일 | PARA | 기둥/타입 | 이동 경로 |
|------|------|----------|----------|
| inbox/2026-05-25-meeting.md | Areas | 4-interstellar | areas/4-interstellar/ |
| inbox/2026-05-25-book.md | Resources | books | resources/books/ |
```

5. 사용자에게 "이대로 이동할까요?" 확인
6. 승인 시 파일 이동 + frontmatter에 para/pillar 필드 추가

## 규칙
- 사용자 승인 없이 이동하지 않는다.
- 판단 어려운 건 "inbox 유지 (수동 분류 필요)" 표시.
- 이동 후 1줄 요약: "3건 분류 완료 (Areas 2, Resources 1)"
