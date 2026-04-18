#!/usr/bin/env node
/**
 * Run design-smell-detector against pilot samples.
 * Output: pass/fail + violation breakdown for each sample.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectDesignSmells } from '../../../lib/design-smell-detector.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const samples = [
  { tone: 'linear', file: 'linear/dashboard.tsx' },
  { tone: 'stripe', file: 'stripe/checkout.tsx' },
  { tone: 'rauno', file: 'rauno/notes.html' },
];

const results = [];

for (const { tone, file } of samples) {
  const filePath = path.resolve(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  const result = detectDesignSmells({ file, content });
  results.push({ tone, file, ...result });

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`${tone.toUpperCase()} — ${file}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Score: ${result.score}/100`);
  console.log(`Summary:`, result.summary);

  if (result.violations.length === 0) {
    console.log(`✅ NO VIOLATIONS`);
  } else {
    console.log(`Violations (${result.violations.length}):`);
    for (const v of result.violations) {
      console.log(`  [${v.severity}] ${v.rule} (${v.category}) line ${v.line}`);
      console.log(`         ${v.match}`);
    }
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`PILOT SUMMARY`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
for (const r of results) {
  const verdict = r.score >= 85 ? '✅ CRAFT-READY' :
                  r.score >= 70 ? '🟡 SHIP-OK' :
                  '🔴 NEEDS_WORK';
  console.log(`${r.tone.padEnd(10)} score ${r.score}/100  ${verdict}`);
}

// Save report
const reportPath = path.resolve(__dirname, 'detector-results.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\nDetailed report: ${reportPath}`);
