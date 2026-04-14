// RFC-002 Handoff Compression — TDD RED tests
import { describe, it, expect, afterEach } from 'vitest';
import { compress5Layer, formatHandoff, parseCurrentMd } from '../scripts/handoff-compressor.mjs';

const SAMPLE_CURRENT_MD = `# CURRENT — Session State

## Status
Working on RFC-001 Prompt Caching Phase 1. Tests 244 pass. daemon-utils.mjs wired.

## In Progress Files
- scripts/prompt-cache.mjs (created)
- scripts/daemon-utils.mjs (modified L45-70)

## Last Completions (2026-04-14)
- Added buildCachedSystemPrompt with opt-in flag
- 7 unit tests GREEN
- Commit 8c83565 pushed

## Next Tasks
- RFC-003 ToolSearch template
- RFC-004 Classical Tools install script

## Blockers
- None

## Reasoning
Prompt caching requires cache_control array because Anthropic SDK needs explicit block markers.
Chose default OFF to preserve backward compat (Criterion 8).
`;

describe('RFC-002 Handoff Compression 5-Layer', () => {
  afterEach(() => {
    delete process.env.COMPRESSION_MODE;
  });

  describe('Opt-in behavior (Criterion 8)', () => {
    it('returns original content when COMPRESSION_MODE not set', () => {
      const result = compress5Layer(SAMPLE_CURRENT_MD);
      expect(result.mode).toBe('passthrough');
      expect(result.output).toBe(SAMPLE_CURRENT_MD);
    });

    it('returns original when COMPRESSION_MODE=off', () => {
      process.env.COMPRESSION_MODE = 'off';
      const result = compress5Layer(SAMPLE_CURRENT_MD);
      expect(result.mode).toBe('passthrough');
    });

    it('activates compression when COMPRESSION_MODE=on', () => {
      process.env.COMPRESSION_MODE = 'on';
      const result = compress5Layer(SAMPLE_CURRENT_MD);
      expect(result.mode).toBe('5layer');
      expect(result.layers).toBeDefined();
    });
  });

  describe('5-Layer structure (Facts/Story/Reasoning/Action/Caution)', () => {
    it('extracts all 5 layers', () => {
      process.env.COMPRESSION_MODE = 'on';
      const result = compress5Layer(SAMPLE_CURRENT_MD);
      expect(result.layers.facts).toBeDefined();
      expect(result.layers.story).toBeDefined();
      expect(result.layers.reasoning).toBeDefined();
      expect(result.layers.action).toBeDefined();
      expect(result.layers.caution).toBeDefined();
    });

    it('Facts contains timestamps/paths/commits (no reasoning words)', () => {
      process.env.COMPRESSION_MODE = 'on';
      const result = compress5Layer(SAMPLE_CURRENT_MD);
      // F12 boundary test: Facts must not contain reasoning keywords
      const reasoningKeywords = ['because', 'therefore', 'so that', 'Chose'];
      for (const kw of reasoningKeywords) {
        expect(result.layers.facts.toLowerCase()).not.toContain(kw.toLowerCase());
      }
    });

    it('Action contains next tasks', () => {
      process.env.COMPRESSION_MODE = 'on';
      const result = compress5Layer(SAMPLE_CURRENT_MD);
      expect(result.layers.action).toContain('RFC-003');
    });

    it('Reasoning contains "why" statements', () => {
      process.env.COMPRESSION_MODE = 'on';
      const result = compress5Layer(SAMPLE_CURRENT_MD);
      expect(result.layers.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('Compression ratio', () => {
    it('for large input (≥3KB), compressed output shorter', () => {
      process.env.COMPRESSION_MODE = 'on';
      // Larger synthetic input (small samples have header overhead)
      const largeInput = SAMPLE_CURRENT_MD + '\n' + SAMPLE_CURRENT_MD.repeat(5);
      const result = compress5Layer(largeInput);
      expect(result.output.length).toBeLessThan(largeInput.length);
    });

    it('mode is "5layer" when enabled regardless of size', () => {
      process.env.COMPRESSION_MODE = 'on';
      const result = compress5Layer(SAMPLE_CURRENT_MD);
      expect(result.mode).toBe('5layer');
    });
  });

  describe('formatHandoff output format', () => {
    it('formats layers into structured markdown', () => {
      const layers = {
        facts: 'Commit 8c83565 at 2026-04-14',
        story: 'Added buildCachedSystemPrompt',
        reasoning: 'Cache_control needed explicit markers',
        action: 'RFC-003 next',
        caution: 'None',
      };
      const formatted = formatHandoff(layers);
      expect(formatted).toContain('## FACTS');
      expect(formatted).toContain('## STORY');
      expect(formatted).toContain('## REASONING');
      expect(formatted).toContain('## ACTION');
      expect(formatted).toContain('## CAUTION');
    });
  });

  describe('parseCurrentMd edge cases', () => {
    it('handles empty input', () => {
      const parsed = parseCurrentMd('');
      expect(parsed).toBeDefined();
    });

    it('handles missing sections', () => {
      const parsed = parseCurrentMd('# Only Title\n');
      expect(parsed).toBeDefined();
    });
  });
});
