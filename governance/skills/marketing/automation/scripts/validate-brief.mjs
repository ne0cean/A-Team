#!/usr/bin/env node
/**
 * Brief schema validator
 * 사용: node validate-brief.mjs path/to/06-brief.json
 *
 * marketing-research 산출물 06-brief.json 을 brief.schema.json 으로 검증.
 * Make.com / n8n 워크플로우에서 호출 가능 + CLI 사용 가능.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, '../../schemas/brief.schema.json');

function validate(briefPath) {
  if (!fs.existsSync(briefPath)) {
    console.error(`ERROR: Brief file not found: ${briefPath}`);
    process.exit(2);
  }

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`ERROR: Schema not found: ${SCHEMA_PATH}`);
    process.exit(2);
  }

  let brief, schema;
  try {
    brief = JSON.parse(fs.readFileSync(briefPath, 'utf-8'));
    schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  } catch (e) {
    console.error(`ERROR: JSON parse failed: ${e.message}`);
    process.exit(2);
  }

  const errors = [];
  const warnings = [];

  for (const required of schema.required || []) {
    if (!(required in brief)) {
      errors.push(`MISSING required field: ${required}`);
    }
  }

  if (brief.title_options) {
    if (!Array.isArray(brief.title_options) || brief.title_options.length !== 5) {
      errors.push(`title_options must be array of exactly 5, got ${brief.title_options?.length}`);
    }
  }

  if (brief.meta_description) {
    const len = brief.meta_description.length;
    if (len < 100 || len > 160) {
      warnings.push(`meta_description length ${len} (recommended 100-160)`);
    }
  }

  if (brief.content_structure?.sections) {
    const sections = brief.content_structure.sections;
    if (sections.length < 3) {
      errors.push(`sections must have at least 3, got ${sections.length}`);
    }
    sections.forEach((s, i) => {
      if (!s.h2 || !s.word_count || !s.purpose) {
        errors.push(`section[${i}] missing required field (h2/word_count/purpose)`);
      }
    });
  }

  if (brief.unique_angle && brief.unique_angle.length < 30) {
    warnings.push(`unique_angle too short (${brief.unique_angle.length} chars, recommend 30+)`);
  }

  if (errors.length === 0) {
    console.log(`✅ VALID — ${briefPath}`);
    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${warnings.length}):`);
      warnings.forEach(w => console.log(`  - ${w}`));
    }
    process.exit(0);
  } else {
    console.error(`❌ INVALID — ${briefPath}`);
    console.error(`\nErrors (${errors.length}):`);
    errors.forEach(e => console.error(`  - ${e}`));
    if (warnings.length > 0) {
      console.error(`\nWarnings (${warnings.length}):`);
      warnings.forEach(w => console.error(`  - ${w}`));
    }
    process.exit(1);
  }
}

const briefPath = process.argv[2];
if (!briefPath) {
  console.error('Usage: node validate-brief.mjs <path/to/06-brief.json>');
  process.exit(2);
}

validate(path.resolve(briefPath));
