#!/usr/bin/env node
/**
 * Multi-Model Monitor (Direct Mode — Groq + Ollama)
 *
 * Usage:
 *   node monitor.mjs              # Status + usage summary
 *   node monitor.mjs --test       # Health check all endpoints
 *   node monitor.mjs --budget     # Show budget/rate limit status
 *   node monitor.mjs --watch      # Live refresh (10s)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ANALYTICS_PATH = resolve(__dir, '..', '..', '.context', 'analytics.jsonl');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const MODELS = {
  'groq-free':    { provider: 'groq',   api: 'llama-3.3-70b-versatile',  cost: 'free' },
  'groq-fast':    { provider: 'groq',   api: 'llama-3.1-8b-instant',     cost: 'free' },
  'local-fast':   { provider: 'ollama', api: 'llama3.2:1b',              cost: 'free' },
  'local-strong': { provider: 'ollama', api: 'qwen2.5-coder:32b',       cost: 'free' },
};

// Groq free tier limits (per minute / per day)
const GROQ_LIMITS = {
  'llama-3.3-70b-versatile': { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
  'llama-3.1-8b-instant':    { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
};

// ── Health checks ─────────────────────────────────────────

async function checkGroq() {
  if (!GROQ_API_KEY) return { status: 'NO_KEY', detail: 'GROQ_API_KEY not set' };
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const count = data.data?.length || 0;
      return { status: 'OK', detail: `${count} models available` };
    }
    if (res.status === 429) return { status: 'RATE_LIMITED', detail: 'Rate limit hit' };
    return { status: 'ERROR', detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: 'OFFLINE', detail: e.message.slice(0, 60) };
  }
}

async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { status: 'ERROR', detail: `HTTP ${res.status}` };
    const data = await res.json();
    const models = data.models?.map(m => m.name) || [];
    return { status: 'OK', detail: models.join(', ') || 'no models' };
  } catch {
    return { status: 'OFFLINE', detail: `${OLLAMA_URL} unreachable` };
  }
}

async function testModel(name, spec) {
  const start = Date.now();
  try {
    if (spec.provider === 'groq') {
      if (!GROQ_API_KEY) return { ok: false, ms: 0, error: 'no API key' };
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: spec.api,
          messages: [{ role: 'user', content: 'Say "ok"' }],
          max_tokens: 3,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const ms = Date.now() - start;
      if (!res.ok) return { ok: false, ms, error: `HTTP ${res.status}` };
      const data = await res.json();
      const tokens = data.usage?.total_tokens || 0;
      return { ok: true, ms, tokens };
    } else {
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: spec.api,
          messages: [{ role: 'user', content: 'Say "ok"' }],
          stream: false,
          options: { num_predict: 3 },
        }),
        signal: AbortSignal.timeout(60000),
      });
      const ms = Date.now() - start;
      if (!res.ok) return { ok: false, ms, error: `HTTP ${res.status}` };
      return { ok: true, ms, tokens: 0 };
    }
  } catch (e) {
    return { ok: false, ms: Date.now() - start, error: e.message.slice(0, 40) };
  }
}

// ── Analytics ─────────────────────────────────────────────

function loadAnalytics(sinceDaysAgo = 1) {
  try {
    const since = new Date(Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000);
    const lines = readFileSync(ANALYTICS_PATH, 'utf8').trim().split('\n');
    return lines
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(e => e && new Date(e.ts) >= since);
  } catch {
    return [];
  }
}

function getUsageStats(events) {
  const modelCalls = {};
  const hourly = {};

  for (const e of events) {
    if (e.event === 'agent_start') {
      const model = (e.model || 'inherit').toLowerCase();
      let bucket = 'anthropic';
      if (model.includes('groq')) bucket = 'groq';
      else if (model.includes('local') || model.includes('ollama')) bucket = 'ollama';
      else if (model.includes('haiku')) bucket = 'haiku';
      else if (model.includes('sonnet')) bucket = 'sonnet';
      else if (model.includes('opus')) bucket = 'opus';
      modelCalls[bucket] = (modelCalls[bucket] || 0) + 1;

      const h = new Date(e.ts).toISOString().slice(11, 13);
      hourly[h] = (hourly[h] || 0) + 1;
    }
  }

  return { modelCalls, hourly, total: Object.values(modelCalls).reduce((a, b) => a + b, 0) };
}

function getBudgetStatus(events) {
  const now = new Date();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

  let groqLastHour = 0;
  let groqLastDay = 0;
  let ollamaLastDay = 0;

  for (const e of events) {
    if (e.event !== 'agent_start') continue;
    const model = (e.model || '').toLowerCase();
    const ts = new Date(e.ts);

    if (model.includes('groq')) {
      if (ts >= oneDayAgo) groqLastDay++;
      if (ts >= oneHourAgo) groqLastHour++;
    }
    if (model.includes('local') || model.includes('ollama')) {
      if (ts >= oneDayAgo) ollamaLastDay++;
    }
  }

  const limits = GROQ_LIMITS['llama-3.3-70b-versatile'];
  return {
    groq: {
      lastHour: groqLastHour,
      lastDay: groqLastDay,
      hourLimit: limits.rpm * 60,
      dayLimit: limits.rpd,
      hourPct: ((groqLastHour / (limits.rpm * 60)) * 100).toFixed(1),
      dayPct: ((groqLastDay / limits.rpd) * 100).toFixed(1),
    },
    ollama: { lastDay: ollamaLastDay },
  };
}

// ── Display ───────────────────────────────────────────────

const STATUS_ICON = { OK: '\u2705', RATE_LIMITED: '\u26A0\uFE0F ', ERROR: '\u274C', OFFLINE: '\u274C', NO_KEY: '\u26D4' };

async function display(opts) {
  console.log('\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('       Multi-Model Monitor (Direct Mode)');
  console.log(`       ${new Date().toISOString().slice(0, 19)}`);
  console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n');

  // Services
  const [groq, ollama] = await Promise.all([checkGroq(), checkOllama()]);
  console.log('## Services');
  console.log(`  Groq API  : ${STATUS_ICON[groq.status] || '?'} ${groq.detail}`);
  console.log(`  Ollama    : ${STATUS_ICON[ollama.status] || '?'} ${ollama.detail}`);
  console.log(`  MCP Server: llm (mcp-local-model.mjs)`);
  console.log('');

  // Models
  console.log('## Models');
  console.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  for (const [name, spec] of Object.entries(MODELS)) {
    const provider = spec.provider === 'groq' ? 'cloud' : 'local';
    const available = spec.provider === 'groq'
      ? (groq.status === 'OK' ? 'ready' : groq.status.toLowerCase())
      : (ollama.status === 'OK' ? 'ready' : 'offline');
    console.log(`  ${name.padEnd(14)} ${provider.padEnd(6)} ${spec.api.padEnd(28)} ${available}`);
  }
  console.log('');

  // Test endpoints
  if (opts.test) {
    console.log('## Endpoint Tests');
    console.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
    for (const [name, spec] of Object.entries(MODELS)) {
      process.stdout.write(`  ${name.padEnd(14)} `);
      const r = await testModel(name, spec);
      if (r.ok) {
        console.log(`OK  ${String(r.ms).padStart(5)}ms${r.tokens ? `  ${r.tokens} tok` : ''}`);
      } else {
        console.log(`FAIL  ${r.error}`);
      }
    }
    console.log('');
  }

  // Usage from analytics
  const events = loadAnalytics(1);
  const stats = getUsageStats(events);

  console.log('## Usage (24h)');
  console.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  if (stats.total === 0) {
    console.log('  (no agent_start events in analytics.jsonl)');
  } else {
    for (const [model, count] of Object.entries(stats.modelCalls).sort((a, b) => b[1] - a[1])) {
      const pct = ((count / stats.total) * 100).toFixed(0);
      const bar = '\u2588'.repeat(Math.min(Math.ceil(count / stats.total * 30), 30));
      console.log(`  ${model.padEnd(12)} ${String(count).padStart(4)} (${pct.padStart(2)}%) ${bar}`);
    }
    const freeCount = (stats.modelCalls.groq || 0) + (stats.modelCalls.ollama || 0);
    const freeRate = stats.total > 0 ? ((freeCount / stats.total) * 100).toFixed(0) : 0;
    console.log(`\n  Free routing: ${freeCount}/${stats.total} calls (${freeRate}%)`);
  }
  console.log('');

  // Budget / rate limits
  if (opts.budget || opts.test) {
    const budget = getBudgetStatus(events);
    console.log('## Budget & Rate Limits');
    console.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
    console.log(`  Groq (1h) : ${budget.groq.lastHour} calls (${budget.groq.hourPct}% of ${budget.groq.hourLimit})`);
    console.log(`  Groq (24h): ${budget.groq.lastDay} calls (${budget.groq.dayPct}% of ${budget.groq.dayLimit})`);
    console.log(`  Ollama    : ${budget.ollama.lastDay} calls (unlimited)`);
    console.log(`  Cost      : $0.00 (all free tier)`);
    if (parseFloat(budget.groq.dayPct) > 80) {
      console.log('\n  WARNING: Groq daily limit approaching. Consider Ollama fallback.');
    }
    console.log('');
  }

  // Quick reference
  console.log('## Commands');
  console.log('  llm "prompt"                Groq 70B (free)');
  console.log('  llm -m groq-fast "prompt"   Groq 8B (ultra-fast)');
  console.log('  llm -m local-fast "prompt"  Ollama 1B (offline)');
  console.log('  mcp__llm__ask               MCP tool (in Claude Code)');
  console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
}

// ── Main ──────────────────────────────────────────────────

const args = new Set(process.argv.slice(2));
const opts = {
  test: args.has('--test'),
  budget: args.has('--budget'),
  watch: args.has('--watch'),
};

await display(opts);

if (opts.watch) {
  setInterval(async () => {
    process.stdout.write('\x1B[2J\x1B[H');
    await display(opts);
  }, 10000);
}
