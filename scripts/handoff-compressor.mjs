// RFC-002 Handoff Compression — 5-Layer (Facts/Story/Reasoning/Action/Caution)
// Opt-in via COMPRESSION_MODE env flag (default OFF, Criterion 8 준수)
// Governance: governance/rules/handoff-compression.md (to be created), rfc/RFC-001-002.md

/**
 * Parse CURRENT.md structure into sections.
 * @param {string} md
 * @returns {object} sections keyed by lowercase heading
 */
export function parseCurrentMd(md) {
  const sections = {};
  if (!md || typeof md !== 'string') return sections;

  const lines = md.split('\n');
  let currentSection = 'preamble';
  sections[currentSection] = [];

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      currentSection = h2[1].toLowerCase().replace(/\s+/g, '_');
      sections[currentSection] = [];
      continue;
    }
    if (!sections[currentSection]) sections[currentSection] = [];
    sections[currentSection].push(line);
  }

  // Trim each section
  for (const key of Object.keys(sections)) {
    sections[key] = sections[key].join('\n').trim();
  }

  return sections;
}

/**
 * Extract Facts layer — timestamps, file paths, commit hashes. No reasoning.
 */
function extractFacts(sections) {
  const parts = [];

  // In Progress Files
  if (sections.in_progress_files) {
    parts.push(sections.in_progress_files);
  }

  // Extract date/commit patterns from Last Completions
  if (sections.last_completions_2026_04_14 || sections.last_completions) {
    const lc = sections.last_completions_2026_04_14 || sections.last_completions || '';
    const lines = lc.split('\n').filter(l => {
      // Keep only factual lines: commit hash, dates, file paths, "Added X"
      return /(commit\s+[0-9a-f]{7}|pushed|\d{4}-\d{2}-\d{2}|\.(mjs|ts|md|sh|json)|L\d+)/i.test(l);
    });
    if (lines.length) parts.push(lines.join('\n'));
  }

  return parts.join('\n\n');
}

/**
 * Extract Story layer — narrative of what happened.
 */
function extractStory(sections) {
  const parts = [];
  if (sections.last_completions_2026_04_14 || sections.last_completions) {
    parts.push(sections.last_completions_2026_04_14 || sections.last_completions);
  }
  if (sections.status) parts.push(sections.status);
  return parts.join('\n\n').split('\n').slice(0, 6).join('\n'); // 압축: 최대 6줄
}

/**
 * Extract Reasoning layer — why decisions were made.
 */
function extractReasoning(sections) {
  const parts = [];
  if (sections.reasoning) parts.push(sections.reasoning);
  if (sections.status) parts.push(sections.status);
  // Pull "because/chose/decided/to ensure" sentences from anywhere
  const allText = Object.values(sections).join('\n');
  const reasoningLines = allText.split('\n').filter(l =>
    /(because|chose|decided|to ensure|in order to|since|for backward|compat|trade-off)/i.test(l)
  );
  if (reasoningLines.length) parts.push(reasoningLines.join('\n'));
  return parts.join('\n').trim();
}

/**
 * Extract Action layer — next tasks.
 */
function extractAction(sections) {
  return sections.next_tasks || '';
}

/**
 * Extract Caution layer — blockers and gotchas.
 */
function extractCaution(sections) {
  return sections.blockers || '(none)';
}

/**
 * Main — compress CURRENT.md into 5-layer handoff.
 * @param {string} currentMd
 * @returns {{mode: 'passthrough' | '5layer', output: string, layers?: object}}
 */
export function compress5Layer(currentMd) {
  const mode = process.env.COMPRESSION_MODE;
  if (mode !== 'on') {
    return { mode: 'passthrough', output: currentMd };
  }

  const sections = parseCurrentMd(currentMd);
  const layers = {
    facts: extractFacts(sections),
    story: extractStory(sections),
    reasoning: extractReasoning(sections),
    action: extractAction(sections),
    caution: extractCaution(sections),
  };

  const output = formatHandoff(layers);
  return { mode: '5layer', output, layers };
}

/**
 * Format layers into structured markdown.
 */
export function formatHandoff(layers) {
  const sections = [
    `## FACTS\n${layers.facts || '(none)'}`,
    `## STORY\n${layers.story || '(none)'}`,
    `## REASONING\n${layers.reasoning || '(none)'}`,
    `## ACTION\n${layers.action || '(none)'}`,
    `## CAUTION\n${layers.caution || '(none)'}`,
  ];
  return sections.join('\n\n');
}
