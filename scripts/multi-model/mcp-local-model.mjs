#!/usr/bin/env node
/**
 * MCP Server: Local Model (Ollama)
 *
 * Claude Code에서 Ollama 로컬 모델을 MCP tool로 사용.
 * 토큰 비용 0, rate limit 없음.
 *
 * 설치:
 *   1. ~/.claude/settings.json에 mcpServers 추가
 *   2. ollama serve 실행 중이어야 함
 *
 * 사용:
 *   mcp__local-model__ask_local({ prompt: "...", model: "qwen2.5-coder:7b" })
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || "qwen2.5-coder:7b";
const TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || "120000", 10);

const server = new Server({
  name: "local-model",
  version: "1.0.0",
}, {
  capabilities: { tools: {} }
});

// Tool 목록
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "ask_local",
      description: "Ask local Ollama model. Free, no rate limit. Best for: summaries, formatting, simple code, log analysis.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The question or task for the local model"
          },
          model: {
            type: "string",
            description: "Ollama model to use",
            enum: ["qwen2.5-coder:7b", "qwen2.5-coder:14b", "qwen2.5-coder:32b"],
            default: DEFAULT_MODEL
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
      name: "local_status",
      description: "Check Ollama server status and available models",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "local_embed",
      description: "Generate embeddings using local model",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to embed" },
          model: { type: "string", default: "nomic-embed-text" }
        },
        required: ["text"]
      }
    }
  ]
}));

// Tool 실행
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "ask_local":
        return await handleAskLocal(args);
      case "local_status":
        return await handleStatus();
      case "local_embed":
        return await handleEmbed(args);
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

async function handleAskLocal({ prompt, model = DEFAULT_MODEL, system }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const body = {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 4096
      }
    };

    if (system) {
      body.system = system;
    }

    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 메타데이터 포함
    const meta = [
      `Model: ${model}`,
      `Tokens: ${data.prompt_eval_count || 0} in / ${data.eval_count || 0} out`,
      `Time: ${((data.total_duration || 0) / 1e9).toFixed(2)}s`
    ].join(" | ");

    return {
      content: [{
        type: "text",
        text: `${data.response}\n\n---\n_${meta}_`
      }]
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleStatus() {
  const [tagsRes, versionRes] = await Promise.all([
    fetch(`${OLLAMA_BASE}/api/tags`).catch(() => null),
    fetch(`${OLLAMA_BASE}/api/version`).catch(() => null)
  ]);

  if (!tagsRes?.ok) {
    return {
      content: [{
        type: "text",
        text: `Ollama not reachable at ${OLLAMA_BASE}\n\nStart with: ollama serve`
      }],
      isError: true
    };
  }

  const tags = await tagsRes.json();
  const version = versionRes?.ok ? await versionRes.json() : { version: "unknown" };

  const models = tags.models?.map(m =>
    `- ${m.name} (${(m.size / 1e9).toFixed(1)}GB)`
  ).join("\n") || "No models installed";

  return {
    content: [{
      type: "text",
      text: `Ollama Status\n\nVersion: ${version.version}\nEndpoint: ${OLLAMA_BASE}\n\nModels:\n${models}`
    }]
  };
}

async function handleEmbed({ text, model = "nomic-embed-text" }) {
  const response = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text })
  });

  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    content: [{
      type: "text",
      text: `Embedding generated (${data.embedding?.length || 0} dimensions)`
    }]
  };
}

// 시작
const transport = new StdioServerTransport();
await server.connect(transport);
