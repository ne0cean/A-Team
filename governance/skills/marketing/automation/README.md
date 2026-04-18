# Automation Layer — n8n + Make.com 통합

> 마케팅 + 디자인 모듈을 완전 자동화하는 워크플로우 라이브러리.
> 파이프라인의 손동작을 제거하고 매일 콘텐츠가 자동 흐르게 한다.

## 아키텍처

```
┌──────────────────────────────────────────────────┐
│  스케줄러 (n8n cron / Make.com schedule)         │
└────┬─────────────────────────────────────────────┘
     │
     ↓
┌──────────────────────────────────────────────────┐
│  Workflow 1: Daily Content Pipeline              │
│  매일 09:00 KST → research → generate → audit    │
└────┬─────────────────────────────────────────────┘
     │
     ↓
┌──────────────────────────────────────────────────┐
│  Workflow 2: Repurpose & Visual Generation       │
│  Trigger: 콘텐츠 승인 시 → 15포맷 + 비주얼 세트   │
└────┬─────────────────────────────────────────────┘
     │
     ↓
┌──────────────────────────────────────────────────┐
│  Workflow 3: Multi-Platform Publishing           │
│  Trigger: 비주얼 완성 → Postiz → 22+ 플랫폼      │
└────┬─────────────────────────────────────────────┘
     │
     ↓
┌──────────────────────────────────────────────────┐
│  Workflow 4: Analytics + Loop                    │
│  매주 월 09:00 KST → 성과 수집 → 프롬프트 개선  │
└──────────────────────────────────────────────────┘
```

## 워크플로우 카탈로그

| ID | 이름 | 도구 | 주기 | 파일 |
|----|------|------|------|------|
| WF-1 | Daily Content Pipeline | n8n | 매일 | `n8n/01-daily-content.json` |
| WF-2 | Repurpose & Visual | Make.com | 트리거 | `make/02-repurpose-visual.json` |
| WF-3 | Multi-Platform Publish | n8n | 트리거 | `n8n/03-multi-publish.json` |
| WF-4 | Analytics + Loop | Make.com | 매주 | `make/04-analytics-loop.json` |

## 도구 선택 가이드

**n8n 사용** (셀프호스팅, 무료):
- Daily 정기 작업
- 복잡한 분기 로직
- 데이터베이스 직접 접근
- 비용 민감한 운영

**Make.com 사용** (SaaS, $9-29/월):
- SaaS 통합 많은 워크플로우 (Notion + Airtable + Slack 등)
- 시각적 디버깅 필요
- 빠른 프로토타이핑
- 비코더 친화

**둘 다 사용** (권장 — Pro Stack):
- n8n: 데이터 처리 + Claude API 호출
- Make.com: 외부 서비스 통합

## 환경 변수 (.env)

```bash
# AI
ANTHROPIC_API_KEY=sk-ant-xxx

# 발행
POSTIZ_API_URL=http://localhost:3000
POSTIZ_API_KEY=xxx

# 분석
GA4_PROPERTY_ID=xxx
GA4_CREDENTIALS_PATH=/path/to/service-account.json

# 이메일
CONVERTKIT_API_KEY=xxx (선택)

# 알림
SLACK_WEBHOOK_URL=xxx (선택)
```

## 설치 순서

1. **n8n 셀프호스팅 설치**
   ```bash
   docker run -it --rm \
     --name n8n \
     -p 5678:5678 \
     -v ~/.n8n:/home/node/.n8n \
     -e N8N_BASIC_AUTH_ACTIVE=true \
     -e N8N_BASIC_AUTH_USER=admin \
     -e N8N_BASIC_AUTH_PASSWORD=$(openssl rand -hex 16) \
     n8nio/n8n
   ```

2. **워크플로우 import**
   - n8n UI → Workflows → Import → `n8n/*.json` 선택

3. **Credentials 설정**
   - n8n UI → Credentials → Anthropic API + Postiz + GA4 등록

4. **Activate 워크플로우**
   - 각 워크플로우 우상단 Activate 토글 ON

5. **Make.com 별도 설정** (선택)
   - make.com 가입 → Scenarios → Import → `make/*.json`

## 안전 장치

모든 워크플로우 공통:
- **인간 승인 게이트**: 발행 전 Slack/이메일로 알림 → 승인 후 발행
- **에러 알림**: 실패 시 Slack DM
- **비용 모니터링**: Claude API 일일 한도 체크
- **로그 보존**: 모든 실행 로그 30일 보관
