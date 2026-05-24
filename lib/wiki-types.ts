// Wiki 복리 시스템 타입 정의
// 지식이 세션마다 축적되고, 링크가 늘어나고, quality가 올라가는 복리 구조

export interface WikiEntry {
  id: string;           // kebab-case 고유 ID (예: bash-variable-korean-bug)
  title: string;        // 사람이 읽기 좋은 제목
  category: WikiCategory;
  tags: string[];       // 검색 가능한 태그
  content: string;      // 핵심 지식/인사이트 (Markdown)
  source: string;       // 출처 (session, command, manual, experiment)
  created: string;      // ISO 8601 날짜
  updated: string;      // 마지막 갱신 날짜
  links: string[];      // 연관 WikiEntry ID (복리: 링크가 늘수록 가치 상승)
  quality: number;      // 0-100 (wiki-lint가 채점)
  version: number;      // 갱신 횟수 (복리 성장 지표)
}

export type WikiCategory =
  | 'bash'        // Shell 스크립팅 패턴/버그
  | 'typescript'  // TS 패턴/트릭
  | 'architecture'// 시스템 설계 결정
  | 'workflow'    // Claude Code 워크플로우
  | 'security'    // 보안 패턴
  | 'debugging'   // 디버깅 인사이트
  | 'testing'     // 테스팅 전략
  | 'governance'  // 거버넌스/규칙
  | 'misc';       // 기타

export interface WikiFrontmatter {
  id: string;
  title: string;
  category: WikiCategory;
  tags: string[];
  source: string;
  created: string;
  updated: string;
  links: string[];
  quality: number;
  version: number;
}

export interface WikiLintResult {
  file: string;
  id: string;
  issues: WikiLintIssue[];
  score: number;   // 0-100
  passed: boolean;
}

export interface WikiLintIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
}

// Type guard
export function isWikiCategory(s: string): s is WikiCategory {
  return ['bash','typescript','architecture','workflow','security','debugging','testing','governance','misc'].includes(s);
}

// Parse frontmatter from .md file content
export function parseFrontmatter(content: string): { fm: WikiFrontmatter | null; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { fm: null, body: content };
  try {
    // Simple YAML parser for our known fields
    const yaml = match[1];
    const body = match[2];
    const fm: Record<string, unknown> = {};
    for (const line of yaml.split('\n')) {
      const [key, ...rest] = line.split(':');
      if (!key || !rest.length) continue;
      const val = rest.join(':').trim();
      if (val.startsWith('[')) {
        fm[key.trim()] = JSON.parse(val.replace(/'/g, '"'));
      } else if (!isNaN(Number(val))) {
        fm[key.trim()] = Number(val);
      } else {
        fm[key.trim()] = val.replace(/^"|"$/g, '');
      }
    }
    return { fm: fm as unknown as WikiFrontmatter, body };
  } catch {
    return { fm: null, body: content };
  }
}
