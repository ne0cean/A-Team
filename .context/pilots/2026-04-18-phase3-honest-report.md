---
date: 2026-04-18
type: live-validation
status: partial-success
slug: claude-sleep-resume
---

# Phase 3 Live Validation — Honest Report

> 사용자 요청: "a부터 하자" — 실제 콘텐츠 end-to-end 생성하고 어디까지 작동하는지 검증.

## TL;DR

**작동한 부분**: 콘텐츠 생성 파이프라인 (research → brief → 3-platform native → visual code) **80% 자동화 가능**.
**막힌 부분**: 발행 자동화 (Postiz/Midjourney/API 키) — 외부 인프라 미셋업으로 dry-run 종료.
**[HUMAN INSERT]**: 3개 (LinkedIn 2개 + Instagram caption 1개) — 인간 편집 미완료.

## End-to-End 결과

| 단계 | 상태 | 자동화 비율 | 증거 |
|------|------|-----------|------|
| 1. 토픽 선정 | ✅ | 100% (WebSearch) | GitHub issues 5+ confirmed (#18980 #26789 etc.) |
| 2. Research → Brief | ✅ | 100% | `06-brief.json` schema VALID |
| 3. Twitter thread | ✅ | 100% (3 hook variants) | 9 tweets, [HUMAN INSERT] 0개 |
| 4. LinkedIn post | ✅ | 80% | 1450 words, [HUMAN INSERT] 2개 |
| 5. Instagram carousel | ✅ | 90% | 8 slides, [HUMAN INSERT] 1개 (caption) |
| 6. Art Direction | ✅ | 100% | CODE > Midjourney 결정 (브리프 작성) |
| 7. OG Image (HTML) | ✅ | 100% | 1200×630 functional HTML |
| 8. OG Image (PNG) | ✅ | 100% (Playwright) | 43KB, 한국어 렌더 정상 |
| 9. Design Audit | ✅ | LLM critique 작동 | 64/100 (false positives), AI smell 0-1/10, A11Y PASS |
| 10. Postiz 발행 | ❌ | 0% | OAuth/Docker 미셋업 |
| 11. Analytics 루프 | ❌ | 0% | 발행 안 됨 → 데이터 없음 |

## 어디서 막혔는가 (정직)

### 막힌 곳 1: Postiz MCP 미연결
- **증상**: 22+ 플랫폼 API 자동화 가능하지만 Docker 인스턴스 + OAuth 셋업 필요
- **결과**: `publish-log.md` 첫 엔트리 status: `dry-run`
- **재개 조건**: `docker-compose up -d` + Twitter/LinkedIn/Instagram OAuth → 기존 publish-plan 그대로 실행 가능

### 막힌 곳 2: Visual Asset 자동화 (Midjourney/Canva)
- **증상**: Twitter card 1600×900, Instagram carousel 8 PNG → 스펙만 작성, 실제 생성 불가
- **우회**: og-image.html 처럼 모두 코드(HTML/CSS)로 작성 → Playwright screenshot 가능. 단 **시간 비용 8배** (8 슬라이드 = 8 HTML).
- **재개 조건**: Midjourney API or Canva API key, 또는 8 HTML 작성 추가 토큰

### 막힌 곳 3: [HUMAN INSERT] 마커 3개
- **위치**:
  1. `linkedin-post.md` 라인 ~30: 실제 commit hash + GitHub issue 링크
  2. `linkedin-post.md` 라인 ~60: 실제 6주 운영 데이터 차트 1개
  3. `instagram-carousel.md`: 캡션 마지막 personal 톤 1줄
- **이유**: AI가 작성하면 거짓말 또는 generic. 인간 1-2분 편집이 신뢰도 결정.

## 작동한 가장 어려운 부분

### 1. Brief schema 작성 → JSON validation → 콘텐츠 생성 사슬
```
research.md (6-Phase 프롬프트)
  → 06-brief.json (구조화 출력)
  → validate-brief.mjs (스키마 검증, exit 0)
  → twitter/linkedin/instagram (각 native 프롬프트)
```
6 단계 파이프라인이 **schema 통과 후 한 호흡으로** 진행됨. 각 단계 사람 개입 없이.

### 2. Art Director가 Midjourney를 거부하고 코드를 선택
- 입력: "기술 다이어그램 (5-layer architecture) + 한국어 텍스트"
- 결정: Midjourney = 텍스트 깨짐 + AI 냄새 → CODE
- 결과: design-auditor에서 AI smell **0-1/10**

### 3. Design auditor가 자기 점수 64/100을 "false positive"로 정직하게 인정
- 22 static rule이 11px 모노스페이스 캡션을 RD-04 위반으로 잡음
- LLM critique (PL-01 tone, PL-02 personality)가 **PASS** 판정 + 정성적 근거 서술
- **최종 verdict: SHIP-READY**
- → 정적 룰만 보면 잘못된 결정. LLM critique 추가가 결정적이었음.

## 디자인 module 회귀 발견

design-auditor 보고에서:
- **RD-04 임계값 14px**가 editorial 톤(11-13px caption)에 false positive 다발
- **AI-02 (Inter solo)**가 페어링된 mono fonts를 못 보고 있음
- **개선 백로그**: tone-aware threshold (Linear/Stripe/Bloomberg 톤은 11px 허용)

→ `governance/skills/design/` TODO에 추가 필요.

## 정직한 평가: "회사 마케팅팀/디자인팀 대체?"

| 영역 | 대체율 | 근거 |
|------|--------|------|
| 콘텐츠 생산 | 60-80% | Phase 3에서 실증. brief→3 platform 사람 1-2분만 |
| 비주얼 (코드 가능 영역) | 90% | OG image, 데이터 다이어그램 |
| 비주얼 (사진/일러스트) | 0-20% | Midjourney 인프라 + 후처리 인간 필요 |
| 실제 발행 | 0% | Postiz 미연결 |
| 분석/개선 루프 | 50% | 워크플로우 정의됨, 실행 인프라 없음 |
| 위기 대응/제휴 | 0% | 인간 영역 |
| 사용자 인터뷰 | 0% | 인간 영역 |

**한 줄 결론**: 1인 외주 비용 60-80% 절감 가능. **회사 팀 완전 대체는 아직 NO** — 인프라 셋업 + 인간 20% 편집 필수.

## 다음 즉시 가능한 5 작업

1. ⚡ Postiz Docker 가동 → publish-plan 실제 OAuth → 첫 자동 발행
2. ⚡ [HUMAN INSERT] 3개 채우기 (사용자 1분 작업)
3. 🔧 design-auditor RD-04 tone-aware threshold 추가
4. 🔧 social-twitter.md 한국어 280자 압축 가이드
5. 🔧 social-tiktok.md TikTok Creative Center 사운드 선택법

## 산출물 인벤토리

```
content/research/2026-04-18-claude-sleep-resume/06-brief.json    [VALID]
content/social/2026-04-18-claude-sleep-resume/
  ├─ twitter-thread.md            [9 tweets, ready]
  ├─ linkedin-post.md             [1450w, 2 [HUMAN INSERT]]
  ├─ instagram-carousel.md        [8 slides, 1 [HUMAN INSERT]]
  └─ publish-plan.md              [dry-run, 3 platforms]
content/visuals/2026-04-18-claude-sleep-resume/
  ├─ art-direction-brief.md       [CODE > MJ 결정 근거]
  ├─ og-image.html                [1200×630]
  └─ og-image.png                 [43KB, rendered]
content/publish-log.md            [첫 엔트리 status: dry-run]
.context/HANDOFF-2026-04-18.md    [계정 전환 대응]
.context/pilots/2026-04-18-phase3-honest-report.md  [이 파일]
```
