# /marketing-publish — 멀티플랫폼 배포

**용도**: 생성된 콘텐츠를 22+ 플랫폼에 스케줄링 + 배포.

## 실행 흐름

### Step 0: 입력 파싱

```
사용법:
  /marketing-publish --dir content/repurposed/YYYY-MM-DD-slug/
  /marketing-publish --file content/repurposed/YYYY-MM-DD-slug/01-twitter-thread.md
  /marketing-publish --all  (미발행 전체 배포)

플래그:
  --dir       리퍼포징 결과 디렉토리
  --file      특정 파일 1개
  --all       content/repurposed/ 전체 미발행 항목
  --platforms 발행할 플랫폼 선택 (기본: twitter,linkedin,instagram)
              옵션: twitter,linkedin,instagram,tiktok,youtube,reddit,email
  --schedule  "2026-04-19 09:00 KST" 형식 (기본: 최적 시간 자동 계산)
  --now       즉시 발행 (스케줄 없이)
  --preview   발행 전 미리보기만 (실제 배포 안 함)
  --dry-run   --preview 와 동일
```

### Step 1: 콘텐츠 목록 파악

디렉토리 스캔 → 발행할 파일 목록 표시:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 발행 대기 콘텐츠 — {slug}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
01 Twitter 스레드       → X (@handle)
02 LinkedIn 롱폼        → LinkedIn
03 LinkedIn 캐러셀      → LinkedIn (이미지 필요 ⚠️)
04 Instagram 캡션       → Instagram (이미지 필요 ⚠️)
05 Instagram 캐러셀     → Instagram (이미지 필요 ⚠️)
06 TikTok 스크립트      → 영상 제작 필요 ⚠️
07 YouTube Shorts       → 영상 제작 필요 ⚠️
08 팟캐스트 쇼노트      → 수동 업로드 필요 ⚠️
09 뉴스레터             → 이메일 플랫폼
10 이메일 시퀀스        → 이메일 플랫폼
11 재활성화 이메일      → 이메일 플랫폼
12 광고 카피            → 수동 업로드 (Ad Manager)
13 랜딩페이지           → 수동 편집 필요
14 인포그래픽 개요      → 디자인 도구 필요
15 이미지 프롬프트      → AI 생성 후 업로드

텍스트 즉시 배포 가능: 01, 02, 09, 10, 11
이미지/영상 필요: 03, 04, 05, 06, 07
수동 처리: 08, 12, 13, 14, 15
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2: 최적 게시 시간 계산

플랫폼별 2026년 기준 최고 참여 시간대:

| 플랫폼 | 최적 시간 (KST) | 최적 요일 |
|--------|---------------|---------|
| Twitter/X | 09:00, 12:00, 17:00 | 화-목 |
| LinkedIn | 08:00, 12:00, 17:30 | 화-목 |
| Instagram | 06:00, 11:00, 19:00 | 월,수,금 |
| TikTok | 07:00, 15:00, 21:00 | 모든 요일 |
| Reddit | 09:00, 12:00 | 월-금 |

스케줄 제안 출력:
```
추천 발행 스케줄:
  Twitter 스레드    → 내일 09:00 KST (화요일)
  LinkedIn 롱폼     → 내일 08:00 KST (화요일)
  Instagram 캡션    → 모레 11:00 KST (수요일)
  뉴스레터          → 내일 07:30 KST (화요일)

승인하시겠습니까? [y/N/수정]
```

### Step 3: Postiz MCP 연동 (스케줄 설정)

MCP 사용 가능 시:
```
use_mcp_tool postiz schedule_post
  platform: twitter
  content: {파일 내용}
  scheduled_at: {최적 시간}
```

MCP 미설정 시 → 수동 가이드 제공:
```
Postiz 미연결 상태입니다. 두 가지 옵션:
1. Postiz 설정: governance/skills/marketing/stacks/starter.md 참고
2. 수동 배포: 각 플랫폼에 직접 붙여넣기
   → content/repurposed/{slug}/ 에서 해당 파일 열기
```

### Step 4: 발행 확인 + 추적 파일 업데이트

발행 완료 후 프론트매터 업데이트:
```yaml
# content/repurposed/{slug}/publish-log.md
---
blog_title: ...
published_at: YYYY-MM-DD HH:MM KST
platforms:
  twitter: {url}
  linkedin: {url}
  instagram: pending
analytics_check: YYYY-MM-DD (발행 7일 후)
---
```

### Step 5: 완료 요약

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 발행 완료
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
스케줄됨: Twitter (내일 09:00), LinkedIn (내일 08:00)
즉시 발행: 뉴스레터 ✓

7일 후 성과 분석: /marketing-analytics --slug {slug}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## MCP 설정 요구사항

Postiz MCP 설정 필요:
```json
// ~/.claude/settings.json 에 추가
{
  "mcpServers": {
    "postiz": {
      "command": "npx",
      "args": ["postiz-mcp"],
      "env": {
        "POSTIZ_API_KEY": "your-key-here"
      }
    }
  }
}
```

미설정 시 수동 가이드 모드로 대체 동작 (graceful degradation).
