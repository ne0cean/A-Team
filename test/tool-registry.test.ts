// RFC-003 × RFC-006 cross-integration tests
import { describe, it, expect } from 'vitest';
import { resolveToolset, analyzeToolCatalog, type McpTool } from '../lib/tool-registry.js';

const SAMPLE_TOOLS: McpTool[] = [
  { name: 'exec', description: 'Execute shell' },
  { name: 'read_file', description: 'Read file' },
  { name: 'search_code', description: 'Search code' },
  { name: 'github_search', description: 'GitHub search', defer_loading: true },
  { name: 'slack_query', description: 'Slack', defer_loading: true },
  { name: 'playwright_snapshot', description: 'Browser', defer_loading: true },
];

describe('RFC-003 × RFC-006 — Tool Registry', () => {
  describe('resolveToolset', () => {
    it('Haiku → defer_loading 무시, 전체 로드 (F5 fallback)', () => {
      const result = resolveToolset(SAMPLE_TOOLS, 'haiku');
      expect(result.defer_applied).toBe(false);
      expect(result.loaded_count).toBe(6);
      expect(result.tools.every(t => !t.defer_loading)).toBe(true);
    });

    it('Sonnet → defer_loading 준수, non-deferred만 초기 로드', () => {
      const result = resolveToolset(SAMPLE_TOOLS, 'sonnet');
      expect(result.defer_applied).toBe(true);
      expect(result.tools.length).toBe(3); // exec, read_file, search_code
      expect(result.loaded_count).toBe(6); // total catalog
    });

    it('Opus → Sonnet과 동일 동작 (defer 준수)', () => {
      const result = resolveToolset(SAMPLE_TOOLS, 'opus');
      expect(result.defer_applied).toBe(true);
      expect(result.tools.length).toBe(3);
    });

    it('defer_loading 없는 tool만 있을 때', () => {
      const onlyHot: McpTool[] = [
        { name: 'exec' },
        { name: 'read' },
      ];
      const result = resolveToolset(onlyHot, 'sonnet');
      expect(result.tools.length).toBe(2);
      expect(result.defer_applied).toBe(true);
    });
  });

  describe('analyzeToolCatalog', () => {
    it('balanced catalog', () => {
      const analysis = analyzeToolCatalog(SAMPLE_TOOLS);
      expect(analysis.total).toBe(6);
      expect(analysis.non_deferred).toBe(3);
      expect(analysis.deferred).toBe(3);
      expect(analysis.recommendation).toContain('Balanced');
    });

    it('too many hot tools', () => {
      const tooManyHot: McpTool[] = Array.from({ length: 10 }, (_, i) => ({
        name: `tool_${i}`,
        // no defer_loading
      }));
      const analysis = analyzeToolCatalog(tooManyHot);
      expect(analysis.non_deferred).toBe(10);
      expect(analysis.recommendation).toContain('축소');
    });

    it('no defer applied', () => {
      const noDefer: McpTool[] = [
        { name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }, { name: 'e' },
      ];
      const analysis = analyzeToolCatalog(noDefer);
      expect(analysis.recommendation).toContain('defer_loading 미적용');
    });

    it('too few tools', () => {
      const few: McpTool[] = [{ name: 'a' }, { name: 'b' }];
      const analysis = analyzeToolCatalog(few);
      expect(analysis.recommendation).toContain('미미');
    });
  });
});
