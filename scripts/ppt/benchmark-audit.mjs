#!/usr/bin/env node
/**
 * Benchmark-aware PPT spec audit.
 *
 * This catches strategy-deck failures before rendering: generic titles, data
 * placeholders, weak evidence layouts, and overused decorative layouts.
 */

import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const ACTION_VERBS = [
  'increase', 'reduce', 'improve', 'shift', 'prioritize', 'focus', 'separate',
  'accelerate', 'protect', 'capture', 'requires', 'drives', 'enables',
  '\ud655\ub300', '\ucd95\uc18c', '\uac1c\uc120', '\uc804\ud658', '\uc9d1\uc911', '\uc6b0\uc120', '\ubd84\ub9ac', '\uac00\uc18d', '\ubc29\uc5b4',
  '\ud655\ubcf4', '\ud544\uc694', '\uacac\uc778', '\uac00\ub2a5', '\ud574\uc57c', '\ub41c\ub2e4', '\ub192\uc778\ub2e4', '\ub0ae\ucd98\ub2e4'
];

const EVIDENCE_LAYOUTS = new Set([
  'chart', 'bar_chart', 'line_chart', 'stacked_bar', 'waterfall', 'matrix',
  'table', 'comparison', 'stats_grid', 'big_number', 'timeline', 'roadmap'
]);

const DECORATIVE_LAYOUTS = new Set(['cover', 'section_break', 'quote', 'closing', 'bento_grid', 'icon_grid']);

function usage() {
  return [
    'Usage: node scripts/ppt/benchmark-audit.mjs <spec.json> [--json] [--threshold <score>]',
    '',
    'Scores a PPT spec against consulting benchmark rules before rendering.'
  ].join('\n');
}

function getArgValue(args, flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}

function textOf(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textOf).join(' ');
  if (typeof value === 'object') return Object.values(value).map(textOf).join(' ');
  return String(value);
}

function hasActionTitle(slide) {
  const headline = slide.headline || slide.title || '';
  const lower = headline.toLowerCase();
  if (headline.length < 12) return false;
  return ACTION_VERBS.some(verb => lower.includes(verb.toLowerCase()));
}

function hasPlaceholder(slide) {
  return /\[(DATA|HUMAN|TODO|TBD|INSERT)[^\]]*\]/i.test(textOf(slide));
}

function hasSource(slide) {
  const text = textOf(slide);
  return new RegExp('source|\uCD9C\uCC98|\uC790\uB8CC|survey|n\\s*=|internal analysis|analysis', 'i').test(text);
}

function isBloatedBigNumber(slide) {
  if (slide.layout !== 'big_number') return false;
  const value = textOf(slide.number || slide.value);
  const metrics = value.split(new RegExp('[,;/\xB7]| and |\uBC0F ', 'i')).map(item => item.trim()).filter(Boolean);
  return metrics.length >= 4 || value.length > 36;
}

export function auditSpec(spec) {
  const slides = Array.isArray(spec.slides) ? spec.slides : [];
  const findings = [];
  let score = 100;

  if (slides.length < 6) {
    findings.push({ severity: 'high', rule: 'deck_too_short', message: 'Consulting benchmark decks need enough room for setup, evidence, implication, and recommendation.' });
    score -= 12;
  }

  const contentSlides = slides.filter(slide => !['cover', 'closing'].includes(slide.layout));
  const actionTitleCount = contentSlides.filter(hasActionTitle).length;
  const actionTitleRatio = contentSlides.length ? actionTitleCount / contentSlides.length : 0;
  if (actionTitleRatio < 0.55) {
    findings.push({
      severity: 'critical',
      rule: 'weak_action_titles',
      message: `Only ${actionTitleCount}/${contentSlides.length} content slides have action-style titles.`
    });
    score -= 20;
  }

  const placeholderSlides = slides.filter(hasPlaceholder);
  if (placeholderSlides.length > 0) {
    findings.push({
      severity: 'critical',
      rule: 'unresolved_placeholders',
      message: `${placeholderSlides.length} slides still contain [DATA]/[TODO]-style placeholders.`
    });
    score -= Math.min(25, placeholderSlides.length * 6);
  }

  const evidenceSlides = contentSlides.filter(slide => EVIDENCE_LAYOUTS.has(slide.layout));
  const evidenceRatio = contentSlides.length ? evidenceSlides.length / contentSlides.length : 0;
  if (evidenceRatio < 0.45) {
    findings.push({
      severity: 'high',
      rule: 'low_evidence_density',
      message: `Only ${evidenceSlides.length}/${contentSlides.length} content slides use evidence-oriented layouts.`
    });
    score -= 15;
  }

  const sourceCount = evidenceSlides.filter(hasSource).length;
  if (evidenceSlides.length > 0 && sourceCount / evidenceSlides.length < 0.35) {
    findings.push({
      severity: 'medium',
      rule: 'missing_sources',
      message: `Only ${sourceCount}/${evidenceSlides.length} evidence slides include source or analysis context.`
    });
    score -= 8;
  }

  const bloatedBigNumbers = slides.filter(isBloatedBigNumber);
  if (bloatedBigNumbers.length > 0) {
    findings.push({
      severity: 'high',
      rule: 'bloated_big_number',
      message: `${bloatedBigNumbers.length} big_number slides contain multiple metrics in the hero number field.`
    });
    score -= Math.min(18, bloatedBigNumbers.length * 9);
  }

  const decorativeCount = contentSlides.filter(slide => DECORATIVE_LAYOUTS.has(slide.layout)).length;
  if (contentSlides.length && decorativeCount / contentSlides.length > 0.4) {
    findings.push({
      severity: 'medium',
      rule: 'decorative_layout_overuse',
      message: `${decorativeCount}/${contentSlides.length} content slides use decorative layouts instead of analytical structures.`
    });
    score -= 8;
  }

  return {
    score: Math.max(0, score),
    grade: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D',
    summary: {
      slides: slides.length,
      contentSlides: contentSlides.length,
      actionTitleRatio: Number(actionTitleRatio.toFixed(2)),
      evidenceRatio: Number(evidenceRatio.toFixed(2)),
      placeholderSlides: placeholderSlides.length
    },
    findings
  };
}

function main() {
  const args = process.argv.slice(2);
  const specPath = args.find(arg => !arg.startsWith('--'));
  const asJson = args.includes('--json');
  const threshold = Number(getArgValue(args, '--threshold') || 70);

  if (!specPath || args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    process.exitCode = specPath ? 0 : 2;
    return;
  }
  const resolved = resolve(process.cwd(), specPath);
  if (!existsSync(resolved)) {
    console.error(`Spec not found: ${resolved}`);
    process.exitCode = 2;
    return;
  }

  const report = auditSpec(JSON.parse(readFileSync(resolved, 'utf8')));
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`PPT benchmark score: ${report.score}/100 (${report.grade})`);
    for (const finding of report.findings) {
      console.log(`- ${finding.severity.toUpperCase()} ${finding.rule}: ${finding.message}`);
    }
  }
  if (report.score < threshold) process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

