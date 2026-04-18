---
slug: claude-sleep-resume
date: 2026-04-18
mode: dry-run
status: ready_for_publish_pending_visuals
---

# Publish Plan — Claude Code Sleep Mode

## Pre-publish Checklist

- [x] Brief schema validated (✅ valid)
- [x] Twitter thread drafted (9 tweets, hook variant C 권장)
- [x] LinkedIn post drafted (1450 words, 2 [HUMAN INSERT] 마커)
- [x] Instagram carousel drafted (8 slides, visual system 일관)
- [x] Art direction brief written
- [x] OG image HTML written (og-image.html)
- [ ] OG image PNG 변환 (Puppeteer/playwright screenshot)
- [ ] [HUMAN INSERT] 마커 채워짐 (twitter 0개, linkedin 2개, instagram caption 1개)
- [ ] 인간 20% 편집 완료
- [ ] Brand guard 통과

## Schedule (Dry-Run — 실제 발행 X)

| 플랫폼 | 발행 시간 (KST) | 콘텐츠 파일 | Postiz job_id |
|--------|---------------|-------------|---------------|
| Twitter/X | 2026-04-21 09:00 (화) | twitter-thread.md | dry-run-tw-001 |
| LinkedIn | 2026-04-22 09:00 (수) | linkedin-post.md | dry-run-li-001 |
| Instagram | 2026-04-21 19:00 (화) | instagram-carousel.md + 8 PNG | dry-run-ig-001 |

**선후 의도**:
- Twitter 화요일 09시 → 개발자 출근길 + 알고리즘
- Instagram 화요일 19시 (저녁) → 동일 토픽 다른 매체 도달
- LinkedIn 수요일 09시 → Twitter 24h 반응 데이터 활용

## Visual Dependencies

| 비주얼 | 상태 | 출처 |
|--------|------|------|
| Twitter card 1600×900 | ⚠️ HTML 없음 (스펙만) | content/visuals/.../twitter-card.html (TODO) |
| OG image 1200×630 (LinkedIn) | ✅ HTML 작성 / ⚠️ PNG 미변환 | og-image.html |
| Instagram carousel 1080×1350 × 8 | ⚠️ 스펙만 (HTML 없음) | (TODO) |

## Failure Modes (Dry-Run 단계 발견)

1. **Postiz MCP 미연결** — 실제 발행 불가, 수동 모드로 fallback 필요
2. **Midjourney/Canva API 미연동** — 모든 비주얼 수동 생성 또는 코드 직접
3. **Instagram API은 Postiz로도 carousel 자동화 까다로움** — 수동 업로드 가능성 높음

## Real Publish 시 필요한 환경

```bash
# .env
POSTIZ_API_URL=http://localhost:3000  # 또는 Postiz Cloud URL
POSTIZ_API_KEY=xxx                     # Postiz UI에서 발급
ANTHROPIC_API_KEY=sk-ant-xxx           # 자동 콘텐츠 보정 시

# Postiz 셋업 (Docker)
git clone https://github.com/gitroomhq/postiz-app
cd postiz-app && cp .env.example .env
docker-compose up -d
# → http://localhost:3000 접속 → Twitter/LinkedIn/Instagram OAuth 연결
```

## Dry-Run 결과

이 publish-plan은 실제 API 호출 없이 작성됨.
실제 발행 시 `/marketing-publish --dir content/social/2026-04-18-claude-sleep-resume/` 실행.

**완료 기준**:
- Postiz job_id 3개 모두 발급
- publish-log.md status: scheduled (또는 published)
- 24h 후 Postiz 분석 데이터 → marketing-analytics 입력
