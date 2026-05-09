# Buffer 발행 통합 설계

> **Status**: 설계 완료, 대기 (SNS 마케팅 계정 생성 후 진행)
> **선행 조건**: Twitter/LinkedIn/Instagram 마케팅 계정 생성
> **Created**: 2026-05-09

## 왜 Buffer?

| 항목 | Postiz (셀프호스트) | Buffer (클라우드) |
|------|-------------------|------------------|
| OAuth 설정 | 각 플랫폼별 앱 등록 필요 | Buffer가 대행 (가입만) |
| 초기 설정 시간 | 2-4시간 | 10분 |
| 비용 | 무료 | 무료 (3채널, 10포스트/채널) |
| API | REST | GraphQL (Beta) |
| 데이터 소유 | 내 서버 | Buffer 서버 |

**결론**: 초기에는 Buffer로 빠르게 시작. 무료 한도(3채널, 10포스트) 초과 시 Postiz 전환 검토.

## Buffer API 스펙

- **Endpoint**: `https://api.buffer.com` (GraphQL)
- **Auth**: `Authorization: Bearer <API_KEY>`
- **API Key 발급**: `https://publish.buffer.com/settings/api`
- **Rate Limit**: 100 req / 15분 (3rd party), 2000 req / 15분 (전체)

### 지원 플랫폼 (11개)
X(Twitter), LinkedIn, Instagram, Facebook, Threads, TikTok, YouTube, Pinterest, Bluesky, Mastodon, Google Business Profile

## 핵심 API 호출

### 채널 목록 조회
```graphql
query {
  account {
    organizations {
      id
      channels {
        id
        name
        service  # twitter, linkedin, instagram, ...
      }
    }
  }
}
```

### 예약 포스트 생성
```graphql
mutation {
  createPost(input: {
    text: "포스트 내용"
    channelId: "채널_ID"
    schedulingType: automatic
    mode: customScheduled
    dueAt: "2026-05-10T09:00:00.000Z"
  }) {
    ... on PostActionSuccess {
      post { id dueAt }
    }
    ... on MutationError {
      message
    }
  }
}
```

### 큐에 추가 (자동 시간)
```graphql
mutation {
  createPost(input: {
    text: "포스트 내용"
    channelId: "채널_ID"
    schedulingType: automatic
    mode: addToQueue
  }) {
    ... on PostActionSuccess {
      post { id dueAt }
    }
    ... on MutationError {
      message
    }
  }
}
```

## A-Team 통합 설계

### 파일 구조
```
scripts/
  buffer-publish.mjs     # Buffer GraphQL 클라이언트

.claude/commands/
  marketing-publish.md   # 기존 커맨드에 Buffer 옵션 추가
```

### buffer-publish.mjs 인터페이스
```javascript
// Usage:
//   node scripts/buffer-publish.mjs --text "내용" --channel twitter --schedule "2026-05-10T09:00:00Z"
//   node scripts/buffer-publish.mjs --text "내용" --channel all --queue
//   node scripts/buffer-publish.mjs --channels  # 채널 목록
//   node scripts/buffer-publish.mjs --file content/social/post.md --channel linkedin

// 환경변수: BUFFER_API_KEY
```

### marketing-publish.md 변경
```
기존: Postiz API → 22개 플랫폼
추가: --via buffer (기본값) | --via postiz

Buffer 경로:
1. content/drafts/ 또는 content/social/ 에서 콘텐츠 로드
2. 채널별 포맷 변환 (Twitter 280자, LinkedIn 3000자 등)
3. buffer-publish.mjs 호출
4. publish-log.jsonl에 결과 기록
```

### 워크플로우
```
/marketing-generate → content/drafts/
    ↓
/marketing-repurpose → content/social/ (15개 포맷)
    ↓
/marketing-publish --via buffer
    ↓
buffer-publish.mjs → Buffer GraphQL API
    ↓
Buffer → Twitter/LinkedIn/Instagram 동시 발행
```

## 실행 계획 (SNS 계정 생성 후)

1. [ ] Twitter 마케팅 계정 생성
2. [ ] LinkedIn 페이지/계정 생성
3. [ ] Instagram 비즈니스 계정 생성
4. [ ] Buffer 가입 (buffer.com) → 3채널 연결
5. [ ] API Key 발급 (`publish.buffer.com/settings/api`)
6. [ ] `BUFFER_API_KEY` 환경변수 설정
7. [ ] `buffer-publish.mjs` 구현
8. [ ] `marketing-publish.md` Buffer 옵션 추가
9. [ ] 첫 발행 테스트 (content/drafts/ 기존 콘텐츠)

## 무료 한도 초과 시 전환 기준

| 지표 | Buffer 무료 | 전환 트리거 |
|------|------------|------------|
| 채널 수 | 3개 | 4번째 플랫폼 추가 시 |
| 예약 포스트 | 10개/채널 | 주 3회 이상 발행 시 |
| 분석 | 기본 | 심층 분석 필요 시 |

전환 옵션:
- Buffer Essentials ($5/채널/월) — 채널 추가만 필요할 때
- Postiz 셀프호스트 (무료) — 비용 제로 유지 + 데이터 소유

## 참고

- [Buffer Developer API](https://buffer.com/developer-api)
- [Buffer GraphQL Docs](https://developers.buffer.com/)
- [Buffer Pricing](https://buffer.com/pricing)
- [Rate Limits](https://developers.buffer.com/guides/api-limits.html)
