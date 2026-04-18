/**
 * Design Smell Detector — Static AST/regex-based anti-pattern detection.
 *
 * Implements 15 of 24 deterministic rules from governance/design/anti-patterns.md.
 * Remaining 9 rules (RD-01/03/05, A11Y-05, LS-02/03, AI-07 signal) + LLM critique
 * (PL-01, PL-02) handled by design-auditor subagent separately.
 *
 * Output: { score 0-100, violations[], summary, tokens_consumed: 0 }
 *
 * **Security**: file path is **metadata only** — detector never reads files.
 * Callers must validate file paths before passing (no traversal from user input).
 * Content size is capped at MAX_CONTENT_BYTES to prevent regex DoS on huge inputs.
 */

import CONFIG from './design-config.json';

// ──────── Security: content size guard ────────

const MAX_CONTENT_BYTES = 2 * 1024 * 1024; // 2MB — sane cap for single-file UI content

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
// Skips violation if the file pairs the generic with a distinctive font (mono/serif/display).
function ruleAI02(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const fonts = CONFIG.detectorConfig.genericFonts;
  const pairingPattern = /font-family\s*:\s*[^;{}]*?(?:monospace|serif|IBM\s+Plex|JetBrains\s+Mono|SF\s+Mono|Plex\s+Mono|Fira\s+Code|Iosevka|PT\s+Serif|Source\s+Serif|Recoleta|Cormorant|Playfair|Geist\s+Mono|Menlo|Consolas|Courier)/i;
  const hasPairing = pairingPattern.test(content);
  const out: Violation[] = [];
  if (hasPairing) return out;
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
// Tone-aware: editorial-technical/brutalist/bold-typographic legitimately use 11-13px captions.
// Class-aware: when font-size lives inside a caption/meta/label/footer-meta selector, allow ≥10px.
const RD04_CAPTION_TONES = new Set(['editorial-technical', 'brutalist', 'bold-typographic', 'minimal']);
const RD04_CAPTION_CLASS = /\.(?:caption|meta|label|footer[-_]?meta|pretitle|pre[-_]?title|tag|hint|small|micro|footnote|tooltip|layer[-_]?tag|chip|badge|crumb|byline|copyright|kbd|code\b)/i;
const RD04_CAPTION_MIN = 10; // hard floor — anything below 10px is always flagged

function ruleRD04(opts: DetectOptions): Violation[] {
  const { file, content, tone } = opts;
  const isCaptionTone = tone ? RD04_CAPTION_TONES.has(tone) : false;
  const minBody = CONFIG.detectorConfig.minBodyFontSize;
  const p = /font-size\s*:\s*(\d+)px/gi;
  const out: Violation[] = [];
  let m: RegExpExecArray | null;
  while ((m = p.exec(content)) !== null) {
    const v = parseInt(m[1], 10);
    if (v <= 0 || v >= minBody) continue;
    // Walk back to nearest closing brace (or BOF) to grab the current selector context
    const before = content.slice(0, m.index);
    const lastBrace = before.lastIndexOf('}');
    const selectorContext = before.slice(lastBrace + 1);
    const isInCaptionClass = RD04_CAPTION_CLASS.test(selectorContext);
    if (v >= RD04_CAPTION_MIN && (isInCaptionClass || isCaptionTone)) continue;
    out.push({
      rule: 'RD-04',
      category: 'readability',
      severity: 'LOW',
      file,
      line: lineOf(content, m.index),
      match: m[0],
      fix: `Body text ≥ ${minBody}px (caption classes may use ≥${RD04_CAPTION_MIN}px; editorial tones relaxed).`,
    });
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

// RD-01 Long line length (no max-width + long text heuristic)
function ruleRD01(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  // Text containers with NO max-width/max-w-* + text length > 300 chars
  const textBlockPattern = /<(p|article|section|div)\b([^>]*)>([^<]{300,})<\/\1>/gi;
  const out: Violation[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(textBlockPattern.source, 'gi');
  while ((m = re.exec(content)) !== null) {
    const attrs = m[2];
    const hasMaxWidth = /\bmax-width\s*:|max-w-(?:prose|xl|\[|\d)/i.test(attrs);
    if (!hasMaxWidth) {
      out.push({
        rule: 'RD-01',
        category: 'readability',
        severity: 'LOW',
        file,
        line: lineOf(content, m.index),
        match: `<${m[1]}> with ${m[3].length} chars, no max-width`,
        fix: 'Add max-width: 65ch or Tailwind max-w-prose.',
      });
    }
  }
  return out;
}

// RD-05 Heading hierarchy skip
function ruleRD05(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const headingPattern = /<h([1-6])\b/gi;
  const out: Violation[] = [];
  let prevLevel = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(headingPattern.source, 'gi');
  while ((m = re.exec(content)) !== null) {
    const level = parseInt(m[1], 10);
    if (prevLevel > 0 && level > prevLevel + 1) {
      out.push({
        rule: 'RD-05',
        category: 'readability',
        severity: 'MEDIUM',
        file,
        line: lineOf(content, m.index),
        match: `h${prevLevel} → h${level} (skip)`,
        fix: `Use sequential headings: h${prevLevel} → h${prevLevel + 1}`,
      });
    }
    prevLevel = level;
  }
  return out;
}

// A11Y-05 Form field without label (a11y, non-negotiable)
function ruleA11y05(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  // Find all <input>/<select>/<textarea>
  const fieldPattern = /<(input|select|textarea)\b([^>]*?)(?:\/\s*)?>/gi;
  // Find <label for="..."> (HTML) or <label htmlFor="..."> (JSX) → set of covered IDs
  const labelForPattern = /<label\b[^>]*\b(?:for|htmlFor)\s*=\s*["']([^"']+)["']/gi;
  const coveredIds = new Set<string>();
  let lm: RegExpExecArray | null;
  while ((lm = labelForPattern.exec(content)) !== null) {
    coveredIds.add(lm[1]);
  }

  const out: Violation[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(fieldPattern.source, 'gi');
  while ((m = re.exec(content)) !== null) {
    const attrs = m[2];
    // Skip hidden inputs
    if (/\btype\s*=\s*["']hidden["']/i.test(attrs)) continue;
    // Check aria-label or aria-labelledby
    if (/\baria-label(?:ledby)?\s*=\s*["'][^"']+["']/i.test(attrs)) continue;
    // Check id matches a <label for>
    const idMatch = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
    if (idMatch && coveredIds.has(idMatch[1])) continue;
    // Check if wrapped in <label>: look 200 chars before for <label> without >
    const before = content.slice(Math.max(0, m.index - 200), m.index);
    if (/<label\b[^>]*>\s*[^<]*$/i.test(before)) continue;
    // Violation
    out.push({
      rule: 'A11Y-05',
      category: 'a11y',
      severity: 'HIGH',
      file,
      line: lineOf(content, m.index),
      match: m[0].slice(0, 80),
      fix: 'Add <label for>, wrap in <label>, or add aria-label.',
    });
  }
  return out;
}

// LS-02 Absolute positioning overuse (3+ in same file, no flex/grid)
function ruleLS02(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const absoluteMatches = content.match(/position\s*:\s*absolute|\babsolute\b(?!-)/gi) || [];
  if (absoluteMatches.length < 3) return [];
  const hasFlexOrGrid = /display\s*:\s*(?:flex|grid|inline-flex|inline-grid)|\b(?:flex|grid|inline-flex|inline-grid)\b/i.test(content);
  if (hasFlexOrGrid) return [];
  // Find first occurrence for line number
  const firstMatch = content.match(/position\s*:\s*absolute|\babsolute\b(?!-)/i);
  const idx = firstMatch ? content.indexOf(firstMatch[0]) : 0;
  return [{
    rule: 'LS-02',
    category: 'layout',
    severity: 'LOW',
    file,
    line: lineOf(content, idx),
    match: `${absoluteMatches.length}x absolute positioning, no flex/grid`,
    fix: 'Use flex/grid layout. Reserve absolute for overlays/badges only.',
  }];
}

// LS-03 Fixed height on text containers
function ruleLS03(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  // Text tags (p, h1-h6, span) with inline style height: Npx (not min-height)
  const pattern = /<(p|h[1-6]|span)\b[^>]*\bstyle\s*=\s*["'][^"']*(?<!min-)\bheight\s*:\s*\d+px/gi;
  return findAll(content, pattern).map(hit => ({
    rule: 'LS-03',
    category: 'layout',
    severity: 'LOW',
    file,
    line: hit.line,
    match: hit.match.slice(0, 80),
    fix: 'Use min-height or natural flow for text containers.',
  }));
}

// AI-07 Hero-Features-CTA template signal
function ruleAI07(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  // Signal: (1) <section> with h1 + button, (2) grid-cols-3 with 3+ similar items, (3) final section with CTA
  const heroPattern = /<section\b[^>]*>[\s\S]{0,500}?<h1\b[\s\S]{0,500}?<(?:button|a\b[^>]*class\s*=\s*["'][^"']*btn)/i;
  const featuresPattern = /grid-cols-3\b|grid-template-columns:\s*repeat\(3,/i;
  const ctaSectionPattern = /<section\b[^>]*>[\s\S]{0,1000}?<(?:button|a\b[^>]*class\s*=\s*["'][^"']*(?:btn|cta))[\s\S]{0,500}?<\/section>/i;

  const hasHero = heroPattern.test(content);
  const hasFeatures = featuresPattern.test(content);
  const ctaMatches = content.match(/<section\b/gi) || [];
  const hasMultipleSections = ctaMatches.length >= 3;
  const hasCTASection = ctaSectionPattern.test(content);

  if (hasHero && hasFeatures && hasMultipleSections && hasCTASection) {
    const idx = content.search(heroPattern);
    return [{
      rule: 'AI-07',
      category: 'polish',
      severity: 'MEDIUM',
      file,
      line: lineOf(content, idx >= 0 ? idx : 0),
      match: 'Hero-Features-CTA template signal detected',
      fix: 'Break the template — add asymmetry, unique sections, or non-standard layout. Requires LLM critique for final judgment.',
    }];
  }
  return [];
}

// ──────── RD-03: Low Contrast (WCAG AA) ────────
// Color + background-color 쌍을 같은 룰에서 찾고 contrast ratio 4.5:1 미만 플래그.
// Heuristic: CSS 블록 또는 inline style에서 color/background-color 페어 매칭.

function parseColorToRgb(input: string): [number, number, number] | null {
  const s = input.trim().toLowerCase();
  // hex #RGB or #RRGGBB
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) {
      return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
    }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  // rgb() / rgba()
  const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    return [parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3])];
  }
  // named (basic only)
  const named: Record<string, [number, number, number]> = {
    white: [255, 255, 255],
    black: [0, 0, 0],
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    silver: [192, 192, 192],
    yellow: [255, 255, 0],
  };
  return named[s] || null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const norm = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * norm(r) + 0.7152 * norm(g) + 0.0722 * norm(b);
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const lf = relativeLuminance(fg);
  const lb = relativeLuminance(bg);
  const lighter = Math.max(lf, lb);
  const darker = Math.min(lf, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function ruleRD03(opts: DetectOptions): Violation[] {
  const { file, content } = opts;
  const violations: Violation[] = [];

  // CSS 블록 단위 매칭 — { ... color: X; background-color: Y; ... }
  const blockPattern = /\{[^}]+\}/g;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(content)) !== null) {
    const block = match[0];
    const colorMatch = block.match(/(?<![-\w])color\s*:\s*([^;}\s][^;}]*?)(?:[;}]|$)/);
    const bgMatch = block.match(/background(?:-color)?\s*:\s*([^;}\s][^;}]*?)(?:[;}]|$)/);

    if (!colorMatch || !bgMatch) continue;

    const fg = parseColorToRgb(colorMatch[1]);
    const bg = parseColorToRgb(bgMatch[1]);

    if (!fg || !bg) continue;

    const ratio = contrastRatio(fg, bg);
    if (ratio < 4.5) {
      violations.push({
        rule: 'RD-03',
        category: 'readability',
        severity: ratio < 3 ? 'HIGH' : 'MEDIUM',
        file,
        line: lineOf(content, match.index),
        match: `WCAG contrast ${ratio.toFixed(2)}:1 (color: ${colorMatch[1].trim()}, bg: ${bgMatch[1].trim()})`,
        fix: `WCAG AA requires ≥4.5:1 for normal text, ≥3:1 for large text (18pt+/14pt bold). Adjust color or background.`,
      });
    }
  }

  return violations;
}

// ──────── Main detector ────────

const RULES = [
  ruleAI01, ruleAI02, ruleAI03, ruleAI04, ruleAI05, ruleAI06, ruleAI08,
  ruleAI07,
  ruleRD01, ruleRD02, ruleRD03, ruleRD04, ruleRD05, ruleRD06,
  ruleA11y01, ruleA11y02, ruleA11y03, ruleA11y04, ruleA11y05,
  ruleLS01, ruleLS02, ruleLS03,
];

export function detectDesignSmells(opts: DetectOptions): DetectResult {
  // Security: oversize content → 조기 차단 (regex DoS 방지)
  if (typeof opts.content !== 'string' || opts.content.length > MAX_CONTENT_BYTES) {
    return {
      score: 100,
      violations: [],
      summary: { ai_slop: 0, readability: 0, a11y: 0, layout: 0, polish: 0 },
      tokens_consumed: 0,
    };
  }

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
