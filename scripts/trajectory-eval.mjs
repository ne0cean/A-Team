#!/usr/bin/env node
/**
 * trajectory-eval.mjs — 세션 도구 호출 패턴 분석 → trajectory score
 *
 * Usage:
 *   node scripts/trajectory-eval.mjs [--session <session_id>] [--log <path>]
 *
 * 입력: analytics.jsonl (기본: .context/analytics.jsonl)
 * 출력: JSON trajectory score (stdout)
 *
 * 평가 항목 (shadow-evals.yaml path_evals 기준):
 *   - tool_efficiency   : Read 중복 호출 비율
 *   - no_backtracking   : 파일당 최대 Edit 횟수
 *   - context_preservation : 동일 파일 재Read 후 재Edit 패턴
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dir, '..');

const { values: rawArgs } = parseArgs({
  options: {
    session: { type: 'string' },
    log:     { type: 'string', default: resolve(REPO_ROOT, '.context', 'analytics.jsonl') },
    json:    { type: 'boolean', default: false },
  },
  allowPositionals: false,
});

const args = {
  session: rawArgs.session ?? null,
  log:     rawArgs.log,
  json:    rawArgs.json,
};

// ─── 로그 로드 ────────────────────────────────────────────────────────────

function loadEvents(logPath, sessionFilter) {
  if (!existsSync(logPath)) {
    return [];
  }

  const lines = readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(l => l.trim());

  const events = [];
  for (const line of lines) {
    try {
      const ev = JSON.parse(line);
      if (!sessionFilter || ev.session_id === sessionFilter) {
        events.push(ev);
      }
    } catch {
      // 손상된 줄 무시
    }
  }

  return events;
}

// ─── 도구 호출 이벤트 추출 ────────────────────────────────────────────────

/**
 * analytics.jsonl에서 tool_use / tool_result 이벤트 추출.
 * 형식이 없으면 agent_start/agent_stop 이벤트에서 tool 정보를 유추.
 */
function extractToolCalls(events) {
  const toolCalls = [];

  for (const ev of events) {
    // 직접 tool_use 이벤트
    if (ev.event === 'tool_use' && ev.tool_name) {
      toolCalls.push({
        ts: ev.ts,
        tool: ev.tool_name,
        file: ev.file_path || ev.path || null,
        session_id: ev.session_id || null,
      });
      continue;
    }

    // command_start/end 이벤트에서 tool 통계 유추 (fallback)
    if (ev.event === 'command_end' && ev.tool_calls != null) {
      // 집계 형태로 기록된 경우: 세부 파일 정보 없음
      toolCalls.push({
        ts: ev.ts,
        tool: '__aggregate__',
        file: null,
        count: ev.tool_calls,
        session_id: ev.session_id || null,
      });
    }
  }

  return toolCalls;
}

// ─── path_evals 평가 ──────────────────────────────────────────────────────

/**
 * tool_efficiency: Read 총 횟수 vs 고유 파일 수
 * ratio = unique_files / total_reads
 * 1.0 → optimal (각 파일 1번씩), 낮을수록 중복 읽기 多
 */
function scoreToolEfficiency(toolCalls) {
  const reads = toolCalls.filter(tc => tc.tool === 'Read' && tc.file);
  if (reads.length === 0) return { score: 1.0, note: 'Read 이벤트 없음 (데이터 부족)' };

  const uniqueFiles = new Set(reads.map(r => r.file)).size;
  const ratio = uniqueFiles / reads.length;

  let score;
  if (ratio >= 1.0) score = 1.0;         // 중복 없음
  else if (ratio >= 0.7) score = 0.7;    // 경미한 중복
  else score = 0.3;                       // 다수 중복

  return {
    score,
    total_reads: reads.length,
    unique_files: uniqueFiles,
    ratio: Number(ratio.toFixed(3)),
    note: ratio >= 1.0
      ? 'optimal — 각 파일 1회 Read'
      : ratio >= 0.7
        ? 'acceptable — 일부 파일 재읽기'
        : 'wasteful — 같은 파일 다수 재읽기',
  };
}

/**
 * no_backtracking: 파일당 Edit 최대 횟수
 * max_edits_per_file 이 2 이하 → pass
 */
function scoreNoBacktracking(toolCalls) {
  const edits = toolCalls.filter(tc =>
    (tc.tool === 'Edit' || tc.tool === 'Write') && tc.file
  );

  if (edits.length === 0) return { score: 1.0, note: 'Edit 이벤트 없음 (데이터 부족)' };

  const countByFile = {};
  for (const e of edits) {
    countByFile[e.file] = (countByFile[e.file] || 0) + 1;
  }

  const maxEdits = Math.max(...Object.values(countByFile));
  const worstFile = Object.entries(countByFile).find(([, v]) => v === maxEdits)?.[0];

  let score;
  if (maxEdits <= 2) score = 1.0;
  else if (maxEdits === 3) score = 0.5;
  else score = 0.0;

  return {
    score,
    max_edits_per_file: maxEdits,
    worst_file: worstFile || null,
    edit_counts: countByFile,
    note: maxEdits <= 2
      ? 'pass — 파일당 Edit 2회 이하'
      : maxEdits === 3
        ? 'minor_backtrack — 파일당 3회 수정'
        : 'major_backtrack — 파일당 4회 이상 수정',
  };
}

/**
 * context_preservation: 동일 파일에 Read → Edit → Read → Edit 패턴 감지
 * (맥락을 잃어서 다시 읽는 패턴)
 */
function scoreContextPreservation(toolCalls) {
  const fileCalls = toolCalls.filter(tc =>
    (tc.tool === 'Read' || tc.tool === 'Edit' || tc.tool === 'Write') && tc.file
  );

  if (fileCalls.length === 0) return { score: 1.0, note: '파일 이벤트 없음 (데이터 부족)' };

  // 파일별 순서대로 접근 패턴 추적
  const fileSequences = {};
  for (const tc of fileCalls) {
    if (!fileSequences[tc.file]) fileSequences[tc.file] = [];
    fileSequences[tc.file].push(tc.tool);
  }

  let criticalLossFiles = [];
  let partialLossFiles = [];

  for (const [file, seq] of Object.entries(fileSequences)) {
    // Edit 후 Read 재발생 = 맥락 손실 의심
    let postEditRead = false;
    let editSeen = false;
    let reReadAfterEdit = 0;

    for (const tool of seq) {
      if (tool === 'Edit' || tool === 'Write') {
        editSeen = true;
      } else if (tool === 'Read' && editSeen) {
        reReadAfterEdit++;
      }
    }

    if (reReadAfterEdit >= 2) criticalLossFiles.push(file);
    else if (reReadAfterEdit === 1) partialLossFiles.push(file);
  }

  let score;
  if (criticalLossFiles.length > 0) score = 0.0;
  else if (partialLossFiles.length > 0) score = 0.5;
  else score = 1.0;

  return {
    score,
    critical_loss_files: criticalLossFiles,
    partial_loss_files: partialLossFiles,
    note: score === 1.0
      ? 'pass — Edit 후 불필요한 재읽기 없음'
      : score === 0.5
        ? 'partial_loss — 일부 파일 Edit 후 재읽기'
        : 'critical_loss — 다수 파일 맥락 반복 손실',
  };
}

// ─── 종합 점수 ────────────────────────────────────────────────────────────

function computeTrajectoryScore(toolCalls) {
  const efficiency = scoreToolEfficiency(toolCalls);
  const backtrack  = scoreNoBacktracking(toolCalls);
  const context    = scoreContextPreservation(toolCalls);

  // 균등 가중치
  const composite = Number(
    ((efficiency.score + backtrack.score + context.score) / 3).toFixed(3)
  );

  let grade;
  if (composite >= 0.9) grade = 'A';
  else if (composite >= 0.7) grade = 'B';
  else if (composite >= 0.5) grade = 'C';
  else grade = 'D';

  return {
    composite,
    grade,
    path_evals: {
      tool_efficiency:      efficiency,
      no_backtracking:      backtrack,
      context_preservation: context,
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  const logPath = args.log;
  const sessionFilter = args.session;

  const events   = loadEvents(logPath, sessionFilter);
  const toolCalls = extractToolCalls(events);

  const result = {
    ts: new Date().toISOString(),
    log_path: logPath,
    session_filter: sessionFilter,
    total_events: events.length,
    total_tool_calls: toolCalls.filter(tc => tc.tool !== '__aggregate__').length,
    score: computeTrajectoryScore(toolCalls),
  };

  if (args.json || process.stdout.isTTY === false) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }

  // 사람이 읽기 좋은 출력
  const s = result.score;
  console.log('\n=== Trajectory Evaluation ===');
  console.log(`Session  : ${sessionFilter ?? '(all)'}`);
  console.log(`Events   : ${result.total_events}`);
  console.log(`Tool calls: ${result.total_tool_calls}`);
  console.log(`\nComposite: ${s.composite} [${s.grade}]`);
  console.log('\n--- path_evals ---');
  for (const [name, detail] of Object.entries(s.path_evals)) {
    console.log(`  ${name.padEnd(24)} score=${detail.score}  ${detail.note}`);
  }
  console.log('');
}

main();
