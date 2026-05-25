---
description: 대화에서 인사이트 추출 → PARA 자동 판정 + 6기둥 자동 분류 → cortex 저장.
---

> Analytics: `node scripts/log-event.mjs command_start name=idea`

방금 나눈 대화에서 아이디어/인사이트를 추출하여 cortex에 저장한다.

## 동작

1. **대화 분석** — 최근 대화에서 핵심 인사이트 추출 (3-5개)
2. **PARA 판정** — 각 인사이트가 어디에 속하는지 자동 판정:
   - Projects: 진행 중 프로젝트 관련 → `cortex/projects/{name}/`
   - Areas: 인생 영역 관련 → `cortex/areas/{pillar}/`
   - Resources: 참고 자료 → `cortex/resources/{type}/`
   - Archive: 해당 없음 (idea에서는 사용 안 함)

3. **6기둥 자동 분류** (Areas인 경우):
   - 가치관/원칙/정체성 → 1-character
   - 가족/연인/관계 → 2-mo-chuisle
   - 인맥/네트워킹/커뮤니티 → 3-string
   - 커리어/사업/전문성 → 4-interstellar
   - 건강/루틴/습관 → 5-life-xlab
   - 재무/투자/자산 → 6-snowball
   - 목표/리셋/비전 → zeroing
   - 미래계획/학습 → futures-options

4. **분류 제안** — 1줄로 제안: "Areas > 4-interstellar 추천. 맞나요?"
5. **사용자 승인** 후 저장
6. **wikilink 자동 삽입** — 기존 cortex 노트 중 관련 있는 것을 `[[note]]`로 연결

## frontmatter

```yaml
---
title: "{인사이트 제목}"
para: areas
pillar: 4-interstellar
tags: [career, strategy]
created: YYYY-MM-DD
source: conversation
links: []
---
```

## 인자
`$ARGUMENTS`로 카테고리 힌트 가능: `/idea area`, `/idea resource`, `/idea project`
힌트 없으면 자동 판정.
