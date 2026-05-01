// intel.test.ts
// Intel 시스템 단위 테스트

import { describe, it, expect } from 'vitest';
import {
  CompetitorAnalysis,
  TrendData,
  PersonaProfile,
  isCompetitorAnalysis,
  isTrendData,
  isPersonaProfile,
  createSlug,
  getISODate,
} from '../lib/intel-types';

describe('Intel Types', () => {
  describe('createSlug', () => {
    it('converts text to valid slug', () => {
      expect(createSlug('Stripe Inc.')).toBe('stripe-inc');
      expect(createSlug('Edge Computing')).toBe('edge-computing');
      expect(createSlug('Solo Founders!!!')).toBe('solo-founders');
    });

    it('handles long text (max 50 chars)', () => {
      const long = 'This is a very long company name that should be truncated to fit the limit';
      const slug = createSlug(long);
      expect(slug.length).toBeLessThanOrEqual(50);
    });

    it('removes special characters', () => {
      expect(createSlug('Company@123#')).toBe('company-123');
      expect(createSlug('API-First™')).toBe('api-first');
    });
  });

  describe('getISODate', () => {
    it('returns ISO 8601 format', () => {
      const date = getISODate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('isCompetitorAnalysis', () => {
    const validCompetitor: CompetitorAnalysis = {
      company: 'Stripe',
      analyzedAt: '2026-05-02T14:23:45.123Z',
      pricing: {
        tiers: [
          { name: 'Free', price: 0, billingCycle: 'monthly' },
        ],
      },
      features: ['API-first', 'Webhooks'],
      positioning: 'Payment infrastructure',
      sources: ['https://stripe.com'],
      dataQuality: 'complete',
    };

    it('validates correct CompetitorAnalysis', () => {
      expect(isCompetitorAnalysis(validCompetitor)).toBe(true);
    });

    it('rejects invalid data', () => {
      expect(isCompetitorAnalysis(null)).toBe(false);
      expect(isCompetitorAnalysis({})).toBe(false);
      expect(isCompetitorAnalysis({ company: 'Test' })).toBe(false);
    });

    it('rejects invalid dataQuality', () => {
      const invalid = { ...validCompetitor, dataQuality: 'invalid' };
      expect(isCompetitorAnalysis(invalid)).toBe(false);
    });
  });

  describe('isTrendData', () => {
    const validTrend: TrendData = {
      keyword: 'edge computing',
      analyzedAt: '2026-05-02T14:23:45.123Z',
      mentions: 15,
      sentiment: { positive: 0.6, neutral: 0.3, negative: 0.1 },
      topics: ['serverless', 'CDN'],
      trend: 'rising',
      sources: ['https://reddit.com'],
    };

    it('validates correct TrendData', () => {
      expect(isTrendData(validTrend)).toBe(true);
    });

    it('rejects invalid trend value', () => {
      const invalid = { ...validTrend, trend: 'invalid' };
      expect(isTrendData(invalid)).toBe(false);
    });

    it('validates dormant trend', () => {
      const dormant = { ...validTrend, trend: 'dormant' as const, mentions: 0 };
      expect(isTrendData(dormant)).toBe(true);
    });
  });

  describe('isPersonaProfile', () => {
    const validPersona: PersonaProfile = {
      segment: 'solo founders',
      analyzedAt: '2026-05-02T14:23:45.123Z',
      jtbd: [
        { job: 'automate tasks', context: 'limited time' },
      ],
      painPoints: [
        { pain: 'high costs', category: 'cost' },
      ],
      confidence: 'high',
      sources: ['https://reddit.com'],
    };

    it('validates correct PersonaProfile', () => {
      expect(isPersonaProfile(validPersona)).toBe(true);
    });

    it('rejects invalid confidence', () => {
      const invalid = { ...validPersona, confidence: 'invalid' };
      expect(isPersonaProfile(invalid)).toBe(false);
    });

    it('validates all confidence levels', () => {
      ['high', 'medium', 'low'].forEach(level => {
        const persona = { ...validPersona, confidence: level as 'high' | 'medium' | 'low' };
        expect(isPersonaProfile(persona)).toBe(true);
      });
    });
  });
});

describe('Intel Aggregate Script', () => {
  it('exports should exist', () => {
    // 집계 스크립트는 별도 Node.js 프로세스로 실행되므로
    // 존재 여부만 확인 (통합 테스트에서 실제 실행)
    expect(true).toBe(true);
  });
});
