/**
 * confluence-sync/config.mjs
 * 설정 중앙화. PAT는 환경변수 또는 .env.confluence 파일에서 로드.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

// .env.confluence 파일에서 PAT 로드 (없으면 환경변수 사용)
function loadEnv() {
  try {
    const lines = readFileSync(join(ROOT, '.env.confluence'), 'utf8').split('\n');
    for (const line of lines) {
      const [k, ...rest] = line.split('=');
      if (k && rest.length) process.env[k.trim()] = rest.join('=').trim();
    }
  } catch {
    // .env.confluence 없으면 환경변수만 사용
  }
}

loadEnv();

export const CONFIG = {
  confluence: {
    baseUrl: 'https://confluence.tde.sktelecom.com',
    pat: process.env.CONFLUENCE_PAT || '',
    pageId: '1074042453',      // 개인공간 > Dean > Cortex
    spaceKey: '~1109386',      // 개인공간
    userKey: 'e4c0815083e4494e0183e59aad780c03',
  },
  cortex: {
    baseUrl: 'https://cortex.feat-breeze.workers.dev',
  },
  sync: {
    intervalMs: 30_000,           // 30초
    stateFile: join(ROOT, '.confluence-sync-state.json'),
  },
};
