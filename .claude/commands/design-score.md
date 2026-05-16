---
description: /design-score — UI/PPT 빌드 후 품질 평가 + 학습 루프
---

# /design-score — 디자인 품질 피드백 루프

> Build → Capture → Score → Learn → Adjust

## Step 1 — 대상 감지

최근 생성/수정된 디자인 산출물 자동 감지:
```bash
# PPT
LATEST_PPT=$(find content/ppt -name "*.pptx" -mmin -30 2>/dev/null | head -1)
# Web UI
LATEST_UI=$(git diff --name-only HEAD~3 | grep -E '\.(jsx|tsx|vue|svelte|css)$' | head -5)
```

PPT가 있으면 PPT 모드, UI가 있으면 웹 모드.
$ARGUMENTS로 경로 직접 지정 가능.

## Step 2 — 자동 QA (PPT)

PPT 모드일 때:
```bash
python3 scripts/ppt/qa-pptx.py "$LATEST_PPT" --json
```
QA 결과를 먼저 보여주고 인간 평가로 넘어간다.

## Step 3 — 자동 QA (Web)

웹 모드일 때:
```bash
node scripts/design-drift-detect.mjs . --json
```

## Step 4 — 인간 평가 (AskUserQuestion)

AskUserQuestion 도구로 3축 평가:

> 방금 생성된 결과물을 평가해주세요 (1-5점):
>
> 1. 레이아웃 (여백, 정렬, 그리드 밸런스)
> 2. 타이포그래피 (폰트 위계, 가독성, 크기 적절성)
> 3. 전체 느낌 ("사람이 만든 것 같은가")
>
> 추가 피드백이 있으면 적어주세요.

## Step 5 — 레퍼런스 비교 (선택)

점수 3 이하 항목이 있으면:

AskUserQuestion:
> 비교 레퍼런스가 있나요?
> 1. McKinsey/BCG 실제 덱 (컨설팅)
> 2. Linear/Vercel/Stripe (웹 앱)
> 3. 직접 입력 (URL 또는 파일)
> 4. 스킵

레퍼런스 선택 시 → designer 에이전트에 비교 분석 위임:
"이 산출물과 레퍼런스를 비교해서 구조적 차이 3가지를 분석하라"

## Step 6 — 기록

```bash
# design-scores.jsonl에 append
node -e "
const fs = require('fs');
const entry = {
  ts: new Date().toISOString(),
  project: '${PROJECT}',
  component: '${COMPONENT}',
  type: '${TYPE}',  // ppt or web
  scores: { layout: ${LAYOUT}, typography: ${TYPO}, overall: ${OVERALL} },
  feedback: '${FEEDBACK}',
  qa_score: ${QA_SCORE},
  reference: '${REFERENCE}',
  reference_gaps: [],
};
fs.appendFileSync('.context/design-scores.jsonl', JSON.stringify(entry) + '\n');
"
```

## Step 7 — 즉시 조정 제안

점수 기반 자동 제안:

| 점수 | 조치 |
|------|------|
| 1-2 | "근본 문제. 토큰/엔진 재검토 필요" + 구체 위반 목록 |
| 3 | "개선 가능. 다음 수정 포인트:" + 가장 큰 위반 3개 |
| 4 | "양호. 미세 조정:" + 미세 개선 1-2개 |
| 5 | "검증된 패턴. 이 설정 고정 권장" |

## Step 8 — 학습 집계 (주간)

```bash
node scripts/design-learn.mjs --weekly
```
- 3점 이하 반복 패턴 → 토큰/엔진 조정 제안
- 같은 피드백 3회+ → 자동 룰 추가 제안
- 5점 패턴 → "검증된 패턴" 승격

## 자동 트리거

| 감지 패턴 | 커맨드 |
|-----------|--------|
| `/ppt` 완료 직후 | → `/design-score` 자동 제안 |
| UI 컴포넌트 5+ 수정 후 `/end` | → `/design-score` 자동 제안 |
| "디자인 평가", "품질 체크" | → `/design-score` 자동 트리거 |
