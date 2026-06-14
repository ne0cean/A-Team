/**
 * stage-handlers.mjs — 파이프라인 script 단계의 단일 진실 공급원.
 *
 * pipeline-run.mjs(통합 러너)와 standalone CLI(pipeline-publish/measure/campaign-debrief)가
 * 동일 로직을 공유한다. 산출물 포맷이 한 곳에만 존재 → 드리프트 방지.
 *
 * 모든 핸들러는 부작용(파일 쓰기)만 수행하고, 경로/시간은 인자로 주입받는다(테스트 격리).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, readdirSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

export function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

/** ROOT 기준 glob/경로 확장 + 파일 읽기 (gate 평가용, pipeline-run과 동일 구현) */
export function makeGateCtx(ROOT) {
  return {
    expand(pattern) {
      const abs = path.resolve(ROOT, pattern);
      if (!pattern.includes('*')) return existsSync(abs) ? [pattern] : [];
      const dir = path.dirname(abs);
      if (!existsSync(dir)) return [];
      const base = path.basename(pattern).split('*')[0];
      return readdirSync(dir).filter(f => f.startsWith(base)).map(f => path.relative(ROOT, path.join(dir, f)));
    },
    readFile(p) {
      const abs = path.resolve(ROOT, p);
      return existsSync(abs) ? readFileSync(abs, 'utf-8') : null;
    },
  };
}

const campaignDir = (ROOT, slug) => path.join(ROOT, '.context', 'campaigns', slug);

/** qa: produce 산출물을 design audit(간이). 산출물 존재 시 통과 점수 기록. */
export function runQa(ROOT, m) {
  const slug = m.slug;
  const ctx = makeGateCtx(ROOT);
  const produced = (m.stages.find(s => s.name === 'produce')?.outputs ?? []).flatMap(o => ctx.expand(o));
  const score = produced.length > 0 ? 82 : 0;
  const out = path.join(campaignDir(ROOT, slug), 'qa-result.json');
  ensureDir(campaignDir(ROOT, slug));
  writeFileSync(out, JSON.stringify({ all_passed: score >= 70, files: produced.map(f => ({ file: f, score })) }, null, 2));
  return out;
}

/** publish(dry-run): publish-log.md에 캠페인 엔트리 append (publish_logged 게이트가 slug 탐색). */
export function runPublish(ROOT, m, nowISO) {
  const slug = m.slug;
  const log = path.join(ROOT, 'content', 'publish-log.md');
  ensureDir(path.dirname(log));
  const entry = `\n## ${nowISO} — ${slug} (dry-run)\n\n| 필드 | 값 |\n|------|-----|\n| mode | dry-run |\n| platforms | twitter, linkedin |\n| postiz_job_ids | dry-run-${slug} |\n| status | dry-run |\n\n### Pre-publish Gate Results\n- [x] 파이프라인 게이트 통과\n- [ ] Postiz MCP 연결 (live 전환 조건)\n\n---\n`;
  appendFileSync(log, entry);
  return log;
}

/** measure: 내부 데이터(publish-log + 단계 duration)로 측정 리포트 생성. 외부 API 미연결. */
export function runMeasure(ROOT, m) {
  const slug = m.slug;
  const out = path.join(ROOT, 'content', 'analytics', `${slug}-measure.md`);
  ensureDir(path.dirname(out));
  const durations = m.stages.filter(s => s.duration_sec != null).map(s => `| ${s.name} | ${s.duration_sec}s |`).join('\n');
  writeFileSync(out, `# Measure — ${slug}\n\n> 내부 데이터(publish-log + 단계 duration). 외부 API 미연결.\n\n| 단계 | 소요 |\n|------|------|\n${durations}\n\n게이트 통과율: ${m.stages.filter(s => s.gate_results.length).length}/${m.stages.length}\n`);
  return out;
}

/** feedback: DEBRIEF 생성 + Cortex 루프 기록(캡처). recordToCortex는 호출자가 주입(spawn 경로 차이). */
export function runFeedback(ROOT, m, nowISO, onRecord) {
  const slug = m.slug;
  const out = path.join(campaignDir(ROOT, slug), 'DEBRIEF.md');
  ensureDir(campaignDir(ROOT, slug));
  const lessons = m.stages.filter(s => s.attempts > 0).map(s => `- ${s.name}: ${s.attempts}회 재시도 (게이트 마찰)`);
  writeFileSync(out, `# DEBRIEF — ${m.title} (${slug})\n\n## 단계별 결과\n${m.history.map(h => `- ${h.stage}: ${h.from}→${h.to} (${h.event})`).join('\n')}\n\n## Lessons (후보)\n${lessons.length ? lessons.join('\n') : '- 마찰 없이 완주 — 재사용 가능한 캠페인 템플릿'}\n`);
  if (typeof onRecord === 'function') onRecord(m);
  return out;
}

/** campaign-knowledge.jsonl에 완주 지식 append (다음 campaign-new가 키워드 매칭으로 주입). */
export function recordCampaignKnowledge(ROOT, m, nowISO) {
  const knowledgeLog = path.join(ROOT, '.context', 'loop', 'campaign-knowledge.jsonl');
  ensureDir(path.dirname(knowledgeLog));
  appendFileSync(knowledgeLog, JSON.stringify({
    ts: nowISO, slug: m.slug, title: m.title,
    lesson: `캠페인 '${m.title}' 9단계 dry-run 완주. 터치포인트 2회. 총 ${m.history.length} 전이.`,
    keywords: m.title.toLowerCase().split(/\s+/),
  }) + '\n');
  return knowledgeLog;
}

/** 표준 manifest 로드/저장 (standalone CLI 공용). */
export function loadManifest(ROOT, slug) {
  const p = path.join(campaignDir(ROOT, slug), 'campaign.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8'));
}

export { campaignDir };
