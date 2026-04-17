# /marketing — 마케팅 마스터 오케스트레이터

**용도**: 1인 마케팅 회사 풀 파이프라인. 토픽 입력 → 리서치 → 생성 → 15개 포맷 → 배포 → 분석까지 원스탑.

## 빠른 시작

```
/marketing                         대화형 모드 시작
/marketing --topic "AI 마케팅 자동화"  토픽 직행
/marketing --status                 현재 파이프라인 상태
/marketing --help                   도움말
```

## 전체 파이프라인 (기본 모드)

```
입력: 토픽 or URL or 브리프
  ↓
Step 1. /marketing-generate   리서치 + 초안 생성
  ↓
Step 2. [인간 리뷰 20%]       필수 승인 게이트
  ↓
Step 3. /marketing-repurpose  1 → 15 포맷 변환
  ↓
Step 4. /marketing-publish    스케줄 + 배포
  ↓
Step 5. 7일 후 자동 알림      /marketing-analytics 실행
```

## 실행 시나리오

### 시나리오 A: 새 콘텐츠 생성 (가장 일반적)

```
/marketing --topic "제목" [--audience "타깃"] [--lang ko|en]
```

1. `marketing-generate` 실행 → 브리프 + 초안 출력
2. 인간 리뷰 요청 (승인 전까지 대기)
3. 승인 후 `marketing-repurpose` 자동 실행
4. 배포 스케줄 제안 → 확인 후 `marketing-publish`
5. publish-log.md 기록 + 7일 후 분석 예약

### 시나리오 B: 기존 콘텐츠 리퍼포징

```
/marketing --url "https://..." [--platforms twitter,linkedin]
```

1. URL에서 콘텐츠 추출
2. `marketing-repurpose` 즉시 실행 (생성 단계 스킵)
3. 배포 스케줄 제안

### 시나리오 C: 빠른 소셜 포스트

```
/marketing --quick --topic "짧은 인사이트"
```

1. Twitter 스레드 + LinkedIn 포스트만 생성 (전체 15개 스킵)
2. 즉시 배포

### 시나리오 D: 일일 리뷰 모드

```
/marketing --daily
```

1. `marketing-analytics` → 전날 성과 요약
2. AI가 오늘 우선순위 콘텐츠 3개 제안
3. 사용자 선택 → 해당 콘텐츠 파이프라인 시작

## 상태 확인

```
/marketing --status
```

출력:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 마케팅 파이프라인 현황
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
초안 대기 중:     2개
발행 예정:        5개 (내일까지)
분석 대기 중:     1개 (7일 경과)
이번 달 발행:    12개
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 세부 커맨드 참조

| 커맨드 | 용도 |
|--------|------|
| `/marketing-generate` | 콘텐츠 생성만 |
| `/marketing-repurpose` | 15개 포맷 변환만 |
| `/marketing-publish` | 배포만 |
| `/marketing-analytics` | 성과 분석만 |
| `/marketing-loop` | 주간 자가 개선 루프 |

## 설계 원칙 (읽을 것)

이 모듈의 핵심 철학:
- **AI 80%, 인간 20%**: 인간 리뷰 없이 발행 금지 (성과 2.7배 차이)
- **프롬프트 = IP**: `governance/skills/marketing/prompts/` 가 진짜 자산
- **1→15가 핵심**: 1개 만들어 15개로 퍼뜨리는 것이 경쟁 우위
- **피드백 루프 필수**: 분석 없는 발행은 낭비

## 필요 MCP 설정

```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "postiz": {
      "command": "npx",
      "args": ["postiz-mcp"],
      "env": { "POSTIZ_API_KEY": "YOUR_KEY" }
    }
  }
}
```

MCP 없이도 동작 (수동 배포 가이드 모드로 graceful degradation).

## 스택 가이드

- Starter ($75/월): `governance/skills/marketing/stacks/starter.md`
- Pro ($250/월): `governance/skills/marketing/stacks/pro.md`
- Enterprise ($800/월): `governance/skills/marketing/stacks/enterprise.md`
