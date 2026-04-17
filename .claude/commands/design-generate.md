# /design-generate — 비주얼 에셋 생성 오케스트레이터

**용도**: Art Direction 브리핑 기반 비주얼 생성 실행 + 품질 체크 + 저장.
`/design-brief` 완료 후 실행하거나, `--brief` 플래그로 브리핑 동시 실행.

## 실행 흐름

### Step 0: 입력 파싱

```
사용법:
  /design-generate --brief content/visuals/2026-04-18-slug/art-direction-brief.md
  /design-generate --type thumbnail --title "제목" (브리핑 동시 실행)
  /design-generate --content content/drafts/2026-04-18-post.md --all (전체 비주얼 세트)

플래그:
  --brief      기존 art-direction-brief.md 경로
  --type       비주얼 유형 (brief 없을 시): thumbnail/hero/social/infographic
  --title      콘텐츠 제목
  --content    콘텐츠 파일 (자동으로 필요한 비주얼 유형 감지)
  --all        한 포스트에 필요한 모든 비주얼 생성 (thumbnail + OG + social 3종)
  --tool       도구 강제 지정: midjourney/dalle/code/canva
  --no-audit   품질 체크 스킵 (비권장)
```

### Step 1: 브리핑 로드 또는 생성

`--brief` 있으면: 파일 로드 후 바로 Step 2
`--brief` 없으면: `/design-brief` 자동 실행 후 계속

### Step 2: 도구별 실행 분기

#### 🖼️ Midjourney / DALL-E 3 (이미지 생성)

```
현재 제한: Claude Code는 Midjourney/DALL-E 3 API를 직접 호출할 수 없음.
(MCP 또는 자체 스크립트가 있으면 예외)

대신 제공:
1. 복사-붙여넣기 준비된 프롬프트 (최적화 완료)
2. 각 플랫폼 접속 링크 + 사용법
3. 생성 후 파일 저장 경로 안내

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 이미지 생성 준비 완료

[MIDJOURNEY 프롬프트 - 복사하세요]
{ART_DIRECTOR_PROMPT_A}

[DALL-E 3 대안 - ChatGPT 또는 API]
{ART_DIRECTOR_PROMPT_B}

생성 후:
1. 이미지를 content/visuals/YYYY-MM-DD-{slug}/ 에 저장
2. /design-audit --file [경로] 로 품질 체크
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 💻 Code (인터랙티브/데이터 비주얼)

Claude가 직접 생성:

**인터랙티브 컴포넌트 (HTML/CSS)**:
```html
<!-- content/visuals/YYYY-MM-DD-{slug}/component.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Art Director 스펙에 따른 정확한 CSS */
  </style>
</head>
<body>
  <!-- 인터랙티브 요소 -->
</body>
</html>
```

**데이터 시각화 (Recharts/D3)**:
```jsx
// content/visuals/YYYY-MM-DD-{slug}/chart.tsx
// 완전한 컴포넌트 코드
```

**Lottie 애니메이션 스펙**:
```json
// content/visuals/YYYY-MM-DD-{slug}/animation-spec.json
// SVG 경로 + 타이밍 정의
```

#### 🎨 Canva 가이드 (타이포그래피 중심)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 Canva 실행 가이드

템플릿 카테고리: {TEMPLATE_CATEGORY}
템플릿 검색어: "{SEARCH_TERM}"

수정 단계:
1. 배경색 → {HEX}
2. 제목 텍스트 → "{CHOSEN_TITLE}"
   폰트: {FONT}, 크기: {SIZE}px, 색상: {HEX}
3. 부제목 (있을 경우) → "{SUBTITLE}"
4. 이미지 업로드: [Midjourney에서 받은 이미지]
5. 레이아웃: {구체적 배치 지시}
6. 저장 형식: PNG 1200×630 (blog OG) / 1080×1080 (Instagram)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: 자동 품질 체크 (`--no-audit` 없을 시)

이미지 생성 완료 후 Image Critic Agent 자동 실행:

```
`governance/skills/design/agents/image-critic.md` 실행
- AI 냄새 점수 ≤ 4 → PUBLISH 승인
- AI 냄새 점수 5-6 → 구체적 수정 지시 + 재확인
- AI 냄새 점수 ≥ 7 → 재생성 프롬프트 제공
```

Brand Guard 자동 체크:
```
`governance/skills/design/agents/brand-guard.md` 실행
- PASS → 발행 준비 완료
- FAIL → 구체적 브랜드 수정 지시
```

### Step 4: 결과물 저장 + 발행 연계

```
content/visuals/YYYY-MM-DD-{slug}/
  ├── art-direction-brief.md     (브리핑)
  ├── thumbnail.png              (YouTube/블로그용)
  ├── og-image.png               (1200×630, SNS 공유용)
  ├── instagram-square.png       (1080×1080)
  ├── instagram-story.png        (1080×1920, 있을 경우)
  ├── component.html             (인터랙티브, 있을 경우)
  └── audit-report.md            (Image Critic 보고서)
```

발행 연계:
```
마케팅 발행 파이프라인과 연동:
  /marketing-publish 실행 시 자동으로 content/visuals/ 탐색
  매칭되는 날짜/슬러그의 비주얼 자동 첨부
```

---

## --all 모드 (콘텐츠 발행 전 전체 비주얼 세트)

블로그 포스트 1개당 생성되는 비주얼:

| 비주얼 | 크기 | 도구 | 시간 |
|--------|------|------|------|
| 블로그 썸네일 | 1200×630 | Midjourney → Canva | 10분 |
| YouTube 썸네일 | 1280×720 | Midjourney → Canva | 10분 |
| LinkedIn OG | 1200×627 | Canva | 5분 |
| Twitter 헤더 | 1600×900 | Canva | 5분 |
| Instagram 정사각형 | 1080×1080 | Midjourney → Canva | 10분 |
| 인포그래픽 (있을 경우) | 1080×1350 | D3/HTML | 20분 |

---

## 사용 예시

```bash
# 브리핑 + 생성 원스탑
/design-generate --type thumbnail --title "AI 마케팅 자동화 완전 가이드 2026"

# 기존 브리핑으로 생성
/design-generate --brief content/visuals/2026-04-18-ai-marketing/art-direction-brief.md

# 콘텐츠 발행 전 전체 세트
/design-generate --content content/drafts/2026-04-18-ai-marketing.md --all

# 인터랙티브 데이터 비주얼만
/design-generate --type infographic --content content/drafts/2026-04-18-stats.md --tool code
```
