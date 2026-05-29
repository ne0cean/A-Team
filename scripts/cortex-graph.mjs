#!/usr/bin/env node
/**
 * cortex-graph.mjs — Cortex 지식 그래프 추출기
 *
 * cortex/*.md 파일에서 frontmatter + 위키링크 + 태그를 파싱하여
 * nodes + edges JSON 그래프를 출력한다.
 *
 * 향후 Neo4j / SQLite 저장 어댑터로 확장 가능한 구조.
 *
 * 사용:
 *   node scripts/cortex-graph.mjs                  # stdout JSON
 *   node scripts/cortex-graph.mjs --out graph.json # 파일 저장
 *   node scripts/cortex-graph.mjs --stats          # 통계만
 *   node scripts/cortex-graph.mjs --adapter sqlite --db cortex.db
 *   node scripts/cortex-graph.mjs --format dot     # Graphviz DOT 출력
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename, extname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// 경로 설정
// ---------------------------------------------------------------------------

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT  = join(SCRIPT_DIR, '..');
const CORTEX_DIR = join(REPO_ROOT, 'cortex');

// cortex 하위 폴더 → 노드 카테고리 매핑
const CATEGORY_MAP = {
  pillars:  'pillar',
  areas:    'area',
  projects: 'project',
  archives: 'archive',
  staging:  'staging',
};

// ---------------------------------------------------------------------------
// 정규식
// ---------------------------------------------------------------------------

const FRONTMATTER_RE  = /^---\r?\n([\s\S]*?)\r?\n---/;
const WIKI_LINK_RE    = /\[\[([^\]|#]+?)(?:[|#][^\]]*?)?\]\]/g;
const INLINE_TAG_RE   = /(?:^|\s)#([A-Za-z가-힣][A-Za-z0-9가-힣_/-]*)/g;
const YAML_TAG_RE     = /^tags:\s*(.+)$/m;
const YAML_TAG_LIST_RE = /^tags:\s*\n((?:\s+-\s*.+\n?)*)/m;

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

/**
 * YAML frontmatter에서 단순 key-value 파싱 (외부 의존성 없이).
 * 복잡한 YAML(다중 중첩)은 raw string으로 보존한다.
 */
function parseFrontmatter(raw) {
  const result = {};
  const lines = raw.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');
    if (colonIdx < 1) { i++; continue; }

    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();

    // 인라인 배열: tags: [a, b, c]
    if (rest.startsWith('[') && rest.endsWith(']')) {
      result[key] = rest.slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      i++;
      continue;
    }

    // 블록 리스트: tags:\n  - a\n  - b
    if (rest === '' && i + 1 < lines.length && lines[i + 1].trimStart().startsWith('- ')) {
      const items = [];
      i++;
      while (i < lines.length && lines[i].trimStart().startsWith('- ')) {
        items.push(lines[i].replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, ''));
        i++;
      }
      result[key] = items;
      continue;
    }

    // 일반 스칼라
    result[key] = rest.replace(/^["']|["']$/g, '');
    i++;
  }

  return result;
}

/**
 * 마크다운 본문에서 위키링크 타겟 목록 추출.
 * [[링크]], [[링크|별칭]], [[링크#섹션]] 모두 처리.
 */
function extractWikiLinks(body) {
  const links = new Set();
  let m;
  const re = new RegExp(WIKI_LINK_RE.source, 'g');
  while ((m = re.exec(body)) !== null) {
    links.add(m[1].trim());
  }
  return [...links];
}

/**
 * 마크다운에서 #태그 추출 (frontmatter 제외한 본문).
 */
function extractInlineTags(body) {
  const tags = new Set();
  let m;
  const re = new RegExp(INLINE_TAG_RE.source, 'gm');
  while ((m = re.exec(body)) !== null) {
    tags.add(m[1]);
  }
  return [...tags];
}

/**
 * 파일 상대 경로에서 카테고리 추출.
 * cortex/pillars/character/foo.md → { category: 'pillar', subcategory: 'character' }
 */
function categoryFromPath(relPath) {
  // relPath: pillars/character/foo.md  (cortex/ 이후 상대경로)
  const parts = relPath.replace(/\\/g, '/').split('/');

  // cortex 루트에 직접 있는 파일 (예: thinking-toolkit.md)
  if (parts.length === 1) {
    return { category: 'root', subcategory: null };
  }

  const topFolder = parts[0];
  const category = CATEGORY_MAP[topFolder] ?? topFolder;
  const subcategory = parts.length >= 3 ? parts[1] : null;
  return { category, subcategory };
}

// ---------------------------------------------------------------------------
// 파일 수집 (재귀)
// ---------------------------------------------------------------------------

function collectMarkdownFiles(dir) {
  const files = [];

  function walk(current) {
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const full = join(current, entry);
      let stat;
      try { stat = statSync(full); } catch { continue; }
      if (stat.isDirectory()) {
        walk(full);
      } else if (entry.endsWith('.md')) {
        files.push(full);
      }
    }
  }

  walk(dir);
  return files;
}

// ---------------------------------------------------------------------------
// 노드 파싱
// ---------------------------------------------------------------------------

function parseNode(filePath) {
  const relPath = relative(CORTEX_DIR, filePath);  // pillars/character/foo.md
  const { category, subcategory } = categoryFromPath(relPath);
  const stem = basename(filePath, '.md');

  let raw;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  // frontmatter 파싱
  const fmMatch = raw.match(FRONTMATTER_RE);
  let frontmatter = {};
  let body = raw;

  if (fmMatch) {
    frontmatter = parseFrontmatter(fmMatch[1]);
    body = raw.slice(fmMatch[0].length);
  }

  // 태그: frontmatter tags + 본문 인라인 태그
  const fmTags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags
    : (frontmatter.tags ? [frontmatter.tags] : []);
  const inlineTags = extractInlineTags(body);
  const tags = [...new Set([...fmTags, ...inlineTags])];

  // 위키링크
  const wikiLinks = extractWikiLinks(body);

  // 노드 ID: 상대 경로를 슬래시로 정규화 (확장자 제외)
  const id = relPath.replace(/\\/g, '/').replace(/\.md$/, '');

  return {
    id,
    label: frontmatter.title ?? stem,
    path: relPath,
    category,
    subcategory,
    // 주요 frontmatter 필드만 선별 노출
    metadata: {
      title:       frontmatter.title     ?? null,
      created:     frontmatter.created   ?? null,
      modified:    frontmatter.modified  ?? null,
      source:      frontmatter.source    ?? null,
      section:     frontmatter.section   ?? null,
      group:       frontmatter.group     ?? null,
      notebook:    frontmatter.notebook  ?? null,
    },
    tags,
    // 내부 파싱 전용 (엣지 생성 후 제거)
    _wikiLinks: wikiLinks,
  };
}

// ---------------------------------------------------------------------------
// 엣지 생성
// ---------------------------------------------------------------------------

/**
 * 위키링크 기반 엣지.
 * 링크 타겟은 stem 또는 title 기반으로 노드 룩업.
 */
function buildLinkEdges(nodes) {
  const edges = [];

  // 룩업 테이블: stem → node id (단순 파일명 기반)
  const stemIndex = new Map();   // "파일명" → node id
  const titleIndex = new Map();  // "title" → node id
  const labelIndex = new Map();  // "label" → node id (= title ?? stem)

  for (const node of nodes) {
    const stem = basename(node.path, '.md');
    stemIndex.set(stem.toLowerCase(), node.id);
    if (node.metadata.title) {
      titleIndex.set(node.metadata.title.toLowerCase(), node.id);
    }
    labelIndex.set(node.label.toLowerCase(), node.id);
  }

  function resolveTarget(rawTarget) {
    const lower = rawTarget.toLowerCase();
    return stemIndex.get(lower) ?? titleIndex.get(lower) ?? labelIndex.get(lower) ?? null;
  }

  for (const node of nodes) {
    for (const link of node._wikiLinks) {
      const targetId = resolveTarget(link);
      if (targetId && targetId !== node.id) {
        edges.push({
          id:     `link::${node.id}→${targetId}`,
          source: node.id,
          target: targetId,
          type:   'wikilink',
          weight: 1.0,
          metadata: { rawLink: link },
        });
      }
    }
  }

  return edges;
}

/**
 * 태그 공유 기반 엣지.
 * 같은 태그를 공유하는 노드 쌍에 'shared_tag' 엣지 추가.
 * weight = 공유 태그 수.
 */
function buildTagEdges(nodes) {
  const edges = [];

  // 태그 → 노드 id 목록
  const tagIndex = new Map();
  for (const node of nodes) {
    for (const tag of node.tags) {
      if (!tagIndex.has(tag)) tagIndex.set(tag, []);
      tagIndex.get(tag).push(node.id);
    }
  }

  // 노드 쌍별 공유 태그 수 집계
  const pairWeight = new Map();
  const pairTags   = new Map();

  for (const [tag, nodeIds] of tagIndex.entries()) {
    if (nodeIds.length < 2) continue;
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        // 정렬하여 단방향 키 생성
        const [a, b] = [nodeIds[i], nodeIds[j]].sort();
        const key = `${a}↔${b}`;
        pairWeight.set(key, (pairWeight.get(key) ?? 0) + 1);
        if (!pairTags.has(key)) pairTags.set(key, []);
        pairTags.get(key).push(tag);
      }
    }
  }

  for (const [key, weight] of pairWeight.entries()) {
    const [source, target] = key.split('↔');
    edges.push({
      id:     `tag::${key}`,
      source,
      target,
      type:   'shared_tag',
      weight,
      metadata: { sharedTags: pairTags.get(key) },
    });
  }

  return edges;
}

// ---------------------------------------------------------------------------
// 어댑터 인터페이스 (향후 확장용)
// ---------------------------------------------------------------------------

/**
 * 스토리지 어댑터 팩토리.
 * 현재 구현: json (stdout/file), dot (Graphviz).
 * 확장: sqlite, neo4j
 */
async function getAdapter(adapterName) {
  if (adapterName === 'json' || !adapterName) {
    return {
      name: 'json',
      async save(graph, options) {
        const output = JSON.stringify(graph, null, 2);
        if (options.out) {
          writeFileSync(options.out, output, 'utf-8');
          return `저장 완료: ${options.out}`;
        }
        return output;
      },
    };
  }

  if (adapterName === 'dot') {
    return {
      name: 'dot',
      async save(graph, _options) {
        const lines = ['digraph cortex {', '  rankdir=LR;'];
        for (const node of graph.nodes) {
          const label = node.label.replace(/"/g, '\\"');
          const color = { pillar: '#4A90D9', area: '#7ED321', project: '#F5A623', archive: '#9B9B9B', staging: '#BD10E0' }[node.category] ?? '#555';
          lines.push(`  "${node.id}" [label="${label}" color="${color}" style=filled fontcolor=white];`);
        }
        for (const edge of graph.edges) {
          const style = edge.type === 'wikilink' ? 'solid' : 'dashed';
          lines.push(`  "${edge.source}" -> "${edge.target}" [style=${style} weight=${edge.weight}];`);
        }
        lines.push('}');
        return lines.join('\n');
      },
    };
  }

  if (adapterName === 'sqlite') {
    // SQLite 어댑터 — 런타임에 better-sqlite3 또는 node:sqlite 필요
    // Node 22.5+ 내장 node:sqlite 사용 시도
    let sqlite;
    try {
      sqlite = await import('node:sqlite');  // Node 22.5+
    } catch {
      throw new Error('SQLite 어댑터: Node.js 22.5+ (node:sqlite 내장 모듈) 필요. 또는 better-sqlite3 설치 필요.');
    }

    const { DatabaseSync } = sqlite;

    return {
      name: 'sqlite',
      async save(graph, options) {
        const dbPath = options.db ?? 'cortex-graph.db';
        const db = new DatabaseSync(dbPath);

        db.exec(`
          DROP TABLE IF EXISTS cg_nodes;
          DROP TABLE IF EXISTS cg_edges;
          CREATE TABLE cg_nodes (
            id          TEXT PRIMARY KEY,
            label       TEXT,
            path        TEXT,
            category    TEXT,
            subcategory TEXT,
            tags        TEXT,
            metadata    TEXT
          );
          CREATE TABLE cg_edges (
            id      TEXT PRIMARY KEY,
            source  TEXT,
            target  TEXT,
            type    TEXT,
            weight  REAL,
            metadata TEXT,
            FOREIGN KEY (source) REFERENCES cg_nodes(id),
            FOREIGN KEY (target) REFERENCES cg_nodes(id)
          );
          CREATE INDEX idx_cg_nodes_category ON cg_nodes(category);
          CREATE INDEX idx_cg_edges_source   ON cg_edges(source);
          CREATE INDEX idx_cg_edges_target   ON cg_edges(target);
          CREATE INDEX idx_cg_edges_type     ON cg_edges(type);
        `);

        const insertNode = db.prepare(
          'INSERT OR REPLACE INTO cg_nodes VALUES (?,?,?,?,?,?,?)'
        );
        for (const n of graph.nodes) {
          insertNode.run(
            n.id, n.label, n.path, n.category, n.subcategory ?? null,
            JSON.stringify(n.tags),
            JSON.stringify(n.metadata),
          );
        }

        const insertEdge = db.prepare(
          'INSERT OR REPLACE INTO cg_edges VALUES (?,?,?,?,?,?)'
        );
        for (const e of graph.edges) {
          insertEdge.run(
            e.id, e.source, e.target, e.type, e.weight,
            JSON.stringify(e.metadata),
          );
        }

        db.close();
        return `SQLite 저장 완료: ${dbPath} (nodes=${graph.nodes.length}, edges=${graph.edges.length})`;
      },
    };
  }

  throw new Error(`알 수 없는 어댑터: ${adapterName}. 사용 가능: json, dot, sqlite`);
}

// ---------------------------------------------------------------------------
// 통계 출력
// ---------------------------------------------------------------------------

function printStats(graph) {
  const categoryCount = {};
  const tagFreq = {};

  for (const node of graph.nodes) {
    categoryCount[node.category] = (categoryCount[node.category] ?? 0) + 1;
    for (const tag of node.tags) {
      tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
    }
  }

  const edgeTypeCount = {};
  for (const edge of graph.edges) {
    edgeTypeCount[edge.type] = (edgeTypeCount[edge.type] ?? 0) + 1;
  }

  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const lines = [
    '=== Cortex Graph 통계 ===',
    '',
    `노드 총계: ${graph.nodes.length}개`,
    ...Object.entries(categoryCount).map(([k, v]) => `  ${k}: ${v}개`),
    '',
    `엣지 총계: ${graph.edges.length}개`,
    ...Object.entries(edgeTypeCount).map(([k, v]) => `  ${k}: ${v}개`),
    '',
    `태그 종류: ${Object.keys(tagFreq).length}개`,
    `Top 10 태그:`,
    ...topTags.map(([tag, cnt]) => `  #${tag}: ${cnt}개`),
    '',
    `생성 시각: ${graph.meta.generatedAt}`,
    `cortex 경로: ${graph.meta.cortexDir}`,
  ];

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  // 인수 파싱
  const options = {
    out:     null,
    adapter: 'json',
    db:      'cortex-graph.db',
    stats:   false,
    format:  null,
    help:    false,
    quiet:   false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { options.help = true; }
    else if (arg === '--stats')           { options.stats = true; }
    else if (arg === '--quiet' || arg === '-q') { options.quiet = true; }
    else if (arg.startsWith('--out='))    { options.out = arg.slice(6); }
    else if (arg === '--out')             { options.out = args[++i]; }
    else if (arg.startsWith('--adapter=')){ options.adapter = arg.slice(10); }
    else if (arg === '--adapter')         { options.adapter = args[++i]; }
    else if (arg.startsWith('--db='))     { options.db = arg.slice(5); }
    else if (arg === '--db')              { options.db = args[++i]; }
    else if (arg.startsWith('--format=')) { options.format = arg.slice(9); options.adapter = options.format; }
    else if (arg === '--format')          { options.format = args[++i]; options.adapter = options.format; }
  }

  if (options.help) {
    console.log(`
cortex-graph.mjs — Cortex 지식 그래프 추출기

사용법:
  node scripts/cortex-graph.mjs [옵션]

옵션:
  --out <파일>          JSON 출력 파일 경로 (기본: stdout)
  --stats               통계 요약만 출력
  --adapter <이름>      저장 어댑터: json(기본) | dot | sqlite
  --format <이름>       --adapter의 별칭
  --db <파일>           SQLite 어댑터 사용 시 DB 파일 경로 (기본: cortex-graph.db)
  --quiet, -q           stderr 로그 숨김
  --help, -h            이 도움말 출력

예시:
  node scripts/cortex-graph.mjs
  node scripts/cortex-graph.mjs --out graph.json
  node scripts/cortex-graph.mjs --stats
  node scripts/cortex-graph.mjs --adapter sqlite --db cortex.db
  node scripts/cortex-graph.mjs --format dot > cortex.dot
    `.trim());
    return;
  }

  const log = (...msg) => { if (!options.quiet) process.stderr.write(msg.join(' ') + '\n'); };

  // 파일 수집
  log(`cortex 스캔: ${CORTEX_DIR}`);
  const files = collectMarkdownFiles(CORTEX_DIR);
  log(`파일 발견: ${files.length}개`);

  // 노드 파싱
  const rawNodes = [];
  for (const f of files) {
    const node = parseNode(f);
    if (node) rawNodes.push(node);
  }
  log(`노드 파싱: ${rawNodes.length}개`);

  // 엣지 생성
  const linkEdges = buildLinkEdges(rawNodes);
  const tagEdges  = buildTagEdges(rawNodes);
  log(`엣지 생성: wikilink=${linkEdges.length}, shared_tag=${tagEdges.length}`);

  // 내부 필드 제거 후 최종 노드 목록
  const nodes = rawNodes.map(({ _wikiLinks: _, ...rest }) => rest);
  const edges = [...linkEdges, ...tagEdges];

  // 그래프 객체
  const graph = {
    meta: {
      version:     '1.0.0',
      generatedAt: new Date().toISOString(),
      cortexDir:   CORTEX_DIR,
      nodeCount:   nodes.length,
      edgeCount:   edges.length,
      // 향후 어댑터 확장: neo4j, sqlite 등
      adapterHints: {
        neo4j:  'MERGE (n:CortexNode {id: node.id}) SET n += node.metadata',
        sqlite: 'node scripts/cortex-graph.mjs --adapter sqlite --db cortex.db',
      },
    },
    nodes,
    edges,
  };

  // 통계 전용 모드
  if (options.stats) {
    console.log(printStats(graph));
    return;
  }

  // 어댑터 저장
  const adapter = await getAdapter(options.adapter);
  const result = await adapter.save(graph, options);

  if (options.out || options.adapter !== 'json') {
    // 파일 저장 또는 비-json 어댑터: 결과 메시지만 stderr에
    if (options.adapter === 'dot') {
      console.log(result);  // DOT는 stdout으로
    } else {
      log(result);
    }
  } else {
    // json 어댑터 + stdout: 직접 출력
    console.log(result);
  }
}

main().catch(err => {
  process.stderr.write(`오류: ${err.message}\n`);
  process.exit(1);
});
