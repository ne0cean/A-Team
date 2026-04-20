# /marketing-repurpose — 1→15 콘텐츠 변환

**용도**: 블로그 1개 → 15개 포맷 자동 변환. A-Team 마케팅의 핵심 무기.

## 실행 흐름

### Step 0: 입력 파싱

```
사용법:
  /marketing-repurpose --file content/drafts/YYYY-MM-DD-slug.md
  /marketing-repurpose --url "https://..."
  /marketing-repurpose --text "직접 붙여넣기"

플래그:
  --file      로컬 마크다운 파일 경로
  --url       공개된 블로그 URL
  --text      직접 콘텐츠 입력
  --formats   생성할 포맷 선택 (기본: all)
              예: --formats "twitter,linkedin,email"
  --lang      출력 언어 (기본: 원문과 동일)
  --brand     브랜드 가이드 파일 경로 (기본: governance/skills/marketing/brand.md)
```

### Step 1: 콘텐츠 분석

원문을 읽고 추출:
- 핵심 메시지 (1문장)
- 핵심 인사이트 3-5개 (각 트윗급 분량)
- 핵심 데이터 포인트
- CTA 방향
- 타깃 오디언스

### Step 2: 15개 포맷 병렬 생성

각 포맷을 순서대로 생성하되, 독립적으로 완결된 콘텐츠로:

**소셜 미디어 (5개)**
1. **Twitter/X 스레드** — `prompts/social-twitter.md` 사용
   - 7-10개 트윗, 각 280자 이내
   - 스레드 번호 표시: 1/ 2/ 3/ ...

2. **LinkedIn 롱폼** — `prompts/social-linkedin.md` 사용
   - 300-500단어, 전문가 앵글
   - [HUMAN INSERT] 마킹 포함

3. **LinkedIn 캐러셀** — 슬라이드 텍스트 생성
   - 표지 + 6-8 슬라이드 + 마지막(CTA)
   - 각 슬라이드: 제목 + 1-2줄 본문
   - (시각 디자인은 Mirra MCP 또는 Canva로 별도 처리)

4. **Instagram 캡션** — 짧고 감성적, 해시태그 10-15개
   - 2-3문장 훅 + 본문 + CTA + 해시태그 블록

5. **Instagram 캐러셀** — 슬라이드 텍스트
   - 표지(강렬한 훅) + 5-7 슬라이드 + 팔로우 CTA

**영상 콘텐츠 (3개)**
6. **TikTok/Reels 스크립트** (30-60초)
   - 0-3초: 패턴 인터럽트 훅 ("Most people don't know...")
   - 3-25초: 핵심 인사이트 (구체적, 빠른 페이스)
   - 25-30초: CTA + 팔로우 유도

7. **YouTube Shorts 스크립트** (30-60초)
   - TikTok과 유사하나 더 교육적 톤

8. **팟캐스트 쇼노트** (100-150단어)
   - 에피소드 설명 + 타임스탬프 힌트 + 링크 섹션

**이메일 (3개)**
9. **뉴스레터** — `prompts/email.md` Newsletter Prompt
   - 제목 3옵션 + 프리뷰텍스트 + 본문

10. **이메일 시퀀스 3부작** — `prompts/email.md` Nurture Sequence
    - 1일차 / 3일차 / 7일차

11. **재활성화 이메일** (단일)
    - 오래된 구독자 재참여용
    - 훅: "당신이 마지막으로 읽은 이후 X가 바뀌었습니다"

**광고 및 전환 (3개)**
12. **광고 카피 3종** — `prompts/ad-copy.md`
    - Meta / Google / LinkedIn 각각 A/B/C 변형

13. **랜딩페이지 카피**
    - 헤드라인 + 서브헤드라인 + 불릿 3개 + CTA
    - Above-the-fold 섹션 완전 작성

14. **인포그래픽 개요**
    - 제목 + 섹션 5-7개 + 각 섹션 핵심 데이터
    - (디자인은 Canva/Mirra로 별도)

**비주얼 지원 (1개)**
15. **이미지 생성 프롬프트 3종**
    - Flux/DALL-E용 상세 프롬프트
    - 각각: 블로그 헤더 / 소셜 카드 / 인스타 사각형

### Step 3: 출력 파일 저장

```
content/repurposed/YYYY-MM-DD-{slug}/
  ├── 01-twitter-thread.md
  ├── 02-linkedin-post.md
  ├── 03-linkedin-carousel.md
  ├── 04-instagram-caption.md
  ├── 05-instagram-carousel.md
  ├── 06-tiktok-script.md
  ├── 07-youtube-shorts.md
  ├── 08-podcast-shownotes.md
  ├── 09-newsletter.md
  ├── 10-email-sequence.md
  ├── 11-reactivation-email.md
  ├── 12-ad-copy.md
  ├── 13-landing-page.md
  ├── 14-infographic-outline.md
  └── 15-image-prompts.md
```

### Step 4: 완료 요약

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 리퍼포징 완료 — 15개 포맷 생성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

저장 위치: content/repurposed/YYYY-MM-DD-{slug}/

다음 단계:
  /marketing-publish --dir content/repurposed/YYYY-MM-DD-{slug}/
  → 플랫폼별 스케줄링 + 배포

예상 도달 증가: 기존 대비 +200-300%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 품질 기준

- 각 포맷은 원문을 모르는 독자가 읽어도 완결된 가치를 전달해야 함
- 플랫폼별 특성 반영 (LinkedIn = 전문가 / TikTok = 빠른 페이스 / 이메일 = 직접적)
- [HUMAN INSERT] 마킹: 개인 경험 삽입 권장 위치 표시 (제거 가능하나 권장)

## Analytics 로깅 (필수)

각 리퍼포즈 포맷 저장 시마다 `.context/analytics.jsonl` 에 이벤트 1건씩 append (15 포맷 = 15 이벤트):

```typescript
import { logMarketingEvent } from './lib/analytics';

logMarketingEvent('marketing_repurpose', {
  repo: '<현재 프로젝트명>',
  marketingTopic: '<원문 슬러그>',
  marketingPlatform: '<플랫폼>',
  marketingArtifactPath: '<생성된 파일 경로>',
  marketingHumanInsertCount: <해당 포맷의 마커 수>,
}, '.context/analytics.jsonl');
```

배치 실행 시 loop 안에서 호출. 실패 시 graceful.
