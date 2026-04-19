import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  logEvent,
  logMarketingEvent,
  parseJSONL,
  filterByPeriod,
  formatReport,
  type AnalyticsEvent,
} from '../lib/analytics.js';

const TEST_DIR = path.join(os.tmpdir(), 'a-team-analytics-test-' + process.pid);
const ANALYTICS_FILE = path.join(TEST_DIR, 'skill-usage.jsonl');

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('logEvent', () => {
  it('should append JSONL line to analytics file', () => {
    logEvent({ skill: 'review', repo: 'my-app' }, ANALYTICS_FILE);
    logEvent({ skill: 'ship', repo: 'my-app' }, ANALYTICS_FILE);

    const content = fs.readFileSync(ANALYTICS_FILE, 'utf-8').trim();
    const lines = content.split('\n');
    expect(lines).toHaveLength(2);

    const first = JSON.parse(lines[0]);
    expect(first.skill).toBe('review');
    expect(first.ts).toBeDefined();
  });

  it('should create file if not exists', () => {
    const newFile = path.join(TEST_DIR, 'new.jsonl');
    logEvent({ skill: 'qa', repo: 'test' }, newFile);
    expect(fs.existsSync(newFile)).toBe(true);
  });
});

describe('parseJSONL', () => {
  it('should parse valid JSONL content', () => {
    const content = '{"skill":"review","ts":"2026-03-30T00:00:00Z","repo":"app"}\n{"skill":"ship","ts":"2026-03-30T01:00:00Z","repo":"app"}\n';
    const events = parseJSONL(content);
    expect(events).toHaveLength(2);
    expect(events[0].skill).toBe('review');
  });

  it('should skip malformed lines', () => {
    const content = '{"skill":"review","ts":"2026-03-30T00:00:00Z","repo":"app"}\nBAD LINE\n{"skill":"ship","ts":"2026-03-30T01:00:00Z","repo":"app"}\n';
    const events = parseJSONL(content);
    expect(events).toHaveLength(2);
  });

  it('should return empty array for empty content', () => {
    expect(parseJSONL('')).toEqual([]);
    expect(parseJSONL('  \n  ')).toEqual([]);
  });
});

describe('filterByPeriod', () => {
  const now = new Date();
  const events: AnalyticsEvent[] = [
    { skill: 'review', ts: new Date(now.getTime() - 2 * 86400000).toISOString(), repo: 'app' },
    { skill: 'ship', ts: new Date(now.getTime() - 10 * 86400000).toISOString(), repo: 'app' },
    { skill: 'qa', ts: new Date(now.getTime() - 40 * 86400000).toISOString(), repo: 'app' },
  ];

  it('should return all events for "all" period', () => {
    expect(filterByPeriod(events, 'all')).toHaveLength(3);
  });

  it('should filter to last 7 days', () => {
    const filtered = filterByPeriod(events, '7d');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].skill).toBe('review');
  });

  it('should filter to last 30 days', () => {
    const filtered = filterByPeriod(events, '30d');
    expect(filtered).toHaveLength(2);
  });
});

describe('formatReport', () => {
  it('should format a human-readable report', () => {
    const events: AnalyticsEvent[] = [
      { skill: 'review', ts: '2026-03-30T00:00:00Z', repo: 'app-a' },
      { skill: 'review', ts: '2026-03-30T01:00:00Z', repo: 'app-a' },
      { skill: 'ship', ts: '2026-03-30T02:00:00Z', repo: 'app-b' },
      { skill: 'qa', ts: '2026-03-30T03:00:00Z', repo: 'app-a', event: 'hook_fire', pattern: 'rm -rf' },
    ];

    const report = formatReport(events);
    expect(report).toContain('/review');
    expect(report).toContain('2 invocations');
    expect(report).toContain('app-a');
    expect(report).toContain('hook');
  });

  it('should handle empty events', () => {
    const report = formatReport([]);
    expect(report).toContain('Total: 0');
  });
});

describe('logMarketingEvent', () => {
  it('writes a marketing_generate event with topic+platform fields', () => {
    logMarketingEvent('marketing_generate', {
      repo: 'a-team',
      marketingTopic: 'claude-sleep-resume',
      marketingPlatform: 'twitter',
      marketingMode: 'social-first',
      marketingArtifactPath: 'content/social/x/twitter-thread.md',
      marketingHumanInsertCount: 0,
    }, ANALYTICS_FILE);

    const events = parseJSONL(fs.readFileSync(ANALYTICS_FILE, 'utf-8'));
    expect(events).toHaveLength(1);
    expect(events[0].skill).toBe('marketing-generate');
    expect(events[0].event).toBe('marketing_generate');
    expect(events[0].marketingTopic).toBe('claude-sleep-resume');
    expect(events[0].marketingPlatform).toBe('twitter');
    expect(events[0].marketingMode).toBe('social-first');
    expect(events[0].marketingHumanInsertCount).toBe(0);
  });

  it('writes a marketing_publish event with postiz job id', () => {
    logMarketingEvent('marketing_publish', {
      repo: 'a-team',
      marketingTopic: 'claude-sleep-resume',
      marketingPlatform: 'linkedin',
      marketingMode: 'dry-run',
      marketingPostizJobId: 'dry-run-li-001',
    }, ANALYTICS_FILE);

    const events = parseJSONL(fs.readFileSync(ANALYTICS_FILE, 'utf-8'));
    expect(events[0].event).toBe('marketing_publish');
    expect(events[0].marketingPostizJobId).toBe('dry-run-li-001');
  });

  it('writes a marketing_analytics event with metrics', () => {
    logMarketingEvent('marketing_analytics', {
      repo: 'a-team',
      marketingTopic: 'claude-sleep-resume',
      marketingPlatform: 'twitter',
      marketingImpressions: 12500,
      marketingEngagements: 340,
      marketingConversionRate: 0.027,
    }, ANALYTICS_FILE);

    const events = parseJSONL(fs.readFileSync(ANALYTICS_FILE, 'utf-8'));
    expect(events[0].marketingImpressions).toBe(12500);
    expect(events[0].marketingConversionRate).toBeCloseTo(0.027);
  });
});
