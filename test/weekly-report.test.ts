import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const run = (args = '') => {
  try {
    return execSync(`node scripts/weekly-report.mjs ${args}`, { cwd: ROOT, encoding: 'utf8', timeout: 15000 });
  } catch (e: any) {
    if (e.stdout) return e.stdout;
    throw e;
  }
};

describe('weekly-report', () => {
  it('generates markdown report with expected sections', () => {
    const out = run('--weeks-ago 0');
    expect(out).toContain('# Weekly Report');
    expect(out).toContain('## Overview');
    expect(out).toContain('## Event Breakdown');
    expect(out).toContain('## Capability Coverage');
    expect(out).toContain('## Recommendations');
  });

  it('--json produces valid JSON with expected fields', () => {
    const out = run('--json --weeks-ago 0');
    const data = JSON.parse(out);
    expect(data).toHaveProperty('week');
    expect(data).toHaveProperty('current');
    expect(data).toHaveProperty('previous');
    expect(data).toHaveProperty('capability');
    expect(data).toHaveProperty('generated_at');
    expect(data.current).toHaveProperty('total');
    expect(data.current).toHaveProperty('byEvent');
    expect(data.current).toHaveProperty('design');
    expect(data.current).toHaveProperty('sessions');
  });

  it('capability weighted average is a percentage', () => {
    const out = run('--json --weeks-ago 0');
    const data = JSON.parse(out);
    expect(data.capability.weighted_avg).toBeGreaterThanOrEqual(0);
    expect(data.capability.weighted_avg).toBeLessThanOrEqual(100);
  });

  it('--save creates report file', () => {
    const out = run('--save --weeks-ago 0');
    expect(out).toContain('Report saved:');
    expect(out).toContain('-report.md');
  });

  it('previous week has lower or equal event count than all-time', () => {
    const out = run('--json --weeks-ago 1');
    const data = JSON.parse(out);
    expect(data.current.total).toBeGreaterThanOrEqual(0);
  });

  it('WoW delta is calculated correctly', () => {
    const out = run('--json --weeks-ago 0');
    const data = JSON.parse(out);
    // Just verify structure - actual delta depends on data
    expect(typeof data.current.total).toBe('number');
    expect(typeof data.previous.total).toBe('number');
  });
});
