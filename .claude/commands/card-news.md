---
description: /card-news — 인스타그램 카드뉴스 8장 자동 생성
---

> Analytics: `node scripts/log-event.mjs command_start name=card-news` — 실행 시작 시 반드시 호출

# /card-news — 카드뉴스 자동 생성

> **출처**: 짐코딩 (https://youtu.be/501KRO5QSXM)
> **용도**: URL/텍스트 → 인스타그램 카드뉴스 8장 PNG

## 왜 HTML/CSS인가

- 폰트, 컬러, 간격 **1픽셀 단위** 정밀 제어
- 템플릿 1회 → 100장/1000장 동일 퀄리티
- Claude 구독자 추가 비용 **0원**

## 사용법

```
/card-news https://example.com/article
/card-news --text "직접 입력할 내용"
/card-news --topic "주제" --points "핵심1,핵심2,핵심3"
```

**플래그:**
- `--url` 또는 첫 인자: 원문 URL (크롤링)
- `--text`: 직접 텍스트 입력
- `--topic`: 주제
- `--points`: 콤마 구분 핵심 포인트
- `--tone`: 톤 (기본: editorial, 옵션: bold/minimal/playful)
- `--color`: 메인 컬러 (기본: #1a1a2e)

## 워크플로우

### Step 1: 콘텐츠 추출

**URL 입력 시:** WebFetch로 URL 크롤링 → 핵심 내용 추출
**텍스트 입력 시:** 직접 파싱하여 핵심 포인트 추출

### Step 2: 8장 슬라이드 구성

| 슬라이드 | 역할 | 내용 |
|----------|------|------|
| 1 | Hook | 주목 끄는 제목 + 부제 |
| 2-3 | Problem | 문제 제기 / 공감 |
| 4-6 | Solution | 핵심 포인트 3개 |
| 7 | Summary | 요약 / 핵심 메시지 |
| 8 | CTA | 액션 유도 (팔로우/저장/공유) |

### Step 3: HTML 8개 생성

템플릿: `templates/card-news/base.html`
출력: `{out}/slide-01.html ~ slide-08.html`

**HTML 규격:**
- 크기: 1080×1350px (Instagram portrait)
- 폰트: Pretendard (한글), Inter (영문)

### Step 4: Playwright 캡처

```bash
bash scripts/card-news-capture.sh {out}
```

출력: `{out}/slide-01.png ~ slide-08.png`

### Step 5: 저장 및 안내

```
content/card-news/{date}-{slug}/
├── slide-01.html ~ slide-08.html
├── slide-01.png ~ slide-08.png
└── metadata.json
```

## 톤별 스타일

| 톤 | 배경 | 텍스트 | 악센트 |
|----|------|--------|--------|
| editorial | #1a1a2e | #ffffff | #4361ee |
| bold | #000000 | #ffffff | #ff6b6b |
| minimal | #fafafa | #1a1a1a | #2d3436 |
| playful | #fff5f5 | #2d3436 | #e17055 |

## 오류 처리

- URL 크롤링 실패 → 텍스트 직접 입력 요청
- Playwright 미설치 → `cd scripts/browser && npm install` 안내

## Analytics 로깅

```typescript
logMarketingEvent('card_news_generate', {
  marketingPlatform: 'instagram',
  marketingMode: 'card-news',
  slideCount: 8,
}, '.context/analytics.jsonl');
```
