# /design-brief — 디자인 브리핑 생성

**용도**: 비주얼 작업 착수 전 방향 설정. Art Director Agent가 스타일·도구·프롬프트를 결정.
비주얼 생성 전 **반드시** 실행. 브리핑 없이 생성하면 AI 냄새 위험 급증.

## 실행 흐름

### Step 0: 입력 파싱

```
사용법:
  /design-brief --type thumbnail --title "AI 마케팅 자동화 완전 가이드"
  /design-brief --type hero --topic "productivity" --brand content/brand/style-guide.md
  /design-brief --type social --platform instagram --content content/drafts/2026-04-18-post.md

플래그:
  --type      비주얼 유형 (필수): thumbnail / hero / social / illustration / infographic / interactive
  --title     콘텐츠 제목 (thumbnail/hero용)
  --topic     주제 키워드
  --platform  대상 플랫폼 (social용): instagram/linkedin/twitter/youtube
  --content   기존 콘텐츠 파일 경로 (컨텍스트로 사용)
  --brand     브랜드 가이드 경로 (없으면 content/brand/style-guide.md 자동 탐색)
  --quick     빠른 브리핑 (1 variant, 5분 이내)
  --variants  생성할 방향 수 (기본: 2, 최대: 3)
```

### Step 1: 브랜드 가이드 로드

`content/brand/style-guide.md` 존재 확인:
- **있음**: 로드 후 Art Director에게 전달
- **없음**: 

```
브랜드 스타일 가이드가 없습니다.
기본 설정으로 진행하거나 브랜드 가이드를 먼저 생성하세요:

  /design-brief --setup-brand

또는 빠른 설정 (3가지 질문):
  1. 브랜드 주색상 HEX 코드? (예: #1A1A2E)
  2. 디자인 톤? (minimal/bold/warm/editorial/technical)
  3. 레퍼런스 브랜드? (예: "Bloomberg의 데이터 감성 + Stripe의 깔끔함")
```

### Step 2: Art Director 분석

`governance/skills/design/agents/art-director.md` 에이전트 실행.

에이전트가 결정하는 것:
1. **비주얼 유형** (사진/일러/데이터/타이포/코드)
2. **스타일 레퍼런스** (구체적 시대/매체/작가)
3. **도구 선택** (Midjourney/DALL-E 3/SD/Code)
4. **AI 냄새 리스크** + 방어책

### Step 3: 브리핑 출력

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 DESIGN BRIEF — {TYPE} for "{TITLE}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 비주얼 방향
유형: {PHOTO/ILLUSTRATION/DATA/TYPOGRAPHY/CODE}
근거: {왜 이 유형인지 — 구체적 이유}

## 스타일 레퍼런스
"{SPECIFIC_REFERENCE}" — {어떤 점을 가져오는지}
피할 것: {구체적 안티 패턴 3가지}

## 생성 프롬프트

### Variant A — {APPROACH_NAME}
도구: {Midjourney/DALL-E 3/Code}
프롬프트:
```
{EXACT_PROMPT}
```
후처리: {색보정/크롭/텍스트 추가 등}
AI 냄새 위험: LOW/MEDIUM/HIGH

### Variant B — {APPROACH_NAME}
...

## 텍스트 전략
위치: {top/bottom/left/right}
내용: "{OPTION_A}" / "{OPTION_B}" / "{OPTION_C}"
폰트: {specific recommendation}

## 브랜드 통합
색상 사용: {구체적 HEX + 적용 위치}
일관성 포인트: {기존 자산과 연결되는 요소}

## 다음 단계
생성 후: /design-audit 로 AI 냄새 체크
발행 전: Brand Guard 자동 체크
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: 저장

```
content/visuals/YYYY-MM-DD-{slug}/
  └── art-direction-brief.md
```

---

## 브랜드 셋업 모드 (`--setup-brand`)

브랜드 스타일 가이드 최초 생성:

`governance/skills/design/prompts/image-gen.md` Phase C-1 프롬프트 실행:
1. 비즈니스 유형 + 토픽 + 오디언스 파악
2. 색상 시스템 (primary/secondary/accent/neutrals)
3. 타이포그래피 (H1/body/accent 폰트 + 사이즈)
4. 사진 방향 (shot style + color grade + avoid list)
5. 반복 비주얼 요소 결정

저장:
```
content/brand/style-guide.md   (마크다운 가이드)
content/brand/color-palette.json (HEX + 용도 JSON)
```

---

## 사용 예시

```bash
# 블로그 썸네일 브리핑
/design-brief --type thumbnail --title "AI 마케팅 자동화 완전 가이드 2026"

# Instagram용 비주얼 브리핑
/design-brief --type social --platform instagram --topic "productivity tools"

# 브랜드 가이드 최초 생성
/design-brief --setup-brand

# 기존 콘텐츠 기반 브리핑 (연관 비주얼)
/design-brief --type hero --content content/drafts/2026-04-18-ai-marketing.md
```
