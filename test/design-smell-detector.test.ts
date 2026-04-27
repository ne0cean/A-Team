import { describe, it, expect } from 'vitest';
import {
  detectDesignSmells,
  hasA11yViolations,
  meetsThreshold,
  DESIGN_AUDITOR_BREAKER_CONFIG,
} from '../lib/design-smell-detector.js';

describe('design-smell-detector', () => {
  describe('AI slop rules', () => {
    it('detects AI-01 purple gradient (CSS)', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: '.hero { background: linear-gradient(to right, purple, pink); }',
      });
      expect(r.violations.some(v => v.rule === 'AI-01')).toBe(true);
    });

    it('detects AI-01 purple gradient (Tailwind)', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<div className="bg-gradient-to-br from-purple-500 to-pink-500">',
      });
      expect(r.violations.some(v => v.rule === 'AI-01')).toBe(true);
    });

    it('AI-01 skipped for tone=playful', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<div className="bg-gradient-to-br from-purple-500 to-pink-500">',
        tone: 'playful',
      });
      expect(r.violations.some(v => v.rule === 'AI-01')).toBe(false);
    });

    it('detects AI-02 generic font solo', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'body { font-family: "Inter"; }',
      });
      expect(r.violations.some(v => v.rule === 'AI-02')).toBe(true);
    });

    it('AI-02 skipped when paired with monospace', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'body { font-family: "Inter", system-ui, sans-serif; } code { font-family: "IBM Plex Mono", monospace; }',
      });
      expect(r.violations.some(v => v.rule === 'AI-02')).toBe(false);
    });

    it('AI-02 skipped when paired with serif display font', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'body { font-family: "Inter"; } h1 { font-family: "Playfair Display", serif; }',
      });
      expect(r.violations.some(v => v.rule === 'AI-02')).toBe(false);
    });

    it('detects AI-03 AI triad (grid-3 + rounded-2xl + shadow-lg)', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<div className="grid grid-cols-3 gap-4"><div className="rounded-2xl shadow-lg"/></div>',
      });
      expect(r.violations.some(v => v.rule === 'AI-03')).toBe(true);
    });

    it('AI-03 does not fire on 2 of 3', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<div className="grid grid-cols-3 rounded-2xl"/>',
      });
      expect(r.violations.some(v => v.rule === 'AI-03')).toBe(false);
    });

    it('detects AI-04 bounce easing', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: '.btn { transition: transform 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55); }',
      });
      expect(r.violations.some(v => v.rule === 'AI-04')).toBe(true);
    });

    it('detects AI-05 shadow-2xl default', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<div className="shadow-2xl"/>',
      });
      expect(r.violations.some(v => v.rule === 'AI-05')).toBe(true);
    });

    it('detects AI-06 transition-all', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<button className="transition-all hover:scale-105"/>',
      });
      expect(r.violations.some(v => v.rule === 'AI-06')).toBe(true);
    });

    it('detects AI-08 generic marketing copy', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<h1>Revolutionize your workflow with our seamless experience</h1>',
      });
      expect(r.violations.filter(v => v.rule === 'AI-08').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('JSX className extraction (className 안 Tailwind 토큰 감지)', () => {
    it('detects AI-01 inside multiline JSX className with multiple gradient stops', () => {
      const content = `
        export function Card() {
          return (
            <div className="bg-gradient-to-r from-purple-500 via-violet-400 to-pink-500 rounded-2xl">
              x
            </div>
          );
        }`;
      const r = detectDesignSmells({ file: 'card.tsx', content });
      expect(r.violations.filter(v => v.rule === 'AI-01').length).toBeGreaterThanOrEqual(1);
    });

    it('detects full AI triad (AI-03) across multiline JSX className', () => {
      const content = `
        <section className="grid grid-cols-3 gap-4 rounded-2xl shadow-lg p-8">
          <div>card1</div>
        </section>`;
      const r = detectDesignSmells({ file: 'features.tsx', content });
      expect(r.violations.some(v => v.rule === 'AI-03')).toBe(true);
    });

    it('detects AI-01 inside clsx() function call args', () => {
      const content = `
        import { clsx } from 'clsx';
        const cls = clsx('px-4', 'bg-gradient-to-br from-violet-500 to-purple-600', condition && 'shadow-2xl');`;
      const r = detectDesignSmells({ file: 'btn.tsx', content });
      expect(r.violations.some(v => v.rule === 'AI-01')).toBe(true);
      expect(r.violations.some(v => v.rule === 'AI-05')).toBe(true);
    });

    it('detects AI-05 inside cn() helper (shadcn pattern)', () => {
      const content = `
        export const cn = (...args: string[]) => args.join(' ');
        export function Hero() {
          return <div className={cn('p-4', 'shadow-2xl')}>x</div>;
        }`;
      const r = detectDesignSmells({ file: 'hero.tsx', content });
      expect(r.violations.some(v => v.rule === 'AI-05')).toBe(true);
    });

    it('detects AI-06 transition-all inside JSX className', () => {
      const content = `<button className="px-4 py-2 transition-all duration-300">x</button>`;
      const r = detectDesignSmells({ file: 'btn.tsx', content });
      expect(r.violations.some(v => v.rule === 'AI-06')).toBe(true);
    });

    it('detects AI-01 inside template literal className', () => {
      const content = '<div className={`bg-gradient-to-r from-violet-500 ${active ? "shadow-2xl" : ""}`}>x</div>';
      const r = detectDesignSmells({ file: 'card.tsx', content });
      expect(r.violations.some(v => v.rule === 'AI-01')).toBe(true);
      expect(r.violations.some(v => v.rule === 'AI-05')).toBe(true);
    });

    it('AI-01 NOT triggered for non-purple gradient (e.g. blue-only) — false positive guard', () => {
      const content = `<div className="bg-gradient-to-r from-blue-500 to-cyan-500">x</div>`;
      const r = detectDesignSmells({ file: 'a.tsx', content });
      expect(r.violations.filter(v => v.rule === 'AI-01').length).toBe(0);
    });

    it('AI-03 NOT triggered when only 2 of triad present (e.g. shadow-lg + rounded-2xl, no grid-cols-3)', () => {
      const content = `<div className="rounded-2xl shadow-lg p-8">x</div>`;
      const r = detectDesignSmells({ file: 'a.tsx', content });
      expect(r.violations.filter(v => v.rule === 'AI-03').length).toBe(0);
    });
  });

  describe('Readability rules', () => {
    it('detects RD-02 cramped line-height', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'body { line-height: 1.2; }',
      });
      expect(r.violations.some(v => v.rule === 'RD-02')).toBe(true);
    });

    it('RD-02 passes on 1.5', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'body { line-height: 1.5; }',
      });
      expect(r.violations.some(v => v.rule === 'RD-02')).toBe(false);
    });

    it('detects RD-04 tiny body text 11px', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { font-size: 11px; }',
      });
      expect(r.violations.some(v => v.rule === 'RD-04')).toBe(true);
    });

    it('RD-04 skipped for caption class (.meta) at 12px', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: '.meta { font-size: 12px; }',
      });
      expect(r.violations.some(v => v.rule === 'RD-04')).toBe(false);
    });

    it('RD-04 skipped for .footer-meta and .layer-tag at 11px', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: '.footer-meta { font-size: 11px; } .layer-tag { font-size: 11px; }',
      });
      expect(r.violations.some(v => v.rule === 'RD-04')).toBe(false);
    });

    it('RD-04 skipped under tone=editorial-technical at 12px', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { font-size: 12px; }',
        tone: 'editorial-technical',
      });
      expect(r.violations.some(v => v.rule === 'RD-04')).toBe(false);
    });

    it('RD-04 skipped under tone=brutalist at 11px (data-dense allowed)', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { font-size: 11px; }',
        tone: 'brutalist',
      });
      expect(r.violations.some(v => v.rule === 'RD-04')).toBe(false);
    });

    it('RD-04 skipped under tone=bold-typographic at 11px', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: '.label { font-size: 11px; }',
        tone: 'bold-typographic',
      });
      expect(r.violations.some(v => v.rule === 'RD-04')).toBe(false);
    });

    it('RD-04 skipped under tone=minimal at 12px', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'span { font-size: 12px; }',
        tone: 'minimal',
      });
      expect(r.violations.some(v => v.rule === 'RD-04')).toBe(false);
    });

    it('RD-04 still flags 9px under brutalist tone (under 10px hard floor)', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { font-size: 9px; }',
        tone: 'brutalist',
      });
      expect(r.violations.some(v => v.rule === 'RD-04')).toBe(true);
    });

    it('RD-04 still flags 11px under non-caption tone (e.g. luxury)', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { font-size: 11px; }',
        tone: 'luxury',
      });
      expect(r.violations.some(v => v.rule === 'RD-04')).toBe(true);
    });

    it('RD-04 still flags 9px even in caption class (under hard floor)', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: '.caption { font-size: 9px; }',
      });
      expect(r.violations.some(v => v.rule === 'RD-04')).toBe(true);
    });

    it('detects RD-06 justify', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { text-align: justify; }',
      });
      expect(r.violations.some(v => v.rule === 'RD-06')).toBe(true);
    });

    it('RD-03 detects low contrast (gray on white < 4.5:1)', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { color: #999999; background-color: #ffffff; }',
      });
      const v = r.violations.find(x => x.rule === 'RD-03');
      expect(v).toBeDefined();
      expect(v!.match).toContain('contrast');
    });

    it('RD-03 passes high contrast (black on white)', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { color: #000000; background-color: #ffffff; }',
      });
      expect(r.violations.some(v => v.rule === 'RD-03')).toBe(false);
    });

    it('RD-03 flags HIGH severity for very low contrast (< 3:1)', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { color: #cccccc; background-color: #eeeeee; }',
      });
      const v = r.violations.find(x => x.rule === 'RD-03');
      expect(v).toBeDefined();
      expect(v!.severity).toBe('HIGH');
    });

    it('RD-03 supports rgb() syntax', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { color: rgb(150, 150, 150); background-color: rgb(255, 255, 255); }',
      });
      expect(r.violations.some(v => v.rule === 'RD-03')).toBe(true);
    });

    it('RD-03 supports named colors (gray on white)', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { color: gray; background-color: white; }',
      });
      expect(r.violations.some(v => v.rule === 'RD-03')).toBe(true);
    });

    it('RD-03 ignores blocks without both color and bg', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'p { color: #999; } div { background: white; }',
      });
      expect(r.violations.some(v => v.rule === 'RD-03')).toBe(false);
    });
  });

  describe('A11y rules (non-negotiable)', () => {
    it('detects A11Y-01 missing alt on img', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<img src="/logo.png" className="w-8" />',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-01')).toBe(true);
      expect(hasA11yViolations(r)).toBe(true);
    });

    it('A11Y-01 passes when alt present', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<img src="/logo.png" alt="Logo" />',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-01')).toBe(false);
    });

    it('A11Y-01 passes when aria-hidden="true"', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<img src="/deco.png" aria-hidden="true" />',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-01')).toBe(false);
    });

    it('detects A11Y-02 icon-only button', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<button><svg viewBox="0 0 24 24"></svg></button>',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-02')).toBe(true);
    });

    it('A11Y-02 passes when aria-label present', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<button aria-label="Close"><svg viewBox="0 0 24 24"></svg></button>',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-02')).toBe(false);
    });

    it('detects A11Y-03 touch target < 44px', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<button style="height: 32px">X</button>',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-03')).toBe(true);
    });

    it('detects A11Y-04 outline:none without :focus-visible', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'button { outline: none; }',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-04')).toBe(true);
    });

    it('A11Y-04 passes when :focus-visible exists', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: 'button { outline: none; } button:focus-visible { outline: 2px solid blue; }',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-04')).toBe(false);
    });
  });

  describe('Layout/spacing rules', () => {
    it('detects LS-01 non-8 padding (13px)', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: '.card { padding: 13px; }',
      });
      expect(r.violations.some(v => v.rule === 'LS-01')).toBe(true);
    });

    it('LS-01 passes on 8px multiples', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: '.card { padding: 16px; margin: 24px; }',
      });
      expect(r.violations.some(v => v.rule === 'LS-01')).toBe(false);
    });

    it('LS-01 allows special values (4, 12)', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: '.card { padding: 12px; margin: 4px; }',
      });
      expect(r.violations.some(v => v.rule === 'LS-01')).toBe(false);
    });
  });

  describe('score calculation', () => {
    it('clean content scores 100', () => {
      const r = detectDesignSmells({
        file: 'clean.tsx',
        content: '<div className="rounded-md bg-slate-100"/>',
      });
      expect(r.score).toBe(100);
      expect(r.violations.length).toBe(0);
    });

    it('a11y violations weighted heaviest (15 points each)', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<img src="/a.png"/>',
      });
      expect(r.score).toBe(85);
    });

    it('multiple AI slop violations lower score', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<div className="grid grid-cols-3 rounded-2xl shadow-lg bg-gradient-to-r from-purple-500 to-pink-500"/>',
      });
      expect(r.score).toBeLessThan(85);
      expect(r.summary.ai_slop).toBeGreaterThanOrEqual(2);
    });

    it('score floor is 0', () => {
      const content = Array(50).fill('<img src="a.png"/>').join('\n');
      const r = detectDesignSmells({ file: 'a.tsx', content });
      expect(r.score).toBe(0);
    });
  });

  describe('threshold gates', () => {
    it('ship threshold (70) fails on single a11y violation', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<img src="/a.png"/>',
      });
      expect(meetsThreshold(r, 'ship')).toBe(false);
    });

    it('craft threshold (85) stricter than ship', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<div className="shadow-2xl rounded-2xl"/>',
      });
      expect(r.score).toBeGreaterThanOrEqual(85);
      expect(meetsThreshold(r, 'craft')).toBe(true);
    });

    it('default threshold (60) permissive', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<button className="transition-all"/>',
      });
      expect(meetsThreshold(r, 'default')).toBe(true);
    });
  });

  describe('tokens_consumed', () => {
    it('always returns 0 tokens', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<div className="bg-gradient-to-r from-purple-500"/>',
      });
      expect(r.tokens_consumed).toBe(0);
    });
  });

  describe('summary breakdown', () => {
    it('correctly categorizes violations', () => {
      const r = detectDesignSmells({
        file: 'mixed.tsx',
        content: `
          <img src="/a.png"/>
          <div className="bg-gradient-to-r from-purple-500"/>
          <p style="font-size: 11px">x</p>
        `,
      });
      expect(r.summary.a11y).toBeGreaterThanOrEqual(1);
      expect(r.summary.ai_slop).toBeGreaterThanOrEqual(1);
      expect(r.summary.readability).toBeGreaterThanOrEqual(1);
    });
  });

  describe('breaker config export', () => {
    it('exports breaker config shape', () => {
      expect(DESIGN_AUDITOR_BREAKER_CONFIG.name).toBe('design-auditor');
      expect(typeof DESIGN_AUDITOR_BREAKER_CONFIG.failureThreshold).toBe('number');
      expect(typeof DESIGN_AUDITOR_BREAKER_CONFIG.cooldownMs).toBe('number');
    });
  });

  describe('RD-01 long line length', () => {
    it('detects long text block without max-width', () => {
      const longText = 'Lorem ipsum dolor sit amet, '.repeat(20);
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: `<p>${longText}</p>`,
      });
      expect(r.violations.some(v => v.rule === 'RD-01')).toBe(true);
    });

    it('passes with max-w-prose Tailwind class', () => {
      const longText = 'Lorem ipsum dolor sit amet, '.repeat(20);
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: `<p class="max-w-prose">${longText}</p>`,
      });
      expect(r.violations.some(v => v.rule === 'RD-01')).toBe(false);
    });

    it('passes with inline max-width style', () => {
      const longText = 'Lorem ipsum dolor sit amet, '.repeat(20);
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: `<p style="max-width: 65ch">${longText}</p>`,
      });
      expect(r.violations.some(v => v.rule === 'RD-01')).toBe(false);
    });
  });

  describe('RD-05 heading hierarchy skip', () => {
    it('detects h1 → h3 skip', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<h1>Title</h1><h3>Sub</h3>',
      });
      expect(r.violations.some(v => v.rule === 'RD-05')).toBe(true);
    });

    it('passes h1 → h2 → h3 sequential', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<h1>A</h1><h2>B</h2><h3>C</h3>',
      });
      expect(r.violations.some(v => v.rule === 'RD-05')).toBe(false);
    });

    it('detects h2 → h4 skip', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<h2>A</h2><h4>B</h4>',
      });
      expect(r.violations.some(v => v.rule === 'RD-05')).toBe(true);
    });
  });

  describe('A11Y-05 JSX htmlFor support (bug fix)', () => {
    it('recognizes JSX htmlFor= as a valid label', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<label htmlFor="email">Email</label><input id="email" type="email" />',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-05')).toBe(false);
    });

    it('still flags JSX input without label or htmlFor', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<input id="orphan" type="text" />',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-05')).toBe(true);
    });
  });

  describe('A11Y-05 form field without label', () => {
    it('detects input without label', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<form><input type="text" name="email" /></form>',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-05')).toBe(true);
    });

    it('passes with aria-label', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<input type="text" aria-label="Email" />',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-05')).toBe(false);
    });

    it('passes with <label for> matching id', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<label for="email-field">Email</label><input id="email-field" type="text" />',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-05')).toBe(false);
    });

    it('ignores hidden inputs', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<input type="hidden" name="csrf" />',
      });
      expect(r.violations.some(v => v.rule === 'A11Y-05')).toBe(false);
    });
  });

  describe('LS-02 absolute positioning overuse', () => {
    it('detects 3+ absolute without flex/grid', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: '.a { position: absolute; } .b { position: absolute; } .c { position: absolute; }',
      });
      expect(r.violations.some(v => v.rule === 'LS-02')).toBe(true);
    });

    it('passes with 2 absolute + flex', () => {
      const r = detectDesignSmells({
        file: 'a.css',
        content: '.parent { display: flex; } .a { position: absolute; } .b { position: absolute; }',
      });
      expect(r.violations.some(v => v.rule === 'LS-02')).toBe(false);
    });
  });

  describe('LS-03 fixed height on text containers', () => {
    it('detects <p> with fixed height', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<p style="height: 40px">text</p>',
      });
      expect(r.violations.some(v => v.rule === 'LS-03')).toBe(true);
    });

    it('passes with min-height', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<p style="min-height: 40px">text</p>',
      });
      expect(r.violations.some(v => v.rule === 'LS-03')).toBe(false);
    });
  });

  describe('AI-07 Hero-Features-CTA template signal', () => {
    it('detects full template pattern', () => {
      const content = `
        <section><h1>Big Title</h1><button>Get Started</button></section>
        <section class="grid grid-cols-3"><div>F1</div><div>F2</div><div>F3</div></section>
        <section><button class="btn cta">Sign Up Now</button></section>
      `;
      const r = detectDesignSmells({ file: 'a.tsx', content });
      expect(r.violations.some(v => v.rule === 'AI-07')).toBe(true);
    });

    it('does not fire on single hero section alone', () => {
      const r = detectDesignSmells({
        file: 'a.tsx',
        content: '<section><h1>Title</h1><button>CTA</button></section>',
      });
      expect(r.violations.some(v => v.rule === 'AI-07')).toBe(false);
    });
  });

  describe('security guards', () => {
    it('returns safe default on oversize content (> 2MB)', () => {
      const huge = 'x'.repeat(3 * 1024 * 1024);
      const r = detectDesignSmells({ file: 'a.tsx', content: huge });
      expect(r.score).toBe(100);
      expect(r.violations.length).toBe(0);
      expect(r.tokens_consumed).toBe(0);
    });

    it('returns safe default on non-string content', () => {
      const r = detectDesignSmells({ file: 'a.tsx', content: null as unknown as string });
      expect(r.score).toBe(100);
      expect(r.violations.length).toBe(0);
    });
  });
});
