#!/usr/bin/env node
// intel-aggregate.mjs
// .intel/ 디렉토리의 JSON 파일을 프로젝트 키워드로 필터링 후 병합

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const INTEL_DIR = process.env.INTEL_DIR || join(PROJECT_ROOT, '.intel');

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
 * 디렉토리의 모든 JSON 파일 로드 (옵션: 키워드 필터)
 */
function loadJsonFiles(dir, projectKeyword = null) {
  try {
    let files = readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => join(dir, f));

    // 키워드 필터링
    if (projectKeyword) {
      files = filterByProject(files, projectKeyword);
    }

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
  // "all" 키워드는 필터링 하지 않음
  const filterKeyword = projectKeyword === 'all' ? null : projectKeyword;

  const competitors = loadJsonFiles(join(INTEL_DIR, 'competitors'), filterKeyword);
  const trends = loadJsonFiles(join(INTEL_DIR, 'trends'), filterKeyword);
  const personas = loadJsonFiles(join(INTEL_DIR, 'personas'), filterKeyword);

  return {
    project: projectKeyword || 'all',
    generatedAt: new Date().toISOString(),
    competitors,
    trends,
    personas,
    totalFiles: competitors.length + trends.length + personas.length,
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
