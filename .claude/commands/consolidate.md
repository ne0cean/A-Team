---
description: cortex areas/ 전체 스캔 → 패턴 추출 → 프레임워크 승격. 월간 Knowledge Consolidation.
---

> Analytics: `node scripts/log-event.mjs command_start name=consolidate`

산발된 인사이트를 coherent framework으로 승격한다.

## 동작

### 1. 스캔 범위 결정

AskUserQuestion:
> 어떤 범위를 통합할까요?
> 1. 전체 cortex (areas/ + resources/)
> 2. 특정 기둥 (1-character ~ 6-snowball)
> 3. 최근 N일 (기본 30일)

### 2. 데이터 수집

지정 범위의 모든 .md 파일 읽기:
- frontmatter에서 tags, pillar, created 추출
- 본문에서 핵심 주장/인사이트 추출
- [[wikilink]] 연결 그래프 파악

### 3. 패턴 추출

수집된 인사이트에서:
- **반복 테마** — 3회 이상 등장하는 키워드/개념
- **발전 궤적** — 시간순으로 생각이 어떻게 변했는지
- **모순** — 서로 상충하는 인사이트
- **미연결 고립 노트** — 다른 노트와 link 0개

### 4. 프레임워크 생성

추출된 패턴을 구조화된 문서로 작성:

```yaml
---
title: "{주제} 프레임워크"
para: areas
pillar: {해당 기둥}
note_type: structure
tags: [consolidated, framework]
created: YYYY-MM-DD
source: consolidation
links: [{소스 노트 IDs}]
---
```

저장 위치: `cortex/areas/{pillar}/consolidated/YYYY-MM-DD-{slug}.md`

### 5. 결과 보고

```
통합 완료:
  스캔: N개 노트
  발견: 반복 테마 M개, 모순 K개, 고립 노트 J개
  생성: frameworks/YYYY-MM-DD-{slug}.md
  연결: 기존 노트 L개에 [[framework|supports]] 추가
```

### 6. Cascade Updates

생성된 프레임워크에서 참조한 소스 노트들에 역방향 [[framework|extends]] 백링크 추가.

## 주기

- 월 1회 권장 (cortex-ops.md 규칙)
- `/morning`에서 "마지막 consolidation: N일 전" 표시 → 30일+ 시 알림
