# Customer Support System 설계

> **Status**: 설계 완료, 프로젝트 출시 시 구현
> **Created**: 2026-05-13
> **Based on**: 서베이 7건 (Intercom Fin, Help Scout, Twenty CRM, EspoCRM, Tidio Lyro)
> **APQC**: 6.0 Manage Customer Service

## 왜 필요한가

Gap Analysis 결과 **Customer Service = 0% 커버리지** (전면 부재).
제품 출시 Day 1부터 필요한 핵심 기능.

## 추천 아키텍처 (서베이 검증)

```
고객 문의 유입
  ├── Web (채팅 위젯)
  ├── Email
  └── GitHub Issues (개발자 제품)
       │
       ▼
┌──────────────────────────┐
│    AI 1차 응답 (80%+)     │  ← Knowledge Base 기반
│    Tier 1: 자동 응답       │     FAQ, 문서, 이전 티켓
└──────────┬───────────────┘
           │ 해결 못 함
           ▼
┌──────────────────────────┐
│    분류 + 에스컬레이션    │  ← 긴급도/유형 자동 분류
│    Tier 2: 알림           │     Slack/Telegram 알림
└──────────┬───────────────┘
           │ 사람 필요
           ▼
┌──────────────────────────┐
│    사람 응답              │  ← 복잡한 이슈, 환불, 장애
│    Tier 3: 수동           │
└──────────────────────────┘
```

## 도구 선택 (비용 단계별)

### Stage 1: 무료 ($0/월) — 제품 출시 초기

| 도구 | 역할 | 비용 |
|------|------|------|
| GitHub Issues + Labels | 티켓 관리 | $0 |
| `/issue-triage` 커맨드 | 자동 분류/우선순위 | $0 (이미 있음) |
| Claude Code + MCP | 답변 초안 생성 | 구독 포함 |
| README FAQ 섹션 | 지식 기반 | $0 |

**적합**: 오픈소스/개발자 도구, 월 50건 미만

### Stage 2: 저가 ($25-75/월) — 유료 고객 10-100명

| 도구 | 역할 | 비용 | 근거 |
|------|------|------|------|
| **Help Scout** | 이메일 기반 티켓 | $25/seat | 가벼움, 1인에 적합 |
| **Crisp.chat** | 라이브 챗 위젯 | $25/월 Pro | 무제한 채팅 |
| n8n | 자동화 (분류→알림) | $0 자체호스팅 | 이미 사용 중 |

**적합**: B2B SaaS, 이메일 중심 지원

### Stage 3: 확장 ($75-200/월) — 유료 고객 100+

| 도구 | 역할 | 비용 | 근거 |
|------|------|------|------|
| **Intercom Fin** | AI 챗봇 (60-70% 자동 해결) | $39+/seat | 업계 표준 AI 지원 |
| Knowledge Base | KB 기반 자동 응답 | Intercom 번들 | |
| Twenty CRM | 고객 이력 관리 | $0 자체호스팅 | 45.5K stars, MCP 지원 |

**적합**: B2C SaaS, 채팅 중심, 볼륨 높음

## A-Team 통합 설계

### 신규 에이전트: `support-responder`

```markdown
# .claude/agents/support-responder.md
---
name: support-responder
model: haiku
description: 고객 문의 초안 응답 생성. KB 검색 후 답변 작성.
tools: [Read, Grep, Glob, WebFetch]
---

역할: 고객 문의에 대한 1차 응답 초안 생성

1. 문의 내용 분석 (유형: bug/feature/billing/howto)
2. Knowledge Base 검색 (docs/, FAQ, 이전 이슈)
3. 유사 이슈 찾기 (GitHub Issues)
4. 초안 응답 작성 (친절하고 구체적으로)
5. 에스컬레이션 필요 여부 판단

출력: {response_draft, category, priority, needs_escalation}
```

### 신규 커맨드: `/support`

```markdown
# .claude/commands/support.md
사용법: /support <issue_url_or_text>

1. support-responder 에이전트로 분석
2. KB 기반 응답 초안 생성
3. 사용자 확인 후 발송
```

### 자동 트리거 (GitHub Issues)

```yaml
# .github/workflows/auto-triage-support.yml
on:
  issues:
    types: [opened]
  issue_comment:
    types: [created]

# /issue-triage (기존)로 분류 후
# support 라벨이면 support-responder 호출
```

## Customer Success (선제적 관리)

Support가 "반응형"이면, Success는 "선제적":

| 기능 | 방법 | 트리거 |
|------|------|--------|
| 온보딩 이메일 | n8n + 템플릿 | 가입 후 1/3/7일 |
| 사용량 모니터링 | Stripe webhook + analytics | 주간 |
| 이탈 위험 감지 | 로그인 빈도 < 주 1회 | 주간 배치 |
| NPS 수집 | Typeform/Tally (무료) | 월간 |

### 이탈 예측 (데이터 축적 후)

```
입력: 로그인 빈도, 기능 사용률, 티켓 감정, 결제 이력
모델: XGBoost (scikit-learn, 무료)
출력: 이탈 확률 0-100%
알림: >70% → Slack 경고 + 자동 리텐션 이메일
```

리서치 벤치마크: Gainsight 패턴 적용 시 30% 이탈 감소, 95% 갱신 예측 정확도

## 구현 로드맵

```
제품 출시 전:
  □ docs/ 에 FAQ 작성 (10-20개 질문)
  □ support-responder 에이전트 생성
  □ /support 커맨드 생성
  □ GitHub Issue 라벨 체계 (bug/feature/billing/howto/urgent)

Day 1 (출시):
  □ README에 "Support" 섹션 + 연락처
  □ GitHub Issues 템플릿 (.github/ISSUE_TEMPLATE/)
  □ /issue-triage 연동 확인

월 50건 초과 시:
  □ Help Scout 또는 Crisp.chat 도입
  □ n8n 자동 분류 → 알림 설정

월 100건 초과 시:
  □ Intercom Fin 도입 (AI 자동 응답)
  □ Twenty CRM 자체호스팅
  □ Knowledge Base 구축 (Intercom 번들)

고객 100명 초과 시:
  □ NPS 수집 시작 (Typeform/Tally)
  □ 온보딩 이메일 시퀀스 (n8n)
  □ 이탈 예측 모델 구축 (데이터 충분 시)
```

## 참고

- [Intercom Fin AI](https://www.intercom.com/fin) — AI 챗봇 60-70% 자동 해결
- [Help Scout](https://www.helpscout.com/) — $25/seat, 이메일 기반
- [Twenty CRM](https://twenty.com/) — 45.5K stars, MCP 지원
- [Crisp.chat](https://crisp.chat/) — $25/월 무제한 채팅
- [ChurnZero 패턴](https://churnzero.com/) — 이탈 예측 + 헬스 스코어
- [Gainsight 벤치마크](https://www.gainsight.com/) — 30% 이탈 감소, 95% 예측
