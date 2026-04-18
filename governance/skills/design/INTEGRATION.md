# Marketing + Design 통합 파이프라인

> Design Module이 Marketing Module과 어떻게 연동되는지 정의.
> 콘텐츠 생성부터 비주얼 완성까지 원스탑 자동화.

---

## 통합 아키텍처

```
Marketing Module                    Design Module
─────────────────────────────────────────────────────
/marketing-research                      │
  → 콘텐츠 브리프 생성                    │
  ↓                                      │
/marketing-generate                       │
  → 블로그 초안 생성                      │
  ↓                                      │
[인간 20% 편집]                           │
  ↓                                      │
/design-thumbnail ←─────────────── 자동 트리거
  → 썸네일 프롬프트                       │
  ↓                                      │
/design-generate --all ←─────────── 발행 전 실행
  → 전체 비주얼 세트                      │
  ↓                                      │
/design-audit ←─────────────────── 자동 게이트
  → AI 냄새 체크                          │
  ↓                                      │
/marketing-repurpose                      │
  → 15개 포맷 + 비주얼 세트 연결          │
  ↓                                      │
/marketing-publish                        │
  → 콘텐츠 + 비주얼 동시 배포             │
```

---

## 채널별 비주얼 매핑

| 콘텐츠 포맷 | 필요한 비주얼 | 담당 커맨드 |
|------------|------------|-----------|
| 블로그 포스트 | OG 이미지 (1200×630) | /design-thumbnail |
| YouTube 썸네일 | 1280×720 | /design-thumbnail --platform youtube |
| Twitter 스레드 | 선택적 이미지 1-4장 | /design-generate --type social |
| LinkedIn 포스트 | 1200×627 | /design-generate --type social |
| Instagram 피드 | 1080×1080 or 1080×1350 | /design-generate --type social |
| Instagram 스토리 | 1080×1920 | /design-generate --type social |
| 이메일 뉴스레터 | 헤더 600×300 | /design-generate --type email-header |
| 인포그래픽 | 1080×1350 | /design-generate --type infographic |

---

## 자동 트리거 규칙

### Trigger 1: 블로그 초안 완성 시

```
/marketing-generate 완료 → 자동으로 제안:
"썸네일 생성하시겠습니까? /design-thumbnail [제목] 실행"
```

### Trigger 2: /marketing-repurpose 실행 시

```
소셜 포스트 15개 생성 → 각 포맷에 맞는 비주얼 브리핑 자동 생성
→ content/visuals/ 에 비주얼 스펙 파일 저장
→ "비주얼 {N}개 생성 필요 — /design-generate --folder content/visuals/ 실행"
```

### Trigger 3: /marketing-publish 실행 시

```
비주얼 없는 포스트 감지 시:
"⚠️ 비주얼 없음 — 비주얼 없이 발행 시 도달률 40% 감소
   /design-thumbnail [제목] 으로 먼저 생성하거나 --no-visual 플래그로 계속"
```

---

## 통합 파이프라인 원스탑 커맨드

### 풀 파이프라인 (연구 → 작성 → 비주얼 → 발행)

```bash
# 1. 리서치 (15-30분)
/marketing-research --topic "AI 마케팅 자동화 도구 2026"

# 2. 콘텐츠 생성 (20분 AI + 30분 인간 편집)
/marketing-generate --research content/research/2026-04-18-ai-marketing/06-brief.json

# 3. 비주얼 생성 (10분 설정 + 10분 생성 대기)
/design-thumbnail --file content/drafts/2026-04-18-ai-marketing.md
# → Midjourney에서 이미지 생성 후:
/design-audit --file [생성된 이미지]

# 4. 리퍼포징 + 비주얼 세트
/marketing-repurpose --file content/drafts/2026-04-18-ai-marketing.md
/design-generate --type social --content content/drafts/2026-04-18-ai-marketing.md

# 5. 발행
/marketing-publish --file content/drafts/2026-04-18-ai-marketing.md
```

총 소요: ~2시간 (인간 편집 포함), AI + 비주얼 생성 대기 제외

---

## 비주얼 파일 구조 (마케팅 파이프라인과 연동)

```
content/
├── research/
│   └── YYYY-MM-DD-{slug}/
│       ├── 06-brief.json          (리서치 결과)
│       └── BRIEF.md
├── drafts/
│   └── YYYY-MM-DD-{slug}.md      (블로그 초안)
├── repurposed/
│   └── YYYY-MM-DD-{slug}/        (15개 포맷)
├── visuals/                       ← Design Module 출력
│   └── YYYY-MM-DD-{slug}/
│       ├── thumbnail.png
│       ├── og-image.png
│       ├── instagram-square.png
│       ├── instagram-story.png
│       ├── linkedin.png
│       ├── art-direction-brief.md
│       └── audit-report.md
└── brand/                         ← 브랜드 시스템
    ├── style-guide.md
    ├── color-palette.json
    └── visual-language.md
```

---

## 품질 게이트 (발행 전 체크리스트)

```
콘텐츠 게이트 (/marketing-generate):
□ 인간 20% 편집 완료
□ [HUMAN INSERT] 마커 모두 채워짐
□ CTA 자연스럽게 배치됨

비주얼 게이트 (/design-audit):
□ AI 냄새 점수 ≤ 4/10
□ 브랜드 일관성 통과
□ 플랫폼별 크기 확인

발행 게이트 (/marketing-publish):
□ 모든 비주얼 파일 존재 확인
□ 플랫폼별 최적 시간 예약됨
□ publish-log.md 업데이트됨
```
