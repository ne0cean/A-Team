# WF-1: Daily Content Pipeline (n8n)

> 매일 오전 09:00 KST 자동 실행.
> 트렌드 감지 → 리서치 → 콘텐츠 생성 → 인간 승인 대기 → 다음 워크플로우 트리거.

## 노드 구조

```
[Cron Trigger]                — 매일 09:00 KST
    ↓
[Read CURRENT.md]              — 오늘 주제 후보 확인
    ↓
[Trend Detection]              — Google Trends API or 수동 큐
    ↓
[Filter: 처리 가치 있는가?]
    ↓ (yes)
[Claude API: marketing-research]   — 리서치 6 phase 실행
    ↓
[Save to FS: brief.json]
    ↓
[Validate Brief Schema]        — schemas/brief.schema.json
    ↓ (valid)
[Claude API: marketing-generate]   — 블로그 초안 생성
    ↓
[Save Draft + Slack 알림]
    ↓
[Wait: 인간 승인 (24h timeout)]
    ↓ (approved)
[Trigger WF-2: Repurpose]
```

## 노드별 설정

### 1. Cron Trigger
```json
{
  "type": "n8n-nodes-base.cron",
  "parameters": {
    "triggerTimes": {
      "item": [{
        "mode": "everyDay",
        "hour": 9,
        "minute": 0
      }]
    }
  }
}
```

### 2. Read CURRENT.md (Read Binary File)
```json
{
  "type": "n8n-nodes-base.readBinaryFile",
  "parameters": {
    "filePath": "{{ $env.PROJECT_ROOT }}/.context/CURRENT.md"
  }
}
```

### 3. Trend Detection (Function)
```javascript
// 수동 큐 우선, 없으면 trends 토픽 사용
const projectRoot = $env.PROJECT_ROOT;
const queuePath = `${projectRoot}/content/queue/today.json`;

let topic;
try {
  const queue = JSON.parse(require('fs').readFileSync(queuePath));
  topic = queue.shift();
  require('fs').writeFileSync(queuePath, JSON.stringify(queue, null, 2));
} catch (e) {
  // fallback: CURRENT.md Next Tasks에서 추출
  topic = "default-topic";
}

return { topic };
```

### 4. Claude API: marketing-research
```json
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://api.anthropic.com/v1/messages",
    "authentication": "headerAuth",
    "headerParameters": {
      "x-api-key": "={{ $env.ANTHROPIC_API_KEY }}",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    "bodyParameters": {
      "model": "claude-sonnet-4-6",
      "max_tokens": 8000,
      "system": "다음 file을 system prompt로 사용: governance/skills/marketing/prompts/research.md Phase 5",
      "messages": [{
        "role": "user",
        "content": "Topic: {{ $json.topic }}\n\nGenerate full content brief following Phase 5 schema."
      }]
    }
  }
}
```

### 5. Save Brief
```javascript
// content/research/YYYY-MM-DD-{slug}/06-brief.json
const date = new Date().toISOString().slice(0, 10);
const slug = $json.topic.toLowerCase().replace(/\s+/g, '-');
const dir = `${$env.PROJECT_ROOT}/content/research/${date}-${slug}`;

require('fs').mkdirSync(dir, { recursive: true });
require('fs').writeFileSync(
  `${dir}/06-brief.json`,
  JSON.stringify($json.brief, null, 2)
);

return { briefPath: `${dir}/06-brief.json`, slug, date };
```

### 6. Validate Schema
```javascript
const Ajv = require('ajv');
const fs = require('fs');

const schema = JSON.parse(fs.readFileSync(
  `${$env.PROJECT_ROOT}/governance/skills/marketing/schemas/brief.schema.json`
));
const brief = JSON.parse(fs.readFileSync($json.briefPath));

const ajv = new Ajv();
const valid = ajv.validate(schema, brief);

if (!valid) {
  throw new Error(`Schema validation failed: ${JSON.stringify(ajv.errors)}`);
}

return { ...{ $json }, validated: true };
```

### 7. Generate Draft (Claude API 재호출)
brief.json을 input으로, marketing-generate 프롬프트 적용.

### 8. Slack 알림
```json
{
  "type": "n8n-nodes-base.slack",
  "parameters": {
    "channel": "#content-pipeline",
    "text": "📝 새 초안 대기중: {{ $json.title }}\n경로: {{ $json.draftPath }}\n승인: 👍 / 거절: 👎"
  }
}
```

### 9. Wait for Approval
```json
{
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "approve-content",
    "responseMode": "onReceived",
    "options": { "timeout": 86400000 }
  }
}
```

## 비용 추정

매일 1 cycle:
- marketing-research: ~15,000 tokens × $3/M = $0.045
- marketing-generate: ~12,000 tokens × $3/M = $0.036
- 합계: ~$0.08/일 = ~$2.40/월

월 30일 운영 시 Claude API 비용 ~$2.40만 워크플로우에 사용.

## 모니터링

n8n UI → Executions → 실행 결과 + 에러 로그 확인.
실패 시 Slack 자동 알림 (Slack 노드 추가).
