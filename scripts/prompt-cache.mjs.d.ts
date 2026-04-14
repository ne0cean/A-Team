// RFC-001 Prompt Caching — TypeScript declarations for scripts/prompt-cache.mjs

export interface CacheBlock {
  type: 'text';
  text: string;
  cache_control?: {
    type: 'ephemeral';
    ttl?: '1h' | '5m';
  };
}

export interface CacheUsage {
  cacheHit: boolean;
  readTokens: number;
  writeTokens: number;
}

export function buildCachedSystemPrompt(
  sessionPrompt: string,
  options?: { longLivedPrefix?: string }
): string | CacheBlock[];

export function analyzeCacheUsage(usage: any): CacheUsage;

export function cacheVersionHash(filePath: string): string;

export function withVersionMarker(
  sessionContent: string,
  filePath?: string
): string;
