// intel-types.ts
// Phase 2: 시장·사용자 인텔리전스 타입 정의

/**
 * 경쟁사 분석 결과
 */
export interface CompetitorAnalysis {
  company: string;
  analyzedAt: string; // ISO 8601
  pricing: {
    tiers: Array<{
      name: string; // "Free" / "Pro" / "Enterprise"
      price: number | null; // 월 USD, null이면 contact sales
      billingCycle: 'monthly' | 'annual';
    }>;
  };
  features: string[]; // 핵심 기능 5-10개
  positioning: string; // 차별화 메시지 200자 이내
  sources: string[]; // URL 목록
  dataQuality: 'complete' | 'partial' | 'low'; // 데이터 충분성
}

/**
 * 트렌드 데이터
 */
export interface TrendData {
  keyword: string;
  analyzedAt: string; // ISO 8601
  mentions: number; // 최근 30일 추정치
  sentiment: {
    positive: number; // 0-1
    neutral: number;
    negative: number;
  };
  topics: string[]; // 핵심 논의 3-5개
  trend: 'rising' | 'stable' | 'declining' | 'dormant';
  sources: string[];
}

/**
 * 페르소나 프로필
 */
export interface PersonaProfile {
  segment: string; // "solo founders" / "marketing agencies"
  analyzedAt: string; // ISO 8601
  jtbd: Array<{
    job: string; // "automate social media posting"
    context: string; // "while focusing on product development"
  }>;
  painPoints: Array<{
    pain: string;
    category: 'time' | 'cost' | 'complexity' | 'quality';
  }>;
  confidence: 'high' | 'medium' | 'low'; // 데이터 신뢰도
  sources: string[];
}

/**
 * 통합 인텔리전스 리포트 (/intel brief용)
 */
export interface IntelBrief {
  project: string;
  generatedAt: string;
  competitors: CompetitorAnalysis[];
  trends: TrendData[];
  personas: PersonaProfile[];
}

/**
 * 타입 가드: CompetitorAnalysis 검증
 */
export function isCompetitorAnalysis(data: unknown): data is CompetitorAnalysis {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  return (
    typeof d.company === 'string' &&
    typeof d.analyzedAt === 'string' &&
    typeof d.pricing === 'object' &&
    Array.isArray((d.pricing as { tiers: unknown }).tiers) &&
    Array.isArray(d.features) &&
    typeof d.positioning === 'string' &&
    Array.isArray(d.sources) &&
    ['complete', 'partial', 'low'].includes(d.dataQuality as string)
  );
}

/**
 * 타입 가드: TrendData 검증
 */
export function isTrendData(data: unknown): data is TrendData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  return (
    typeof d.keyword === 'string' &&
    typeof d.analyzedAt === 'string' &&
    typeof d.mentions === 'number' &&
    typeof d.sentiment === 'object' &&
    Array.isArray(d.topics) &&
    ['rising', 'stable', 'declining', 'dormant'].includes(d.trend as string) &&
    Array.isArray(d.sources)
  );
}

/**
 * 타입 가드: PersonaProfile 검증
 */
export function isPersonaProfile(data: unknown): data is PersonaProfile {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  return (
    typeof d.segment === 'string' &&
    typeof d.analyzedAt === 'string' &&
    Array.isArray(d.jtbd) &&
    Array.isArray(d.painPoints) &&
    ['high', 'medium', 'low'].includes(d.confidence as string) &&
    Array.isArray(d.sources)
  );
}

/**
 * JSON 파일 슬러그 생성 (파일명용)
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * ISO 8601 날짜 생성
 */
export function getISODate(): string {
  return new Date().toISOString();
}
