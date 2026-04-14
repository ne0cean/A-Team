// RFC-001 Prompt Caching — Phase 1
// Opt-in via ENABLE_PROMPT_CACHING env flag (default OFF, Criterion 8 준수)
// Anthropic spec: system prompt에 cache_control 주입하여 1h/5min TTL 캐시
// Governance: governance/rules/truth-contract.md
// Cross-RFC-001×002 F6 — Cache invalidation via mtime hash version marker

/**
 * Build a cached system prompt or return plain string based on opt-in flag.
 *
 * @param {string} sessionPrompt - 5min TTL session content (e.g., CURRENT.md)
 * @param {object} options
 * @param {string} options.longLivedPrefix - 1h TTL stable content (e.g., CLAUDE.md + rules). Empty string → only session block.
 * @returns {string | Array<{type: 'text', text: string, cache_control?: {type: 'ephemeral', ttl?: '1h'}}>}
 */
export function buildCachedSystemPrompt(sessionPrompt, options = {}) {
  const { longLivedPrefix = '' } = options;

  // Opt-in: default OFF (ENABLE_PROMPT_CACHING=true 명시 시에만 활성)
  if (process.env.ENABLE_PROMPT_CACHING !== 'true') {
    // Plain string — backward compatible
    return longLivedPrefix
      ? `${longLivedPrefix}\n\n${sessionPrompt}`
      : sessionPrompt;
  }

  // Cache-control array (Anthropic spec)
  // F6: 1h block must be BEFORE 5min block (invalidation 순서 강제)
  const blocks = [];

  if (longLivedPrefix) {
    blocks.push({
      type: 'text',
      text: longLivedPrefix,
      cache_control: { type: 'ephemeral', ttl: '1h' },
    });
  }

  // Session block — default TTL (5min), ttl 미지정 시 5min 기본
  blocks.push({
    type: 'text',
    text: sessionPrompt,
    cache_control: { type: 'ephemeral' },
  });

  return blocks;
}

/**
 * RFC-001 × RFC-002 Cross-integration — Cache invalidation hash.
 * Compressed HANDOFF_PROMPT or CURRENT.md의 mtime 기반 version marker 생성.
 * Cache breakpoint 바로 앞에 `<!-- v:{hash} -->` 주석으로 삽입 → content 변경 시 자동 invalidation.
 *
 * @param {string} filePath
 * @returns {string} short hash (8 hex chars)
 */
export function cacheVersionHash(filePath) {
  try {
    // Dynamic import — sync API
    // eslint-disable-next-line
    const fs = require('fs');
    const crypto = require('crypto');
    const stat = fs.statSync(filePath);
    const mtime = stat.mtimeMs || stat.mtime.getTime();
    const size = stat.size;
    return crypto
      .createHash('sha256')
      .update(`${filePath}:${mtime}:${size}`)
      .digest('hex')
      .slice(0, 8);
  } catch {
    return 'nohash';
  }
}

/**
 * Build session block with version marker for cache invalidation.
 * @param {string} sessionContent
 * @param {string} [filePath] - Optional path for mtime-based versioning
 * @returns {string} content with `<!-- v:{hash} -->` prefix
 */
export function withVersionMarker(sessionContent, filePath) {
  if (!filePath) return sessionContent;
  const hash = cacheVersionHash(filePath);
  return `<!-- v:${hash} -->\n${sessionContent}`;
}

/**
 * Analyze Anthropic response usage for cache hit tracking.
 * @param {object} usage - Anthropic response.usage
 * @returns {{cacheHit: boolean, readTokens: number, writeTokens: number}}
 */
export function analyzeCacheUsage(usage) {
  if (!usage) return { cacheHit: false, readTokens: 0, writeTokens: 0 };
  const readTokens = usage.cache_read_input_tokens || 0;
  const writeTokens = usage.cache_creation_input_tokens || 0;
  return {
    cacheHit: readTokens > 0,
    readTokens,
    writeTokens,
  };
}
