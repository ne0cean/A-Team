// ralph-prompts.mjs
// Ralph Loop 반복 프롬프트 빌더
// 매 iteration마다 lean context를 수집하고 에이전트 프롬프트를 생성한다.

import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { safePath } from './daemon-utils.mjs';

// ─── Lean Context 수집 ──────────────────────────────────────────────────────
// L3 최적화: LLM 호출 전 bash로 필요한 정보만 수집
// 에이전트가 직접 파일을 읽게 두고, 여기선 "현재 상태 요약"만 전달

export function collectContext(projectRoot, state) {
  const ctx = {};

  // 1. 최근 5개 커밋 (에이전트가 무엇이 됐는지 파악)
  const gitLog = spawnSync('git', ['log', '--oneline', '-5'], {
    cwd: projectRoot, encoding: 'utf8',
  });
  ctx.gitLog = gitLog.stdout?.trim() || '(git log 실패)';

  // 2. 완료 조건 체크 출력 (에이전트가 뭘 고쳐야 하는지 파악)
  if (state.checkCommand) {
    const check = spawnSync('sh', ['-c', state.checkCommand], {
      cwd: projectRoot, encoding: 'utf8', timeout: 60_000,
    });
    ctx.checkPassed = check.status === 0;
    // 실패 출력만 전달 (성공 시엔 불필요) — 토큰 절약
    if (!ctx.checkPassed) {
      const combined = [check.stdout, check.stderr].filter(Boolean).join('\n').trim();
      // 마지막 60줄만 (에러는 보통 끝에)
      ctx.checkOutput = combined.split('\n').slice(-60).join('\n');
    }
  } else {
    ctx.checkPassed = false;
    ctx.checkOutput = null;
  }

  // 3. 진행 이력 요약 (마지막 20줄만 — 최근 반복 요약)
  const progressFile = `${projectRoot}/.research/ralph-progress.md`;
  if (existsSync(progressFile)) {
    const lines = readFileSync(progressFile, 'utf8').split('\n');
    ctx.progressSummary = lines.slice(-20).join('\n').trim();
  } else {
    ctx.progressSummary = null;
  }

  // 4. 학습 파일 (AGENTS.md) — 이전 반복에서 발견한 패턴/함정
  const agentsFile = `${projectRoot}/.research/AGENTS.md`;
  if (existsSync(agentsFile)) {
    ctx.learnings = readFileSync(agentsFile, 'utf8').trim();
  } else {
    ctx.learnings = null;
  }

  // 5. 리서치 노트 (Research → Ralph 파이프라인용)
  //    가장 최근 리서치 노트를 태스크 관련 컨텍스트로 주입
  ctx.researchNotes = null;
  if (state.researchNotes) {
    // state에 명시적으로 지정된 리서치 노트 경로 (경로 트래버설 방지)
    try {
    const notePath = safePath(projectRoot, state.researchNotes);
    if (existsSync(notePath)) {
      const content = readFileSync(notePath, 'utf8').trim();
      // 토큰 절약: 마지막 80줄만 (핵심 발견 + 제안 부분)
      ctx.researchNotes = content.split('\n').slice(-80).join('\n');
    }
    } catch (e) { /* 경로 트래버설 감지 — 무시 */ }
  }

  return ctx;
}

// ─── 프롬프트 빌더 ───────────────────────────────────────────────────────────
export function buildRalphPrompt(state, ctx, projectRoot) {
  const { task, currentIteration, maxIterations, checkCommand } = state;
  const iterLabel = `반복 ${currentIteration + 1}/${maxIterations}`;
  const progressFile = `${projectRoot}/.research/ralph-progress.md`;

  const sections = [];

  // 헤더
  sections.push(`# Ralph Loop — ${iterLabel}\n`);

  // 태스크
  sections.push(`## 태스크\n${task}\n`);

  // 현재 상태 (git history)
  sections.push(`## 지금까지의 변경사항 (git log)\n\`\`\`\n${ctx.gitLog}\n\`\`\``);

  // 테스트/체크 결과 (실패했을 때만)
  if (checkCommand && !ctx.checkPassed && ctx.checkOutput) {
    sections.push(`## 체크 실패 출력 (\`${checkCommand}\`)\n\`\`\`\n${ctx.checkOutput}\n\`\`\``);
  } else if (checkCommand && !ctx.checkPassed) {
    sections.push(`## 체크 명령\n\`${checkCommand}\` — 아직 통과 못 함. 실행 후 결과 확인 필요.`);
  }

  // 이전 반복 진행 요약
  if (ctx.progressSummary) {
    sections.push(`## 이전 반복 진행 요약\n${ctx.progressSummary}`);
  }

  // 학습 파일 (AGENTS.md) — 이전 반복에서 발견한 패턴/함정/교훈
  if (ctx.learnings) {
    sections.push(`## 이전 반복에서 배운 것 (AGENTS.md)\n${ctx.learnings}`);
  }

  // 리서치 노트 (Research → Ralph 파이프라인으로 전달된 사전 조사 결과)
  if (ctx.researchNotes) {
    sections.push(`## 사전 리서치 결과 (참고용)\n${ctx.researchNotes}`);
  }

  const agentsFile = `${projectRoot}/.research/AGENTS.md`;

  // 지시사항
  sections.push(`## 지시사항

1. **현재 상태 파악** — git log와 위 정보를 바탕으로 무엇이 됐고 무엇이 남았는지 확인
2. **의미 있는 진전** — 태스크를 향해 실질적인 작업 수행
3. **커밋** — 변경 후 반드시 \`git add\` + \`git commit\` (작은 단위로)
4. **진행 기록** — \`${progressFile}\`에 이번 반복에서 한 것을 한 줄로 추가
5. **학습 기록** — 발견한 패턴, gotcha, 실수를 \`${agentsFile}\`에 메모 (다음 반복에 전달됨)

## 완료 조건

태스크가 완전히 완료됐으면 응답 마지막에 정확히 이 태그를 출력:
\`<promise>COMPLETE</promise>\`

${checkCommand ? `체크 명령 (\`${checkCommand}\`)이 통과해야 완료로 인정됨.` : '완료라고 판단하면 위 태그 출력.'}

## 주의사항
- git log를 보고 **이미 된 작업은 반복하지 말 것**
- 막혔으면 다른 접근법 시도 후 진행 기록에 메모
- 파일 전체를 읽은 후 수정할 것`);

  return sections.join('\n\n');
}
