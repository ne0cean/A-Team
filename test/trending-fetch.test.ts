// Stage 10 Weekly Auto-Research — pure function tests
import { describe, it, expect } from 'vitest';
import { normalizeRepo, filterNew, summarizeForPrompt } from '../scripts/trending-fetch.mjs';

describe('Stage 10 — trending-fetch pure functions', () => {
  describe('normalizeRepo', () => {
    it('extracts core fields from GitHub API response', () => {
      const api = {
        full_name: 'org/repo',
        html_url: 'https://github.com/org/repo',
        description: 'Test repo',
        stargazers_count: 5000,
        forks_count: 100,
        language: 'TypeScript',
        license: { spdx_id: 'MIT' },
        pushed_at: '2026-04-14T00:00:00Z',
        topics: ['ai', 'llm', 'agent'],
      };
      const r = normalizeRepo(api, 'ai-agents');
      expect(r.name).toBe('org/repo');
      expect(r.stars).toBe(5000);
      expect(r.license).toBe('MIT');
      expect(r.source_topic).toBe('ai-agents');
      expect(r.topics).toEqual(['ai', 'llm', 'agent']);
    });

    it('handles missing fields gracefully', () => {
      const api = { full_name: 'x/y' };
      const r = normalizeRepo(api);
      expect(r.stars).toBe(0);
      expect(r.language).toBe('unknown');
      expect(r.license).toBe('unknown');
      expect(r.topics).toEqual([]);
    });
  });

  describe('filterNew', () => {
    const repos = [
      { name: 'a/a', stars: 100 } as any,
      { name: 'B/B', stars: 200 } as any,
      { name: 'c/c', stars: 300 } as any,
    ];

    it('excludes known repos (case-insensitive)', () => {
      const result = filterNew(repos, ['a/a', 'b/b']);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('c/c');
    });

    it('passthrough when no known list', () => {
      expect(filterNew(repos)).toEqual(repos);
    });
  });

  describe('summarizeForPrompt', () => {
    it('truncates description to 200 chars + topics to 5', () => {
      const repos: any[] = [
        {
          name: 'org/repo',
          url: 'u',
          stars: 1,
          language: 'TS',
          license: 'MIT',
          description: 'x'.repeat(300),
          topics: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        },
      ];
      const result = summarizeForPrompt(repos, 10);
      expect(result[0].description.length).toBe(200);
      expect(result[0].topics.length).toBe(5);
    });

    it('limits to maxRepos', () => {
      const repos = Array.from({ length: 15 }, (_, i) => ({
        name: `r${i}`, url: '', stars: i, language: '', license: '', description: '', topics: [],
      } as any));
      expect(summarizeForPrompt(repos, 5).length).toBe(5);
    });
  });
});
