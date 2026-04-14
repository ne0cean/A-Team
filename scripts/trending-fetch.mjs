// GitHub Trending fetcher — Stage 10 Weekly Auto-Research
// API: GitHub REST search (public, no auth needed for read)
// Fallback: trending.codehub / gh trending if REST rate limit
// Governance: governance/workflows/eternal-growth.md

const GH_API = 'https://api.github.com';

/**
 * GitHub 검색으로 최근 1주일 star 증가 상위 repo 수집.
 *
 * @param {object} options
 * @param {string[]} options.topics - 관심 topic list (e.g., ['ai-agent', 'llm', 'claude-code'])
 * @param {number} options.perTopic - topic당 수집 수 (default 5)
 * @param {string} options.since - ISO date (default: 7일 전)
 * @returns {Promise<Array>} normalized repo list
 */
export async function fetchTrending(options = {}) {
  const {
    topics = ['ai-agents', 'llm', 'claude-code', 'agent-framework', 'developer-tools'],
    perTopic = 5,
    since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  } = options;

  const all = new Map();

  for (const topic of topics) {
    try {
      const q = encodeURIComponent(`topic:${topic} pushed:>${since}`);
      const url = `${GH_API}/search/repositories?q=${q}&sort=stars&order=desc&per_page=${perTopic}`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'A-Team-Weekly-Research',
          ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
        },
      });
      if (!res.ok) {
        console.error(`[trending] ${topic} fetch failed: ${res.status}`);
        continue;
      }
      const data = await res.json();
      for (const item of data.items || []) {
        if (!all.has(item.full_name)) {
          all.set(item.full_name, normalizeRepo(item, topic));
        }
      }
    } catch (err) {
      console.error(`[trending] ${topic} error: ${err.message}`);
    }
  }

  return Array.from(all.values()).sort((a, b) => b.stars - a.stars);
}

export function normalizeRepo(item, topic = '') {
  return {
    name: item.full_name,
    url: item.html_url,
    description: item.description || '',
    stars: item.stargazers_count || 0,
    forks: item.forks_count || 0,
    language: item.language || 'unknown',
    license: item.license?.spdx_id || 'unknown',
    pushed_at: item.pushed_at,
    topics: item.topics || [],
    source_topic: topic,
  };
}

/**
 * Fetch README (first 10KB) for analysis.
 */
export async function fetchReadme(fullName) {
  try {
    const url = `${GH_API}/repos/${fullName}/readme`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.raw',
        'User-Agent': 'A-Team-Weekly-Research',
        ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 10000); // first 10KB
  } catch {
    return null;
  }
}

/**
 * Filter: ignore already-surveyed repos (from previous weeks).
 * @param {Array} repos
 * @param {string[]} knownRepoNames - e.g., rejected candidates from REJECTED.md
 */
export function filterNew(repos, knownRepoNames = []) {
  const known = new Set(knownRepoNames.map(n => n.toLowerCase()));
  return repos.filter(r => !known.has(r.name.toLowerCase()));
}

/**
 * Compact summary for downstream Claude prompting (keep tokens low).
 */
export function summarizeForPrompt(repos, maxRepos = 8) {
  return repos.slice(0, maxRepos).map(r => ({
    name: r.name,
    url: r.url,
    stars: r.stars,
    language: r.language,
    license: r.license,
    description: (r.description || '').slice(0, 200),
    topics: r.topics.slice(0, 5),
  }));
}
