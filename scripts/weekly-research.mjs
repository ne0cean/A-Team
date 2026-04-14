#!/usr/bin/env node
/**
 * A-Team Weekly Auto-Research (Eternal Growth)
 *
 * Stage 10 — 매주 월요일 03:00 KST 자동 실행.
 * GitHub trending 분석 → Claude API로 A-Team 기준(Selection Criteria + P1-P8 + G5/G7) 평가 → 후보 리포트 생성 → 자동 PR.
 *
 * Usage (로컬): node scripts/weekly-research.mjs
 * Usage (GH Actions): .github/workflows/weekly-research.yml 에서 호출
 *
 * Required env:
 *   ANTHROPIC_API_KEY (필수)
 *   GITHUB_TOKEN (선택, rate limit 완화)
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import {
  fetchTrending,
  fetchReadme,
  filterNew,
  summarizeForPrompt,
} from './trending-fetch.mjs';

const ATEAM_ROOT = process.env.ATEAM_ROOT || process.cwd();
const WEEK_TAG = `${new Date().getUTCFullYear()}-W${String(
  Math.ceil((((new Date().getTime() - new Date(new Date().getUTCFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)
).padStart(2, '0')}`;
const OUT_DIR = join(ATEAM_ROOT, 'docs', 'research', WEEK_TAG);

// ─── Phase 0: Setup ──────────────────────────────────────────────────────
function bootstrap() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[weekly-research] Week: ${WEEK_TAG}, Output: ${OUT_DIR}`);
}

// ─── Phase 1: Fetch trending ─────────────────────────────────────────────
async function phase1_fetch() {
  console.log('[Phase 1] Fetching GitHub trending...');
  const repos = await fetchTrending({
    topics: ['ai-agents', 'llm', 'claude-code', 'agent-framework', 'developer-tools', 'prompt-engineering'],
    perTopic: 5,
  });
  // 이전 REJECTED.md에서 거부된 repo 제외
  const rejectedPath = join(ATEAM_ROOT, 'docs/research/2026-04-optimization/final/REJECTED.md');
  let rejectedNames = [];
  if (existsSync(rejectedPath)) {
    const rej = readFileSync(rejectedPath, 'utf8');
    // simple parse: lines containing repo names (github.com/X/Y pattern)
    const matches = rej.matchAll(/github\.com\/([\w.-]+\/[\w.-]+)/g);
    rejectedNames = Array.from(matches, m => m[1]);
  }
  const newRepos = filterNew(repos, rejectedNames);
  console.log(`[Phase 1] Fetched: ${repos.length}, New (not rejected): ${newRepos.length}`);

  writeFileSync(
    join(OUT_DIR, 'trending-raw.json'),
    JSON.stringify(newRepos, null, 2)
  );
  return newRepos;
}

// ─── Phase 2: README collection (top N) ──────────────────────────────────
async function phase2_readmes(repos, topN = 5) {
  console.log(`[Phase 2] Fetching README for top ${topN}...`);
  const enriched = [];
  for (const repo of repos.slice(0, topN)) {
    const readme = await fetchReadme(repo.name);
    enriched.push({ ...repo, readme });
  }
  return enriched;
}

// ─── Phase 3: Claude API evaluation ──────────────────────────────────────
async function phase3_evaluate(enrichedRepos) {
  console.log('[Phase 3] Evaluating with Claude...');
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[Phase 3] ANTHROPIC_API_KEY missing — skipping evaluation');
    return null;
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are evaluating GitHub repos for A-Team integration.

A-Team Selection Criteria (ALL must pass):
1. Maturity (>=1k stars or 2+ production cases)
2. A-Team compat (fits lib/, .claude/agents/, governance/, hooks)
3. Context cost <=2% main context increase
4. License MIT/Apache/BSD/Anthropic
5. Verifiable (TDD or visual)
6. Strengthens P1-P8 (explicit enhancement statement)
7. Not replacement (no existing asset eviction)
8. Opt-in capable (default OFF)

Protected Assets (NEVER violate):
P1 9-subagent thin-wrapper / P2 bkit / P3 PIOP / P4 Hooks / P5 CURRENT.md / P6 Sovereignty / P7 TDD / P8 thin slash commands.

Performance Gate G5 / Version Gate G7 (실측 필수).

Output STRICT JSON:
{
  "candidates": [
    {
      "name": "org/repo",
      "verdict": "ACCEPT" | "REJECT" | "DEFER",
      "criteria_passes": [1,2,3,...],  // numbers that pass
      "criteria_fails": [{"n":4,"reason":"..."}],
      "strengthens": "P_n + how",
      "risks": "...",
      "one_line": "..."
    }
  ],
  "overall_summary": "...",
  "top_pick": "org/repo",
  "drift_alert": "..." // if conflicts with previous accepted RFCs
}`;

  const userPrompt = `Repos (with metadata + truncated README):

${JSON.stringify(summarizeForPrompt(enrichedRepos, 8), null, 2)}

READMEs:
${enrichedRepos.slice(0, 5).map(r => `--- ${r.name} ---\n${(r.readme || '(no readme)').slice(0, 3000)}`).join('\n\n')}

Evaluate each against A-Team criteria. Output the JSON.`;

  try {
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = resp.content.find(c => c.type === 'text')?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`[Phase 3] Eval done. Candidates: ${parsed.candidates?.length || 0}`);
    return { raw: text, parsed, usage: resp.usage };
  } catch (err) {
    console.error(`[Phase 3] Claude eval failed: ${err.message}`);
    return null;
  }
}

// ─── Phase 4: Report generation ──────────────────────────────────────────
function phase4_report(repos, evaluation) {
  console.log('[Phase 4] Writing reports...');

  // SUMMARY.md
  const summaryLines = [
    `# Weekly Auto-Research — ${WEEK_TAG}`,
    ``,
    `- Generated: ${new Date().toISOString()}`,
    `- Repos scanned: ${repos.length}`,
    `- Evaluated by Claude: ${evaluation ? 'YES' : 'NO (API key missing)'}`,
    ``,
    `## Top Repos (by stars)`,
    ``,
  ];
  for (const r of repos.slice(0, 10)) {
    summaryLines.push(`- **${r.name}** — ${r.stars}⭐ (${r.license}, ${r.language})`);
    summaryLines.push(`  ${r.description}`);
    summaryLines.push(`  ${r.url}`);
    summaryLines.push('');
  }

  if (evaluation?.parsed) {
    summaryLines.push(`## Claude Evaluation`);
    summaryLines.push('');
    summaryLines.push(`**Overall**: ${evaluation.parsed.overall_summary}`);
    summaryLines.push(`**Top pick**: ${evaluation.parsed.top_pick}`);
    if (evaluation.parsed.drift_alert) {
      summaryLines.push(`**⚠️ Drift alert**: ${evaluation.parsed.drift_alert}`);
    }
    summaryLines.push('');
    summaryLines.push(`### Candidates`);
    summaryLines.push('');
    summaryLines.push('| Repo | Verdict | Strengthens | One-line |');
    summaryLines.push('|------|---------|-------------|----------|');
    for (const c of evaluation.parsed.candidates || []) {
      summaryLines.push(`| ${c.name} | **${c.verdict}** | ${c.strengthens || '-'} | ${c.one_line || '-'} |`);
    }
  }

  summaryLines.push('');
  summaryLines.push(`## Next Steps`);
  summaryLines.push('');
  summaryLines.push(`- 이 PR 리뷰 후 ACCEPT 후보에 대해 별도 RFC 작성`);
  summaryLines.push(`- REJECT 후보는 REJECTED.md에 재평가 트리거와 함께 기록`);
  summaryLines.push(`- 자동 merge 금지 — Sovereignty + Earned Integration`);

  writeFileSync(join(OUT_DIR, 'SUMMARY.md'), summaryLines.join('\n'));

  if (evaluation) {
    writeFileSync(
      join(OUT_DIR, 'evaluation-raw.json'),
      JSON.stringify(evaluation, null, 2)
    );
  }
  console.log(`[Phase 4] Reports written to ${OUT_DIR}`);
}

// ─── Phase 5: Optional PR creation (CI only) ─────────────────────────────
function phase5_pr() {
  if (!process.env.GITHUB_ACTIONS) return;
  console.log('[Phase 5] Running in GH Actions — branch creation');
  try {
    execSync(`git config user.name "a-team-bot"`);
    execSync(`git config user.email "bot@ateam.local"`);
    execSync(`git checkout -b research/${WEEK_TAG} 2>&1 || git checkout research/${WEEK_TAG}`);
    execSync(`git add docs/research/${WEEK_TAG}/`);
    execSync(`git commit -m "research(${WEEK_TAG}): auto-generated weekly analysis"`);
    execSync(`git push origin research/${WEEK_TAG}`);
    console.log(`[Phase 5] Branch research/${WEEK_TAG} pushed. PR creation by workflow.`);
  } catch (err) {
    console.error(`[Phase 5] Git operations failed: ${err.message}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  bootstrap();
  const repos = await phase1_fetch();
  if (repos.length === 0) {
    console.log('[weekly-research] No new repos. Exiting.');
    return;
  }
  const enriched = await phase2_readmes(repos);
  const evaluation = await phase3_evaluate(enriched);
  phase4_report(repos, evaluation);
  phase5_pr();
  console.log('[weekly-research] Complete.');
}

main().catch(err => {
  console.error('[weekly-research] FATAL:', err);
  process.exit(1);
});
