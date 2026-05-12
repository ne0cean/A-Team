# Community Management Template

> Discord/GitHub Discussions 커뮤니티 자동화 패턴.
> 서베이 검증: CommunityOne, Discord.py, Eesel.

## 추천 스택 (단계별)

| 규모 | 도구 | 비용 |
|------|------|------|
| 0-100명 | GitHub Discussions | $0 |
| 100-1K명 | Discord + 기본 봇 | $0 |
| 1K+ | Discord + CommunityOne / 커스텀 봇 | $0-50/월 |

## GitHub Discussions (가장 가벼운 시작)

```
Settings → Features → Discussions 활성화

카테고리:
- Announcements (공지)
- Q&A (질문, 답변 채택 가능)
- Ideas (기능 요청)
- Show and Tell (사용 사례)
- General (자유 토론)
```

## Discord 봇 자동화

### 필수 기능
1. **자동 역할 부여** — 가입 시 기본 역할
2. **FAQ 자동 응답** — 키워드 매칭 → 답변
3. **스팸 감지** — 링크 도배, 반복 메시지 차단
4. **환영 메시지** — 새 멤버 온보딩
5. **이슈 에스컬레이션** — #support → GitHub Issue 자동 생성

### n8n 연동 패턴

```
Discord webhook (새 메시지)
  → 키워드 감지 ("bug", "error", "help")
  → Claude/Groq로 답변 초안 생성
  → 자동 응답 또는 모더레이터 알림
```

## DevRel (개발자 관계)

| 활동 | 자동화 | 도구 |
|------|--------|------|
| 블로그 콘텐츠 | 높음 | /marketing-generate |
| 튜토리얼 작성 | 중간 | Claude + 코드 예제 |
| 이슈 트리아지 | 높음 | /issue-triage (이미 있음) |
| 릴리스 노트 | 높음 | git log → Claude 요약 |
| 컨퍼런스 발표 | 낮음 | 사람 필요 |

## 참고
- [CommunityOne](https://communityone.io/) — Discord AI 올인원
- [Discord.py](https://github.com/Rapptz/discord.py) — Python 봇 프레임워크
- [Eesel](https://www.eesel.ai/) — 지식 관리
