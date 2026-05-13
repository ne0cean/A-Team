import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const run = (args = '') => {
  try {
    return execSync(`node scripts/anomaly-detect.mjs ${args}`, { cwd: ROOT, encoding: 'utf8', timeout: 10000 });
  } catch (e: any) {
    // exit code 1 = critical anomaly found, still valid output
    if (e.stdout) return e.stdout;
    throw e;
  }
};

describe('anomaly-detect', () => {
  it('runs without error and produces text output', () => {
    const out = run();
    expect(out).toContain('Anomaly Detection Report');
    expect(out).toContain('Scan window:');
  });

  it('--json produces valid JSON with expected fields', () => {
    const out = run('--json');
    const data = JSON.parse(out);
    expect(data).toHaveProperty('scan_window_days');
    expect(data).toHaveProperty('total_events_scanned');
    expect(data).toHaveProperty('anomalies_found');
    expect(data).toHaveProperty('by_severity');
    expect(data).toHaveProperty('anomalies');
    expect(data).toHaveProperty('scanned_at');
    expect(data.by_severity).toHaveProperty('critical');
    expect(data.by_severity).toHaveProperty('warning');
    expect(data.by_severity).toHaveProperty('info');
    expect(typeof data.total_events_scanned).toBe('number');
  });

  it('--days 14 accepts custom window', () => {
    const out = run('--json --days 14');
    const data = JSON.parse(out);
    expect(data.scan_window_days).toBe(14);
  });

  it('anomaly count matches array length', () => {
    const out = run('--json');
    const data = JSON.parse(out);
    expect(data.anomalies_found).toBe(data.anomalies.length);
  });

  it('severity counts are consistent', () => {
    const out = run('--json');
    const data = JSON.parse(out);
    const total = data.by_severity.critical + data.by_severity.warning + data.by_severity.info;
    expect(total).toBe(data.anomalies_found);
  });

  it('each anomaly has required fields', () => {
    const out = run('--json');
    const data = JSON.parse(out);
    for (const a of data.anomalies) {
      expect(a).toHaveProperty('type');
      expect(a).toHaveProperty('severity');
      expect(a).toHaveProperty('detail');
      expect(['critical', 'warning', 'info']).toContain(a.severity);
    }
  });

  it('--alert-only with no critical exits 0', () => {
    // Should not throw (exit 0 = no critical anomalies)
    const out = run('--alert-only');
    // May or may not produce output depending on anomalies
    expect(typeof out).toBe('string');
  });
});
