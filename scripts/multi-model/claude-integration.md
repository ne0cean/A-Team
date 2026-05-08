# Claude Code + Multi-Model Router 통합 가이드

## 연결 방식

### 방식 A: 환경변수 (간단, 전체 요청 프록시)

```bash
# LiteLLM 프록시를 통해 모든 Claude 요청 라우팅
export ANTHROPIC_BASE_URL="http://localhost:4000"

# 기존 API 키 유지
export ANTHROPIC_API_KEY="your-key"
```

**장점**: 설정 한 줄로 끝
**단점**: LiteLLM이 죽으면 Claude Code도 안 됨

### 방식 B: 선택적 사용 (권장)

기본은 Anthropic 직접 연결, 로컬 모델 필요할 때만 MCP 사용.

```json
// ~/.claude/settings.json에 MCP 서버 추가
{
  "mcpServers": {
    "local-model": {
      "command": "node",
      "args": ["/Users/noir/Projects/a-team/scripts/multi-model/mcp-local-model.mjs"]
    }
  }
}
```

## MCP 서버 구현

로컬 모델을 MCP tool로 노출:

```javascript
// mcp-local-model.mjs
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "local-model",
  version: "1.0.0",
}, { capabilities: { tools: {} } });

server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "ask_local",
    description: "Ask local Ollama model (fast, free, no rate limit)",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Question or task" },
        model: {
          type: "string",
          enum: ["qwen2.5-coder:7b", "qwen2.5-coder:14b"],
          default: "qwen2.5-coder:7b"
        }
      },
      required: ["prompt"]
    }
  }]
}));

server.setRequestHandler("tools/call", async (request) => {
  const { prompt, model = "qwen2.5-coder:7b" } = request.params.arguments;

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false
    })
  });

  const data = await response.json();
  return { content: [{ type: "text", text: data.response }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## 사용 예시

### Claude Code 세션 내에서:

```
사용자: 이 함수 요약해줘 (로컬로)

Claude: MCP 로컬 모델 호출...
→ mcp__local-model__ask_local({ prompt: "Summarize: ..." })
→ Ollama qwen2.5-coder:7b 응답 수신
```

### /auto 스킬과 연동:

```
/auto 이 로그 해석해
→ [판정: Low complexity]
→ local-model MCP 호출 또는 Task(model="haiku")
```

## 장애 대응

| 상황 | 대응 |
|------|------|
| Ollama 다운 | LiteLLM fallback → Claude Sonnet |
| LiteLLM 다운 | 직접 Anthropic API 사용 |
| 둘 다 다운 | `bash ~/Projects/a-team/scripts/multi-model/start.sh` |

## 비용 추적

LiteLLM 대시보드에서 확인:
- http://localhost:4000/ui
- 모델별 토큰 사용량
- 비용 추정치
- 에러율

## A-Team 통합

### orchestrator.md 연동

```markdown
## Phase 2.95: Local Model Gate

Low complexity 작업 감지 시:
1. Ollama 상태 확인 (`curl localhost:11434/api/tags`)
2. 가용 → `mcp__local-model__ask_local` 호출
3. 불가 → 기존 haiku 서브에이전트

**비용 절감**: haiku 대비 100% (로컬은 무료)
```

### /auto 스킬 연동

/auto가 Low로 판정하면:
1. MCP local-model 가용 → 로컬 호출
2. 불가 → Task(model="haiku")
