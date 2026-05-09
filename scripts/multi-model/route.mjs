#!/usr/bin/env node
/**
 * Multi-Model Router CLI (Direct Mode - no LiteLLM)
 *
 * Usage:
 *   node route.mjs --model groq-free --prompt "Summarize this"
 *   echo "code" | node route.mjs --model local-fast --system "You are a code reviewer"
 *   node route.mjs --model groq-fast --file ./src/app.ts --prompt "Review this code"
 *
 * Models:
 *   - groq-free:    Llama 3.3 70B (free, fast)
 *   - groq-fast:    Llama 3.1 8B (free, ultra-fast)
 *   - local-fast:   Ollama llama3.2:1b (local)
 *   - local-strong: Ollama qwen2.5-coder:32b (local)
 */

import { readFileSync } from 'fs';
import { argv, stdin } from 'process';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const MODELS = {
  'groq-free':    { provider: 'groq',   model: 'llama-3.3-70b-versatile' },
  'groq-fast':    { provider: 'groq',   model: 'llama-3.1-8b-instant' },
  'local-fast':   { provider: 'ollama', model: 'llama3.2:1b' },
  'local-strong': { provider: 'ollama', model: 'qwen2.5-coder:32b' },
};

// Parse arguments
const BOOL_FLAGS = new Set(['verbose', 'json']);
const args = {};
for (let i = 2; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const key = argv[i].slice(2);
    if (BOOL_FLAGS.has(key) || !argv[i + 1] || argv[i + 1].startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = argv[i + 1];
      i++;
    }
  }
}

async function readStdin() {
  if (stdin.isTTY) return null;
  return new Promise((resolve) => {
    let data = '';
    stdin.setEncoding('utf8');
    stdin.on('readable', () => {
      let chunk;
      while ((chunk = stdin.read()) !== null) data += chunk;
    });
    stdin.on('end', () => resolve(data.trim()));
  });
}

async function callGroq(model, messages, maxTokens) {
  if (!GROQ_API_KEY) {
    console.error('GROQ_API_KEY not set');
    process.exit(1);
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err}`);
  }
  return res.json();
}

async function callOllama(model, messages, maxTokens) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, options: { num_predict: maxTokens } }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama ${res.status}: ${err}`);
  }
  const data = await res.json();
  // Normalize to OpenAI-compatible format
  return {
    model: data.model,
    choices: [{ message: { content: data.message?.content || '' } }],
    usage: {
      prompt_tokens: data.prompt_eval_count || 0,
      completion_tokens: data.eval_count || 0,
      total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    },
  };
}

async function main() {
  const modelKey = args.model || 'groq-free';
  const spec = MODELS[modelKey];
  if (!spec) {
    console.error(`Unknown model: ${modelKey}\nAvailable: ${Object.keys(MODELS).join(', ')}`);
    process.exit(1);
  }

  const systemPrompt = args.system || 'You are a helpful assistant.';
  let userContent = args.prompt || '';

  if (args.file) {
    try {
      const fileContent = readFileSync(args.file, 'utf8');
      userContent = `File: ${args.file}\n\n${fileContent}\n\n${userContent}`;
    } catch (e) {
      console.error(`Error reading file: ${e.message}`);
      process.exit(1);
    }
  }

  if (!userContent) {
    const stdinContent = await readStdin();
    if (stdinContent) {
      userContent = stdinContent;
    } else {
      console.error('No input. Use --prompt, --file, or pipe input.');
      process.exit(1);
    }
  }

  const maxTokens = parseInt(args['max-tokens'] || '1024', 10);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  try {
    const start = Date.now();
    const data = spec.provider === 'groq'
      ? await callGroq(spec.model, messages, maxTokens)
      : await callOllama(spec.model, messages, maxTokens);
    const latency = Date.now() - start;

    const content = data.choices?.[0]?.message?.content || '';

    if (args.json) {
      console.log(JSON.stringify({ model: data.model, content, usage: data.usage, latency_ms: latency }, null, 2));
    } else {
      console.log(content);
    }

    if (args.verbose) {
      console.error(`\n[${spec.provider}/${data.model}] ${data.usage?.total_tokens || '?'} tokens, ${latency}ms`);
    }
  } catch (e) {
    console.error(`Request failed: ${e.message}`);
    process.exit(1);
  }
}

main();
