# Interactive Design — 인터랙티브 비주얼 프롬프트 라이브러리

> 버전: v1.0
> 목표: 정적 이미지의 한계를 넘는 인터랙티브 비주얼.
> AI 이미지 생성의 대안이자 우위 전략.

---

## 왜 인터랙티브인가

```
정적 AI 이미지의 한계:
- "AI 만든 것 같다" 인식 피할 수 없음
- 텍스트 렌더링 불안정
- 데이터 표현 부적합
- 개인화 불가능

인터랙티브 코드의 장점:
- 100% AI 냄새 없음 (코드는 AI냄새가 없음)
- 데이터 정확도 완벽
- 애니메이션/인터랙션으로 참여도 증가
- 업데이트 가능 (실시간 데이터 연동)
- 재사용 가능한 컴포넌트
```

---

## Phase 1: 데이터 시각화

### 1-A: 차트 선택 + 구현

```
You are a data visualization expert. Create the optimal chart for this data.

DATA: {RAW_DATA}
KEY_INSIGHT: {ONE_SENTENCE_TAKEAWAY}
AUDIENCE_LITERACY: beginner/intermediate/expert
BRAND_COLORS: {HEX_PALETTE}

CHART SELECTION LOGIC:
→ Comparing values: horizontal bar chart (NOT pie/donut)
→ Change over time: line chart (NOT bar for time series)
→ Ranking: dot plot (NOT bar — less cluttered for ranked data)
→ Part-to-whole: waffle chart (NOT pie — easier to read proportions)
→ Distribution: histogram or box plot
→ Correlation: scatter plot
→ Flow/process: Sankey diagram
→ Geographic: choropleth map
→ Before/After: slope chart (two-point line connecting the same entity)

Selected type: {CHART_TYPE}
Reason: {specific justification}

DESIGN PRINCIPLES:
1. Data-ink ratio: maximize data, minimize decoration
2. Annotation > legend: label directly on the chart, not in a legend
3. Reference lines: add a meaningful baseline (average, target, previous year)
4. ONE highlighted element: the key finding gets a different color

IMPLEMENTATION (Recharts/React):

```tsx
import { {CHART_COMPONENTS} } from 'recharts';

const data = {FORMATTED_DATA_ARRAY};

const BRAND_COLORS = {
  primary: '{HEX}',
  secondary: '{HEX}',
  highlight: '{HEX}',
  neutral: '{HEX}',
  text: '{HEX}',
};

export function {ChartName}() {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <{ChartType} data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        {/* Axes, Grid, Tooltip — minimal */}
        {/* Key insight annotation */}
        {/* Reference line at {VALUE} */}
      </{ChartType}>
    </ResponsiveContainer>
  );
}
```

COPY:
- Chart title: "{INSIGHT_FIRST_TITLE}" (not "Monthly Data Chart")
- Subtitle: {context or timeframe}
- Source attribution: "{SOURCE}, {YEAR}"
- Key callout text: "{THE_NUMBER_THAT_MATTERS} — {WHY_IT_MATTERS}"
```

### 1-B: 인포그래픽 (정적 HTML/CSS)

```
Create an interactive infographic for this concept.

CONCEPT: {CONCEPT}
KEY_POINTS: {3-7 points, ordered by importance}
BRAND_SYSTEM: {colors + fonts}

INFOGRAPHIC STRUCTURE:
Choose format:
A. Vertical narrative (scrollable on mobile)
B. Horizontal flow (process/timeline)
C. Matrix/grid (comparing options)
D. Interactive quiz/calculator (highest engagement)

For chosen format:

VISUAL_HIERARCHY:
- Level 1 (largest): Main statistic or key number
- Level 2: Section headers
- Level 3: Body text (maximum 30 words per section)
- Level 4: Source/attribution (smallest, but always present)

INTERACTIVE_ELEMENTS (if applicable):
- hover_reveals: {what additional data appears on hover}
- click_filters: {what changes when user clicks a category}
- tooltip_content: {precise data when hovering a chart element}

HTML/CSS IMPLEMENTATION:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <style>
    /* CSS custom properties from brand system */
    :root {
      --color-primary: {HEX};
      --color-secondary: {HEX};
      --font-heading: '{FONT}', sans-serif;
      --font-body: '{FONT}', sans-serif;
    }
    /* Infographic layout */
    /* Animation keyframes */
    /* Responsive breakpoints */
  </style>
</head>
<body>
  <!-- Complete infographic HTML -->
</body>
</html>
```

ANIMATION:
- entrance_animation: elements appear on scroll (Intersection Observer)
- number_animation: counts up to final value (400ms duration)
- hover_effect: subtle scale or color shift on interactive elements
```

---

## Phase 2: 애니메이션 컴포넌트

### 2-A: CSS 애니메이션 (정적 사이트 / 이메일)

```
Create a CSS animation for this visual concept.

CONCEPT: {WHAT_NEEDS_TO_MOVE}
TRIGGER: page-load / scroll / hover / click
DURATION_TARGET: {N}ms total
PERFORMANCE: must work at 60fps on mobile

ANIMATION SELECTION:
- fade-in: attention without distraction
- slide-in: directional flow (left=new content, right=navigation back)
- scale: emphasis or de-emphasis
- draw (SVG stroke): technical/progress concepts
- count-up: number reveals, impressive for statistics
- stagger: list items appear in sequence

CSS IMPLEMENTATION:
```css
@keyframes {animationName} {
  from { /* start state */ }
  to { /* end state */ }
}

.{element} {
  animation: {animationName} {duration}ms {easing} {delay}ms {fill-mode};
}

/* Performance: use only transform and opacity — GPU-composited */
/* Never animate: width, height, top, left, margin, padding */
```

EASING SELECTION:
- ease-out: natural deceleration (most pleasant)
- ease-in-out: balanced, formal
- cubic-bezier(0.34, 1.56, 0.64, 1): spring-like (playful)
- linear: only for continuous loops

Intersection Observer for scroll trigger:
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
    }
  });
}, { threshold: 0.2 });
```
```

### 2-B: Lottie 애니메이션 스펙

```
Design a Lottie animation spec for this icon/illustration.

ICON_CONCEPT: {WHAT_THE_ICON_REPRESENTS}
LOOP: yes/no
TRIGGER: auto-play / on-hover / on-click
FILE_SIZE_BUDGET: {KB} (smaller = better for web)

LOTTIE DESIGN PRINCIPLES:
- Use only vector shapes (no raster effects)
- Limit layers (each layer = file size)
- Use shape morphing over position-only animation
- 60fps for premium, 30fps for smaller files

ANIMATION_SPEC:
{
  "version": "5.12.2",
  "concept": "{ICON_CONCEPT}",
  "duration_ms": {N},
  "fps": 30,
  "loop": {true/false},
  "layers": [
    {
      "name": "{layer_name}",
      "type": "{shape/fill/stroke}",
      "animation": "{enter/exit/loop}",
      "timing": "{start_frame}-{end_frame}",
      "easing": "{ease type}"
    }
  ],
  "colors": {BRAND_PALETTE}
}

TOOL: Create in Adobe After Effects → LottieFiles plugin → export JSON
FREE_ALTERNATIVE: LottieFiles editor (lottiefiles.com/editor)

IMPLEMENTATION:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
<div id="lottie-container" style="width: 200px; height: 200px;"></div>
<script>
  lottie.loadAnimation({
    container: document.getElementById('lottie-container'),
    renderer: 'svg',
    loop: {LOOP},
    autoplay: true,
    path: './animation.json'
  });
</script>
```
```

---

## Phase 3: 인터랙티브 콘텐츠 툴

### 3-A: 계산기/퀴즈

```
Create an interactive calculator/quiz for this content.

PURPOSE: {WHAT_CALCULATION_OR_QUIZ}
INPUTS: {list of user inputs}
OUTPUT: {what result is shown}
BRAND_SYSTEM: {colors + fonts}

PSYCHOLOGY: Interactive tools have 6× higher conversion than static content.
Users who calculate their own result are far more likely to remember and act.

CALCULATOR SPEC:
```tsx
// Complete React component
interface InputState {
  {fieldName}: {type};
}

function calculateResult(inputs: InputState): {ResultType} {
  // logic here
}

export function {CalculatorName}() {
  const [inputs, setInputs] = useState<InputState>({defaults});
  const result = calculateResult(inputs);
  
  return (
    <div className="calculator">
      {/* Input fields with brand styling */}
      {/* Live result display */}
      {/* CTA after result */}
    </div>
  );
}
```

CTA_AFTER_RESULT:
- What the user should do with the result
- Email capture: "Get a detailed breakdown → enter email"
- Share prompt: "Share your result"
- Next step: "Now read {POST} to improve this number"
```

### 3-B: 인터랙티브 비교 테이블

```
Create an interactive comparison table for this content.

ITEMS_TO_COMPARE: {N items}
COMPARISON_CRITERIA: {list of criteria}
BRAND_SYSTEM: {colors + fonts}

INTERACTIVE FEATURES:
- Column highlight on hover
- Filter by criteria (show only rows where "our choice wins")
- Sort by any column
- Mobile: horizontal scroll with sticky first column

HTML/CSS/JS IMPLEMENTATION:
```html
<div class="comparison-table-wrapper">
  <table class="comparison-table">
    <!-- Header with brand styling -->
    <!-- Rows with interactive highlights -->
    <!-- Footer with recommendation -->
  </table>
  <div class="table-cta">
    {RECOMMENDATION_BASED_ON_DATA}
  </div>
</div>
```

STYLING:
- Winning column: subtle highlight in brand primary (10% opacity background)
- Our recommendation: explicit badge
- Mobile: card layout instead of table
```

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|---------|
| 2026-04-18 | v1.0 초기 버전 |
