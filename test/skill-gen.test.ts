import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  renderTemplate,
  discoverTemplates,
  checkFreshness,
  type Resolver,
  type TemplateResult,
} from '../lib/skill-gen.js';

const TEST_DIR = path.join(os.tmpdir(), 'a-team-skill-gen-test-' + process.pid);

beforeEach(() => {
  fs.mkdirSync(path.join(TEST_DIR, 'skills', 'review'), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'skills', 'ship'), { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('renderTemplate', () => {
  it('should replace {{PLACEHOLDER}} with resolver output', () => {
    const tmpl = `# Review Skill\n\n{{PREAMBLE}}\n\n## Main\nDo the review.\n\n{{CONFIDENCE}}\n`;
    const resolvers: Record<string, Resolver> = {
      PREAMBLE: () => '## Preamble\nRun setup first.',
      CONFIDENCE: () => '## Confidence\nScore 1-10.',
    };

    const result = renderTemplate(tmpl, resolvers);
    expect(result).toContain('## Preamble');
    expect(result).toContain('Run setup first.');
    expect(result).toContain('## Confidence');
    expect(result).toContain('Score 1-10.');
    expect(result).not.toContain('{{PREAMBLE}}');
    expect(result).not.toContain('{{CONFIDENCE}}');
  });

  it('should leave unresolved placeholders with a warning comment', () => {
    const tmpl = `# Skill\n\n{{UNKNOWN_RESOLVER}}\n`;
    const resolvers: Record<string, Resolver> = {};

    const result = renderTemplate(tmpl, resolvers);
    expect(result).toContain('<!-- UNRESOLVED: UNKNOWN_RESOLVER -->');
  });

  it('should handle templates with no placeholders', () => {
    const tmpl = '# Simple skill\n\nNo placeholders here.';
    const result = renderTemplate(tmpl, {});
    expect(result).toBe(tmpl);
  });

  it('should handle multiple occurrences of same placeholder', () => {
    const tmpl = '{{A}}\nmiddle\n{{A}}';
    const resolvers: Record<string, Resolver> = { A: () => 'resolved' };

    const result = renderTemplate(tmpl, resolvers);
    expect(result).toBe('resolved\nmiddle\nresolved');
  });
});

describe('discoverTemplates', () => {
  it('should find .tmpl files and pair with output paths', () => {
    fs.writeFileSync(path.join(TEST_DIR, 'skills', 'review', 'SKILL.md.tmpl'), '# Review {{PREAMBLE}}');
    fs.writeFileSync(path.join(TEST_DIR, 'skills', 'ship', 'SKILL.md.tmpl'), '# Ship {{PREAMBLE}}');

    const templates = discoverTemplates(TEST_DIR, 'skills');
    expect(templates).toHaveLength(2);
    expect(templates[0].tmplPath).toContain('.tmpl');
    expect(templates[0].outputPath).toContain('SKILL.md');
    expect(templates[0].outputPath).not.toContain('.tmpl');
  });

  it('should return empty array when no templates exist', () => {
    const templates = discoverTemplates(TEST_DIR, 'nonexistent');
    expect(templates).toEqual([]);
  });
});

describe('checkFreshness', () => {
  it('should return fresh when generated matches committed', () => {
    const skillDir = path.join(TEST_DIR, 'skills', 'review');
    const content = '# Review Skill\n\n## Preamble\nSetup.\n';
    fs.writeFileSync(path.join(skillDir, 'SKILL.md.tmpl'), '# Review Skill\n\n{{PREAMBLE}}\n');
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);

    const resolvers: Record<string, Resolver> = {
      PREAMBLE: () => '## Preamble\nSetup.',
    };

    const result = checkFreshness(
      path.join(skillDir, 'SKILL.md.tmpl'),
      path.join(skillDir, 'SKILL.md'),
      resolvers,
    );
    expect(result.fresh).toBe(true);
  });

  it('should return stale when generated differs from committed', () => {
    const skillDir = path.join(TEST_DIR, 'skills', 'review');
    fs.writeFileSync(path.join(skillDir, 'SKILL.md.tmpl'), '# Review\n\n{{PREAMBLE}}\n');
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Review\n\nOLD CONTENT\n');

    const resolvers: Record<string, Resolver> = {
      PREAMBLE: () => 'NEW CONTENT',
    };

    const result = checkFreshness(
      path.join(skillDir, 'SKILL.md.tmpl'),
      path.join(skillDir, 'SKILL.md'),
      resolvers,
    );
    expect(result.fresh).toBe(false);
    expect(result.diff).toBeDefined();
  });

  it('should return stale when output file is missing', () => {
    const skillDir = path.join(TEST_DIR, 'skills', 'review');
    fs.writeFileSync(path.join(skillDir, 'SKILL.md.tmpl'), '# Review\n');

    const result = checkFreshness(
      path.join(skillDir, 'SKILL.md.tmpl'),
      path.join(skillDir, 'SKILL.md'),
      {},
    );
    expect(result.fresh).toBe(false);
  });
});
