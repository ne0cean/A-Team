// RFC-001 Prompt Caching — Phase 1
// Opt-in via ENABLE_PROMPT_CACHING env flag (default OFF, Criterion 8 준수)
// Anthropic spec: system prompt에 cache_control 주입하여 1h/5min TTL 캐시
// Governance: governance/rules/truth-contract.md Cache invalidation via mtime hash

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
