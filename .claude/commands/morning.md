---
name: morning
description: 오늘의 Ritual & Routine 행 표시 + 없으면 생성
---

# /morning — 오늘의 대시보드

## Step 1: 현재 월 파일 찾기

```bash
MONTH_FILE="cortex/areas/life/ritual-routine/$(date +%Y-%m).md"
if [ ! -f "$MONTH_FILE" ]; then
  echo "MISSING: $MONTH_FILE"
else
  echo "FILE: $MONTH_FILE"
fi
```

## Step 2: 오늘 날짜 행 찾기

오늘 날짜(`date +%-d`)를 파일에서 찾는다.

- **있으면**: 해당 `<tr>...</tr>` 블록만 추출해서 마크다운 테이블로 렌더링
- **없으면**: 템플릿에서 오늘 행 생성 → 현재 주차 테이블 끝에 추가

## Step 3: 출력 포맷

```
━━━ 2026-05-23 (금) ━━━

Ritual & Routine:
  □ Zone2 1H + 스픽&보카
  □ 10분 묵상 챌린지
  ✓ 4H Flow Block @HSH

출근전 - Input/R&D:
  □ Python 22/58
  □ figma 15/84

Work - 1H Blocks:
  □ AX/SCM
  □ 통계 Dashboard

퇴근후 - Outcome:
  □ 임장 매물 검색
  □ 8:30 취침 w/Podcast

━━━━━━━━━━━━━━━━━━━━━
```

## Step 4: 월 파일이 없으면

`scripts/ritual-routine-new-month.sh` 실행해서 새 월 파일 생성 제안.

## Step 5: 이번주 완료율

현재 주차의 `- [x]` / `- [ ]` + `- [x]` 비율 계산해서 한 줄로 표시:
```
이번주 완료율: 23/47 (49%)
```

## 규칙
- 나레이션 최소화. 대시보드 데이터만 출력.
- 체크박스 토글은 하지 않음 (사용자가 에디터에서 직접).
- 새 행 추가 시 Edit 도구로 해당 주차 `</table>` 직전에 삽입.
