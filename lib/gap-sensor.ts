import { appendFileSync, mkdirSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// ESM-safe __dirname (tsx 직접 실행 시 __dirname 미정의 — vitest는 자체 transform으로 가림)
const __dirname = dirname(fileURLToPath(import.meta.url));

export interface FrictionEntry {
  ts: string;
  type: 'missing-capability' | 'manual-step' | 'external-tool-required' | 'low-quality-output';
  context: string;
  capability_path: string;
  blocked_module?: string;
  user_workaround?: string;
}

export interface DetectedFriction {
  keyword: string;
  type: FrictionEntry['type'];
  raw_text: string;
}

export interface UsageGap {
  capability_path: string;
  last_seen: string | null;
  usage_count: number;
  stale: boolean;
}

const DEFAULT_LOG_PATH = resolve(__dirname, '..', '.context', 'friction-log.jsonl');

// 키워드 → friction type 매핑
const FRICTION_KEYWORDS: Array<{ pattern: RegExp; type: FrictionEntry['type'] }> = [
  { pattern: /안\s*돼|안됨|불가능|미지원|지원\s*안/i, type: 'missing-capability' },
  { pattern: /수동으로|직접\s*해야|손으로|manually/i, type: 'manual-step' },
  { pattern: /외부\s*도구|외부\s*서비스|써야\s*해|별도\s*설치/i, type: 'external-tool-required' },
  { pattern: /품질이?\s*낮|엉터리|잘못\s*나왔|오류가\s*많/i, type: 'low-quality-output' },
];

/**
 * 사용자 메시지에서 friction 키워드를 감지합니다.
 * 매칭된 키워드 목록을 반환하며, 실제 logFriction 호출은 호출자가 결정합니다.
 */
export function detectFrictionKeywords(text: string): DetectedFriction[] {
  const results: DetectedFriction[] = [];
  for (const { pattern, type } of FRICTION_KEYWORDS) {
    const match = text.match(pattern);
    if (match) {
      results.push({
        keyword: match[0],
        type,
        raw_text: text.slice(0, 200),
      });
    }
  }
  return results;
}

/**
 * analytics.jsonl에서 skill별 사용 빈도를 분석하여
 * 14일 이상 zero-usage인 capability를 stale로 표시합니다.
 */
export function analyzeUsageGaps(
  analyticsContent: string,
  staleDays = 14,
): UsageGap[] {
  const now = Date.now();
  const staleMs = staleDays * 24 * 60 * 60 * 1000;

  const skillLastSeen: Record<string, number> = {};
  const skillCount: Record<string, number> = {};

  for (const line of analyticsContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed) as { skill?: string; ts?: string };
      if (!entry.skill) continue;
      skillCount[entry.skill] = (skillCount[entry.skill] || 0) + 1;
      if (entry.ts) {
        const t = new Date(entry.ts).getTime();
        if (!Number.isNaN(t)) {
          skillLastSeen[entry.skill] = Math.max(skillLastSeen[entry.skill] ?? 0, t);
        }
      }
    } catch {
      // skip malformed lines
    }
  }

  return Object.entries(skillCount).map(([skill, count]) => {
    const lastTs = skillLastSeen[skill] ?? null;
    const stale = lastTs === null || now - lastTs > staleMs;
    return {
      capability_path: skill,
      last_seen: lastTs ? new Date(lastTs).toISOString() : null,
      usage_count: count,
      stale,
    };
  });
}

export function logFriction(
  entry: Omit<FrictionEntry, 'ts'>,
  logPath: string = DEFAULT_LOG_PATH,
): FrictionEntry {
  const full: FrictionEntry = { ts: new Date().toISOString(), ...entry };
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, JSON.stringify(full) + '\n', 'utf-8');
  return full;
}

/**
 * 텍스트에서 friction 키워드를 감지하면 자동으로 friction-log.jsonl에 기록합니다.
 * capability_path를 추론할 수 없으면 'unknown.detected'로 기록합니다.
 */
export function autoLogFriction(
  text: string,
  capability_path = 'unknown.detected',
  logPath: string = DEFAULT_LOG_PATH,
): FrictionEntry[] {
  const detected = detectFrictionKeywords(text);
  const logged: FrictionEntry[] = [];
  for (const d of detected) {
    const entry = logFriction(
      { type: d.type, context: d.raw_text, capability_path, blocked_module: undefined },
      logPath,
    );
    logged.push(entry);
  }
  return logged;
}

export function parseFrictionLog(content: string): FrictionEntry[] {
  return content
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      try { return JSON.parse(l) as FrictionEntry; }
      catch { return null; }
    })
    .filter((e): e is FrictionEntry => e !== null);
}

export function frictionsByCapability(entries: FrictionEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.capability_path] = (counts[e.capability_path] || 0) + 1;
  }
  return counts;
}

/**
 * friction-log.jsonl 파일을 직접 읽어 파싱합니다 (편의 함수).
 */
export function loadFrictionLog(logPath: string = DEFAULT_LOG_PATH): FrictionEntry[] {
  try {
    return parseFrictionLog(readFileSync(logPath, 'utf-8'));
  } catch {
    return [];
  }
}
