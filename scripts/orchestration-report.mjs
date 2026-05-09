#!/usr/bin/env node
/**
 * Orchestration Report — 에이전트/모델 사용 현황 리포트
 *
 * Usage: node scripts/orchestration-report.mjs [--since ISO_DATE]
 *
 * Reads analytics.jsonl and produces:
 *   - Agent call counts (start/stop pairs)
 *   - Model distribution (opus/sonnet/haiku/groq/local)
 *   - Command usage frequency
 *   - Local model routing rate
 *   - Timeline (hourly breakdown)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = resolve(__dir, '..', '.context', 'analytics.jsonl');

// Parse --since flag
const sinceIdx = process.argv.indexOf('--since');
const since = sinceIdx >= 0 ? new Date(process.argv[sinceIdx + 1]) : new Date(Date.now() - 24 * 60 * 60 * 1000);

let lines;
try {
  lines = readFileSync(LOG_PATH, 'utf8').trim().split('\n').map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
} catch {
  console.error('analytics.jsonl not found');
  process.exit(1);
}

// Filter by time
const events = lines.filter(e => new Date(e.ts) >= since);

// 1. Agent calls
const agentStarts = events.filter(e => e.event === 'agent_start');
const agentStops = events.filter(e => e.event === 'agent_stop');
const agentCounts = {};
const modelCounts = { opus: 0, sonnet: 0, haiku: 0, groq: 0, local: 0, inherit: 0 };

for (const e of agentStarts) {
  const name = e.agent || 'unknown';
  agentCounts[name] = (agentCounts[name] || 0) + 1;
  const model = (e.model || 'inherit').toLowerCase();
  if (model.includes('opus')) modelCounts.opus++;
  else if (model.includes('sonnet')) modelCounts.sonnet++;
  else if (model.includes('haiku')) modelCounts.haiku++;
  else if (model.includes('groq')) modelCounts.groq++;
  else if (model.includes('local') || model.includes('ollama')) modelCounts.local++;
  else modelCounts.inherit++;
}

// 2. Command usage
const commandStarts = events.filter(e => e.event === 'command_start');
const cmdCounts = {};
for (const e of commandStarts) {
  const name = e.name || 'unknown';
  cmdCounts[name] = (cmdCounts[name] || 0) + 1;
}

// 3. Local model routing (llm CLI calls via Bash)
const llmCalls = events.filter(e =>
  e.event === 'agent_start' && (e.model || '').match(/groq|local|ollama/i)
).length;

// 4. Hourly timeline
const hourly = {};
for (const e of agentStarts) {
  const h = new Date(e.ts).toISOString().slice(0, 13);
  hourly[h] = (hourly[h] || 0) + 1;
}

// Output
console.log('═══════════════════════════════════════════════════');
console.log('       Orchestration Report');
console.log(`       Since: ${since.toISOString().slice(0, 16)}`);
console.log(`       Generated: ${new Date().toISOString().slice(0, 16)}`);
console.log('═══════════════════════════════════════════════════\n');

console.log('## Agent Calls');
console.log('─────────────────────────────────────────────────');
const sortedAgents = Object.entries(agentCounts).sort((a, b) => b[1] - a[1]);
if (sortedAgents.length === 0) {
  console.log('  (no agent calls recorded)');
} else {
  for (const [name, count] of sortedAgents) {
    const bar = '█'.repeat(Math.min(count, 30));
    console.log(`  ${name.padEnd(20)} ${String(count).padStart(3)} ${bar}`);
  }
}
console.log(`\n  Total: ${agentStarts.length} starts, ${agentStops.length} stops\n`);

console.log('## Model Distribution');
console.log('─────────────────────────────────────────────────');
const totalModels = Object.values(modelCounts).reduce((a, b) => a + b, 0);
for (const [model, count] of Object.entries(modelCounts)) {
  if (count === 0) continue;
  const pct = totalModels > 0 ? ((count / totalModels) * 100).toFixed(0) : 0;
  const bar = '█'.repeat(Math.ceil(count / Math.max(1, totalModels) * 30));
  console.log(`  ${model.padEnd(12)} ${String(count).padStart(3)} (${String(pct).padStart(2)}%) ${bar}`);
}
console.log(`\n  Local/Free routing: ${llmCalls} calls (${totalModels > 0 ? ((llmCalls / totalModels) * 100).toFixed(0) : 0}%)\n`);

console.log('## Command Usage');
console.log('─────────────────────────────────────────────────');
const sortedCmds = Object.entries(cmdCounts).sort((a, b) => b[1] - a[1]);
if (sortedCmds.length === 0) {
  console.log('  (no command_start events recorded)');
} else {
  for (const [name, count] of sortedCmds) {
    console.log(`  ${name.padEnd(20)} ${count}`);
  }
}

console.log('\n## Hourly Timeline');
console.log('─────────────────────────────────────────────────');
const sortedHours = Object.entries(hourly).sort();
if (sortedHours.length === 0) {
  console.log('  (no data)');
} else {
  for (const [hour, count] of sortedHours) {
    const bar = '█'.repeat(Math.min(count, 40));
    console.log(`  ${hour} ${bar} ${count}`);
  }
}

console.log('\n═══════════════════════════════════════════════════');

// Summary stats
const designAudits = events.filter(e => e.event === 'design_audit').length;
const sessions = events.filter(e => e.event === 'session_start').length;
console.log(`Sessions: ${sessions} | Design audits: ${designAudits} | Agent calls: ${agentStarts.length} | Commands: ${commandStarts.length}`);
console.log('═══════════════════════════════════════════════════');
