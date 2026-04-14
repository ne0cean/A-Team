// RFC-007 Spotlighting Phase S — TDD tests
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  applyDelimiting,
  getSessionMarker,
  getSpotlightMode,
  spotlight,
  isUntrustedTool,
} from '../scripts/spotlight.mjs';

describe('RFC-007 Spotlighting Phase S', () => {
  afterEach(() => {
    delete process.env.A_TEAM_SPOTLIGHT;
    delete process.env.ATEAM_SESSION_ID;
  });

  describe('Opt-in behavior (Criterion 8)', () => {
    it('returns original content when A_TEAM_SPOTLIGHT is not set (default OFF)', () => {
      const result = spotlight('malicious content', { source: 'WebFetch', isUntrusted: true });
      expect(result).toBe('malicious content');
    });

    it('returns original when A_TEAM_SPOTLIGHT=0', () => {
      process.env.A_TEAM_SPOTLIGHT = '0';
      const result = spotlight('content', { source: 'WebFetch', isUntrusted: true });
      expect(result).toBe('content');
    });

    it('activates when A_TEAM_SPOTLIGHT=delimiting', () => {
      process.env.A_TEAM_SPOTLIGHT = 'delimiting';
      const result = spotlight('content', { source: 'WebFetch', isUntrusted: true });
      expect(result).toContain('UNTRUSTED_START');
      expect(result).toContain('UNTRUSTED_END');
    });
  });

  describe('Trusted content bypass', () => {
    it('does NOT wrap trusted content even if mode is active', () => {
      process.env.A_TEAM_SPOTLIGHT = 'delimiting';
      const result = spotlight('trusted system prompt', { source: 'Read', isUntrusted: false });
      expect(result).toBe('trusted system prompt');
    });
  });

  describe('Delimiting format', () => {
    it('wraps with session-scoped marker in start and end tags', () => {
      process.env.ATEAM_SESSION_ID = 'test-session-abc';
      const result = applyDelimiting('payload', 'WebFetch');
      const marker = getSessionMarker();
      expect(result).toContain(`UNTRUSTED_START_${marker}`);
      expect(result).toContain(`UNTRUSTED_END_${marker}`);
      expect(result).toContain('src="WebFetch"');
      expect(result).toContain('payload');
    });

    it('session marker is deterministic per-session', () => {
      process.env.ATEAM_SESSION_ID = 'session-1';
      const m1 = getSessionMarker();
      const m2 = getSessionMarker();
      expect(m1).toBe(m2);
    });

    it('different sessions get different markers', () => {
      process.env.ATEAM_SESSION_ID = 'session-A';
      const ma = getSessionMarker();
      process.env.ATEAM_SESSION_ID = 'session-B';
      const mb = getSessionMarker();
      expect(ma).not.toBe(mb);
    });

    it('marker is 8 hex chars', () => {
      process.env.ATEAM_SESSION_ID = 'session-xxx';
      const m = getSessionMarker();
      expect(m).toMatch(/^[a-f0-9]{8}$/);
    });
  });

  describe('Untrusted tool detection', () => {
    it('identifies WebFetch, WebSearch, RAG as untrusted', () => {
      expect(isUntrustedTool('WebFetch')).toBe(true);
      expect(isUntrustedTool('WebSearch')).toBe(true);
      expect(isUntrustedTool('RAG')).toBe(true);
    });

    it('identifies Read, Edit, Write as trusted', () => {
      expect(isUntrustedTool('Read')).toBe(false);
      expect(isUntrustedTool('Edit')).toBe(false);
      expect(isUntrustedTool('Write')).toBe(false);
    });
  });

  describe('Mode detection', () => {
    it('returns null when disabled', () => {
      delete process.env.A_TEAM_SPOTLIGHT;
      expect(getSpotlightMode()).toBe(null);
    });

    it('returns "delimiting" for 1/true/delimiting', () => {
      process.env.A_TEAM_SPOTLIGHT = '1';
      expect(getSpotlightMode()).toBe('delimiting');
      process.env.A_TEAM_SPOTLIGHT = 'true';
      expect(getSpotlightMode()).toBe('delimiting');
      process.env.A_TEAM_SPOTLIGHT = 'delimiting';
      expect(getSpotlightMode()).toBe('delimiting');
    });

    it('returns "datamarking"/"encoding" for Phase M/L', () => {
      process.env.A_TEAM_SPOTLIGHT = 'datamarking';
      expect(getSpotlightMode()).toBe('datamarking');
      process.env.A_TEAM_SPOTLIGHT = 'encoding';
      expect(getSpotlightMode()).toBe('encoding');
    });
  });

  describe('Empty content edge case', () => {
    it('returns empty string unchanged', () => {
      process.env.A_TEAM_SPOTLIGHT = 'delimiting';
      expect(spotlight('', { source: 'WebFetch', isUntrusted: true })).toBe('');
    });
  });
});
