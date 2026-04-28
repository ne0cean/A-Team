#!/usr/bin/env node
// capability.mjs — 부서별 capability 점수 + 런칭 시나리오 매핑
// Usage: node scripts/capability.mjs [--json]

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { computePriorities } from './gap-priority.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadMap() {
  return JSON.parse(readFileSync(resolve(ROOT, 'lib/capability-map.json'), 'utf-8'));
}

export function computeScores() {
  const map = loadMap();
  const deptScores = {};
  let totalWeighted = 0;
  let totalWeight = 0;

  for (const [name, dept] of Object.entries(map.departments)) {
    const caps = Object.values(dept.capabilities);
    const avg = caps.reduce((s, c) => s + c.coverage, 0) / caps.length;
    deptScores[name] = { score: Math.round(avg * 100), weight: dept.weight, count: caps.length };
    totalWeighted += avg * dept.weight;
    totalWeight += dept.weight;
  }

  const overall = Math.round((totalWeighted / totalWeight) * 100);

  // launch scenarios
  const scenarios = {
    'dev-tool': { required: ['engineering', 'qa'], nice: ['analytics'], threshold: 70 },
    'b2c-saas': { required: ['engineering', 'marketing', 'design', 'qa'], nice: ['analytics', 'operations'], threshold: 50 },
    'b2b-enterprise': { required: ['engineering', 'marketing', 'sales-cs', 'operations', 'qa'], nice: ['analytics', 'design'], threshold: 40 },
  };

  const launchScores = {};
  for (const [name, s] of Object.entries(scenarios)) {
    const reqAvg = s.required.reduce((sum, d) => sum + (deptScores[d]?.score || 0), 0) / s.required.length;
    const niceAvg = s.nice.reduce((sum, d) => sum + (deptScores[d]?.score || 0), 0) / s.nice.length;
    const score = Math.round(reqAvg * 0.8 + niceAvg * 0.2);
    launchScores[name] = { score, ready: score >= s.threshold };
  }

  return { deptScores, overall, launchScores };
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('capability.mjs')) {
  const json = process.argv.includes('--json');
  const { deptScores, overall, launchScores } = computeScores();

  if (json) {
    console.log(JSON.stringify({ deptScores, overall, launchScores }, null, 2));
    process.exit(0);
  }

  const date = new Date().toISOString().slice(0, 10);
  console.log(`\n🏢 A-Team Company Capability — ${date}\n`);

  const sorted = Object.entries(deptScores).sort((a, b) => b[1].score - a[1].score);
  for (const [name, d] of sorted) {
    const filled = Math.round(d.score / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    console.log(`  ${name.padEnd(16)} ${bar}  ${d.score}%`);
  }

  console.log(`\n  종합: ${overall}%\n`);
  console.log('🚀 런칭 가능 시나리오:');
  const labels = { 'dev-tool': '개발자 도구', 'b2c-saas': 'B2C SaaS', 'b2b-enterprise': 'B2B 엔터프라이즈' };
  for (const [name, s] of Object.entries(launchScores)) {
    const icon = s.ready ? '✅' : (s.score >= 30 ? '⚠️' : '❌');
    console.log(`  ${(labels[name] || name).padEnd(18)} ${s.score}% ${icon}`);
  }

  // top 3 gaps
  const gaps = computePriorities(0);
  console.log('\n🔝 다음 1순위 갭:');
  for (const [i, g] of gaps.slice(0, 3).entries()) {
    console.log(`  ${i + 1}. ${g.path.padEnd(35)} score=${g.score}`);
  }
  console.log('');
}
