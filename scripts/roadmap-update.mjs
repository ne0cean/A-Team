#!/usr/bin/env node
// roadmap-update.mjs — 매주 gap-priority 기반 roadmap 우선순위 재정렬 제안
// Usage: node scripts/roadmap-update.mjs [--apply]

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { computePriorities } from './gap-priority.mjs';
import { computeScores } from './capability.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PHASE_DEPT_MAP = {
  0: ['meta-infra'],
  1: ['analytics'],
  2: ['analytics', 'marketing'],
  3: ['marketing'],
  4: ['design'],
  5: ['qa'],
  6: ['operations', 'sales-cs'],
};

export function generateProposal() {
  const gaps = computePriorities(0);
  const { deptScores, overall, launchScores } = computeScores();

  const top5 = gaps.slice(0, 5);
  const date = new Date().toISOString().slice(0, 10);

  const lines = [
    `# Roadmap Update Proposal — ${date}`,
    '',
    `종합 점수: ${overall}%`,
    '',
    '## 우선순위 재정렬 제안 (Top 5 갭 기반)',
    '',
  ];

  for (const [i, g] of top5.entries()) {
    const dept = g.path.split('.')[0];
    const suggestedPhase = Object.entries(PHASE_DEPT_MAP)
      .find(([, depts]) => depts.includes(dept))?.[0] ?? '?';
    lines.push(`${i + 1}. **${g.path}** — score ${g.score} (Phase ${suggestedPhase} 영역)`);
    if (g.gap) lines.push(`   > ${g.gap}`);
  }

  lines.push('', '## 런칭 시나리오 현황', '');
  const labels = { 'dev-tool': '개발자 도구', 'b2c-saas': 'B2C SaaS', 'b2b-enterprise': 'B2B 엔터프라이즈' };
  for (const [name, s] of Object.entries(launchScores)) {
    const icon = s.score >= 70 ? '✅' : (s.score >= 40 ? '⚠️' : '❌');
    lines.push(`- ${labels[name] || name}: ${s.score}% ${icon}`);
  }

  lines.push('', '---', `_자동 생성: ${new Date().toISOString()}_`);
  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('roadmap-update.mjs')) {
  const apply = process.argv.includes('--apply');
  const proposal = generateProposal();

  console.log(proposal);

  if (apply) {
    const outPath = resolve(ROOT, '.context', `roadmap-proposal-${new Date().toISOString().slice(0, 10)}.md`);
    writeFileSync(outPath, proposal, 'utf-8');
    console.log(`\n저장됨: ${outPath}`);
  }
}
