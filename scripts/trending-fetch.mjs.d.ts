export interface TrendingRepo {
  name: string;
  url: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  license: string;
  pushed_at: string;
  topics: string[];
  source_topic: string;
}

export function fetchTrending(options?: {
  topics?: string[];
  perTopic?: number;
  since?: string;
}): Promise<TrendingRepo[]>;

export function normalizeRepo(item: any, topic?: string): TrendingRepo;

export function fetchReadme(fullName: string): Promise<string | null>;

export function filterNew(
  repos: TrendingRepo[],
  knownRepoNames?: string[]
): TrendingRepo[];

export function summarizeForPrompt(
  repos: TrendingRepo[],
  maxRepos?: number
): Array<{
  name: string;
  url: string;
  stars: number;
  language: string;
  license: string;
  description: string;
  topics: string[];
}>;
