# Publish Log

> 발행 추적 로그. /marketing-publish 또는 자동화 워크플로우(WF-3)가 append.
> 스키마: `.claude/commands/marketing-publish.md` 참조.

---

## 2026-04-18 17:45:00 — claude-sleep-resume (dry-run)

| 필드 | 값 |
|------|-----|
| content_path | content/social/2026-04-18-claude-sleep-resume/ |
| platforms | twitter, linkedin, instagram |
| scheduled_at | 2026-04-21 09:00 KST (Twitter) / 2026-04-22 09:00 KST (LinkedIn) / 2026-04-21 19:00 KST (Instagram) |
| published_at | — (dry-run) |
| postiz_job_ids | [{"platform":"twitter","id":"dry-run-tw-001"},{"platform":"linkedin","id":"dry-run-li-001"},{"platform":"instagram","id":"dry-run-ig-001"}] |
| status | dry-run |
| visual_assets | content/visuals/2026-04-18-claude-sleep-resume/og-image.html (PNG 미변환) |
| error | — |
| notes | Phase 3 라이브 검증 파일럿. Native social-first mode. Brief schema validated. 인간 편집 미완료. |

### Pre-publish Gate Results

- [x] Brief schema valid
- [x] 4 콘텐츠 파일 작성 완료 (Twitter/LinkedIn/Instagram + Art direction brief)
- [ ] [HUMAN INSERT] 마커 채워짐 (3개 중 0개)
- [ ] OG image PNG 변환
- [ ] Postiz MCP 연결
- [ ] Midjourney API 연결

### Real Publish 차단 사유

이 엔트리는 다음이 충족되면 status: scheduled로 전환:
1. Postiz 인스턴스 가동 + OAuth 연결
2. OG image PNG 변환
3. 인간 편집 20% 완료

---
