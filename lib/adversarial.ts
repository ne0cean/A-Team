/**
 * Adversarial Verification — Counter-evidence based validation
 *
 * Instead of "does the required thing exist?" (positive),
 * checks "does something that shouldn't exist?" (negative).
 * Cross-checking both reduces confirmation bias in self-assessment.
 *
 * Outputs: Score, Confidence, Bias Delta.
 */

import * as fs from 'fs';
import * as path from 'path';

// --- Types ---

export type Confidence = 'high' | 'medium' | 'low';
export type CheckResult = 'PASS' | 'FAIL';
export type BiasVerdict = 'ok' | 'info' | 'warn';

export interface AdversarialCheck {
  id: string;
  description: string;
  result: CheckResult;
  confidence: Confidence;
  detail?: string;
}

export interface AdversarialResult {
  checks: AdversarialCheck[];
  passed: number;
  failed: number;
  total: number;
}

export interface BiasDelta {
  score: string;
  confident: number;
  biasDelta: number;
  verdict: BiasVerdict;
}

// --- Checks ---

function checkEntryPoint(rootDir: string): AdversarialCheck {
  const claudeMd = path.join(rootDir, 'CLAUDE.md');
  const agentsMd = path.join(rootDir, 'AGENTS.md');

  for (const file of [claudeMd, agentsMd]) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const hasBuild = /빌드|build|test|npm run/i.test(content);
      const hasStructure = /구조|structure|디렉토리|directory/i.test(content);
      if (hasBuild && hasStructure) {
        return { id: 'entry-point', description: '에이전트 진입점 존재 + 필수 섹션', result: 'PASS', confidence: 'high' };
      }
      return { id: 'entry-point', description: '진입점 존재하나 필수 섹션 불완전', result: 'PASS', confidence: 'low' };
    }
  }
  return { id: 'entry-point', description: '에이전트 진입점(CLAUDE.md/AGENTS.md) 없음', result: 'FAIL', confidence: 'high' };
}

function checkNoGarbage(rootDir: string): AdversarialCheck {
  const garbagePatterns = ['.tmp', '.bak', '~'];
  const dirsToScan = ['lib', 'scripts', '.claude', 'governance'].map(d => path.join(rootDir, d));
  const found: string[] = [];

  for (const dir of dirsToScan) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir, { recursive: true }) as string[];
      for (const f of files) {
        const name = typeof f === 'string' ? f : String(f);
        if (garbagePatterns.some(p => name.endsWith(p))) found.push(name);
        // Check empty files
        const fullPath = path.join(dir, name);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isFile() && stat.size === 0) found.push(name + ' (empty)');
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  if (found.length === 0) {
    return { id: 'no-garbage', description: '임시/빈 파일 없음', result: 'PASS', confidence: 'high' };
  }
  return { id: 'no-garbage', description: `쓰레기 파일 ${found.length}건`, result: 'FAIL', confidence: 'high', detail: found.join(', ') };
}

function checkContextFreshness(rootDir: string): AdversarialCheck {
  const currentMd = path.join(rootDir, '.context', 'CURRENT.md');
  if (!fs.existsSync(currentMd)) {
    return { id: 'context-freshness', description: 'CURRENT.md 없음', result: 'FAIL', confidence: 'medium' };
  }

  const content = fs.readFileSync(currentMd, 'utf-8');
  const dateMatch = content.match(/(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) {
    return { id: 'context-freshness', description: 'CURRENT.md에 날짜 없음', result: 'PASS', confidence: 'low' };
  }

  const lastDate = new Date(dateMatch[1]);
  const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);

  if (daysSince <= 30) {
    return { id: 'context-freshness', description: `CURRENT.md ${daysSince}일 전 갱신`, result: 'PASS', confidence: 'high' };
  }
  return { id: 'context-freshness', description: `CURRENT.md ${daysSince}일 전 — 오래됨`, result: 'FAIL', confidence: 'high' };
}

function checkBrokenRefs(rootDir: string): AdversarialCheck {
  const agentDir = path.join(rootDir, '.claude', 'agents');
  if (!fs.existsSync(agentDir)) {
    return { id: 'no-broken-refs', description: 'agents/ 디렉토리 없음', result: 'PASS', confidence: 'low' };
  }

  const broken: string[] = [];
  const files = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(agentDir, file), 'utf-8');
    const refs = content.match(/`([^`]*\.(?:md|ts|sh|mjs))`/g) || [];
    for (const ref of refs) {
      const cleanRef = ref.replace(/`/g, '');
      if (cleanRef.startsWith('http') || cleanRef.includes('{')) continue;
      const fullPath = path.join(rootDir, cleanRef);
      if (!fs.existsSync(fullPath)) {
        broken.push(`${file} → ${cleanRef}`);
      }
    }
  }

  if (broken.length === 0) {
    return { id: 'no-broken-refs', description: '깨진 참조 없음', result: 'PASS', confidence: 'medium' };
  }
  return { id: 'no-broken-refs', description: `깨진 참조 ${broken.length}건`, result: 'FAIL', confidence: 'high', detail: broken.join('; ') };
}

function checkDuplication(rootDir: string): AdversarialCheck {
  const agentDir = path.join(rootDir, '.claude', 'agents');
  const rulesDir = path.join(rootDir, 'governance', 'rules');
  if (!fs.existsSync(agentDir) || !fs.existsSync(rulesDir)) {
    return { id: 'no-duplication', description: '비교 대상 없음', result: 'PASS', confidence: 'low' };
  }

  // Check if agent files contain long passages duplicated from governance
  let dupes = 0;
  const ruleContents = fs.readdirSync(rulesDir)
    .filter(f => f.endsWith('.md'))
    .map(f => fs.readFileSync(path.join(rulesDir, f), 'utf-8'));

  const agentFiles = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));
  for (const af of agentFiles) {
    const agentContent = fs.readFileSync(path.join(agentDir, af), 'utf-8');
    const agentLines = agentContent.split('\n').filter(l => l.length > 40 && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('-'));
    for (const line of agentLines) {
      if (ruleContents.some(rc => rc.includes(line))) dupes++;
    }
  }

  if (dupes <= 3) {
    return { id: 'no-duplication', description: `에이전트-규칙 간 중복 최소 (${dupes}건)`, result: 'PASS', confidence: 'medium' };
  }
  return { id: 'no-duplication', description: `중복 ${dupes}건 — 토큰 낭비`, result: 'FAIL', confidence: 'medium', detail: `${dupes} duplicated lines` };
}

// --- Main ---

export function runAdversarialChecks(rootDir: string): AdversarialResult {
  const checks = [
    checkEntryPoint(rootDir),
    checkNoGarbage(rootDir),
    checkContextFreshness(rootDir),
    checkBrokenRefs(rootDir),
    checkDuplication(rootDir),
  ];

  const passed = checks.filter(c => c.result === 'PASS').length;
  const failed = checks.filter(c => c.result === 'FAIL').length;

  return { checks, passed, failed, total: checks.length };
}

// --- Bias Delta ---

export function calculateBiasDelta(checks: AdversarialCheck[]): BiasDelta {
  const total = checks.length;
  const passed = checks.filter(c => c.result === 'PASS').length;
  const failed = total - passed;
  const lowConfidencePasses = checks.filter(c => c.result === 'PASS' && c.confidence === 'low').length;
  const confident = total - lowConfidencePasses;
  const biasDelta = passed - (passed - lowConfidencePasses);

  let verdict: BiasVerdict = 'ok';
  if (biasDelta >= 5) verdict = 'warn';
  else if (biasDelta >= 3) verdict = 'info';

  return {
    score: `${passed}/${total}`,
    confident,
    biasDelta,
    verdict,
  };
}
