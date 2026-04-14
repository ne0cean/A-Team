# DD-04 — promptfoo (eval) + Langfuse (observability)

## 1. promptfoo Integration (C5, P7)

**Folder Structure**:
```
eval/
├── templates/
│   ├── b1-small-fix.yml      # ≤50 LOC fix + test
│   ├── b2-tdd-feature.yml    # RED→GREEN→REFACTOR assertion flow
│   ├── b3-multi-file.yml     # File 변경 순서 + dep graph
│   ├── b4-ui-visual.yml      # Snapshot + LLM-rubric
│   ├── b5-research.yml       # subagent orchestration quality
│   └── b6-debug.yml          # root-cause multi-turn reasoning
├── scripts/run-gate.js        # G5 auto-check
├── scores/results-{date}.jsonl
└── package.json
```

**B2 TDD YAML example**:
```yaml
description: TDD Feature (RED→GREEN→REFACTOR)
providers:
  - id: claude-opus
    config: { model: claude-opus-4-6, temperature: 0 }
prompts:
  - |
    TDD engineer 역할. 1.RED, 2.GREEN, 3.REFACTOR
    Feature: {{feature_description}}, Context: {{existing_code}}
    Output JSON: { "red_test", "green_impl", "refactor_notes" }
tests:
  - vars: { feature_description: "JWT auth", existing_code: "..." }
    assert:
      - type: javascript
        value: output.red_test?.includes('test(') && !output.red_test.includes('implementation')
        weight: 2  # HIGH: RED phase critical
      - type: javascript
        value: output.green_impl?.length > 50 && output.green_impl.includes('export')
        weight: 1.5
      - type: llm-rubric
        value: Does impl follow test contract? Does refactor improve quality?
        weight: 1.5
    threshold: 0.85
metadata: { category: "tdd-discipline", benchmark: "b2", severity: "gate-blocking" }
```

**npm scripts**:
```json
{
  "eval:b1": "promptfoo eval -c eval/templates/b1-small-fix.yml --verbose",
  "eval:all": "npm run eval:b1 && ... && npm run eval:b6",
  "eval:gate": "node eval/scripts/run-gate.js --check-g5"
}
```

## 2. Langfuse Self-Hosted Docker Compose

```yaml
services:
  postgres: { image: postgres:15-alpine, env: POSTGRES_PASSWORD, POSTGRES_DB: langfuse, ports: ["5432:5432"] }
  redis: { image: redis:7-alpine, command: redis-server --requirepass ..., ports: ["6379:6379"] }
  langfuse:
    image: langfuse/langfuse:latest
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql://...
      LANGFUSE_MASK_PII: "true"
      LANGFUSE_DATA_RETENTION_DAYS: 30
      OTEL_ENABLED: "true"
    ports: ["3000:3000"]
```

**.env**:
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SAMPLER=parentbased_traceidratio
OTEL_SAMPLER_ARG=0.1  # 10% 기본
LANGFUSE_MASK_PII=true
```

## 3. PostToolUse OTEL Hook (`observability/hooks/post-tool-use.js`, ~150 LOC)

```javascript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { getSamplingDecision, maskPII } from './sampling.js';

const tracer = trace.getTracer('ateam-posttooluse', '1.0.0');

export function createPostToolUseHook() {
  return async (input) => {
    const { tool_name, tool_input, tool_response, tool_use_id, agent_id } = input;
    if (!getSamplingDecision()) return { additionalContext: '' };

    try {
      let rootSpan = context.getActiveSpan() || tracer.startSpan('ateam-session', {
        attributes: { 'ateam.session.id': agent_id, 'ateam.phase': 'execution' }
      });
      const span = tracer.startSpan(`tool:${tool_name}`, {
        parent: rootSpan,
        attributes: {
          'tool.name': tool_name,
          'tool.use_id': tool_use_id,
          'tool.input.masked': maskPII(JSON.stringify(tool_input)),
          'tool.response.masked': maskPII(String(tool_response).substring(0, 500)),
          'agent.id': agent_id,
          ...(global.__PROMPTFOO_EVAL_ID__ && { 'eval.id': global.__PROMPTFOO_EVAL_ID__ })
        }
      });
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return { additionalContext: `[OTEL span: ${tool_name}, trace=${span.spanContext().traceId}]` };
    } catch (err) {
      console.error('[OTEL emission failed]', err.message);
      return { additionalContext: '[OTEL error, proceeding]' };
    }
  };
}
```

## 4. PII Masking + Sampling

```javascript
// sampling.js
export function getSamplingDecision() {
  if (process.env.LANGFUSE_ENABLED === 'false') return false;
  if (process.env.ATEAM_TRACE_ALL === '1') return true;
  return Math.random() < parseFloat(process.env.OTEL_SAMPLER_ARG || '0.1');
}

// masking.js
export function maskPII(text) {
  return text
    .replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[EMAIL]')
    .replace(/\+?1?\s*\(?\d{3}\)?[\s\.-]?\d{3}[\s\.-]?\d{4}/g, '[PHONE]')
    .replace(/(['"])(sk-[A-Za-z0-9\-_]{20,})\1/g, '$1[API_KEY]$1')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
}
```

## 5. Eval-Trace Linking (run-gate.js G5 validator)

```javascript
export async function validateGate5(evalResults) {
  const span = tracer.startSpan('performance-gate-g5');
  const gates = {
    'G5-a': evalResults.improvements >= 0.15,
    'G5-b': evalResults.regressions <= 0.05,
    'G5-c': evalResults.correctness >= 1.0,
    'G5-d': evalResults.passedBenchmarks >= 4,
    'G5-e': evalResults.variability < 0.1
  };
  span.setAttributes({ 'gate.g5.passed': Object.values(gates).every(g => g), ...gates });
  span.end();
  return Object.values(gates).every(g => g);
}
```

## Porting Difficulty

| Component | Effort | LOC |
|-----------|-------|-----|
| promptfoo B1–B6 YAML | S | 300 |
| Docker Compose + env | S | 100 |
| PostToolUse hook | M | 200 |
| Sampling + rollback | S | 50 |
| Eval-Trace linking | M | 150 |
| **Total** | **M** | **~800** |

## Performance

| Metric | promptfoo | Langfuse (10%) | Combined |
|--------|-----------|----------------|----------|
| M1 token | <50B/eval | +10–30B/trace | <80B |
| M2 latency | ~200ms LLM | +2–5ms | +1% |
| CPU/mem | 무시 | 0.1–0.3% | <0.5% |
| M4 correctness | +2–5pp | audit trail | net positive |

## Rollback
```bash
export LANGFUSE_ENABLED=false  # Observability 끄기
export PROMPTFOO_SKIP=1         # Eval gate 건너뛰기
export ATEAM_TRACE_ALL=1        # Debug 시 100% sampling
docker exec langfuse-web npx langfuse cleanup --older-than-days 30
```

## Privacy
- Client-side 마스킹 (SDK emission 전)
- Server-side Langfuse 수집 시 regex 재적용
- PII 패턴 external JSON config
- 30일 retention default (LANGFUSE_CLEANUP_CRON)

## P4+P6+P7 강화
- **P4 hooks**: 기존 PostToolUse 사용, 신규 hook 불필요
- **P6 Sovereignty**: self-hosted Docker, SaaS 외부 의존 없음
- **P7 TDD**: eval gate = correctness gate 강제

## Stage 5.5 순서
1. promptfoo B1-B6 YAML 작성 (≤2일)
2. Docker Compose spec + `.env` (0.5일)
3. PostToolUse hook 구현 (1일)
4. Baseline 측정 (LANGFUSE_ENABLED=false, PROMPTFOO_SKIP=1)
5. A/B 측정 (10% sampling), 오버헤드 <0.5% 확인
6. G5 gate 검증

## Sources
- [promptfoo](https://github.com/promptfoo/promptfoo)
- [Langfuse GitHub](https://github.com/langfuse/langfuse)
- [Langfuse OTEL Integration](https://langfuse.com/integrations/native/opentelemetry)
- [Claude Agent SDK Hooks](https://platform.claude.com/docs/en/agent-sdk/hooks)
