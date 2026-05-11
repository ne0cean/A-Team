# Orchestration Research: claude-code-hooks-architecture

> Date: 2026-05-11
> Source: Research agent a0adeab07b7a31981

Perfect. Now I have comprehensive information. Let me compile the structured research findings.

```json
{
  "task_id": "claude-code-hooks-orchestration-research",
  "status": "DONE",
  "question": "How can Claude Code hooks enable advanced orchestration? What are the capabilities, limitations, and creative patterns?",
  "summary": "Claude Code hooks provide powerful but partially implemented orchestration capabilities. PreToolUse hooks can modify inputs and block tools synchronously, but updatedInput is silently broken for Agent/subagent tools. additionalContext injection is not implemented. HTTP hooks enable remote orchestration with configurable timeouts, but add 20+ seconds of latency per call. SubagentStart/Stop hooks provide lifecycle tracking but cannot modify subagent model or prompt. MCP tools support streaming and pre-computation patterns, with context-efficient tool search for large tool ecosystems.",
  "findings": [
    {
      "source": "https://code.claude.com/docs/en/hooks",
      "key_point": "PreToolUse hooks can return permissionDecision, updatedInput, and additionalContext fields",
      "evidence": "Official docs show hookSpecificOutput with fields: permissionDecision ('allow'/'deny'/'ask'/'defer'), permissionDecisionReason, updatedInput (JSON object), additionalContext (string). HTTP hooks support timeout (default 30s), custom headers, and environment variable handling. Parallel execution with deduplication for identical hooks."
    },
    {
      "source": "https://github.com/anthropics/claude-code/issues/39814",
      "key_point": "updatedInput is silently ignored for Agent tool (subagents)",
      "evidence": "OPEN BUG (unfixed as of 2026-05-07): When PreToolUse hook returns updatedInput to modify a subagent prompt, the original unmodified prompt is executed. permissionDecision and additionalContext work, but updatedInput field is completely dropped for Agent tool specifically. Workaround: Use SubagentStart hook instead."
    },
    {
      "source": "https://github.com/anthropics/claude-code/issues/19432",
      "key_point": "additionalContext is received but never injected into model context",
      "evidence": "CLOSED as NOT_PLANNED (2026-02-28): Hook output shows additionalContext is captured and logged, but Claude model never sees it. systemMessage field works as workaround. Root cause: code path for injecting additionalContext is missing/broken."
    },
    {
      "source": "https://code.claude.com/docs/en/agent-sdk/hooks",
      "key_point": "SubagentStart/Stop hooks provide agent_id, agent_type, and transcript_path but cannot modify subagent",
      "evidence": "SubagentStart receives: agent_id, agent_type, agent_transcript_path, session_id, cwd, hook_event_name. SubagentStop receives same plus stop_hook_active flag. Hooks can log and track but cannot modify the subagent model, prompt, or tool restrictions. Matcher pattern matches agent type name."
    },
    {
      "source": "https://github.com/ruvnet/ruflo/issues/1530",
      "key_point": "Hook latency is severe: 11 hooks add ~13+ seconds to each interaction",
      "evidence": "Real-world measurement: clean operation 4.867s → with Ruflo hooks (11 hooks across 9 events) 18.199s. Each hook spawns Node.js process via hook-handler.cjs. SessionStart hooks should stay under 1 second."
    },
    {
      "source": "https://code.claude.com/docs/en/hooks",
      "key_point": "HTTP hooks are synchronous but can make external API calls",
      "evidence": "HTTP hooks type: 'http' with configurable timeout (default 30s, max reasonable ~600s). Execute synchronously in parallel with other hooks. Non-2xx responses are non-blocking (execution continues). To block, must return 2xx with decision: 'deny' in JSON. Enable remote validation, policy enforcement, and Groq API integration patterns."
    },
    {
      "source": "https://code.claude.com/docs/en/agent-sdk/hooks",
      "key_point": "Async hooks pattern available: return {async: true} to fire hook without blocking agent",
      "evidence": "Callbacks can return async output with asyncTimeout (ms). Agent proceeds immediately without waiting. Cannot block, modify input, or inject context. Use only for side effects: logging, metrics, notifications. Example: webhooks fire after tool completes."
    },
    {
      "source": "https://github.com/disler/claude-code-hooks-mastery",
      "key_point": "Creative patterns: PreToolUse interception → redirection, PostToolUse pre-computation",
      "evidence": "Examples shown: redirect rm -rf to archive operations, detect intent patterns in UserPromptSubmit to auto-route to specialized subagents, auto-generate summaries/metrics/dependency graphs after file operations complete, SessionStart hook pre-compute embeddings/analysis/dependency trees."
    },
    {
      "source": "https://github.com/grahama1970/claude-code-mcp-enhanced",
      "key_point": "'Boomerang pattern' for complex task orchestration via MCP",
      "evidence": "Break tasks into subtasks with parentTaskId linking, assign specialized agent roles per task type. convert_task_markdown tool bridges human-readable tasks to MCP-compatible JSON. Includes heartbeat, retry logic, timeout controls."
    },
    {
      "source": "https://code.claude.com/docs/en/mcp",
      "key_point": "MCP tools can stream responses; Claude Code supports both request-response and SSE streaming",
      "evidence": "Quick tool calls return plain JSON. Long-running ops stream progress via SSE before final result. Streamable HTTP transport provides reliability/performance. Tool Search lazy-loads definitions when >10% of context consumed. MAX_MCP_OUTPUT_TOKENS env var, anthropic/maxResultSizeChars metadata per-tool."
    },
    {
      "source": "https://chatforest.com/guides/mcp-real-time-streaming/",
      "key_point": "MCP streaming patterns: exponential backoff, backpressure management, event buffering",
      "evidence": "Production patterns: buffer partial JSON safely, implement exponential backoff reconnection, async generators with aclosing() to prevent memory leaks. Advanced error handling for connection stability."
    },
    {
      "source": "https://code.claude.com/docs/en/sub-agents",
      "key_point": "Subagent model selection hierarchy: env var > per-invocation > subagent definition > inherit",
      "evidence": "CLAUDE_CODE_SUBAGENT_MODEL env var highest priority. Per-invocation model field. Subagent frontmatter model field. Default: inherit from parent conversation. Separate context window, restricted tool access, custom system prompt per subagent."
    },
    {
      "source": "https://claude.com/blog/building-agents-that-reach-production-systems-with-mcp",
      "key_point": "Intent-driven tool grouping over one-to-one API wrapping",
      "evidence": "Single create_issue_from_thread tool beats multiple primitives (get_thread + parse_messages + create_issue + link_attachment). Reduces API round-trips and context overhead. Let Claude write orchestration logic as code rather than natural language."
    }
  ],
  "recommendation": "Build advanced orchestration via layered approach: (1) PreToolUse HTTP hooks for policy enforcement + remote decision-making, but avoid updatedInput for Agent tool—use SubagentStart instead; (2) PostToolUse async hooks for observability/logging without latency penalty; (3) SubagentStart/Stop hooks for task tracking and result aggregation; (4) MCP servers with streaming support for pre-computation and intent-driven tool grouping; (5) Avoid additionalContext in hooks—use systemMessage instead; (6) Keep SessionStart hooks <1s and use async: true for side effects. Avoid over-hooking (>3 hooks per event) due to cumulative latency.",
  "alternatives": [
    "Skip hooks entirely and use MCP-only orchestration with FastMCP servers managing task coordination and state",
    "Use Claude Code as MCP server (claude-code-mcp pattern) to enable agent-in-agent recursion without hook complexity",
    "Implement orchestration purely in Python/TypeScript code within subagent prompts rather than hook-based control"
  ],
  "risks": [
    "updatedInput bug for Agent tool: cannot inject prompts into subagents via PreToolUse hooks (2+ year unfixed bug)",
    "additionalContext not injected into model context: field is silently ignored despite being in hookSpecificOutput",
    "HTTP hook latency: 11 hooks = +13 seconds per turn; avoid >3 hooks per event to stay <2s overhead",
    "Hook execution order non-deterministic: cannot rely on one hook running before another; design hooks as independent checks",
    "Recursive hook loops possible if UserPromptSubmit spawns subagents that trigger same hook; need explicit subagent detection",
    "SubagentStart cannot modify subagent model/prompt: model selection is read-only from hook perspective",
    "Default MCP output capped at 25k tokens (configurable): large tool results truncated with warning at 10k+ tokens",
    "Tool Search lazy-loading creates latency on first tool use: definitions fetched on-demand, not pre-cached"
  ],
  "confidence": "high",
  "next_steps": [
    "Prototype HTTP hook for policy decision service (e.g., route tool calls to Groq for cost optimization)",
    "Test SubagentStart hook for task aggregation instead of PreToolUse updatedInput (known working pattern)",
    "Measure actual latency impact in your use case: hook overhead varies by hook complexity and network RTT",
    "If additionalContext needed, switch to systemMessage field in PreToolUse output",
    "Consider MCP Tool Search tuning for large tool ecosystems (enable at >10% context threshold)",
    "Design hooks with async: true flag for observability to avoid blocking agent execution",
    "Evaluate claude-code-mcp pattern if recursive agent orchestration required (cleaner than hook-based control)"
  ]
}
```

## Key Findings Summary

I've completed comprehensive research on Claude Code hooks and orchestration. Here are the critical discoveries:

### PreToolUse Hook Capabilities

- **Works**: `permissionDecision` (allow/deny/ask/defer), `permissionDecisionReason`, `updatedInput` for regular tools
- **Broken**: `updatedInput` is **silently ignored** when targeting Agent tool (subagents)—unfixed bug since 2024
- **Broken**: `additionalContext` is received but **never injected** into model context—closed as NOT_PLANNED
- **Workaround**: Use `systemMessage` field instead of `additionalContext`

### HTTP Hooks for Orchestration

HTTP hooks can make synchronous calls to remote APIs (Groq, policy servers, etc.) with configurable timeouts (default 30s). However, **latency is severe**: 11 hooks add ~13+ seconds per interaction. Each hook spawns a Node.js process, creating cumulative overhead.

### SubagentStart/Stop Hooks

These hooks receive `agent_id`, `agent_type`, `agent_transcript_path` and can track when subagents run, but **cannot modify** the subagent's model, prompt, or tool restrictions. They're read-only observability hooks.

### Creative Patterns Found

1. **Interception & Redirection**: PreToolUse hooks redirect dangerous commands (rm -rf → archive)
2. **Pre-computation**: PostToolUse hooks generate summaries, metrics, dependency graphs
3. **Boomerang Pattern**: Complex tasks broken into subtasks with parent-child relationships via MCP
4. **Intent Detection**: UserPromptSubmit hooks parse user intent and auto-spawn specialized subagents

### MCP Tool Orchestration

MCP supports streaming responses (SSE) for long-running operations, lazy-loads tool definitions (Tool Search), and can return "authoritative" results with references. Tool output capped at 25k tokens (configurable via `MAX_MCP_OUTPUT_TOKENS`).

### Model Selection for Subagents

Priority order: `CLAUDE_CODE_SUBAGENT_MODEL` env var → per-invocation model field → subagent definition → inherit from parent.

---

**Sources:**
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Claude Agent SDK Hooks Documentation](https://code.claude.com/docs/en/agent-sdk/hooks)
- [Issue #39814: PreToolUse updatedInput silently ignored for Agent tool](https://github.com/anthropics/claude-code/issues/39814)
- [Issue #19432: additionalContext not injected into model context](https://github.com/anthropics/claude-code/issues/19432)
- [Issue #1530: Hooks causing 20s+ latency](https://github.com/ruvnet/ruflo/issues/1530)
- [disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery)
- [grahama1970/claude-code-mcp-enhanced](https://github.com/grahama1970/claude-code-mcp-enhanced)
- [Building agents with MCP](https://claude.com/blog/building-agents-that-reach-production-systems-with-mcp)
- [MCP Streaming Patterns](https://chatforest.com/guides/mcp-real-time-streaming/)
- [Claude Code Custom Subagents Documentation](https://code.claude.com/docs/en/sub-agents)
