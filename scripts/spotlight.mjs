// RFC-007 Spotlighting Phase S — 무신뢰 입력 delimiting
// Opt-in via A_TEAM_SPOTLIGHT (default="0", off)
// Modes: delimiting (Phase S) / datamarking (Phase M, 미구현) / encoding (Phase L, 미구현)
// Governance: governance/rules/spotlighting.md (to be created), rfc/RFC-007

import crypto from 'crypto';

/**
 * Generate per-session marker (deterministic within session).
 * @returns {string} 8-char hex
 */
export function getSessionMarker() {
  const sessionId = process.env.ATEAM_SESSION_ID || String(process.pid);
  return crypto.createHash('sha256').update(`spotlight:${sessionId}`).digest('hex').slice(0, 8);
}

/**
 * Wrap untrusted content in delimiters.
 * Phase S mode: randomized (per-session) delimiter tags.
 * @param {string} content - untrusted text
 * @param {string} source - origin (e.g., "WebFetch", "RAG", "FileRead")
 * @returns {string} delimited content
 */
export function applyDelimiting(content, source = 'unknown') {
  if (typeof content !== 'string' || content.length === 0) return content;
  const marker = getSessionMarker();
  const prefix = `<<UNTRUSTED_START_${marker} src="${source}">>`;
  const suffix = `<<UNTRUSTED_END_${marker}>>`;
  return `${prefix}\n${content}\n${suffix}`;
}

/**
 * Check if spotlighting is enabled for a given mode.
 * @returns {"delimiting" | "datamarking" | "encoding" | null}
 */
export function getSpotlightMode() {
  const val = process.env.A_TEAM_SPOTLIGHT;
  if (!val || val === '0' || val === 'false') return null;
  if (val === 'delimiting' || val === '1' || val === 'true') return 'delimiting';
  if (val === 'datamarking') return 'datamarking'; // Phase M
  if (val === 'encoding') return 'encoding';       // Phase L
  return null;
}

/**
 * RFC-007 Phase M — Datamarking: inject special token at whitespace boundaries.
 * Harder for injected instructions to reconstruct coherent imperatives.
 * @param {string} content
 * @param {string} source
 * @returns {string}
 */
export function applyDatamarking(content, source = 'unknown') {
  if (typeof content !== 'string' || content.length === 0) return content;
  const marker = getSessionMarker();
  const datamark = `^${marker.slice(0, 2)}^`;
  // 공백 토큰 사이에 datamark 삽입 (interval ~50 chars)
  const INTERVAL = 50;
  let result = '';
  let since = 0;
  for (let i = 0; i < content.length; i++) {
    result += content[i];
    if (/\s/.test(content[i]) && since >= INTERVAL) {
      result += datamark + ' ';
      since = 0;
    }
    since++;
  }
  // Prefix/suffix tag (source tracking)
  return `<<DATAMARKED src="${source}">>\n${result}\n<<END_DATAMARKED>>`;
}

/**
 * Main entry — wrap untrusted content based on current mode.
 * Untrusted tools (default): WebFetch, WebSearch, Read(http*), RAG
 *
 * @param {string} content
 * @param {object} options
 * @param {string} options.source - tool name
 * @param {boolean} options.isUntrusted - whether content is from untrusted source
 * @returns {string} wrapped or original
 */
export function spotlight(content, options = {}) {
  const { source = 'unknown', isUntrusted = false } = options;
  if (!isUntrusted) return content;

  const mode = getSpotlightMode();
  if (!mode) return content;

  if (mode === 'delimiting') {
    return applyDelimiting(content, source);
  }
  if (mode === 'datamarking') {
    return applyDatamarking(content, source);
  }

  // Phase L (encoding) 미구현 — fallback to datamarking
  console.warn(`[spotlight] ${mode} mode not yet implemented, falling back to datamarking`);
  return applyDatamarking(content, source);
}

/**
 * Detect if a tool call result should be spotlighted.
 * @param {string} toolName
 * @returns {boolean}
 */
export function isUntrustedTool(toolName) {
  const untrustedTools = [
    'WebFetch',
    'WebSearch',
    'mcp__fetch',
    'RAG',
    // Read(http*) 는 URL 패턴 체크 별도
  ];
  return untrustedTools.includes(toolName);
}
