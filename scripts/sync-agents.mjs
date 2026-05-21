#!/usr/bin/env node
/**
 * sync-agents.mjs
 * CLAUDE.md / .claude/commands 변경 시 AGENTS.md 자동 재생성
 *
 * 실행: node scripts/sync-agents.mjs
 * 훅:  pre-commit에서 자동 호출
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// ── 카테고리 분류 ─────────────────────────────────────────────
const CATEGORIES = {
  session: {
    label: '세션/워크플로우',
    names: ['vibe', 'pickup', 'end', 'zzz', 'resume', 'rc', 'handoff', 'sync', 'daily-brief'],
  },
  planning: {
    label: '기획/설계',
    names: ['office-hours', 'prd', 'blueprint', 'autoplan', 'plan-ceo', 'plan-eng',
            'prioritize', 'intel', 'thinking-partner', 'webapp-prd', 'dashboard-prd'],
  },
  engineering: {
    label: '구현/품질',
    names: ['tdd', 'investigate', 'cso', 'pmi', 'review', 'ship', 'benchmark',
            'adversarial', 'craft', 'land', 'optimize', 'qa', 'ralph'],
  },
  marketing: {
    label: '마케팅/콘텐츠',
    names: ['marketing', 'marketing-generate', 'marketing-social', 'marketing-publish',
            'marketing-repurpose', 'marketing-analytics', 'marketing-research',
            'marketing-loop', 'card-news', 'yt'],
  },
  design: {
    label: '디자인',
    names: ['design-audit', 'design-brief', 'design-generate', 'design-score',
            'design-thumbnail', 'design-retro', 'ppt', 'frontend-design'],
  },
  operations: {
    label: '운영/관리',
    names: ['okr', 'incident', 'insights', 'retro', 'board', 'legal-check',
            'dashboard', 'capability', 'prjt', 'issue-triage', 'github-review'],
  },
  data: {
    label: '데이터',
    names: ['excel-to-csv', 'csv-clean', 'data-calc'],
  },
  ateam: {
    label: 'A-Team 관리',
    names: ['absorb', 'improve', 'cold-review', 'autoresearch', 'doc-sync',
            'daily-review', 'browse', 're'],
  },
};

// ── 커맨드 스캔 ────────────────────────────────────────────────
function scanCommands() {
  const dir = join(ROOT, '.claude', 'commands');
  const files = readdirSync(dir).filter(f => f.endsWith('.md'));

  const commands = {};
  for (const file of files) {
    const name = file.replace('.md', '');
    const content = readFileSync(join(dir, file), 'utf8');
    // frontmatter description 추출
    const match = content.match(/^---\s*\ndescription:\s*(.+)/m);
    const desc = match ? match[1].trim() : '';
    commands[name] = desc;
  }
  return commands;
}

// ── 커맨드 섹션 생성 ───────────────────────────────────────────
function buildCommandsSection(commands) {
  const allNames = new Set(Object.keys(commands));
  const categorized = new Set();
  let lines = ['## Available Commands', ''];

  for (const [, cat] of Object.entries(CATEGORIES)) {
    const available = cat.names.filter(n => allNames.has(n));
    if (available.length === 0) continue;
    lines.push(`### ${cat.label}`);
    for (const name of available) {
      const desc = commands[name];
      // description에서 커맨드명 접두어 제거하고 핵심만 추출
      const shortDesc = desc
        .replace(/^\/\S+\s*[—–-]\s*/, '')  // "/name —" 제거
        .replace(/^\/\S+\s+/, '')            // "/name " 제거
        .split('.')[0]                        // 첫 문장만
        .trim();
      lines.push(`- \`${name}\`${shortDesc ? ' — ' + shortDesc : ''}`);
      categorized.add(name);
    }
    lines.push('');
  }

  // 미분류 커맨드
  const uncategorized = [...allNames].filter(n => !categorized.has(n));
  if (uncategorized.length > 0) {
    lines.push('### 기타');
    for (const name of uncategorized) {
      lines.push(`- \`${name}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── 현재 Phase 추출 ────────────────────────────────────────────
function extractPhase() {
  const currentPath = join(ROOT, '.context', 'CURRENT.md');
  if (!existsSync(currentPath)) return null;
  const content = readFileSync(currentPath, 'utf8');
  // "현재 Phase: X" 또는 Phase 테이블에서 추출
  const phaseMatch = content.match(/\*\*현재 Phase\*\*[:\s]+([^\n]+)/);
  if (phaseMatch) return phaseMatch[1].trim();
  // 테이블에서 🔑 or ✅ 마지막 Phase 추출
  const rows = [...content.matchAll(/\|\s*(\d+)\s*\|[^|]+\|\s*(✅|🔑)[^|]*\|/g)];
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    return `Phase ${last[1]} 완료/진입가능`;
  }
  return null;
}

// ── AGENTS.md 재생성 ───────────────────────────────────────────
function syncAgents() {
  const agentsPath = join(ROOT, 'AGENTS.md');
  const existing = existsSync(agentsPath) ? readFileSync(agentsPath, 'utf8') : '';

  const commands = scanCommands();
  const commandsSection = buildCommandsSection(commands);
  const phase = extractPhase();

  // 고정 섹션 (수동 관리 영역) — Available Commands와 현재 Phase 앞부분까지 보존
  // AGENTS.md 구조: header → 주요 디렉토리 → 작업 원칙 → 완성 선언 규칙 → [AUTO: Commands] → [AUTO: Phase] → [HOW-TO]
  const HEADER = `# A-Team — 글로벌 AI 툴킷

모든 프로젝트에서 끌어다 쓰는 글로벌 툴킷. 특정 프로젝트에 종속되지 않는 독립 레포.

- **원본 레포**: \`~/Projects/a-team\` (canonical)
- **GitHub**: https://github.com/ne0cean/A-Team
- **프로젝트별 사본**: \`{project}/A-Team\` (서브디렉토리로 참조)
- **현재 상태**: \`.context/CURRENT.md\` 항상 최신

## 주요 디렉토리

- \`.claude/commands/\` — 슬래시 커맨드 원본 (${Object.keys(commands).length}개)
- \`.context/\` — CURRENT.md (작업 상태), SESSIONS.md (이력), DECISIONS.md
- \`governance/\` — 규칙/워크플로우/스킬
- \`scripts/\` — 자동화 스크립트
- \`templates/\` — 신규 프로젝트 스캐폴드
- \`docs/\` — 레슨런드 (docs/INDEX.md로 on-demand 참조)
- \`lib/\` — 공유 TypeScript 라이브러리
- \`test/\` — Vitest 테스트

## 작업 원칙

- 변경사항은 반드시 이 레포에서 작업 후 push
- 프로젝트 사본에서 작업한 경우 즉시 push → 원본 pull로 동기화
- 명령어 배포: \`bash scripts/install-commands.sh\` → \`~/.claude/commands/\`

## 완성 선언 규칙

완료 선언("완성됐습니다", "done" 등)은 반드시 테스트 증거를 첨부해야 한다.

| 상황 | 최소 요건 |
|------|-----------|
| 기존 테스트 있음 | 테스트 실행 후 결과(pass/fail 수) 첨부 |
| 새 로직 추가 | 핵심 케이스 테스트 1개 이상 추가 + 실행 결과 첨부 |
| 리팩토링 | 기존 테스트 실행 결과 첨부 |
| 스크립트/설정 변경 | 실행 결과 또는 검증 커맨드 출력 첨부 |

예외: 테스트가 구조적으로 불가한 경우 → "테스트 없음, 이유: ___" 명시 필수.

`;

  const PHASE_SECTION = phase
    ? `## 현재 Phase\n\n- ${phase}\n- 인프라 모라토리엄 중 — 제품 출시 전 새 커맨드/에이전트 빌드 금지\n- 상세: \`.context/CURRENT.md\`\n\n`
    : `## 현재 Phase\n\n- 상세: \`.context/CURRENT.md\`\n\n`;

  const HOW_TO = `## 타 에이전트에서 A-Team 커맨드 사용법

Claude Code가 아닌 에이전트(Codex, Gemini, Cursor 등)는 다음 방식으로 A-Team 커맨드를 활용할 수 있다.

### 세션 시작 (vibe 동등)
\`\`\`
.context/CURRENT.md 파일을 읽어라.
다음 우선순위 작업을 확인하고 이어서 진행하라.
\`\`\`

### 커맨드 실행
각 커맨드는 \`.claude/commands/<name>.md\`에 워크플로우가 기술되어 있다.
해당 파일을 읽고, Claude Code 전용 도구 문법(Read/Bash tool call 등)은 무시하고
**워크플로우 로직**을 네이티브 도구로 따르면 된다.

예시:
\`\`\`
.claude/commands/blueprint.md 파일을 읽고 그 워크플로우대로 진행해라.
\`\`\`

### 세션 종료 (end 동등)
\`\`\`
.context/CURRENT.md의 상태를 업데이트하고, 변경사항을 git commit + push해라.
\`\`\`

### 커맨드 파일 위치
모든 커맨드: \`.claude/commands/\` (이 디렉토리가 A-Team의 핵심)
`;

  const AUTO_MARKER = '<!-- AUTO-GENERATED: do not edit below this line -->\n';

  // 기존 파일에서 수동 편집 영역(header 위) 보존 여부 판단
  // 현재는 전체를 스크립트가 관리 (HEADER는 여기서 정의)
  const output = HEADER + AUTO_MARKER + '\n' + commandsSection + PHASE_SECTION + HOW_TO;

  if (output === existing) {
    console.log('AGENTS.md unchanged');
    return false;
  }

  writeFileSync(agentsPath, output, 'utf8');
  const count = Object.keys(commands).length;
  console.log(`AGENTS.md synced — ${count} commands`);
  return true;
}

syncAgents();
