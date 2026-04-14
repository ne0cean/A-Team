// RFC-005 × RFC-007 cross-integration — PII masking for observability traces
// Opt-in via A_TEAM_OBS_MASK env (default="0")
// Order: PII mask → spotlight wrap → trace (emit)
// 이유: spotlight (datamarking/encoding)가 먼저 되면 PII regex가 매칭되지 않음.
// 반드시 PII 제거 먼저, 그 후 untrusted content wrap.

/**
 * Default PII patterns. 외부 config (A_TEAM_PII_CONFIG_PATH)로 확장 가능.
 */
// ORDER MATTERS: API key + SSN + CC 먼저 (prefix/boundary 강함), 그 다음 phone (digit heavy regex)
const DEFAULT_PATTERNS = [
  { name: 'email', re: /[\w\.-]+@[\w\.-]+\.\w+/g, replacement: '[EMAIL]' },
  // API keys first — contains "sk-" prefix so boundary clear
  { name: 'api_key_sk_quoted', re: /['"]sk-[A-Za-z0-9\-_]{20,}['"]/g, replacement: "'[API_KEY]'" },
  { name: 'api_key_sk_bare', re: /\bsk-[A-Za-z0-9\-_]{20,}\b/g, replacement: '[API_KEY]' },
  // SSN: 3-2-4 format
  { name: 'ssn_us', re: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  // Credit card: 4-4-4-4 format
  { name: 'credit_card_spaced', re: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CC]' },
  // Phone last — lookbehind prevents mid-digit match but allows optional + prefix
  { name: 'phone', re: /(?<=^|\s)\+?1?\s*\(?\d{3}\)?[\s\.-]?\d{3}[\s\.-]?\d{4}\b/g, replacement: '[PHONE]' },
];

export function isObsMaskEnabled() {
  return process.env.A_TEAM_OBS_MASK === '1' || process.env.A_TEAM_OBS_MASK === 'true';
}

/**
 * Mask PII in input string.
 * @param {string} text
 * @returns {string}
 */
export function maskPII(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  let result = text;
  for (const { re, replacement } of DEFAULT_PATTERNS) {
    result = result.replace(re, replacement);
  }
  return result;
}

/**
 * Combined pipeline: PII mask → spotlight → ready for trace emit.
 * RFC-005 Langfuse trace 정책: untrusted content은 spotlighted 상태 유지.
 * RFC-007 Spotlighting: PII 제거 후 wrap (역순 불가 — datamark/encoding이 regex를 방해).
 *
 * @param {string} content — 원본 tool output
 * @param {object} options
 * @param {string} options.source — tool name
 * @param {boolean} options.isUntrusted — 무신뢰 소스 여부
 * @param {(text: string, opts: object) => string} [options.spotlight] — spotlight 함수 (DI for testability)
 * @returns {string}
 */
export function pipelineForTrace(content, options = {}) {
  const { source = 'unknown', isUntrusted = false, spotlight } = options;

  // Step 1: PII mask (opt-in)
  const maskEnabled = isObsMaskEnabled();
  const masked = maskEnabled ? maskPII(content) : content;

  // Step 2: Spotlight (opt-in, untrusted만)
  if (isUntrusted && typeof spotlight === 'function') {
    return spotlight(masked, { source, isUntrusted: true });
  }

  return masked;
}
