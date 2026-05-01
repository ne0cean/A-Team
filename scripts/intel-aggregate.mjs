#!/usr/bin/env node
// intel-aggregate.mjs
// .intel/ 디렉토리의 JSON 파일을 프로젝트 키워드로 필터링 후 병합

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const INTEL_DIR = join(PROJECT_ROOT, '.intel');

/**
 * 프로젝트 키워드로 JSON 파일 필터링
 */
function filterByProject(files, projectKeyword) {
  const keyword = projectKeyword.toLowerCase();
  return files.filter(file => {
    const content = readFileSync(file, 'utf8');
    const filename = file.toLowerCase();

    // 파일명 또는 내용에 키워드 포함 시 매칭
    return filename.includes(keyword) || content.toLowerCase().includes(keyword);
  });
}

/**
 * 디렉토리의 모든 JSON 파일 로드
 */
function loadJsonFiles(dir) {
  try {
    const files = readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => join(dir, f));

    return files.map(file => {
      try {
        return JSON.parse(readFileSync(file, 'utf8'));
      } catch (e) {
        console.error(`[WARN] JSON 파싱 실패: ${file}`, e.message);
        return null;
      }
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

/**
 * 메인 집계 로직
 */
function aggregateIntel(projectKeyword) {
  const competitors = loadJsonFiles(join(INTEL_DIR, 'competitors'));
  const trends = loadJsonFiles(join(INTEL_DIR, 'trends'));
  const personas = loadJsonFiles(join(INTEL_DIR, 'personas'));

  // 키워드 필터링 (옵션)
  let filteredCompetitors = competitors;
  let filteredTrends = trends;
  let filteredPersonas = personas;

  if (projectKeyword) {
    const allFiles = [
      ...readdirSync(join(INTEL_DIR, 'competitors')).map(f => join(INTEL_DIR, 'competitors', f)),
      ...readdirSync(join(INTEL_DIR, 'trends')).map(f => join(INTEL_DIR, 'trends', f)),
      ...readdirSync(join(INTEL_DIR, 'personas')).map(f => join(INTEL_DIR, 'personas', f)),
    ].filter(f => f.endsWith('.json'));

    const matched = filterByProject(allFiles, projectKeyword);

    filteredCompetitors = competitors.filter((_, i) =>
      matched.some(m => m.includes('competitors'))
    );
    filteredTrends = trends.filter((_, i) =>
      matched.some(m => m.includes('trends'))
    );
    filteredPersonas = personas.filter((_, i) =>
      matched.some(m => m.includes('personas'))
    );
  }

  return {
    project: projectKeyword || 'all',
    generatedAt: new Date().toISOString(),
    competitors: filteredCompetitors,
    trends: filteredTrends,
    personas: filteredPersonas,
    totalFiles: filteredCompetitors.length + filteredTrends.length + filteredPersonas.length,
  };
}

// CLI 실행
const projectKeyword = process.argv[2];

if (!projectKeyword) {
  console.error('사용법: node intel-aggregate.mjs <프로젝트명>');
  console.error('예시: node intel-aggregate.mjs new-saas-launch');
  process.exit(1);
}

const result = aggregateIntel(projectKeyword);

if (result.totalFiles === 0) {
  console.error(`❌ "${projectKeyword}" 관련 데이터 없음`);
  console.error('먼저 /intel competitor/trend/persona 실행하세요.');
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
