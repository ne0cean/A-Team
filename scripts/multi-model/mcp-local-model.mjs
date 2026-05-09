#!/usr/bin/env node
/**
 * MCP Server: Multi-Model (Ollama + Groq)
 *
 * Claude Code에서 로컬/무료 모델을 MCP tool로 사용.
 * Ollama: 토큰 비용 0, rate limit 없음.
 * Groq: 무료 tier, 초고속.
 *
 * 설치:
 *   1. ~/.claude/settings.json에 mcpServers 추가
 *   2. ollama serve 실행 중이어야 함 (로컬 모델용)
 *   3. GROQ_API_KEY 환경변수 설정 (Groq용)
 *
 * 사용:
 *   mcp__llm__ask({ prompt: "...", model: "groq-free" })
 *   mcp__llm__ask({ prompt: "...", model: "local-fast" })
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || "qwen2.5-coder:7b";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || "120000", 10);

const GROQ_MODELS = {
  'groq-free': 'llama-3.3-70b-versatile',
  'groq-fast': 'llama-3.1-8b-instant',
};

const server = new Server({
  name: "llm",
  version: "2.0.0",
}, {
  capabilities: { tools: {} }
});

// Tool 목록
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ask",
      description: "Ask a free/local model. Use for summaries, formatting, simple code, log analysis. Models: groq-free (70B, fast), groq-fast (8B, ultra-fast), local-fast (Ollama 1B), local-strong (Ollama 32B).",
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The question or task"
          },
          model: {
            type: "string",
            description: "Model to use",
            enum: ["groq-free", "groq-fast", "local-fast", "local-strong"],
            default: "groq-free"
          },
          system: {
            type: "string",
            description: "Optional system prompt"
          }
        },
        required: ["prompt"]
      }
    },
    {
      name: "status",
      description: "Check available models and their status (Ollama + Groq)",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    }
  ]
}));

// Tool 실행
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "ask":
        return await handleAsk(args);
      case "status":
        return await handleStatus();
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}\n\nIs Ollama running? Try: ollama serve`
      }],
      isError: true
    };
  }
});

const OLLAMA_MODELS = {
  'local-fast': 'llama3.2:1b',
  'local-strong': 'qwen2.5-coder:32b',
};

async function handleAsk({ prompt, model = "groq-free", system }) {
  if (GROQ_MODELS[model]) {
    return await handleGroq({ prompt, model, system });
  }
  if (OLLAMA_MODELS[model]) {
    return await handleOllama({ prompt, model: OLLAMA_MODELS[model], system });
  }
  throw new Error(`Unknown model: ${model}. Use: groq-free, groq-fast, local-fast, local-strong`);
}

async function handleGroq({ prompt, model, system }) {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const start = Date.now();
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODELS[model],
      messages,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const latency = Date.now() - start;

  const meta = `${model} (${GROQ_MODELS[model]}) | ${data.usage?.total_tokens || "?"} tokens | ${latency}ms`;
  return { content: [{ type: "text", text: `${content}\n\n---\n_${meta}_` }] };
}

async function handleOllama({ prompt, model, system }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, options: { num_predict: 4096 } }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`Ollama ${response.status}: ${response.statusText}`);
    const data = await response.json();
    const content = data.message?.content || "";

    const meta = [
      `${model} (local)`,
      `${(data.prompt_eval_count || 0) + (data.eval_count || 0)} tokens`,
      `${((data.total_duration || 0) / 1e9).toFixed(2)}s`
    ].join(" | ");

    return { content: [{ type: "text", text: `${content}\n\n---\n_${meta}_` }] };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleStatus() {
  const results = [];

  // Groq
  if (GROQ_API_KEY) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
      });
      results.push(res.ok ? "Groq: OK (free tier)" : `Groq: Error ${res.status}`);
    } catch { results.push("Groq: Unreachable"); }
  } else {
    results.push("Groq: GROQ_API_KEY not set");
  }

  // Ollama
  try {
    const tagsRes = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (tagsRes.ok) {
      const tags = await tagsRes.json();
      const models = tags.models?.map(m => m.name).join(", ") || "none";
      results.push(`Ollama: OK (${models})`);
    } else {
      results.push(`Ollama: Error ${tagsRes.status}`);
    }
  } catch { results.push(`Ollama: Offline (${OLLAMA_BASE})`); }

  return { content: [{ type: "text", text: results.join("\n") }] };
}

// 시작
const transport = new StdioServerTransport();
await server.connect(transport);
