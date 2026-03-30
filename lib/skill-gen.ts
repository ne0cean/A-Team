/**
 * SKILL.md Template Pipeline
 *
 * Renders .tmpl files by replacing {{PLACEHOLDER}} with resolver output.
 * Supports: discovery, rendering, freshness checking, dry-run mode.
 *
 * Pipeline: read .tmpl → find {{PLACEHOLDERS}} → resolve → write .md
 */

import * as fs from 'fs';
import * as path from 'path';

// --- Types ---

export type Resolver = () => string;

export interface TemplatePair {
  tmplPath: string;
  outputPath: string;
  skillName: string;
}

export interface FreshnessResult {
  fresh: boolean;
  diff?: string;
}

export interface TemplateResult {
  outputPath: string;
  rendered: string;
  placeholders: string[];
  unresolved: string[];
}

// --- Rendering ---

const PLACEHOLDER_RE = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;

export function renderTemplate(
  template: string,
  resolvers: Record<string, Resolver>,
): string {
  return template.replace(PLACEHOLDER_RE, (_match, name: string) => {
    const resolver = resolvers[name];
    if (resolver) {
      return resolver();
    }
    return `<!-- UNRESOLVED: ${name} -->`;
  });
}

// --- Discovery ---

export function discoverTemplates(rootDir: string, skillsDir: string): TemplatePair[] {
  const base = path.join(rootDir, skillsDir);
  if (!fs.existsSync(base)) return [];

  const pairs: TemplatePair[] = [];

  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const dir = path.join(base, entry.name);
    const tmplPath = path.join(dir, 'SKILL.md.tmpl');

    if (fs.existsSync(tmplPath)) {
      pairs.push({
        tmplPath,
        outputPath: path.join(dir, 'SKILL.md'),
        skillName: entry.name,
      });
    }
  }

  return pairs;
}

// --- Freshness ---

export function checkFreshness(
  tmplPath: string,
  outputPath: string,
  resolvers: Record<string, Resolver>,
): FreshnessResult {
  if (!fs.existsSync(outputPath)) {
    return { fresh: false, diff: 'output file missing' };
  }

  const template = fs.readFileSync(tmplPath, 'utf-8');
  const rendered = renderTemplate(template, resolvers);
  const committed = fs.readFileSync(outputPath, 'utf-8');

  if (rendered === committed) {
    return { fresh: true };
  }

  return {
    fresh: false,
    diff: `STALE: ${outputPath}`,
  };
}

// --- Generation ---

export function generateSkill(
  tmplPath: string,
  outputPath: string,
  resolvers: Record<string, Resolver>,
  dryRun = false,
): TemplateResult {
  const template = fs.readFileSync(tmplPath, 'utf-8');

  // Extract all placeholders
  const placeholders: string[] = [];
  const unresolved: string[] = [];
  let match;
  const re = new RegExp(PLACEHOLDER_RE.source, 'g');
  while ((match = re.exec(template)) !== null) {
    const name = match[1];
    if (!placeholders.includes(name)) placeholders.push(name);
    if (!resolvers[name] && !unresolved.includes(name)) unresolved.push(name);
  }

  const rendered = renderTemplate(template, resolvers);

  if (!dryRun) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, rendered);
  }

  return { outputPath, rendered, placeholders, unresolved };
}
