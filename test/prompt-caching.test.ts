// RFC-001 Prompt Caching — Phase 1 TDD RED tests
// Governance: governance/rules/truth-contract.md + autonomous-loop.md
// Goal: system prompt에 cache_control 주입 로직 검증

import { describe, it, expect } from 'vitest';
import { buildCachedSystemPrompt } from '../scripts/prompt-cache.mjs';

describe('RFC-001 Phase 1 — buildCachedSystemPrompt', () => {
  describe('Opt-in behavior (Criterion 8)', () => {
    it('should return plain string when ENABLE_PROMPT_CACHING is not set', () => {
      delete process.env.ENABLE_PROMPT_CACHING;
      const result = buildCachedSystemPrompt('test prompt', { longLivedPrefix: '' });
      expect(result).toBe('test prompt');
    });

    it('should return plain string when ENABLE_PROMPT_CACHING=false', () => {
      process.env.ENABLE_PROMPT_CACHING = 'false';
      const result = buildCachedSystemPrompt('test prompt', { longLivedPrefix: '' });
      expect(result).toBe('test prompt');
      delete process.env.ENABLE_PROMPT_CACHING;
    });

    it('should return array with cache_control when ENABLE_PROMPT_CACHING=true', () => {
      process.env.ENABLE_PROMPT_CACHING = 'true';
      const result = buildCachedSystemPrompt('session prompt', {
        longLivedPrefix: 'persistent rules',
      });
      expect(Array.isArray(result)).toBe(true);
      delete process.env.ENABLE_PROMPT_CACHING;
    });
  });

  describe('Cache block ordering (F6 invalidation safety)', () => {
    it('should place 1h TTL (long-lived) block BEFORE 5min (session) block', () => {
      process.env.ENABLE_PROMPT_CACHING = 'true';
      const result = buildCachedSystemPrompt('session content', {
        longLivedPrefix: 'stable rules',
      });
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        // long-lived (1h) block must come first
        expect(result[0].cache_control?.ttl).toBe('1h');
        expect(result[0].text).toBe('stable rules');
        // session block (5min, default TTL) comes after
        expect(result[1].cache_control?.ttl).toBeUndefined(); // default = 5min
        expect(result[1].text).toBe('session content');
      }
      delete process.env.ENABLE_PROMPT_CACHING;
    });

    it('should handle empty longLivedPrefix (only session block)', () => {
      process.env.ENABLE_PROMPT_CACHING = 'true';
      const result = buildCachedSystemPrompt('session only', { longLivedPrefix: '' });
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.length).toBe(1);
        expect(result[0].text).toBe('session only');
      }
      delete process.env.ENABLE_PROMPT_CACHING;
    });
  });

  describe('Cache block structure (Anthropic spec)', () => {
    it('should have type="text" on each block', () => {
      process.env.ENABLE_PROMPT_CACHING = 'true';
      const result = buildCachedSystemPrompt('session', { longLivedPrefix: 'prefix' });
      if (Array.isArray(result)) {
        result.forEach(block => {
          expect(block.type).toBe('text');
        });
      }
      delete process.env.ENABLE_PROMPT_CACHING;
    });

    it('should have cache_control.type="ephemeral"', () => {
      process.env.ENABLE_PROMPT_CACHING = 'true';
      const result = buildCachedSystemPrompt('session', { longLivedPrefix: 'prefix' });
      if (Array.isArray(result)) {
        result.forEach(block => {
          if (block.cache_control) {
            expect(block.cache_control.type).toBe('ephemeral');
          }
        });
      }
      delete process.env.ENABLE_PROMPT_CACHING;
    });
  });
});
