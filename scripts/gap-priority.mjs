#!/usr/bin/env node
// gap-priority.mjs — friction-log 기반 갭 우선순위 엔진
// score = (impact × 3) + (frequency × 2) + (feasibility × 1) - (dep_blockers × 0.5)

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadCapabilityMap() {
  return JSON.parse(readFileSync(resolve(ROOT, 'lib/capability-map.json'), 'utf-8'));
}

function loadFrictionLog() {
  const path = resolve(ROOT, '.context/friction-log.jsonl');
  try {
    return readFileSync(path, 'utf-8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l));
  } catch { return []; }
}

// impact: 해당 갭이 막는 시나리오 수 추정 (capability coverage 역수 기반)
function estimateImpact(coverage) {
  if (coverage === 0) return 5;
  if (coverage <= 0.2) return 4;
  if (coverage <= 0.4) return 3;
  if (coverage <= 0.6) return 2;
  return 1;
}

// feasibility: gap 설명에 외부 의존 키워드 포함 시 낮음
function estimateFeasibility(gap) {
  if (!gap) return 4;
  const external = /docker|api|oauth|외부|postiz|예산|결제/i;
  return external.test(gap) ? 2 : 4;
}

// dependency blockers: 현재 Phase 기반
function depBlockers(capPath, currentPhase) {
  const phaseMap = {
    'analytics.external-bi': 1,
    'analytics.anomaly-detection': 1,
    'sales-cs': 6,
    'operations.pr-cs': 6,
  };
  for (const [prefix, phase] of Object.entries(phaseMap)) {
    if (capPath.startsWith(prefix) && phase > currentPhase) return phase - currentPhase;
  }
  return 0;
}

export function computePriorities(currentPhase = 0) {
  const map = loadCapabilityMap();
  const frictions = loadFrictionLog();

  // frequency count by capability_path
  const freq = {};
  for (const f of frictions) {
    freq[f.capability_path] = (freq[f.capability_path] || 0) + 1;
  }
  const maxFreq = Math.max(1, ...Object.values(freq));

  const gaps = [];

  for (const [deptName, dept] of Object.entries(map.departments)) {
    for (const [capName, cap] of Object.entries(dept.capabilities)) {
      if (cap.coverage >= 0.8) continue; // not a gap
      const path = `${deptName}.${capName}`;
      const impact = estimateImpact(cap.coverage);
      const frequency = ((freq[path] || 0) / maxFreq) * 5;
      const feasibility = estimateFeasibility(cap.gap);
      const dep = depBlockers(path, currentPhase);
      const score = (impact * 3) + (frequency * 2) + (feasibility * 1) - (dep * 0.5);

      gaps.push({
        path,
        coverage: cap.coverage,
        gap: cap.gap || null,
        impact,
        frequency: Math.round(frequency * 10) / 10,
        feasibility,
        dep_blockers: dep,
        score: Math.round(score * 10) / 10,
      });
    }
  }

  return gaps.sort((a, b) => b.score - a.score);
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('gap-priority.mjs')) {
  const top = parseInt(process.argv[2] || '10', 10);
  const json = process.argv.includes('--json');
  const gaps = computePriorities(0);

  if (json) {
    console.log(JSON.stringify(gaps.slice(0, top), null, 2));
  } else {
    console.log(`\n🔝 Gap Priority (top ${Math.min(top, gaps.length)}):\n`);
    for (const [i, g] of gaps.slice(0, top).entries()) {
      const filled = Math.min(10, Math.max(0, Math.round(g.score / 3)));
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
      console.log(`  ${i + 1}. ${g.path.padEnd(35)} ${bar} ${g.score.toFixed(1)} (cov=${(g.coverage * 100).toFixed(0)}%)`);
      if (g.gap) console.log(`     └─ ${g.gap}`);
    }
    console.log(`\nTotal gaps: ${gaps.length}`);
  }
}
