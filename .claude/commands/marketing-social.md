# /marketing-social — Native Social-First 콘텐츠 생성

**용도**: 블로그 없이 X/Instagram/LinkedIn/TikTok용 콘텐츠 직접 생성.
`/marketing-generate`가 블로그 중심인 반면, 이 커맨드는 소셜이 1차 매체.

## 실행 흐름

### Step 0: 입력 파싱

```
사용법:
  /marketing-social --platform twitter --topic "AI 마케팅 자동화"
  /marketing-social --platform instagram --format carousel --topic "..."
  /marketing-social --platform tiktok --concept "30초로 보는 ROI 계산법"
  /marketing-social --multi --topic "..." (모든 주요 플랫폼 native 생성)

플래그:
  --platform   twitter / instagram / linkedin / tiktok / youtube-shorts (필수, --multi 없을 시)
  --format     플랫폼별 포맷:
               twitter: tweet / thread (기본 thread)
               instagram: feed / carousel / story / reels (기본 carousel)
               linkedin: post / carousel / poll (기본 post)
               tiktok: video (15s/30s/60s, 기본 30s)
  --topic      주제 (필수)
  --concept    구체적 훅/각도 (없으면 자동 생성)
  --research   /marketing-research 결과 JSON (선택)
  --multi      모든 플랫폼 동시 native 생성 (각 플랫폼 최적화)
  --lang       언어 (기본: ko)
  --no-review  인간 리뷰 게이트 스킵 (비권장)
```

### Step 1: 플랫폼별 프롬프트 라우팅

| Platform | Format | 사용 프롬프트 |
|----------|--------|-------------|
| twitter | thread | `prompts/social-twitter.md` |
| instagram | feed/carousel/story/reels | `prompts/social-instagram.md` |
| linkedin | post/carousel | `prompts/social-linkedin.md` |
| tiktok | video | `prompts/social-tiktok.md` |
| youtube-shorts | video | `prompts/social-tiktok.md` (동일 프롬프트, 플랫폼 차이만 조정) |

### Step 2: --multi 모드 (모든 플랫폼 동시 생성)

```
입력: --topic "AI 마케팅 자동화 ROI"

자동으로 모든 플랫폼 native 콘텐츠 생성:
- Twitter: 8-tweet thread (텍스트 중심)
- Instagram Carousel: 7 slides (시각 중심)
- LinkedIn: 1500-word post (분석 + 데이터)
- TikTok: 30s video script (속도 중심)
- YouTube Shorts: 60s script (TikTok 변형)

각 플랫폼에 최적화된 다른 각도/구조로 생성 (단순 복붙 X)
```

### Step 3: 비주얼 자동 연동

각 플랫폼 콘텐츠 생성 후:
```
"비주얼 필요한 항목 감지:
  - Twitter: 데이터 차트 1개 (선택)
  - Instagram Carousel: 7 슬라이드 비주얼 (필수)
  - LinkedIn: OG 카드 1개 (권장)
  - TikTok: B-roll 촬영 가이드 (수동)

  /design-generate --type social --content [경로] 실행하시겠습니까?"
```

### Step 4: 인간 리뷰 게이트

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✋ 인간 리뷰 — Native Social 게이트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

각 플랫폼별 체크:
  □ Twitter: 첫 트윗 훅이 standalone로 작동?
  □ Instagram: 첫 슬라이드 후크가 swipe 유발?
  □ LinkedIn: 첫 줄이 "더 보기" 누를 만큼 강력?
  □ TikTok: 첫 1초 시각 임팩트 충분?

플랫폼별 [HUMAN INSERT] 마커 위치 표시됨.
20% 이상 편집 후 다음 단계 진행.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 5: 저장 + 발행 연계

```
content/social/YYYY-MM-DD-{slug}/
  ├── twitter-thread.md
  ├── instagram-carousel.md  (캡션 + 슬라이드별 텍스트)
  ├── linkedin-post.md
  ├── tiktok-script.md
  └── publish-plan.md  (플랫폼별 최적 시간 + Postiz 스케줄링)

다음 단계:
  /design-generate --type social --content content/social/{slug}/
  /marketing-publish --folder content/social/{slug}/
```

---

## 사용 예시

```bash
# Twitter 전용 — 빠른 thread 생성
/marketing-social --platform twitter --topic "1인 마케팅 자동화 ROI"

# Instagram Reels 스크립트
/marketing-social --platform instagram --format reels --concept "30초 안에 깨닫는 마케팅 진실"

# LinkedIn 분석 글
/marketing-social --platform linkedin --topic "B2B 콘텐츠 마케팅 2026 트렌드"

# 모든 플랫폼 동시 native 생성 (블로그 없이)
/marketing-social --multi --topic "AI 콘텐츠 자동화 진짜 ROI"

# 리서치 결과 활용
/marketing-social --multi --topic "..." --research content/research/2026-04-18-slug/06-brief.json
```

---

## /marketing-generate 와의 차이

| 항목 | /marketing-generate | /marketing-social |
|------|--------------------|--------------------|
| 1차 매체 | 블로그 (3000자) | 소셜 (각 플랫폼 native) |
| 결과물 | 블로그 1개 | 플랫폼별 콘텐츠 1-N개 |
| 후속 흐름 | /marketing-repurpose로 15포맷 | 각 플랫폼 직접 발행 |
| 리서치 깊이 | 깊음 (long-form) | 중간 (각 플랫폼 컨벤션) |
| 인간 편집 시간 | 30-60분 | 10-20분 |
| 적합한 경우 | SEO + 권위 구축 | 빠른 도달 + 알고리즘 활용 |

**권장**: 두 가지 병행. 주 1-2개는 blog-first (/generate → /repurpose), 매일 1개는 social-first (/social).
