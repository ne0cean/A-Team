---
name: morning
description: 아침 루틴 — 목표 상기 + One Thing 강제 + 오늘 할 일
---

> Analytics: `node scripts/log-event.mjs command_start name=morning` — 실행 시작 시 반드시 호출

# /morning — 아침 시작 의식

## Step 1: 목표 상기

`cortex/thinking-toolkit.md`와 아래 고정 텍스트를 출력한다.

```
━━━ Good morning, Dean ━━━

■ Vision: 지금부터 InterStellar을 준비한다. 목표는 성공이며,
  내가 정의하는 성공 "아침에 일어나서 원하는 것을 할 수 있는 것, 즉 자유"

■ 6 Pillars: Cha · Fam · Soli · Inter · Life · Ass

━━━━━━━━━━━━━━━━━━━━━
```

## Step 2: One Thing 질문 (강제)

반드시 물어본다. 답을 받기 전까지 다음 단계로 넘어가지 않는다.

```
오늘의 One Thing은 뭔가요?
(오늘 하루 딱 하나만 해야 한다면, 뭘 해야 목표에 가장 가까워지나요?)

>
```

사용자가 답하면:
1. 6 Pillars 중 어디에 해당하는지 1줄로 연결
2. 오늘 할 일 목록 상단에 고정 표시

## Step 3: 오늘 할 일 로드

JSON 우선, .md 폴백:

```bash
YM=$(date +%Y-%m)
JSON_FILE="cortex/areas/life/ritual-routine/${YM}.json"
MD_FILE="cortex/areas/life/ritual-routine/${YM}.md"
SO_FILE="cortex/areas/life/ritual-routine/standing-orders.json"
if [ -f "$JSON_FILE" ]; then
  echo "SOURCE: $JSON_FILE (JSON)"
elif [ -f "$MD_FILE" ]; then
  echo "SOURCE: $MD_FILE (MD fallback)"
else
  echo "MISSING: both $JSON_FILE and $MD_FILE"
fi
```

**JSON 모드** (우선):
- `jq` 또는 `node -e`로 오늘 날짜 키의 데이터 추출
- `day_type` 필드가 있으면 출력에 [BLOCK]/[FLOW]/[HF]/[휴가] 표시
- `standing-orders.json`에서 오늘 해당하는 상시업무도 포함

**MD 모드** (폴백):
오늘 날짜(`date +%-d`)를 파일에서 찾는다.
- **있으면**: 해당 날짜 블록 추출
- **없으면**: 템플릿에서 오늘 행 생성

## Step 4: 출력 포맷

```
━━━ 2026-05-23 (금) [BLOCK] ━━━

★ ONE THING: [사용자 답변] → [Pillar]

Ritual & Routine:
  □ Zone2 1H + 스픽&보카
  □ 10분 묵상 챌린지

출근전 - Input/R&D:
  □ Python 22/58
  □ figma 15/84

Work - 1H Blocks:
  □ AX/SCM
  □ 통계 Dashboard

퇴근후 - Outcome:
  □ 임장 매물 검색
  □ 8:30 취침 w/Podcast

상시 업무:
  □ Swimming/Golf/테니스
  □ 리더의 서재(금)

이번주 완료율: 23/47 (49%)
━━━━━━━━━━━━━━━━━━━━━
```

## Step 5: One Thing 기록

사용자의 One Thing을 오늘 날짜의 JSON에 기록한다:

```bash
# Dashboard API로 저장 (서버 실행 중이면)
curl -s -X POST http://localhost:7843/api/one-thing \
  -H 'Content-Type: application/json' \
  -d "{\"ym\":\"$(date +%Y-%m)\",\"day\":\"$(date +%-d)\",\"text\":\"ONE_THING_TEXT\"}"
```

서버 미실행 시 JSON 파일 직접 Edit.
월 파일이 없으면 `scripts/ritual-routine-new-month.sh` 실행 제안.

## 규칙
- Step 2 응답 받기 전까지 할 일 목록 표시하지 않음. One Thing이 먼저.
- 나레이션 최소화.
- 체크박스 토글은 하지 않음 (사용자가 에디터에서 직접).
- thinking-toolkit.md에서 오늘 맥락에 맞는 개념이 있으면 1줄 제안.
