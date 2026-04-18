# Content Workspace

마케팅 + 디자인 모듈의 산출물 저장소.

## 디렉토리

```
content/
├── research/{date}-{slug}/         리서치 (06-brief.json, BRIEF.md 등)
├── drafts/{date}-{slug}.md         블로그 초안 (frontmatter + 본문)
├── social/{date}-{slug}/           Native social (Twitter/Insta/LinkedIn/TikTok)
├── repurposed/{date}-{slug}/       1→15 변환 (블로그에서 파생)
├── visuals/{date}-{slug}/          비주얼 에셋 (썸네일, OG, social images)
├── brand/                          브랜드 시스템 (style-guide.md, color-palette.json)
├── analytics/{date}-daily-metrics.md  성과 데이터
└── publish-log.md                  전체 발행 추적 (append-only)
```

## 워크플로우

**Blog-first**:
```
/marketing-research → /marketing-generate → /marketing-repurpose → /design-generate → /marketing-publish
```

**Social-first**:
```
/marketing-research → /marketing-social --multi → /design-generate (선택) → /marketing-publish
```

## 발행 상태

`publish-log.md` 의 각 엔트리 status:
- `dry-run` — 인프라 미연결, 스케줄만 시뮬레이션
- `scheduled` — Postiz에 예약됨, 미발행
- `published` — 실제 발행 완료
- `failed` — 실패 (error 필드 참조)
- `partial` — 일부 플랫폼만 성공
