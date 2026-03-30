import { describe, it, expect } from 'vitest';
import {
  isProtectedConfig,
  getProtectionMessage,
  type ProtectionResult,
} from '../lib/config-protection.js';

describe('isProtectedConfig', () => {
  it('should block eslint config modifications', () => {
    expect(isProtectedConfig('.eslintrc.js')).toBe(true);
    expect(isProtectedConfig('eslint.config.js')).toBe(true);
    expect(isProtectedConfig('.eslintrc.json')).toBe(true);
  });

  it('should block prettier config modifications', () => {
    expect(isProtectedConfig('.prettierrc')).toBe(true);
    expect(isProtectedConfig('.prettierrc.json')).toBe(true);
    expect(isProtectedConfig('prettier.config.js')).toBe(true);
  });

  it('should block tsconfig modifications', () => {
    expect(isProtectedConfig('tsconfig.json')).toBe(true);
    expect(isProtectedConfig('tsconfig.build.json')).toBe(true);
  });

  it('should block biome config', () => {
    expect(isProtectedConfig('biome.json')).toBe(true);
    expect(isProtectedConfig('biome.jsonc')).toBe(true);
  });

  it('should not block regular source files', () => {
    expect(isProtectedConfig('src/app.ts')).toBe(false);
    expect(isProtectedConfig('lib/utils.ts')).toBe(false);
    expect(isProtectedConfig('README.md')).toBe(false);
  });

  it('should handle full paths', () => {
    expect(isProtectedConfig('/Users/dev/project/.eslintrc.js')).toBe(true);
    expect(isProtectedConfig('/Users/dev/project/src/app.ts')).toBe(false);
  });
});

describe('getProtectionMessage', () => {
  it('should return actionable message', () => {
    const msg = getProtectionMessage('.eslintrc.js');
    expect(msg).toContain('eslint');
    expect(msg.toLowerCase()).toContain('fix');
  });
});
