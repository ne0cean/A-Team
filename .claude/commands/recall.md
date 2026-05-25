---
description: cortex 전체 키워드 검색 — PARA 모든 레이어 + wiki + archive 포괄.
---

> Analytics: `node scripts/log-event.mjs command_start name=recall`

`$ARGUMENTS` 키워드로 cortex 전체를 검색한다.

## 검색 범위

1. `cortex/areas/` — 6기둥 활성 노트
2. `cortex/projects/` — 진행 중 프로젝트
3. `cortex/resources/` — 참고 자료
4. `cortex/archive/interstellar-onenote/` — OneNote 아카이브
5. `cortex/archive/work/` — 직장 기록
6. `.wiki/entries/` — 개발 지식
7. `cortex/thinking-toolkit.md` — 멘탈 모델
8. `cortex/daily/` — Daily Note

## 출력 형식

PARA 카테고리별로 그룹핑:

```
🔍 "투자 전략" 검색 결과 (7건)

[Areas] (3건)
  - areas/6-snowball/etf-strategy.md — "ETF 장기 투자 전략"
  - areas/6-snowball/portfolio.md — "포트폴리오 구성"
  - areas/zeroing/2026-vision.md — "2026 재무 목표"

[Resources] (2건)
  - resources/books/snowball-warren.md — "워런 버핏 스노볼"
  - resources/articles/compound-effect.md — "복리 효과"

[Archive] (2건)
  - archive/interstellar-onenote/.../투자일지.md
  - archive/work/.../재무분석.md

관련 6기둥: 6-snowball (5건), zeroing (1건), 4-interstellar (1건)
```

## 규칙
- grep 기반 빠른 검색 (cortex-graph 불필요)
- 결과 10건 초과 시 상위 10건만 + "더 보기" 안내
- 결과 0건이면 유사 키워드 제안
