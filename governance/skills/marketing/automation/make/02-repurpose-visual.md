# WF-2: Repurpose & Visual Generation (Make.com)

> 인간 승인된 콘텐츠 → 15 포맷 + 비주얼 세트 자동 생성.
> Make.com의 시각적 분기 + 외부 통합 강점 활용.

## 시나리오 구조

```
[Webhook: 콘텐츠 승인 알림]
    ↓
[Router: 콘텐츠 타입 분기]
    │
    ├─→ Long-form blog → Repurpose 15 formats
    │       ├─ Twitter thread (Claude API)
    │       ├─ LinkedIn carousel (Claude API)
    │       ├─ Instagram carousel (Claude API)
    │       ├─ Email newsletter (Claude API)
    │       ├─ TikTok script (Claude API)
    │       └─ ... (15개 병렬 처리)
    │
    └─→ Native social → Skip repurpose
            ↓
    [Visual Generation Branch]
    │
    ├─→ Thumbnail (Midjourney API)
    ├─→ OG image (Canva API)
    ├─→ Instagram visuals (Midjourney → Canva)
    └─→ Data charts (Code execution)
            ↓
    [Save to /content/]
            ↓
    [Slack 알림: 비주얼 검토 대기]
            ↓
    [Wait: 인간 비주얼 승인]
            ↓
    [Trigger WF-3: Publish]
```

## Make.com 모듈 설정

### 1. Webhook
```
Trigger: Custom webhook
Data structure: JSON
{
  "slug": "string",
  "date": "YYYY-MM-DD",
  "draft_path": "content/drafts/...",
  "approved_by": "string"
}
```

### 2. Router (콘텐츠 타입 분기)
Filter conditions:
- Route 1: `draft_path` contains "drafts/" (long-form blog)
- Route 2: `draft_path` contains "social/" (native social-first)

### 3. Long-form Repurpose 분기 (Iterator)

**Iterator 입력**: 15개 포맷 정의 배열
```json
[
  {"name": "twitter_thread", "prompt_file": "social-twitter.md"},
  {"name": "linkedin_carousel", "prompt_file": "social-linkedin.md"},
  {"name": "instagram_carousel", "prompt_file": "social-instagram.md"},
  {"name": "instagram_story", "prompt_file": "social-instagram.md"},
  {"name": "instagram_reels", "prompt_file": "social-instagram.md"},
  {"name": "tiktok_script", "prompt_file": "social-tiktok.md"},
  {"name": "youtube_shorts", "prompt_file": "social-tiktok.md"},
  {"name": "email_newsletter", "prompt_file": "email.md"},
  {"name": "email_sequence_d0", "prompt_file": "email.md"},
  {"name": "email_sequence_d3", "prompt_file": "email.md"},
  {"name": "email_sequence_d7", "prompt_file": "email.md"},
  {"name": "email_reactivation", "prompt_file": "email.md"},
  {"name": "ad_meta", "prompt_file": "ad-copy.md"},
  {"name": "ad_google", "prompt_file": "ad-copy.md"},
  {"name": "ad_linkedin", "prompt_file": "ad-copy.md"}
]
```

각 포맷에 대해 병렬로:
- Anthropic API 호출 (Claude Sonnet 4.6)
- 결과를 `content/repurposed/{date}-{slug}/{NN}-{name}.md`에 저장

### 4. Anthropic API 모듈 설정
```
URL: https://api.anthropic.com/v1/messages
Method: POST
Headers:
  x-api-key: {{ANTHROPIC_API_KEY}}
  anthropic-version: 2023-06-01
  content-type: application/json
Body:
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 4000,
  "system": "{{prompt_file_content}}",
  "messages": [{
    "role": "user",
    "content": "Convert this blog to {{format_name}}:\n\n{{blog_content}}"
  }]
}
```

### 5. Visual Generation 분기

**5-A. Midjourney 호출** (Discord webhook 또는 비공식 API):
- 프롬프트는 `governance/skills/design/prompts/thumbnail.md` 적용
- 결과 이미지 URL 받아서 다운로드

**5-B. Canva API** (Pro+ 플랜 필요):
- Template ID + 데이터 매핑
- 텍스트 + 이미지 자동 합성
- PNG export

**5-C. Code-based 비주얼** (n8n 호출):
- Recharts 컴포넌트 렌더링
- HTML/CSS → Puppeteer screenshot

### 6. Slack 비주얼 검토 알림
```
Channel: #visual-review
Message:
🎨 비주얼 생성 완료: {{slug}}

Thumbnail: {{thumbnail_url}}
Instagram: {{instagram_url}}
LinkedIn: {{linkedin_url}}

승인: 다음 워크플로우 트리거
재생성: 슬랙 reply에 "regen [이미지명]"
```

## 인간 게이트 (Mandatory)

WF-2는 다음 두 지점에서 인간 승인 필수:

1. **콘텐츠 승인** (WF-1 끝, WF-2 트리거)
   - 블로그 초안 20% 편집 후 승인
2. **비주얼 승인** (WF-2 끝, WF-3 트리거)
   - AI 냄새 + 브랜드 일관성 체크 후 승인

승인 없으면 다음 워크플로우 자동 트리거 안 됨.

## 비용 추정

WF-2 실행당 (1 콘텐츠):
- Claude API (15 포맷): ~50,000 tokens × $3/M = $0.15
- Midjourney (5 이미지): $0.08 × 5 = $0.40
- Canva API: 포함 (Pro 플랜 내)
- 합계: ~$0.55/콘텐츠

월 12 콘텐츠 운영 시: ~$6.60/월

## Make.com 운영비

- Free 플랜: 1,000 ops/월 (불충분)
- Core 플랜 ($9/월): 10,000 ops/월 (충분)
- Pro 플랜 ($29/월): 50,000 ops/월 (멀티 브랜드용)
