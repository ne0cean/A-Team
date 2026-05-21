import { describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import path from 'path';
import { loadManifest, validateManifest } from '../scripts/ppt/benchmark-corpus.mjs';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'ppt', 'benchmark-corpus.mjs');

describe('ppt benchmark corpus', () => {
  it('validates the official-source manifest', () => {
    const manifest = loadManifest();
    const result = validateManifest(manifest);
    expect(result).toEqual({ ok: true, errors: [] });
    expect(manifest.sources.length).toBeGreaterThanOrEqual(5);
  });

  it('prints validate summary from CLI', () => {
    const stdout = execFileSync('node', [SCRIPT, 'validate'], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.rubricWeight).toBe(100);
  });

  it('rejects unofficial source domains', () => {
    const manifest = loadManifest();
    const result = validateManifest({
      ...manifest,
      sources: [
        ...manifest.sources,
        {
          id: 'bad-source',
          firm: 'Unknown',
          title: 'Unofficial Deck',
          sourceType: 'pdf',
          pageUrl: 'https://example.com/deck.pdf',
          pdfUrl: 'https://example.com/deck.pdf',
          acquisition: 'direct_pdf',
          benchmarkFocus: ['layout'],
          priority: 'low'
        }
      ]
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some(error => error.includes('official domain allowlist'))).toBe(true);
  });
});
