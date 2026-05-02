// intel-integration.test.ts
// Intel 시스템 통합 테스트 — 집계 스크립트 + 실제 파일 I/O

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import type { CompetitorAnalysis, TrendData, PersonaProfile } from '../lib/intel-types';

const TEST_INTEL_DIR = join(process.cwd(), '.intel-test');
const AGGREGATE_SCRIPT = join(process.cwd(), 'scripts/intel-aggregate.mjs');

describe('Intel Aggregate Script', () => {
  beforeAll(() => {
    // 테스트용 .intel 디렉토리 생성
    mkdirSync(join(TEST_INTEL_DIR, 'competitors'), { recursive: true });
    mkdirSync(join(TEST_INTEL_DIR, 'trends'), { recursive: true });
    mkdirSync(join(TEST_INTEL_DIR, 'personas'), { recursive: true });

    // 샘플 경쟁사 데이터
    const competitor1: CompetitorAnalysis = {
      company: 'TestSaaS',
      analyzedAt: '2026-05-02T10:00:00.000Z',
      pricing: {
        tiers: [
          { name: 'Free', price: 0, billingCycle: 'monthly' },
          { name: 'Pro', price: 29, billingCycle: 'monthly' },
        ],
      },
      features: ['API Access', 'Webhooks', 'Custom Domain'],
      positioning: 'Developer-first SaaS platform',
      sources: ['https://testsaas.com/pricing'],
      dataQuality: 'complete',
    };

    const competitor2: CompetitorAnalysis = {
      company: 'AnotherTool',
      analyzedAt: '2026-05-02T11:00:00.000Z',
      pricing: {
        tiers: [{ name: 'Enterprise', price: null, billingCycle: 'annual' }],
      },
      features: ['Analytics', 'Reporting'],
      positioning: 'Enterprise analytics tool',
      sources: ['https://anothertool.com'],
      dataQuality: 'partial',
    };

    // 샘플 트렌드 데이터
    const trend1: TrendData = {
      keyword: 'saas automation',
      analyzedAt: '2026-05-02T10:00:00.000Z',
      mentions: 42,
      sentiment: { positive: 0.7, neutral: 0.2, negative: 0.1 },
      topics: ['workflow', 'integration', 'efficiency'],
      trend: 'rising',
      sources: ['https://reddit.com/r/saas', 'https://news.ycombinator.com'],
    };

    const trend2: TrendData = {
      keyword: 'edge computing',
      analyzedAt: '2026-05-02T10:00:00.000Z',
      mentions: 15,
      sentiment: { positive: 0.6, neutral: 0.3, negative: 0.1 },
      topics: ['serverless', 'CDN', 'performance'],
      trend: 'stable',
      sources: ['https://news.ycombinator.com'],
    };

    // 샘플 페르소나 데이터
    const persona1: PersonaProfile = {
      segment: 'indie hackers',
      analyzedAt: '2026-05-02T10:00:00.000Z',
      jtbd: [
        { job: 'launch MVP quickly', context: 'limited budget and time' },
        { job: 'validate product-market fit', context: 'before scaling' },
      ],
      painPoints: [
        { pain: 'expensive tools', category: 'cost' },
        { pain: 'complex setup', category: 'complexity' },
        { pain: 'slow iteration', category: 'time' },
      ],
      confidence: 'high',
      sources: ['https://reddit.com/r/indiehackers'],
    };

    // 파일 저장 (키워드 'saas' 포함)
    writeFileSync(
      join(TEST_INTEL_DIR, 'competitors/2026-05-02-testsaas.json'),
      JSON.stringify(competitor1, null, 2)
    );

    // 키워드 'saas' 미포함
    writeFileSync(
      join(TEST_INTEL_DIR, 'competitors/2026-05-02-anothertool.json'),
      JSON.stringify(competitor2, null, 2)
    );

    // 트렌드 (키워드 'saas' 포함)
    writeFileSync(
      join(TEST_INTEL_DIR, 'trends/2026-05-02-saas-automation.json'),
      JSON.stringify(trend1, null, 2)
    );

    // 트렌드 (키워드 'saas' 미포함)
    writeFileSync(
      join(TEST_INTEL_DIR, 'trends/2026-05-02-edge-computing.json'),
      JSON.stringify(trend2, null, 2)
    );

    // 페르소나
    writeFileSync(
      join(TEST_INTEL_DIR, 'personas/2026-05-02-indie-hackers.json'),
      JSON.stringify(persona1, null, 2)
    );
  });

  afterAll(() => {
    // 테스트 디렉토리 정리
    if (existsSync(TEST_INTEL_DIR)) {
      rmSync(TEST_INTEL_DIR, { recursive: true, force: true });
    }
  });

  it('aggregates all files when no keyword filter', () => {
    // INTEL_DIR 환경변수를 테스트 디렉토리로 설정
    const result = execSync(
      `INTEL_DIR="${TEST_INTEL_DIR}" node "${AGGREGATE_SCRIPT}" "all"`,
      { encoding: 'utf8' }
    );

    const aggregated = JSON.parse(result);

    expect(aggregated.project).toBe('all');
    expect(aggregated.competitors).toHaveLength(2);
    expect(aggregated.trends).toHaveLength(2);
    expect(aggregated.personas).toHaveLength(1);
    expect(aggregated.totalFiles).toBe(5);
    expect(aggregated.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('filters files by project keyword', () => {
    const result = execSync(
      `INTEL_DIR="${TEST_INTEL_DIR}" node "${AGGREGATE_SCRIPT}" "saas"`,
      { encoding: 'utf8' }
    );

    const aggregated = JSON.parse(result);

    expect(aggregated.project).toBe('saas');

    // 'saas' 키워드 포함: testsaas.json, saas-automation.json
    // 파일명 또는 내용에 'saas' 포함된 것만 필터링
    expect(aggregated.totalFiles).toBeGreaterThan(0);

    // 최소한 saas-automation 트렌드는 포함되어야 함
    expect(aggregated.trends.length).toBeGreaterThan(0);
    const hasSaasAutomation = aggregated.trends.some(
      (t: TrendData) => t.keyword === 'saas automation'
    );
    expect(hasSaasAutomation).toBe(true);
  });

  it('returns error when no matching files', () => {
    try {
      execSync(
        `INTEL_DIR="${TEST_INTEL_DIR}" node "${AGGREGATE_SCRIPT}" "nonexistent-keyword-xyz"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      // 실패해야 함
      expect(true).toBe(false);
    } catch (error: any) {
      // exit code 1로 종료되어야 함
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toContain('관련 데이터 없음');
    }
  });

  it('validates output JSON structure', () => {
    const result = execSync(
      `INTEL_DIR="${TEST_INTEL_DIR}" node "${AGGREGATE_SCRIPT}" "all"`,
      { encoding: 'utf8' }
    );

    const aggregated = JSON.parse(result);

    // 필수 필드 검증
    expect(aggregated).toHaveProperty('project');
    expect(aggregated).toHaveProperty('generatedAt');
    expect(aggregated).toHaveProperty('competitors');
    expect(aggregated).toHaveProperty('trends');
    expect(aggregated).toHaveProperty('personas');
    expect(aggregated).toHaveProperty('totalFiles');

    // 배열 타입 검증
    expect(Array.isArray(aggregated.competitors)).toBe(true);
    expect(Array.isArray(aggregated.trends)).toBe(true);
    expect(Array.isArray(aggregated.personas)).toBe(true);

    // 숫자 타입 검증
    expect(typeof aggregated.totalFiles).toBe('number');
  });
});
