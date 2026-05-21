import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const REVIEWS_PATH = resolve(ROOT, '.context', 'scheduled-reviews.json');
const SCRIPT_PATH = resolve(ROOT, 'scripts', 'check-scheduled-reviews.mjs');

describe('Scheduled Reviews 인프라', () => {
  it('check script should exist', () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true);
  });

  it('scheduled-reviews.json should be valid JSON array', () => {
    if (!existsSync(REVIEWS_PATH)) return; // 파일 없으면 통과 (신규 프로젝트)
    const data = JSON.parse(readFileSync(REVIEWS_PATH, 'utf-8'));
    expect(Array.isArray(data)).toBe(true);
  });

  it('each review should have required fields', () => {
    if (!existsSync(REVIEWS_PATH)) return;
    const data = JSON.parse(readFileSync(REVIEWS_PATH, 'utf-8'));
    const REQUIRED = ['id', 'due', 'title', 'status'];

    const invalid: string[] = [];
    for (const item of data) {
      for (const field of REQUIRED) {
        if (!item[field]) {
          invalid.push(`${item.id || 'unknown'}: ${field} 누락`);
        }
      }
      // due 형식 검증 (YYYY-MM-DD)
      if (item.due && !/^\d{4}-\d{2}-\d{2}$/.test(item.due)) {
        invalid.push(`${item.id}: due 형식 오류 "${item.due}" (YYYY-MM-DD 필요)`);
      }
    }
    expect(invalid, `필드 위반:\n${invalid.join('\n')}`).toEqual([]);
  });

  it('no duplicate ids', () => {
    if (!existsSync(REVIEWS_PATH)) return;
    const data = JSON.parse(readFileSync(REVIEWS_PATH, 'utf-8'));
    const ids = data.map((r: { id: string }) => r.id);
    const dupes = ids.filter((id: string, i: number) => ids.indexOf(id) !== i);
    expect(dupes, `중복 id: ${dupes.join(', ')}`).toEqual([]);
  });
});
