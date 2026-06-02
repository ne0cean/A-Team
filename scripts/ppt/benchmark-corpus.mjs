#!/usr/bin/env node
/**
 * PPT benchmark corpus manager.
 *
 * Keeps benchmark sources reproducible without committing third-party PDFs.
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import https from 'https';
import http from 'http';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_MANIFEST = join(REPO_ROOT, 'reference', 'ppt-benchmarks', 'manifest.json');
const CACHE_DIR = join(REPO_ROOT, 'reference', 'ppt-benchmarks');
const PDF_DIR = join(CACHE_DIR, 'pdfs');
const SLIDE_DIR = join(CACHE_DIR, 'slides');

const OFFICIAL_DOMAINS = [
  'mckinsey.com',
  'bcg.com',
  'media-publications.bcg.com',
  'web-assets.bcg.com',
  'bain.com',
  'media.bain.com'
];

export function loadManifest(path = DEFAULT_MANIFEST) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function validateManifest(manifest) {
  const errors = [];
  const ids = new Set();
  const rubricWeight = (manifest.rubric || []).reduce((sum, item) => sum + Number(item.weight || 0), 0);

  if (manifest.policy?.sourceRule !== 'official_public_only') {
    errors.push('policy.sourceRule must be official_public_only');
  }
  if (rubricWeight !== 100) {
    errors.push(`rubric weights must sum to 100, got ${rubricWeight}`);
  }

  for (const [idx, source] of (manifest.sources || []).entries()) {
    const prefix = `sources[${idx}]`;
    for (const field of ['id', 'firm', 'title', 'sourceType', 'pageUrl', 'acquisition', 'priority']) {
      if (!source[field]) errors.push(`${prefix}.${field} is required`);
    }
    if (ids.has(source.id)) errors.push(`${prefix}.id is duplicated: ${source.id}`);
    ids.add(source.id);

    for (const field of ['pageUrl', 'pdfUrl']) {
      if (!source[field]) continue;
      let host = '';
      try {
        host = new URL(source[field]).hostname;
      } catch {
        errors.push(`${prefix}.${field} is not a valid URL`);
        continue;
      }
      if (!OFFICIAL_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`))) {
        errors.push(`${prefix}.${field} is not in official domain allowlist: ${host}`);
      }
    }
    if (!Array.isArray(source.benchmarkFocus) || source.benchmarkFocus.length === 0) {
      errors.push(`${prefix}.benchmarkFocus must include at least one tag`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function usage() {
  return [
    'Usage: node scripts/ppt/benchmark-corpus.mjs <command> [options]',
    '',
    'Commands:',
    '  validate          Validate manifest schema and official-domain policy',
    '  list              Print benchmark source summary',
    '  fetch [--dry-run] Download direct PDF sources into reference/ppt-benchmarks/pdfs',
    '  render            Render downloaded PDFs to PNG via pdftoppm or PyMuPDF',
    '',
    'Options:',
    '  --manifest <path> Use a custom manifest path',
    '  --python <path>   Python executable with PyMuPDF installed, used when pdftoppm is unavailable'
  ].join('\n');
}

function getArgValue(args, flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}

function hasCommand(command) {
  return spawnSync('which', [command], { encoding: 'utf8' }).status === 0;
}

function pdfFilename(source) {
  const suffix = source.pdfUrl ? basename(new URL(source.pdfUrl).pathname) : `${source.id}.pdf`;
  return `${source.id}-${suffix}`.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function download(url, destination) {
  const client = url.startsWith('https:') ? https : http;
  return new Promise((resolvePromise, reject) => {
    const request = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 A-Team-PPT-Benchmark/1.0',
        'Accept': 'application/pdf,*/*;q=0.8'
      }
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode || 0) && response.headers.location) {
        download(new URL(response.headers.location, url).toString(), destination).then(resolvePromise, reject);
        return;
      }
      if ((response.statusCode || 0) >= 400) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      mkdirSync(dirname(destination), { recursive: true });
      const file = createWriteStream(destination);
      response.pipe(file);
      file.on('finish', () => file.close(resolvePromise));
      file.on('error', reject);
    });
    request.on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args.find(arg => !arg.startsWith('--')) || 'help';
  const manifestPath = getArgValue(args, '--manifest') || DEFAULT_MANIFEST;
  const pythonPath = getArgValue(args, '--python') || process.env.PPT_BENCHMARK_PYTHON || 'python3';
  const manifest = loadManifest(manifestPath);

  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(usage());
    return;
  }

  const validation = validateManifest(manifest);
  if (!validation.ok) {
    console.error(validation.errors.join('\n'));
    process.exitCode = 2;
    return;
  }

  if (command === 'validate') {
    console.log(JSON.stringify({ ok: true, sources: manifest.sources.length, rubricWeight: 100 }, null, 2));
    return;
  }

  if (command === 'list') {
    for (const source of manifest.sources) {
      const mode = source.pdfUrl ? 'direct_pdf' : source.acquisition;
      console.log(`${source.priority.padEnd(6)} ${source.firm}: ${source.title} (${mode})`);
    }
    return;
  }

  if (command === 'fetch') {
    const dryRun = args.includes('--dry-run');
    const directSources = manifest.sources.filter(source => source.pdfUrl);
    const results = [];
    for (const source of directSources) {
      const destination = join(PDF_DIR, pdfFilename(source));
      if (dryRun) {
        console.log(`[dry-run] ${source.pdfUrl} -> ${destination}`);
        continue;
      }
      if (existsSync(destination)) {
        console.log(`[skip] ${destination}`);
        continue;
      }
      console.log(`[fetch] ${source.id}`);
      try {
        await download(source.pdfUrl, destination);
        results.push({ id: source.id, ok: true });
      } catch (error) {
        results.push({ id: source.id, ok: false, error: error.message });
        console.error(`[failed] ${source.id}: ${error.message}`);
      }
    }
    const failed = results.filter(result => !result.ok);
    if (failed.length > 0) {
      console.error(`${failed.length}/${results.length} direct PDF downloads failed. Use manual download for blocked sources.`);
      process.exitCode = 1;
    }
    return;
  }

  if (command === 'render') {
    const renderer = hasCommand('pdftoppm') ? 'pdftoppm' : 'pymupdf';
    mkdirSync(SLIDE_DIR, { recursive: true });
    for (const source of manifest.sources.filter(item => item.pdfUrl)) {
      const pdfPath = join(PDF_DIR, pdfFilename(source));
      if (!existsSync(pdfPath)) {
        console.log(`[missing] ${pdfPath}`);
        continue;
      }
      const outDir = join(SLIDE_DIR, source.id);
      mkdirSync(outDir, { recursive: true });
      let result;
      if (renderer === 'pdftoppm') {
        const prefix = join(outDir, 'slide');
        result = spawnSync('pdftoppm', ['-png', '-r', '144', pdfPath, prefix], { encoding: 'utf8' });
      } else {
        const code = [
          'import fitz, os, sys',
          'pdf_path, out_dir = sys.argv[1], sys.argv[2]',
          'os.makedirs(out_dir, exist_ok=True)',
          'doc = fitz.open(pdf_path)',
          'matrix = fitz.Matrix(2, 2)',
          'for idx, page in enumerate(doc, start=1):',
          '    pix = page.get_pixmap(matrix=matrix, alpha=False)',
          '    pix.save(os.path.join(out_dir, f"slide-{idx:03d}.png"))',
          'print(len(doc))'
        ].join('\n');
        result = spawnSync(pythonPath, ['-c', code, pdfPath, outDir], { encoding: 'utf8' });
      }
      if (result.status !== 0) {
        console.error(result.stderr || `render failed: ${source.id}`);
        if (renderer === 'pymupdf') {
          console.error('PyMuPDF renderer needs a Python with fitz installed. Pass --python <path> or set PPT_BENCHMARK_PYTHON.');
        }
        process.exitCode = result.status || 1;
        return;
      }
      console.log(`[rendered] ${source.id} via ${renderer}`);
    }
    return;
  }

  console.error(`Unknown command: ${command}\n\n${usage()}`);
  process.exitCode = 2;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
