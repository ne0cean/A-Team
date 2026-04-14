// RFC-005 × RFC-007 cross-integration tests
import { describe, it, expect, afterEach } from 'vitest';
import { maskPII, pipelineForTrace, isObsMaskEnabled } from '../scripts/pii-mask.mjs';

describe('RFC-005 × RFC-007 — PII Mask Pipeline', () => {
  afterEach(() => {
    delete process.env.A_TEAM_OBS_MASK;
  });

  describe('isObsMaskEnabled', () => {
    it('default OFF', () => {
      expect(isObsMaskEnabled()).toBe(false);
    });

    it('ON when A_TEAM_OBS_MASK=1', () => {
      process.env.A_TEAM_OBS_MASK = '1';
      expect(isObsMaskEnabled()).toBe(true);
    });
  });

  describe('maskPII patterns', () => {
    it('masks email', () => {
      expect(maskPII('contact user@example.com for info')).toBe('contact [EMAIL] for info');
    });

    it('masks phone', () => {
      expect(maskPII('call +1 (555) 123-4567')).toBe('call [PHONE]');
    });

    it('masks API key', () => {
      expect(maskPII('apiKey: "sk-ant-1234567890abcdef1234567890"')).toContain('[API_KEY]');
    });

    it('masks SSN', () => {
      expect(maskPII('SSN 123-45-6789 confirmed')).toBe('SSN [SSN] confirmed');
    });

    it('masks credit card', () => {
      expect(maskPII('CC 4111-1111-1111-1111')).toContain('[CC]');
    });

    it('empty content unchanged', () => {
      expect(maskPII('')).toBe('');
    });

    it('no PII unchanged', () => {
      expect(maskPII('regular text without any secrets')).toBe('regular text without any secrets');
    });
  });

  describe('pipelineForTrace (mask → spotlight order)', () => {
    it('masks PII before spotlight wraps (critical ordering)', () => {
      process.env.A_TEAM_OBS_MASK = '1';
      const mockSpotlight = (text: string) => `<<WRAPPED>>\n${text}\n<<END>>`;

      const result = pipelineForTrace('My email: test@foo.com in web content', {
        source: 'WebFetch',
        isUntrusted: true,
        spotlight: mockSpotlight,
      });

      // PII 먼저 마스킹됨 → spotlight가 그걸 wrap
      expect(result).toContain('[EMAIL]');
      expect(result).toContain('<<WRAPPED>>');
      expect(result).not.toContain('test@foo.com');
    });

    it('skips spotlight when trusted', () => {
      process.env.A_TEAM_OBS_MASK = '1';
      const result = pipelineForTrace('user@foo.com', {
        source: 'Read',
        isUntrusted: false,
      });
      expect(result).toBe('[EMAIL]');
    });

    it('passthrough when mask disabled', () => {
      delete process.env.A_TEAM_OBS_MASK;
      const result = pipelineForTrace('sensitive: user@foo.com', {
        source: 'WebFetch',
        isUntrusted: false,
      });
      expect(result).toContain('user@foo.com');
    });

    it('preserves ordering: datamark on PII-masked content only', () => {
      process.env.A_TEAM_OBS_MASK = '1';
      const datamarkFn = (text: string) => text.replace(/\s+/g, ' ^ ');
      const result = pipelineForTrace('email user@a.com and sk-ant-12345678901234567890', {
        source: 'WebFetch',
        isUntrusted: true,
        spotlight: datamarkFn,
      });
      // [EMAIL] [API_KEY] 가 datamark 적용된 형태
      expect(result).toContain('[EMAIL]');
      expect(result).toContain('[API_KEY]');
      expect(result).toContain(' ^ '); // datamark applied after masking
    });
  });
});
