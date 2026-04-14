/**
 * Design Smell Detector — Static AST/regex-based anti-pattern detection.
 *
 * Implements 22 deterministic rules from governance/design/anti-patterns.md.
 * Zero token cost — pure regex + heuristics. LLM critique (PL-01, PL-02, AI-07)
 * handled by design-auditor subagent separately.
 *
 * Output: { score 0-100, violations[], summary, tokens_consumed: 0 }
 */

import CONFIG from './design-config.json';

// ──────── Types ────────

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Category = 'ai_slop' | 'readability' | 'a11y' | 'layout' | 'polish';

export interface Violation {
  rule: string;
  category: Category;
  severity: Severity;
  file: string;
  line: number;
  match: string;
  fix: string;
}

export interface DetectSummary {
  ai_slop: number;
  readability: number;
  a11y: number;
  layout: number;
  polish: number;
}

export interface DetectResult {
  score: number;
  violations: Violation[];
  summary: DetectSummary;
  tokens_consumed: 0;
}

export interface DetectOptions {
  file: string;
  content: string;
  tone?: string;
  variant?: string;
}

// ──────── Helpers ────────

function lineOf(content: string, offset: number): number {
  return content.slice(0, offset).split('\n').length;
}

function findAll(content: string, pattern: RegExp): Array<{ line: number; match: string; index: number }> {
  const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
  const re = new RegExp(pattern.source, flags);
  const results: Array<{ line: number; match: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    results.push({ line: lineOf(content, m.index), match: m[0], index: m.index });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return results;
}

function isGridMultiple(value: number): boolean {
  return CONFIG.detectorConfig.gridExceptions.includes(value) || value % CONFIG.detectorConfig.gridMultiple === 0;
}

// ──────── Rules (static, deterministic) ────────

// AI-01 Purple gradient
function ruleAI01(opts: DetectOptions): Violation[] {
  const { file, content, tone } = opts;
  if (tone === 'playful') return [];
  const patterns = [
    /linear-gradient\([^)]*(?:purple|violet|#7C3AED|#8B5CF6|#A78BFA)/gi,
    /(?:from-|to-|via-)(?:purple|violet)-\d+/g,
    /bg-gradient-to-(?:br|r|bl|l|tr|tl)\b[^"'`]*(?:purple|violet|pink|fuchsia)/gi,
  ];
  const out: Violation[] = [];
  for (const p of patterns) {
    for (const hit of findAll(content, p)) {
      out.push({
        rule: 'AI-01',
        category: 'ai_slop',
        severity: 'HIGH',
        file,
        line: hit.line,
        match: hit.match,
        fix: 'Use tone palette variable: var(--ds-accent) or replace gradient with solid tone color.',
      });
    }
  }
  return out;
}

// AI-02 Generic font stack (solo usage, no pairing)
function ruleAI02(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const fonts = CONFIG.detectorConfig.genericFonts;
  const out: Violation[] = [];
  for (const font of fonts) {
    const escaped = font.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const p = new RegExp(`font-family\\s*:\\s*["']?${escaped}["']?`, 'gi');
    for (const hit of findAll(content, p)) {
      out.push({
        rule: 'AI-02',
        category: 'ai_slop',
        severity: 'MEDIUM',
        file,
        line: hit.line,
        match: hit.match,
        fix: `Pair distinctive display font + refined body font per tone. Avoid ${font} solo usage.`,
      });
    }
  }
  return out;
}

// AI-03 AI Triad (grid-cols-3 + rounded-2xl + shadow-lg co-occurrence)
function ruleAI03(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const hasGrid3 = /\b(?:grid-cols-3|grid-template-columns:\s*repeat\(3,)/gi.test(content);
  const hasRoundedLg = /\b(?:rounded-2xl|rounded-3xl|border-radius:\s*(?:16|20|24)px)/gi.test(content);
  const hasShadowLg = /\b(?:shadow-lg|shadow-xl|shadow-2xl)/gi.test(content);
  if (hasGrid3 && hasRoundedLg && hasShadowLg) {
    const m = content.match(/\b(?:grid-cols-3|rounded-2xl|shadow-lg)/i);
    return [{
      rule: 'AI-03',
      category: 'ai_slop',
      severity: 'HIGH',
      file,
      line: m ? lineOf(content, content.indexOf(m[0])) : 1,
      match: 'grid-cols-3 + rounded-2xl + shadow-lg (AI triad)',
      fix: 'Break the triad — change grid layout, radius, or shadow to match tone (not generic Tailwind defaults).',
    }];
  }
  return [];
}

// AI-04 Bounce easing
function ruleAI04(opts: DetectOptions): Violation[] {
  const { file, content, tone } = opts;
  if (tone === 'playful') return [];
  const p = /cubic-bezier\(\s*[-\d.]+\s*,\s*-[\d.]+\s*,\s*[-\d.]+\s*,\s*1\.[\d]+\s*\)/g;
  return findAll(content, p).map(hit => ({
    rule: 'AI-04',
    category: 'ai_slop',
    severity: 'MEDIUM',
    file,
    line: hit.line,
    match: hit.match,
    fix: 'Use ease-out or cubic-bezier(0.4, 0, 0.2, 1) for non-playful tones.',
  }));
}

// AI-05 Default heavy shadow
function ruleAI05(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const patterns = [
    /shadow-2xl(?![-\w])/g,
    /box-shadow:\s*0\s+25px\s+50px\s+-12px\s+rgba?\(0,\s*0,\s*0,\s*0\.25\)/g,
  ];
  const out: Violation[] = [];
  for (const p of patterns) {
    for (const hit of findAll(content, p)) {
      out.push({
        rule: 'AI-05',
        category: 'ai_slop',
        severity: 'LOW',
        file,
        line: hit.line,
        match: hit.match,
        fix: 'Use tone-appropriate shadow (brutalist: hard 2-4px solid / luxury: subtle or none).',
      });
    }
  }
  return out;
}

// AI-06 Universal transition
function ruleAI06(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const patterns = [
    /transition:\s*all\s+[\d.]+s/gi,
    /\btransition-all(?![-\w])/g,
  ];
  const out: Violation[] = [];
  for (const p of patterns) {
    for (const hit of findAll(content, p)) {
      out.push({
        rule: 'AI-06',
        category: 'ai_slop',
        severity: 'LOW',
        file,
        line: hit.line,
        match: hit.match,
        fix: 'Specify explicit properties (e.g. transition: transform 200ms ease-out).',
      });
    }
  }
  return out;
}

// AI-08 Generic marketing copy
function ruleAI08(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const patterns = CONFIG.detectorConfig.genericCopyPatterns;
  const out: Violation[] = [];
  for (const pat of patterns) {
    const escaped = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const p = new RegExp(escaped, 'gi');
    for (const hit of findAll(content, p)) {
      out.push({
        rule: 'AI-08',
        category: 'ai_slop',
        severity: 'LOW',
        file,
        line: hit.line,
        match: hit.match,
        fix: 'Replace with domain-specific content (avoid buzzwords / lorem ipsum).',
      });
    }
  }
  return out;
}

// RD-02 Cramped line-height
function ruleRD02(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const p = /line-height\s*:\s*(\d+(?:\.\d+)?)(?!\s*(?:px|em|rem|%))/gi;
  const out: Violation[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(p.source, 'gi');
  while ((m = re.exec(content)) !== null) {
    const v = parseFloat(m[1]);
    if (v > 0 && v < CONFIG.detectorConfig.minLineHeight) {
      out.push({
        rule: 'RD-02',
        category: 'readability',
        severity: 'MEDIUM',
        file,
        line: lineOf(content, m.index),
        match: m[0],
        fix: 'Body text line-height ≥ 1.5, headings 1.1-1.25.',
      });
    }
  }
  return out;
}

// RD-04 Tiny body text
function ruleRD04(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const p = /font-size\s*:\s*(\d+)px/gi;
  const out: Violation[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(p.source, 'gi');
  while ((m = re.exec(content)) !== null) {
    const v = parseInt(m[1], 10);
    if (v > 0 && v < CONFIG.detectorConfig.minBodyFontSize) {
      out.push({
        rule: 'RD-04',
        category: 'readability',
        severity: 'LOW',
        file,
        line: lineOf(content, m.index),
        match: m[0],
        fix: `Body text ≥ ${CONFIG.detectorConfig.minBodyFontSize}px (12px allowed only for meta/caption).`,
      });
    }
  }
  return out;
}

// RD-06 Justified text
function ruleRD06(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const patterns = [
    /text-align\s*:\s*justify/gi,
    /\btext-justify(?![-\w])/g,
  ];
  const out: Violation[] = [];
  for (const p of patterns) {
    for (const hit of findAll(content, p)) {
      out.push({
        rule: 'RD-06',
        category: 'readability',
        severity: 'LOW',
        file,
        line: hit.line,
        match: hit.match,
        fix: 'Use left alignment — justify creates uneven spacing hurting readability.',
      });
    }
  }
  return out;
}

// A11Y-01 Missing alt on <img>
function ruleA11y01(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  // <img ... > without alt=  (heuristic — ignores aria-hidden)
  const p = /<img\b(?![^>]*\balt\s*=)(?![^>]*\baria-hidden\s*=\s*["']?true)[^>]*>/gi;
  return findAll(content, p).map(hit => ({
    rule: 'A11Y-01',
    category: 'a11y',
    severity: 'HIGH',
    file,
    line: hit.line,
    match: hit.match.slice(0, 80),
    fix: 'Add alt="" (decorative) or descriptive alt text.',
  }));
}

// A11Y-02 Icon-only button (heuristic)
function ruleA11y02(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  // <button> ... <svg/> ... </button> 혹은 <IconComponent/> 단독, text 없음
  const p = /<button\b(?![^>]*\baria-label)[^>]*>\s*(?:<(?:svg|[A-Z][A-Za-z0-9]+Icon)\b[^>]*\/?>[^<]*<\/(?:svg|[A-Z][A-Za-z0-9]+Icon)>|<(?:svg|[A-Z][A-Za-z0-9]+Icon)\b[^>]*\/>)\s*<\/button>/gi;
  return findAll(content, p).map(hit => ({
    rule: 'A11Y-02',
    category: 'a11y',
    severity: 'HIGH',
    file,
    line: hit.line,
    match: hit.match.slice(0, 80),
    fix: 'Add aria-label or visible text to icon-only buttons.',
  }));
}

// A11Y-04 Focus outline removed without :focus-visible replacement
function ruleA11y04(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const outlineNone = /outline\s*:\s*(?:none|0)(?!\-)/gi;
  const hasFocusVisible = /:focus-visible\b|focus-visible:/g.test(content);
  if (hasFocusVisible) return [];
  return findAll(content, outlineNone).map(hit => ({
    rule: 'A11Y-04',
    category: 'a11y',
    severity: 'HIGH',
    file,
    line: hit.line,
    match: hit.match,
    fix: 'Add :focus-visible styles when removing default outline.',
  }));
}

// A11Y-03 Touch target < 44 (heuristic for explicit height)
function ruleA11y03(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const p = /(?:<(?:button|a)\b[^>]*\bstyle\s*=\s*["'][^"']*\b(?:height|min-height)\s*:\s*(\d+)px)/gi;
  const out: Violation[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(p.source, 'gi');
  while ((m = re.exec(content)) !== null) {
    const v = parseInt(m[1], 10);
    if (v > 0 && v < CONFIG.detectorConfig.minTouchTarget) {
      out.push({
        rule: 'A11Y-03',
        category: 'a11y',
        severity: 'HIGH',
        file,
        line: lineOf(content, m.index),
        match: m[0].slice(0, 80),
        fix: `Touch target min-height ≥ ${CONFIG.detectorConfig.minTouchTarget}px.`,
      });
    }
  }
  return out;
}

// LS-01 Non-grid spacing
function ruleLS01(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const p = /(?:padding|margin)(?:-(?:top|right|bottom|left))?\s*:\s*(\d+)px/gi;
  const out: Violation[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(p.source, 'gi');
  while ((m = re.exec(content)) !== null) {
    const v = parseInt(m[1], 10);
    if (v > 0 && !isGridMultiple(v)) {
      out.push({
        rule: 'LS-01',
        category: 'layout',
        severity: 'LOW',
        file,
        line: lineOf(content, m.index),
        match: m[0],
        fix: 'Use 8px grid: 4, 8, 12, 16, 24, 32, 48, 64.',
      });
    }
  }
  return out;
}

// ──────── Main detector ────────

const RULES = [
  ruleAI01, ruleAI02, ruleAI03, ruleAI04, ruleAI05, ruleAI06, ruleAI08,
  ruleRD02, ruleRD04, ruleRD06,
  ruleA11y01, ruleA11y02, ruleA11y03, ruleA11y04,
  ruleLS01,
];

export function detectDesignSmells(opts: DetectOptions): DetectResult {
  const violations: Violation[] = [];
  for (const rule of RULES) {
    try {
      violations.push(...rule(opts));
    } catch {
      // 개별 룰 실패는 전체를 막지 않음
    }
  }

  const summary: DetectSummary = {
    ai_slop: violations.filter(v => v.category === 'ai_slop').length,
    readability: violations.filter(v => v.category === 'readability').length,
    a11y: violations.filter(v => v.category === 'a11y').length,
    layout: violations.filter(v => v.category === 'layout').length,
    polish: violations.filter(v => v.category === 'polish').length,
  };

  const weights = CONFIG.detectorConfig.scoreWeights;
  let score = 100;
  score -= summary.a11y * weights.a11y;
  score -= summary.ai_slop * weights.ai_slop;
  score -= summary.readability * weights.readability;
  score -= summary.layout * weights.layout;
  score -= summary.polish * weights.polish;
  score = Math.max(0, Math.min(100, score));

  return { score, violations, summary, tokens_consumed: 0 };
}

export function hasA11yViolations(result: DetectResult): boolean {
  return result.summary.a11y > 0;
}

export function meetsThreshold(result: DetectResult, context: 'ship' | 'craft' | 'default' = 'default'): boolean {
  const min = CONFIG.detectorConfig.minScore[context] ?? CONFIG.detectorConfig.minScore.default;
  if (CONFIG.detectorConfig.a11yNonNegotiable && hasA11yViolations(result)) return false;
  return result.score >= min;
}

// ──────── Breaker config re-export (advisor-breaker 패턴 동일) ────────

export const DESIGN_AUDITOR_BREAKER_CONFIG = {
  name: CONFIG.name,
  failureThreshold: CONFIG.failureThreshold,
  windowMs: CONFIG.windowMs,
  cooldownMs: CONFIG.cooldownMs,
  halfOpenProbes: CONFIG.halfOpenProbes,
  countThreshold: CONFIG.countThreshold,
  windowCount: CONFIG.windowCount,
} as const;
