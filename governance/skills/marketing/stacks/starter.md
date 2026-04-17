# Starter Stack — $75-100/월

> Tatsuya Mizuno 검증 스택. 1인 운영, 3개 블로그 + 40+ 콘텐츠/월 가능.

## 구성

| 역할 | 도구 | 비용 |
|------|------|------|
| AI 엔진 | Claude API (Sonnet 4.6) | ~$50/월 |
| 워크플로우 | n8n (self-hosted, $5 VPS) | $5-10/월 |
| SNS 배포 | Postiz (오픈소스, self-hosted) | $0 |
| 분석 | Google Analytics 4 | $0 |
| 블로그 | WordPress (저렴한 호스팅) | $10-20/월 |
| **합계** | | **$75-100/월** |

## 설치 순서

### 1. Claude API 설정

```bash
# .env 파일
ANTHROPIC_API_KEY=your-key-here
```

### 2. n8n 설치 (self-hosted)

```bash
# Docker로 실행 (가장 빠름)
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# 접속: http://localhost:5678
```

### 3. Postiz 설치 (SNS 스케줄러)

```bash
# Docker Compose
git clone https://github.com/gitroomhq/postiz-app
cd postiz-app
cp .env.example .env
# .env에 소셜 미디어 API 키 입력
docker-compose up -d

# 접속: http://localhost:3000
```

소셜 미디어 API 키 발급:
- Twitter/X: developer.twitter.com
- LinkedIn: linkedin.com/developers
- Instagram: developers.facebook.com

### 4. Postiz MCP 연결 (Claude Code)

```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "postiz": {
      "command": "npx",
      "args": ["postiz-mcp"],
      "env": {
        "POSTIZ_API_URL": "http://localhost:3000",
        "POSTIZ_API_KEY": "your-postiz-api-key"
      }
    }
  }
}
```

### 5. 첫 실행 테스트

```
/marketing --topic "테스트 포스트" --preview
```

## 일일 워크플로우 (4-5시간)

```
오전 30분: /marketing --daily 로 전날 성과 확인
오전 2시간: 초안 리뷰 + 20% 편집
오후 1시간: /marketing-publish 로 스케줄링
저녁 30분: 배포 확인
```

## 예상 아웃풋 (월간)

- 블로그: 8-15개
- 소셜 포스트: 150-300개 (15개 포맷 × 10-20개 원본)
- 이메일: 4-8개
- 커버 플랫폼: Twitter, LinkedIn, Instagram, 이메일

## 업그레이드 시점

월 수익이 $500+ 되면 Pro Stack 고려.
