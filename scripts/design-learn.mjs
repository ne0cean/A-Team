#!/usr/bin/env node
/**
 * Design Learn — 디자인 점수 패턴 분석 + 토큰 조정 제안
 *
 * design-scores.jsonl을 집계하여:
 *   - 반복 저점 패턴 감지 → 구체적 토큰/엔진 조정 제안
 *   - 같은 피드백 3회+ → 자동 룰 추가 제안
 *   - 고점 패턴 → "검증된 패턴" 승격
 *
 * Usage:
 *   node scripts/design-learn.mjs                  # 전체 분석
 *   node scripts/design-learn.mjs --weekly          # 주간 트렌드
 *   node scripts/design-learn.mjs --suggestions     # 조정 제안만
 *   node scripts/design-learn.mjs --json            # JSON 출력
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const flagWeekly = args.includes('--weekly');
const flagSuggestions = args.includes('--suggestions');
const flagJson = args.includes('--json');

const SCORE_FILE = join(process.cwd(), '.context', 'design-scores.jsonl');

if (!existsSync(SCORE_FILE)) {
  console.log('  No design scores yet. Run /design-score after building UI/PPT.');
  process.exit(0);
}

const lines = readFileSync(SCORE_FILE, 'utf8').trim().split('\n').filter(Boolean);
const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const scored = entries.filter(e => e.scores && e.scores.overall !== null);

if (scored.length === 0) {
  console.log('  No scored entries yet. Complete /design-score evaluations first.');
  process.exit(0);
}

// ── Analysis ──

// 1. Overall trend
const avgLayout = avg(scored.map(e => e.scores.layout).filter(Boolean));
const avgTypo = avg(scored.map(e => e.scores.typography).filter(Boolean));
const avgOverall = avg(scored.map(e => e.scores.overall).filter(Boolean));

// 2. Low-score patterns (≤3)
const lowScores = scored.filter(e => e.scores.overall <= 3);
const lowFeedback = lowScores.map(e => e.feedback).filter(Boolean);

// 3. Feedback frequency
const feedbackCounts = {};
for (const fb of lowFeedback) {
  const normalized = fb.toLowerCase().trim();
  const key = normalized.slice(0, 50);
  feedbackCounts[key] = (feedbackCounts[key] || 0) + 1;
}
const repeatedFeedback = Object.entries(feedbackCounts)
  .filter(([_, count]) => count >= 2)
  .sort((a, b) => b[1] - a[1]);

// 4. High-score patterns (5)
const highScores = scored.filter(e => e.scores.overall >= 5);
const verifiedPatterns = highScores.map(e => ({
  project: e.project,
  component: e.component,
  token_preset: e.token_preset,
  qa_score: e.qa_score,
}));

// 5. Suggestions
const suggestions = [];

if (avgLayout < 3) {
  suggestions.push({
    area: 'layout',
    severity: 'high',
    suggestion: '여백/정렬 체계 재검토. spacing 스케일 확대 또는 그리드 시스템 도입 권장',
    avg_score: avgLayout,
  });
}
if (avgTypo < 3) {
  suggestions.push({
    area: 'typography',
    severity: 'high',
    suggestion: '폰트 위계 부족. title/subtitle/body/caption 4단계 명확히 분리',
    avg_score: avgTypo,
  });
}
if (avgOverall < 3) {
  suggestions.push({
    area: 'overall',
    severity: 'high',
    suggestion: '전체 품질 기준 미달. 레퍼런스 비교 후 근본 원인 파악 필요',
    avg_score: avgOverall,
  });
}

for (const [feedback, count] of repeatedFeedback) {
  suggestions.push({
    area: 'repeated_feedback',
    severity: count >= 3 ? 'high' : 'medium',
    suggestion: `"${feedback}" — ${count}회 반복. 자동 룰 추가 권장`,
    count,
  });
}

// QA score correlation
const qaScores = scored.filter(e => e.qa_score !== null);
if (qaScores.length >= 3) {
  const highQaLowHuman = qaScores.filter(e => e.qa_score >= 90 && e.scores.overall <= 3);
  if (highQaLowHuman.length >= 2) {
    suggestions.push({
      area: 'qa_gap',
      severity: 'medium',
      suggestion: 'QA 통과(90+)해도 인간 평가 낮음(≤3) — QA 룰 확장 필요 (시각적 품질 감지 부족)',
      count: highQaLowHuman.length,
    });
  }
}

// ── Output ──
const result = {
  total_entries: scored.length,
  averages: { layout: avgLayout, typography: avgTypo, overall: avgOverall },
  low_count: lowScores.length,
  high_count: highScores.length,
  repeated_feedback: repeatedFeedback,
  verified_patterns: verifiedPatterns,
  suggestions,
};

if (flagJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('\n  Design Learning Report');
  console.log('  ' + '─'.repeat(45));
  console.log(`  Entries:  ${scored.length} scored`);
  console.log(`  Averages: Layout ${avgLayout}/5  Typo ${avgTypo}/5  Overall ${avgOverall}/5`);
  console.log(`  Low (≤3): ${lowScores.length}  High (5): ${highScores.length}`);

  if (repeatedFeedback.length > 0) {
    console.log('\n  Repeated Feedback:');
    for (const [fb, count] of repeatedFeedback.slice(0, 5)) {
      console.log(`    ${count}x — "${fb}"`);
    }
  }

  if (suggestions.length > 0) {
    console.log('\n  Suggestions:');
    for (const s of suggestions) {
      const sev = s.severity === 'high' ? '!!' : ' *';
      console.log(`  ${sev} [${s.area}] ${s.suggestion}`);
    }
  }

  if (verifiedPatterns.length > 0) {
    console.log('\n  Verified Patterns (score 5):');
    for (const p of verifiedPatterns) {
      console.log(`    ${p.project}/${p.component} — preset: ${p.token_preset || 'N/A'}`);
    }
  }
  console.log('');
}

function avg(arr) {
  if (arr.length === 0) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}
