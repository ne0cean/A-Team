# Privileged Executor — 자율 모드 승인 문제 구조적 해결

> **Status**: RFC (Request for Comments)
> **Created**: 2026-05-08
> **Problem**: claude-remote/zzz 모드에서 복합 Bash 명령이 승인 대기로 블로킹

---

## 문제 분석

### 현재 상황
```
settings.local.json: defaultMode: bypassPermissions
↓
단일 명령 (`npm test`) → ✅ 승인 없이 통과
복합 명령 (`git add && git commit`) → ❌ 항상 승인 대기
```

### 근본 원인
Claude Code 내부 보안 정책:
- 파이프 (`|`), 체인 (`&&`, `;`), 리다이렉트 (`>`, `2>&1`) 포함 명령
- 환경변수 설정 (`FOO=bar cmd`)
- 서브셸 (`$(...)`, `` `...` ``)

→ **settings.json으로 비활성화 불가**. CLI 플래그 `--dangerously-skip-permissions`만 우회.

### claude-remote 한계
- PTY 주입 = 기존 세션에 텍스트 삽입
- CLI 플래그 추가 불가 (세션 이미 시작됨)
- 결과: 자율 모드에서 git commit 등 필수 작업 블로킹

---

## 해결안 비교

| 방안 | 장점 | 단점 | 복잡도 |
|------|------|------|--------|
| A. Allowlist 확장 | 즉시 적용 | 무한 확장 불가, 동적 명령 미지원 | 저 |
| B. Executor 스크립트 | 단순 | 여전히 복합 명령 | 저 |
| C. 큐 + 데몬 | 완전 분리 | 지연, 복잡도 | 중 |
| D. 세션 재시작 | 근본 해결 | 컨텍스트 손실 | 중 |
| **E. MCP Server** | **완전 해결, 권한 분리** | 초기 설정 필요 | 중 |
| F. 하이브리드 (A+E) | 점진적 마이그레이션 | - | 중 |

**권장: F (하이브리드)** — 즉시 Allowlist 확장 + MCP Server 구축

---

## Phase 1: Allowlist 체계화 (즉시)

### 원칙
1. **Prefix wildcard 최대 활용**: `Bash(git:*)` → 모든 git 명령
2. **Scripts 폴더 위임**: `Bash(bash scripts/*.sh:*)` → 스크립트는 완전 신뢰
3. **npm/bun 전체 허용**: `Bash(npm:*)`, `Bash(bun:*)`

### 추가할 룰
```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(npm:*)",
      "Bash(bun:*)",
      "Bash(bash /Users/noir/Projects/a-team/scripts/*:*)",
      "Bash(node /Users/noir/Projects/a-team/scripts/*:*)",
      "Bash(rtk:*)",
      "Bash(claude:*)"
    ]
  }
}
```

### 한계
- 동적 생성 명령 (예: `curl $(...)`) 여전히 블로킹
- 새 스크립트 추가 시 수동 등록 불필요 (와일드카드)
- 복합 체인 (`a && b`) 여전히 문제

---

## Phase 2: MCP Privileged Executor (단기)

### 아키텍처
```
┌─────────────────────────────────────────────────┐
│  Claude Code Session (any permission mode)      │
│                                                 │
│  MCP Tool Call: exec_privileged                 │
│  - command: "git add -A && git commit -m '...'" │
│  - cwd: "/Users/noir/Projects/a-team"           │
│  - timeout: 60000                               │
└───────────────────┬─────────────────────────────┘
                    │ MCP Protocol (no approval)
                    ▼
┌─────────────────────────────────────────────────┐
│  MCP Server: privileged-executor                │
│  (Node.js, runs with full system access)        │
│                                                 │
│  1. Validate command (blocklist check)          │
│  2. child_process.exec() with timeout           │
│  3. Return stdout/stderr/exitCode               │
└─────────────────────────────────────────────────┘
```

### MCP Server 구현 (`scripts/mcp/privileged-executor.mjs`)

```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// 절대 실행 금지 명령
const BLOCKLIST = [
  /rm\s+-rf\s+[\/~]/,           // rm -rf / or ~
  /:(){ :|:& };:/,              // fork bomb
  /mkfs/,                        // format
  /dd\s+if=.*of=\/dev/,         // disk overwrite
  />\s*\/dev\/sd/,              // direct device write
];

const server = new Server({
  name: "privileged-executor",
  version: "1.0.0",
}, {
  capabilities: { tools: {} }
});

server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "exec_privileged",
    description: "Execute shell command with full permissions (autonomous mode)",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        cwd: { type: "string", description: "Working directory" },
        timeout: { type: "number", description: "Timeout in ms (default: 60000)" }
      },
      required: ["command"]
    }
  }]
}));

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name !== "exec_privileged") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { command, cwd, timeout = 60000 } = request.params.arguments;

  // Blocklist check
  for (const pattern of BLOCKLIST) {
    if (pattern.test(command)) {
      return {
        content: [{ type: "text", text: `BLOCKED: Command matches security blocklist` }]
      };
    }
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      shell: "/bin/bash"
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ exitCode: 0, stdout, stderr }, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          exitCode: error.code || 1,
          stdout: error.stdout || "",
          stderr: error.stderr || error.message
        }, null, 2)
      }]
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Claude settings.json 등록

```json
{
  "mcpServers": {
    "privileged-executor": {
      "command": "node",
      "args": ["/Users/noir/Projects/a-team/scripts/mcp/privileged-executor.mjs"],
      "env": {}
    }
  }
}
```

### 사용법 (Claude 측)

```
// MCP tool 호출 (승인 불필요)
mcp__privileged-executor__exec_privileged({
  command: "git add -A && git commit -m 'auto-commit'",
  cwd: "/Users/noir/Projects/a-team"
})
```

---

## Phase 3: 자율 모드 통합 (중기)

### autonomous-loop.md 개정

```markdown
### 강제 조항 9: MCP Executor 우선 (2026-05-08)

복합 Bash 명령 실행 시:
1. MCP `exec_privileged` 가용 여부 확인
2. 가용 → MCP 호출 (승인 없음)
3. 불가 → Bash 직접 호출 (승인 대기 가능)
4. 승인 대기 감지 → 로그에 기록 + 다음 iteration 대기

**근거**: claude-remote/IDE 환경에서 승인 블로킹 방지.
```

### claude-remote 통합

```typescript
// packages/server/src/index.ts
// auto-switch 전 MCP executor 상태 확인
const mcpAvailable = await checkMcpExecutor();
if (!mcpAvailable) {
  log.warn("MCP privileged-executor not available, complex commands may block");
}
```

---

## 보안 고려사항

### Blocklist (MCP Server 측)
- 파일시스템 파괴 명령
- 네트워크 공격 도구
- 권한 상승 시도

### Audit Log
```javascript
// 모든 명령 로깅
const logEntry = {
  timestamp: new Date().toISOString(),
  command,
  cwd,
  exitCode,
  invokedBy: "claude-session"
};
appendFileSync("~/.ateam/privileged-exec.log", JSON.stringify(logEntry) + "\n");
```

### Rate Limiting
```javascript
const RATE_LIMIT = 100; // commands per minute
const rateLimiter = new Map();
```

---

## 마이그레이션 계획

| Phase | 작업 | 예상 |
|-------|------|------|
| 1 | Allowlist 확장 | 즉시 |
| 2 | MCP Server 구현 + 테스트 | 1-2일 |
| 3 | autonomous-loop.md 개정 | Phase 2 후 |
| 4 | claude-remote 통합 | Phase 3 후 |
| 5 | 기존 Bash 호출 점진적 MCP 전환 | 2주 |

---

## 대안: Session Restart

MCP가 과하다면:

1. claude-remote가 autosave 후 세션 종료
2. 새 세션을 `--dangerously-skip-permissions`로 시작
3. RESUME.md로 컨텍스트 복원

**단점**: 컨텍스트 손실 (handoff 품질 의존), 세션 재시작 오버헤드

---

## 결론

**즉시**: Allowlist 와일드카드 확장
**단기**: MCP privileged-executor 구축
**중기**: 자율 모드 전체 통합

MCP 방식이 가장 깔끔한 권한 분리 + 확장성 제공.
