---
description: 일간 성장 브리핑 — 외부 트렌드 + 내부 진단 → 오늘의 성장 제안
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, WebSearch, WebFetch
---

# /daily-brief — Daily Growth Brief

> A-Team을 지속 성장하는 조직으로 유지하기 위한 일간 브리핑.
> 의장(사용자)에게 "오늘 무엇을 수용하고 발전해야 하는지" 보고한다.

## Step 1: 내부 데이터 수집

```bash
node scripts/log-event.mjs command_start name=daily-brief
mkdir -p .context/briefs
node scripts/daily-brief-collect.mjs --save
```

수집 결과: `.context/briefs/YYYY-MM-DD-collect.json`

## Step 2: 중복 실행 방지

오늘 날짜의 브리핑이 이미 존재하는지 확인:

```bash
TODAY=$(date +%Y-%m-%d)
ls .context/briefs/${TODAY}-brief.md 2>/dev/null && echo "EXISTS" || echo "NEW"
```

- `EXISTS` → "오늘 브리핑이 이미 있습니다. 강제 갱신할까요?" (사용자 확인)
- `NEW` → Step 3 진행

## Step 3: daily-brief 에이전트 호출

`.claude/agents/daily-brief.md` 에이전트를 호출한다.

입력: `.context/briefs/YYYY-MM-DD-collect.json` (파일 경로 전달)

에이전트 지시:
- collect.json을 읽고 내부 진단 수행
- 외부 트렌드 웹 검색 (최근 24-48h)
- 성장 제안 3카테고리 (즉시/이번주/관찰) 도출
- 마크다운 보고서 stdout 출력

## Step 4: 보고서 저장

에이전트 출력을 `.context/briefs/YYYY-MM-DD-brief.md`에 저장.

## Step 5: 의장 보고

보고서의 **Executive Summary** + **Growth Actions > A. 즉시 수용** 섹션만 추출하여 사용자에게 표시.

형식:
```
--- Daily Growth Brief (YYYY-MM-DD) ---

[Executive Summary 내용]

즉시 수용:
1. [액션 1]
2. [액션 2]

전체: .context/briefs/YYYY-MM-DD-brief.md
---
```

## Step 6: analytics 로깅

```bash
node scripts/log-event.mjs command_end name=daily-brief data='{"actions_today":N,"actions_week":M,"external_signals":K}'
```

## 자동 트리거 조건

다음 상황에서 자동 실행 (수동 호출 불필요):
1. `/vibe` Step 0.7 — 세션 시작 시 오늘 브리핑 미존재 + 09:00 이후
2. `/pickup` — 오늘 첫 세션이면 자동 실행
3. 크론 — launchd 매일 09:00 KST

## 오류 처리

| 상황 | 처리 |
|------|------|
| collect.mjs 실패 | 내부 데이터 없이 외부 스캔만 실행 |
| 웹 검색 실패/차단 | 내부 데이터만으로 보고서 생성 + "외부 스캔 실패" 명시 |
| 에이전트 2회 실패 | fallback: collect.json 요약만 저장 |
| briefs/ 디렉토리 쓰기 실패 | stdout에 전체 출력 (유실 방지) |

## 주기 연계

| 주기 | 시스템 | 관계 |
|------|--------|------|
| 일간 | `/daily-brief` (이것) | 오늘의 성장 제안 |
| 주간 | `/insights` | 지난 주 분석 리포트 |
| 월간 | `/board` | 전략 감사 + 이사회 결의 |

daily-brief는 insights/board의 결의사항을 참조하되, 일간 수준의 구체적 실행 아이템에 집중한다.
