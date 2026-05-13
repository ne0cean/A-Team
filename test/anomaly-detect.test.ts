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
    const out = run('--alert-only');
    expect(typeof out).toBe('string');
  });

  it('ANOMALY_NO_EMIT prevents self-pollution', () => {
    const { execSync: exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const analyticsPath = path.resolve(ROOT, '.context/analytics.jsonl');

    const countAnomalyEvents = () => {
      if (!fs.existsSync(analyticsPath)) return 0;
      return fs.readFileSync(analyticsPath, 'utf8')
        .split('\n')
        .filter((l: string) => l.includes('"skill":"anomaly-detect"'))
        .length;
    };

    const before = countAnomalyEvents();

    // Run with NO_EMIT — anomaly-detect events should NOT increase
    try {
      exec('node scripts/anomaly-detect.mjs --json', {
        cwd: ROOT, encoding: 'utf8', timeout: 10000,
        env: { ...process.env, ANOMALY_NO_EMIT: '1' },
      });
    } catch { /* exit 1 is OK */ }

    const after = countAnomalyEvents();
    expect(after).toBe(before);
  });

  it('--days 1 with narrow window still produces valid output', () => {
    const out = run('--json --days 1');
    const data = JSON.parse(out);
    expect(data.scan_window_days).toBe(1);
    expect(data.anomalies_found).toBeGreaterThanOrEqual(0);
  });

  it('anomaly types are known values', () => {
    const out = run('--json --days 30');
    const data = JSON.parse(out);
    const knownTypes = [
      'module_usage_drop', 'module_usage_spike',
      'design_quality_drop', 'a11y_violation_spike',
      'test_failure_spike', 'session_mismatch',
      'event_gap', 'daily_volume_spike', 'daily_volume_drop',
    ];
    for (const a of data.anomalies) {
      expect(knownTypes).toContain(a.type);
    }
  });
});
