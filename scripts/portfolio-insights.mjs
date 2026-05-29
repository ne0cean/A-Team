#!/usr/bin/env node
/**
 * portfolio-insights.mjs — 포트폴리오 레벨 브리핑 생성기
 * Usage: node scripts/portfolio-insights.mjs [--json] [--focus blocked|active|idle]
 *
 * prjt.md와의 차이:
 *   prjt  → GitHub API 기반, 단순 상태 나열 + Opus/Gemini 분류
 *   portfolio → 로컬 CURRENT.md 기반, 교차 패턴 분석 + 전략적 추천
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

// ── 상수 ────────────────────────────────────────────────────────────────────

const PROJECTS_DIR = join(homedir(), 'Projects');
const TODAY = new Date();
const STALE_DAYS_IDLE = 7;   // 7일 이상 미활동 → idle
const STALE_DAYS_COLD = 30;  // 30일 이상 미활동 → cold (별도 표시)

// ── 날짜 파싱 ────────────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null;
  // YYYY-MM-DD or YYYY-MM-DD HH:MM
  const m = str.match(/(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  return new Date(m[1]);
}

function daysSince(date) {
  if (!date) return Infinity;
  return Math.floor((TODAY - date) / 86400000);
}

function formatDaysAgo(days) {
  if (days === Infinity) return '날짜 불명';
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

// ── CURRENT.md 파서 ──────────────────────────────────────────────────────────

function parseCurrent(content, filePath) {
  const lines = content.split('\n');

  const result = {
    title: null,
    status: null,
    goal: null,
    lastDate: null,
    nextTasks: [],
    blockers: [],
    inProgress: [],
    rawSections: {},
  };

  // 제목 (첫 번째 # 라인)
  const titleLine = lines.find(l => l.startsWith('# '));
  if (titleLine) result.title = titleLine.replace(/^#\s+/, '').trim();

  // _Last updated: 날짜_ 패턴
  const updatedLine = lines.find(l => /last updated:/i.test(l));
  if (updatedLine) {
    result.lastDate = parseDate(updatedLine);
  }

  let currentSection = null;
  let sectionBuf = [];

  function flushSection() {
    if (currentSection) {
      result.rawSections[currentSection] = sectionBuf.join('\n').trim();
    }
  }

  for (const line of lines) {
    // 섹션 헤더 감지
    const headMatch = line.match(/^#{2,3}\s+(.+)/);
    if (headMatch) {
      flushSection();
      sectionBuf = [];
      currentSection = headMatch[1].trim();
      continue;
    }
    if (currentSection) sectionBuf.push(line);

    // Status 섹션
    if (currentSection && /^(📍\s*)?상태$|^Status$|^상태$/i.test(currentSection)) {
      if (line && !line.startsWith('#') && !result.status) {
        const clean = line.replace(/\*\*/g, '').trim();
        if (clean) result.status = clean;
      }
    }

    // Goal 섹션
    if (currentSection && /goal|목표|목적/i.test(currentSection)) {
      if (line && !line.startsWith('#') && !result.goal) {
        const clean = line.replace(/\*\*/g, '').trim();
        if (clean) result.goal = clean;
      }
    }

    // Next Tasks 섹션 — 미완료 항목만
    if (currentSection && /next|다음\s*할\s*일|다음\s*태스크|할\s*일/i.test(currentSection)) {
      const todoMatch = line.match(/^-\s*\[\s*\]\s+(.+)/);
      if (todoMatch) result.nextTasks.push(todoMatch[1].trim());
    }

    // Blockers 섹션
    if (currentSection && /blocker|블로커|차단/i.test(currentSection)) {
      const itemMatch = line.match(/^[-*]\s+(.+)/);
      if (itemMatch) {
        const text = itemMatch[1].trim();
        // "없음" 텍스트는 블로커로 취급하지 않음
        if (!/^(없음|none|없음\.?)$/i.test(text)) {
          result.blockers.push(text);
        }
      }
    }

    // In Progress 섹션
    if (currentSection && /in progress|진행\s*중|진행중/i.test(currentSection)) {
      const itemMatch = line.match(/^[-*]\s+(.+)/);
      if (itemMatch && !/없음/.test(itemMatch[1])) {
        result.inProgress.push(itemMatch[1].trim());
      }
    }

    // Last Completions / 마지막 완료 — 날짜 추출
    if (!result.lastDate && currentSection && /last completion|완료|completion/i.test(currentSection)) {
      const dateMatch = line.match(/\[(\d{4}-\d{2}-\d{2})\]/);
      if (dateMatch && !result.lastDate) {
        result.lastDate = parseDate(dateMatch[1]);
      }
    }
  }

  flushSection();

  // 날짜가 없으면 파일 mtime 사용
  if (!result.lastDate) {
    try {
      const stat = statSync(filePath);
      result.lastDate = stat.mtime;
    } catch {}
  }

  return result;
}

// ── 프로젝트 수집 ─────────────────────────────────────────────────────────────

function collectProjects() {
  const projects = [];

  let entries;
  try {
    entries = readdirSync(PROJECTS_DIR);
  } catch {
    process.stderr.write(`[error] Cannot read ${PROJECTS_DIR}\n`);
    process.exit(1);
  }

  const skipDirs = new Set(['_archive', 'CLAUDE.md', 'node_modules', '.DS_Store']);

  for (const entry of entries) {
    if (skipDirs.has(entry)) continue;
    const dir = join(PROJECTS_DIR, entry);

    let stat;
    try { stat = statSync(dir); } catch { continue; }
    if (!stat.isDirectory()) continue;

    const contextPath = join(dir, '.context', 'CURRENT.md');
    if (!existsSync(contextPath)) continue;

    let content;
    try {
      content = readFileSync(contextPath, 'utf8');
    } catch { continue; }

    const parsed = parseCurrent(content, contextPath);
    const days = daysSince(parsed.lastDate);

    // 상태 분류
    let statusClass;
    if (parsed.blockers.length > 0) {
      statusClass = 'blocked';
    } else if (parsed.inProgress.length > 0) {
      statusClass = 'active';
    } else if (days <= STALE_DAYS_IDLE) {
      statusClass = 'active';
    } else if (days <= STALE_DAYS_COLD) {
      statusClass = 'idle';
    } else {
      statusClass = 'cold';
    }

    projects.push({
      name: entry,
      dir,
      contextPath,
      title: parsed.title || entry,
      status: parsed.status,
      goal: parsed.goal,
      lastDate: parsed.lastDate,
      daysAgo: days,
      daysAgoStr: formatDaysAgo(days),
      statusClass,
      nextTasks: parsed.nextTasks,
      blockers: parsed.blockers,
      inProgress: parsed.inProgress,
    });
  }

  // 최근 활동 순 정렬
  projects.sort((a, b) => a.daysAgo - b.daysAgo);
  return projects;
}

// ── 분석: 교차 패턴 감지 ─────────────────────────────────────────────────────

function analyzePortfolio(projects) {
  const blocked = projects.filter(p => p.statusClass === 'blocked');
  const active = projects.filter(p => p.statusClass === 'active');
  const idle = projects.filter(p => p.statusClass === 'idle');
  const cold = projects.filter(p => p.statusClass === 'cold');

  // 블로커 주제 클러스터링 — 의미 있는 키워드만 (5자+ 한국어, 4자+ 영어)
  const STOP_WORDS = new Set([
    '문제', '필요', '불가', '이상', '추정', '확인', '해결', '사용',
    '가능', '방법', '때문', '없음', '완료', '진행', '이번', '에서',
    'when', 'with', 'that', 'this', 'from', 'have', 'been', 'will',
    'after', 'before', 'during', 'until',
  ]);
  const blockerKeywords = {};
  for (const p of blocked) {
    for (const b of p.blockers) {
      // 한국어: 5자+, 영어: 4자+
      const words = [
        ...(b.match(/[가-힣]{5,}/g) || []),
        ...(b.toLowerCase().match(/[a-z]{4,}/g) || []),
      ].filter(w => !STOP_WORDS.has(w));
      for (const w of words) {
        blockerKeywords[w] = (blockerKeywords[w] || []);
        blockerKeywords[w].push(p.name);
      }
    }
  }
  const sharedBlockers = Object.entries(blockerKeywords)
    .filter(([, ps]) => new Set(ps).size >= 2)   // 서로 다른 프로젝트 2개+
    .map(([kw, ps]) => ({ keyword: kw, projects: [...new Set(ps)] }))
    .sort((a, b) => b.projects.length - a.projects.length)
    .slice(0, 5);  // 상위 5개만

  // 방치 위험 (idle 중 다음 태스크 있는 것)
  const idleWithTasks = idle.filter(p => p.nextTasks.length > 0);

  // 활성 프로젝트 중 블로커 없고 다음 태스크 명확한 것 → 즉시 착수 가능
  const readyToGo = active.filter(
    p => p.blockers.length === 0 && p.nextTasks.length > 0
  );

  // 최근 24h 활동
  const veryRecent = projects.filter(p => p.daysAgo === 0);

  return {
    counts: {
      total: projects.length,
      active: active.length,
      blocked: blocked.length,
      idle: idle.length,
      cold: cold.length,
    },
    blocked,
    active,
    idle,
    cold,
    sharedBlockers,
    idleWithTasks,
    readyToGo,
    veryRecent,
  };
}

// ── 전략적 추천 생성 ──────────────────────────────────────────────────────────

function generateRecommendations(analysis) {
  const recs = [];

  if (analysis.blocked.length > 0) {
    recs.push({
      priority: 1,
      type: 'unblock',
      title: `${analysis.blocked.length}개 프로젝트 블로커 해소`,
      detail: analysis.blocked.map(p =>
        `  - ${p.name}: ${p.blockers[0] || '블로커 불명'}`
      ).join('\n'),
    });
  }

  if (analysis.readyToGo.length > 0) {
    const top = analysis.readyToGo.slice(0, 3);
    recs.push({
      priority: 2,
      type: 'momentum',
      title: '즉시 착수 가능한 태스크',
      detail: top.map(p =>
        `  - ${p.name}: ${p.nextTasks[0] || '태스크 확인 필요'}`
      ).join('\n'),
    });
  }

  if (analysis.idleWithTasks.length > 0) {
    recs.push({
      priority: 3,
      type: 'rescue',
      title: `방치 위험 프로젝트 (${analysis.idleWithTasks.length}개) — 태스크 있으나 ${STALE_DAYS_IDLE}일+ 미활동`,
      detail: analysis.idleWithTasks.map(p =>
        `  - ${p.name} (${p.daysAgoStr}): ${p.nextTasks[0]}`
      ).join('\n'),
    });
  }

  if (analysis.sharedBlockers.length > 0) {
    recs.push({
      priority: 4,
      type: 'pattern',
      title: '복수 프로젝트 공통 블로커 감지',
      detail: analysis.sharedBlockers.map(sb =>
        `  - "${sb.keyword}" 관련: ${sb.projects.join(', ')}`
      ).join('\n'),
    });
  }

  if (analysis.cold.length >= 3) {
    recs.push({
      priority: 5,
      type: 'archive',
      title: `${analysis.cold.length}개 cold 프로젝트 — 아카이브 또는 재활성화 결정 필요`,
      detail: analysis.cold.map(p =>
        `  - ${p.name} (${p.daysAgoStr})`
      ).join('\n'),
    });
  }

  return recs.sort((a, b) => a.priority - b.priority);
}

// ── 마크다운 렌더 ─────────────────────────────────────────────────────────────

const STATUS_ICON = {
  active:  'A',
  blocked: 'B',
  idle:    'I',
  cold:    'C',
};

function renderMarkdown(projects, analysis, recommendations) {
  const lines = [];
  const now = TODAY.toISOString().slice(0, 16).replace('T', ' ');

  lines.push(`# Portfolio Insights — ${now}`);
  lines.push('');
  lines.push(`> prjt: 상태 나열 | **portfolio: 교차 분석 + 전략 추천** (로컬 CURRENT.md 기반)`);
  lines.push('');

  // ── 요약 대시보드
  lines.push('## 요약');
  lines.push('');
  lines.push(`| 전체 | 활성 | 블로킹 | 유휴 | cold |`);
  lines.push(`|------|------|--------|------|------|`);
  lines.push(`| ${analysis.counts.total} | ${analysis.counts.active} | ${analysis.counts.blocked} | ${analysis.counts.idle} | ${analysis.counts.cold} |`);
  lines.push('');

  // ── 블로킹 프로젝트
  if (analysis.blocked.length > 0) {
    lines.push('## [B] 블로킹 — 즉시 해소 필요');
    lines.push('');
    for (const p of analysis.blocked) {
      lines.push(`### ${p.name}`);
      if (p.status) lines.push(`> ${p.status.slice(0, 120)}`);
      lines.push('');
      lines.push('**블로커:**');
      for (const b of p.blockers) lines.push(`- ${b}`);
      if (p.nextTasks.length > 0) {
        lines.push('');
        lines.push(`**블로커 해소 후 → ${p.nextTasks[0]}**`);
      }
      lines.push('');
    }
  }

  // ── 활성 프로젝트
  if (analysis.active.length > 0) {
    lines.push('## [A] 활성 프로젝트');
    lines.push('');
    for (const p of analysis.active) {
      const inProg = p.inProgress.length > 0 ? ` | 진행: ${p.inProgress[0].slice(0, 60)}` : '';
      const next = p.nextTasks.length > 0 ? p.nextTasks[0].slice(0, 80) : '(태스크 없음)';
      lines.push(`- **${p.name}** (${p.daysAgoStr})${inProg}`);
      lines.push(`  → 다음: ${next}`);
    }
    lines.push('');
  }

  // ── 유휴 프로젝트
  if (analysis.idle.length > 0) {
    lines.push('## [I] 유휴 (7-30일 미활동)');
    lines.push('');
    for (const p of analysis.idle) {
      const next = p.nextTasks.length > 0 ? p.nextTasks[0].slice(0, 80) : '태스크 미정';
      lines.push(`- **${p.name}** (${p.daysAgoStr}) — ${next}`);
    }
    lines.push('');
  }

  // ── cold 프로젝트
  if (analysis.cold.length > 0) {
    lines.push('## [C] Cold (30일+ 미활동)');
    lines.push('');
    for (const p of analysis.cold) {
      lines.push(`- **${p.name}** (${p.daysAgoStr})`);
    }
    lines.push('');
  }

  // ── 전략적 추천
  if (recommendations.length > 0) {
    lines.push('## 전략적 추천');
    lines.push('');
    for (const rec of recommendations) {
      const typeTag = {
        unblock: 'UNBLOCK',
        momentum: 'MOMENTUM',
        rescue: 'RESCUE',
        pattern: 'PATTERN',
        archive: 'ARCHIVE',
      }[rec.type] || rec.type.toUpperCase();
      lines.push(`### [${typeTag}] ${rec.title}`);
      lines.push('');
      lines.push(rec.detail);
      lines.push('');
    }
  }

  // ── 교차 인사이트
  lines.push('## 교차 인사이트');
  lines.push('');

  if (analysis.veryRecent.length > 0) {
    lines.push(`- 오늘 활동: ${analysis.veryRecent.map(p => p.name).join(', ')}`);
  }

  const activeRatio = Math.round((analysis.counts.active / analysis.counts.total) * 100);
  lines.push(`- 활성률: ${activeRatio}% (${analysis.counts.active}/${analysis.counts.total})`);

  if (analysis.counts.blocked > 0) {
    const blockRatio = Math.round((analysis.counts.blocked / analysis.counts.total) * 100);
    lines.push(`- 블로킹률: ${blockRatio}% — 블로커 해소 시 즉시 모멘텀 회복 가능`);
  }

  if (analysis.idleWithTasks.length >= 2) {
    lines.push(`- ${analysis.idleWithTasks.length}개 유휴 프로젝트에 구체적 다음 태스크 존재 — 작은 실행으로 부활 가능`);
  }

  lines.push('');
  lines.push(`---`);
  lines.push(`_Generated by portfolio-insights.mjs | ${now}_`);

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const focusFilter = (() => {
  const idx = args.indexOf('--focus');
  return idx !== -1 ? args[idx + 1] : null;
})();

const projects = collectProjects();

if (projects.length === 0) {
  process.stderr.write(`[warn] ${PROJECTS_DIR} 하위에 .context/CURRENT.md 파일을 찾을 수 없습니다.\n`);
  process.exit(0);
}

const filtered = focusFilter
  ? projects.filter(p => p.statusClass === focusFilter)
  : projects;

const analysis = analyzePortfolio(filtered.length < projects.length ? projects : filtered);
// 필터가 걸렸을 때도 전체 분석값 전달 (counts는 전체 기준 유지)
const fullAnalysis = analyzePortfolio(projects);
const recommendations = generateRecommendations(fullAnalysis);

if (jsonMode) {
  process.stdout.write(JSON.stringify({
    generated_at: TODAY.toISOString(),
    counts: fullAnalysis.counts,
    projects: projects.map(p => ({
      name: p.name,
      statusClass: p.statusClass,
      daysAgo: p.daysAgo,
      nextTasks: p.nextTasks.slice(0, 3),
      blockers: p.blockers,
      inProgress: p.inProgress,
    })),
    recommendations,
  }, null, 2) + '\n');
} else {
  process.stdout.write(renderMarkdown(
    focusFilter ? filtered : projects,
    fullAnalysis,
    recommendations,
  ) + '\n');
}
