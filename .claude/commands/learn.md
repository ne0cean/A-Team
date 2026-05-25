---
description: 책/영상/강의에서 배운 것을 cortex resources에 구조화 저장.
---

> Analytics: `node scripts/log-event.mjs command_start name=learn`

## 사용법

```
/learn book 타이탄의 도구들
/learn video Claude Code 비용 절감
/learn course 프로덕트 매니지먼트
/learn article 복리 효과의 실체
```

## 동작

1. `$ARGUMENTS`에서 타입(book/video/course/article) + 제목 파싱
2. 타입 없으면: AskUserQuestion "어떤 종류인가요? (book/video/course/article)"
3. 사용자에게 핵심 내용 요청: "핵심 인사이트 3-5개를 알려주세요. 또는 자유롭게 메모해주세요."
4. 저장 경로: `cortex/resources/{type}/YYYY-MM-DD-{slug}.md`

## frontmatter

```yaml
---
title: "{제목}"
para: resources
type: book
tags: [productivity, habits]
created: YYYY-MM-DD
source: "{타입}"
author: "{저자}" # 있으면
links: []
---
```

5. 내용 정리 후 저장
6. 관련 6기둥 태그 자동 추가 (예: 재무 책 → tags에 snowball 추가)
7. 기존 cortex 노트와 연결 가능하면 [[wikilink]] 제안
