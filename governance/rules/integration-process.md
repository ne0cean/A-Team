# Integration Process — 외부 통합 강제 품질 게이트

> **목적**: Ralph처럼 "문서는 거창한데 구현은 없는" 통합을 근본적으로 차단

**감사 배경** (2026-05-03):
- **건강도**: 54% (27/50 stars)
- **Documentation Inflation**: 거창한 문서 vs 미설치/미배포
- **Misleading Commits**: "가동" 메시지인데 실제로 작동 안함
- **No Evidence**: analytics.jsonl 없어서 실사용 검증 불가

**핵심 원칙**: 허술한 통합은 기술 부채가 아니라 **조직 부패**다.

---

## Phase 0: 통합 전 리서치 (필수)

### 0.1 외부 대안 조사

**자체 구현 시작 전 반드시 실행:**

```bash
# GitHub awesome-* 리스트 검색
gh search repos "awesome-[카테고리]" --sort stars --limit 5

# 키워드 검색 (stars >100, 최근 6개월 업데이트)
gh search repos "[키워드]" \
  --stars ">100" \
  --pushed ">=2025-11-01" \
  --sort stars --limit 10

# 경쟁 프로젝트 테스트 수 확인
gh repo view [owner/repo] --json openGraphImageUrl | \
  grep -i "tests\|coverage" || echo "테스트 정보 없음"
```

**비교 매트릭스** (자체 vs 외부):

| 항목 | 자체 구현 | 외부 프로젝트 | 결정 |
|------|---------|------------|------|
| 테스트 수 | 0 (신규) | 566 (frankbria/ralph) | → 외부 |
| 유지보수 | 1인 | 커뮤니티 8.2k stars | → 외부 |
| 기능 | 기본만 | Production-grade | → 외부 |
| 통합 비용 | 0 (자체) | ./install.sh 실행 | → 외부 |
| 라이선스 | N/A | MIT (자유) | → 외부 |

**결정 기준:**
- 외부 > 자체: **테스트 100개 이상** OR **stars 500+ AND 최근 3개월 활동**
- 자체 > 외부: A-Team 특화 로직 OR 외부 의존성 제로 필요

**산출물:**
- `.context/integrations/[기능명]-research.md` 작성
- 결정 근거 + 대안 3개 + 선택 이유

---

## Phase 1: 통합 계획 (강제 문서)

### 1.1 통합 명세서 작성

**파일**: `.context/integrations/[기능명]-integration-plan.md`

```markdown
# [기능명] Integration Plan

## Metadata
- **Source**: [GitHub URL or "internal"]
- **Version**: [semver or commit hash]
- **License**: [MIT/Apache/etc.]
- **Stars**: [GitHub stars] (외부 프로젝트 시)
- **Last updated**: [upstream last commit date]
- **Integration date**: [YYYY-MM-DD]
- **Integrator**: [GitHub username or "A-Team"]

## Decision
- [ ] External (Wrapper)
- [ ] External (Fork + Customize)
- [ ] Internal (Build from scratch)

**Rationale**: [왜 이 방식을 선택했는가? 대안과 비교]

## Integration Type
- [ ] Binary (CLI tool) — requires installation
- [ ] Library (npm package) — requires dependency
- [ ] MCP Server — requires settings.json config
- [ ] Code Pattern — copy & adapt
- [ ] Documentation Reference — no code integration

## Installation Steps
1. [구체적 설치 명령]
2. [검증 명령]
3. [롤백 명령]

## Files Affected
- **Added**: [list new files]
- **Modified**: [list modified files]
- **Configuration**: [settings.json, .claude.json, etc.]

## Verification Checklist
- [ ] Binary exists (`which [cmd]` or path check)
- [ ] Version matches plan (`[cmd] --version`)
- [ ] Basic smoke test passes
- [ ] Documentation updated (external-references.md)
- [ ] Test added (minimum 1)
- [ ] Analytics event added (if applicable)

## Rollback Plan
```bash
# [Exact commands to uninstall/revert]
```

## Maintenance
- **Update frequency**: [weekly/monthly/on-demand]
- **Upstream monitor**: [GitHub watch/RSS/manual]
- **Break-glass contact**: [upstream maintainer or internal owner]
```

**거부 조건:**
- 계획서 없으면 → 통합 PR 자동 거절
- "TODO" 또는 placeholder 있으면 → 거절

---

## Phase 2: 구현 및 설치

### 2.1 설치 증명 (필수)

**Binary/CLI 통합:**
```bash
# 설치 후 즉시 실행
which [binary] || echo "❌ FAIL: Binary not found"
[binary] --version || [binary] -v || echo "⚠️ Version check failed"

# 스크린샷 or 로그 저장
[binary] --help > .context/integrations/[binary]-install-proof.txt
```

**MCP 통합:**
```bash
# settings.json 백업
cp ~/.claude/settings.json ~/.claude/settings.json.backup-$(date +%s)

# MCP 등록 후 검증
claude mcp list | grep "[mcp-name]" || echo "❌ FAIL: MCP not registered"
```

**Library 통합:**
```bash
# package.json 확인
jq '.dependencies["[package-name]"]' package.json || echo "❌ FAIL: Dependency not added"

# 설치 검증
npm ls [package-name] || echo "❌ FAIL: Package not installed"
```

### 2.2 Smoke Test (필수)

**최소 1개 동작 검증:**
```bash
# Example: Ralph
ralph --status || echo "❌ FAIL: Ralph not working"

# Example: MCP
echo '{"method":"tools/list"}' | mcp-client [server-name] || echo "❌ FAIL: MCP not responding"

# Example: Library
node -e "require('[package]'); console.log('OK')" || echo "❌ FAIL: Import failed"
```

**산출물:**
- `.context/integrations/[기능명]-smoke-test.log`
- 성공/실패 명시
- 스크린샷 or 출력 저장

---

## Phase 3: 문서화 (필수)

### 3.1 external-references.md 등록

**즉시 추가 (통합 완료 후 1시간 이내):**

```markdown
| [날짜] | [이름] | [URL] | [흡수 부분] | [반영 위치] | [라이선스] |
```

**필수 필드:**
- 날짜: YYYY-MM-DD
- URL: 정확한 GitHub/docs URL
- 흡수 부분: 구체적 (e.g., "Dual-condition exit gate", not "통합")
- 반영 위치: 파일 경로 (e.g., `.claude/commands/ralph.md`)
- 라이선스: MIT/Apache/etc.

### 3.2 커맨드 문서 업데이트

**`.claude/commands/[기능].md` 작성 시 필수 섹션:**

```markdown
## Installation

**Status**: ✅ Installed | ⚠️ Not Installed | 🔄 Pending

**Verification**:
```bash
# [exact command to verify installation]
```

**Expected output**: [sample output or "command found"]

## Quick Start

[3줄 이내 최소 사용법]

## Implementation

- **Type**: External (frankbria/ralph) | Internal (ralph-daemon.mjs)
- **Binary**: /path/to/binary
- **Config**: ~/.config/file
- **Tests**: [count] passing

## Last Used

[YYYY-MM-DD or "Never" or "Unknown"]
```

**거부 조건:**
- "Installation" 섹션 없으면 → PR 거절
- Status와 실제 불일치 → PR 거절

### 3.3 Analytics 이벤트 추가 (권장)

```typescript
// lib/analytics.ts
export function logIntegrationEvent(data: {
  integration: string;
  action: 'install' | 'use' | 'update' | 'remove';
  version?: string;
  metadata?: Record<string, unknown>;
}) {
  logEvent({
    type: 'integration',
    timestamp: new Date().toISOString(),
    ...data,
  });
}
```

**호출 위치:**
- 설치 스크립트
- 커맨드 실행 시작
- 업데이트 후

---

## Phase 4: 테스트 (필수)

### 4.1 최소 테스트 요구사항

**통합 타입별 최소 테스트:**

| 타입 | 최소 테스트 | 예시 |
|------|-----------|------|
| Binary | 1개 (설치 검증) | `test/integrations/ralph.test.ts` |
| Library | 3개 (import, basic use, error) | `test/unit/[lib].test.ts` |
| MCP | 1개 (연결 검증) | `test/integrations/mcp-[name].test.ts` |
| Pattern | 5개 (각 패턴마다) | `test/unit/circuit-breaker.test.ts` |

**테스트 템플릿** (Binary):

```typescript
// test/integrations/[binary].test.ts
import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('[Binary] Integration', () => {
  it('should be installed', async () => {
    const { stdout } = await execAsync('which [binary]');
    expect(stdout).toContain('/');
  });

  it('should return version', async () => {
    const { stdout } = await execAsync('[binary] --version');
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should pass smoke test', async () => {
    const { stdout, stderr } = await execAsync('[binary] [smoke-test-cmd]');
    expect(stderr).toBe('');
    expect(stdout).toContain('[expected-output]');
  });
});
```

**CI 통합:**
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests
on: [push, pull_request]
jobs:
  test-integrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run integration tests
        run: npm run test:integration
```

---

## Phase 5: 유지보수 계획

### 5.1 업데이트 모니터링

**External 통합:**
```bash
# GitHub watch 설정
gh repo set-upstream [owner/repo]
gh repo watch [owner/repo] --include releases

# 월간 버전 체크 (스크립트 자동화)
#!/bin/bash
# scripts/check-integration-updates.sh
CURRENT_VERSION=$(ralph --version | grep -oE '\d+\.\d+\.\d+')
LATEST_VERSION=$(gh release view --repo frankbria/ralph-claude-code --json tagName -q .tagName | sed 's/v//')

if [ "$CURRENT_VERSION" != "$LATEST_VERSION" ]; then
  echo "⚠️ Update available: $CURRENT_VERSION → $LATEST_VERSION"
  echo "- Review changelog: https://github.com/frankbria/ralph-claude-code/releases"
  echo "- Update plan: .context/integrations/ralph-update-$LATEST_VERSION.md"
fi
```

**Internal 통합:**
```bash
# 테스트 회귀 모니터링
npm test -- --reporter=json > test-results.json
jq '.numFailedTests' test-results.json | grep -q '^0$' || \
  echo "⚠️ Regression detected in internal integration"
```

### 5.2 Deprecation 기준

**제거 트리거:**
- 6개월 사용 없음 (analytics.jsonl 기준)
- Upstream 1년 이상 업데이트 없음
- 보안 취약점 발견 + 패치 없음
- 대체 통합 가용 + migration 완료

**제거 프로세스:**
1. `.context/integrations/[기능]-deprecation.md` 작성
2. 3개월 deprecation 기간 (warning 추가)
3. 사용자 마이그레이션 가이드 제공
4. 제거 + external-references.md에 "Removed" 마킹

---

## Enforcement: Git Hooks

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# 통합 관련 파일 변경 감지
CHANGED_FILES=$(git diff --cached --name-only)

if echo "$CHANGED_FILES" | grep -qE '(^\.claude/commands/.*\.md$|^scripts/.*install.*\.sh$|^package\.json$)'; then
  echo "⚠️ Integration-related files changed. Checking compliance..."

  # external-references.md 업데이트 확인
  if ! echo "$CHANGED_FILES" | grep -q "governance/external-references.md"; then
    echo "❌ FAIL: Integration changes must update governance/external-references.md"
    echo "   Run: Edit governance/external-references.md and add entry"
    exit 1
  fi

  # Integration plan 존재 확인 (신규 통합 시)
  NEW_COMMANDS=$(echo "$CHANGED_FILES" | grep '^\.claude/commands/.*\.md$' | wc -l)
  if [ "$NEW_COMMANDS" -gt 0 ]; then
    for cmd_file in $(echo "$CHANGED_FILES" | grep '^\.claude/commands/.*\.md$'); do
      cmd_name=$(basename "$cmd_file" .md)
      if [ ! -f ".context/integrations/$cmd_name-integration-plan.md" ]; then
        echo "❌ FAIL: New command $cmd_name requires integration plan"
        echo "   Create: .context/integrations/$cmd_name-integration-plan.md"
        exit 1
      fi
    done
  fi
fi

echo "✅ Integration compliance checks passed"
```

### Post-merge Hook

```bash
#!/bin/bash
# .git/hooks/post-merge

# 설치 필요한 통합 감지
if git diff HEAD@{1} --name-only | grep -qE '(install.*\.sh$|package\.json$)'; then
  echo "⚠️ Integration changes detected. Review installation requirements:"
  echo "   - Check .context/integrations/*-integration-plan.md"
  echo "   - Run installation scripts if needed"
  echo "   - Verify with: npm test"
fi
```

---

## Integration Dashboard

### /integration-status Command

`.claude/commands/integration-status.md`:

```markdown
---
description: Show integration health and compliance status
---

Run integration health check:

```bash
node scripts/integration-dashboard.mjs
```

**Generates**:
- `.context/integrations/DASHBOARD.md`
- Health score (0-100%)
- Compliance violations
- Missing verifications
- Update recommendations
```

### scripts/integration-dashboard.mjs

```typescript
#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

interface Integration {
  name: string;
  type: 'binary' | 'library' | 'mcp' | 'pattern';
  source: 'external' | 'internal';
  documented: boolean;
  installed: boolean;
  tested: boolean;
  lastUsed?: string;
  version?: string;
  healthScore: number;
}

function checkBinary(name: string): boolean {
  try {
    execSync(`which ${name}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkMcp(name: string): boolean {
  try {
    const settings = JSON.parse(fs.readFileSync(process.env.HOME + '/.claude/settings.json', 'utf8'));
    return !!settings.mcpServers?.[name];
  } catch {
    return false;
  }
}

function checkLibrary(name: string): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    return !!pkg.dependencies?.[name] || !!pkg.devDependencies?.[name];
  } catch {
    return false;
  }
}

function auditIntegrations(): Integration[] {
  const integrations: Integration[] = [];

  // Parse external-references.md
  const refs = fs.readFileSync('governance/external-references.md', 'utf8');

  // Binary integrations
  const binaries = ['ralph', 'rtk', 'yt-dlp', 'ffmpeg'];
  for (const bin of binaries) {
    integrations.push({
      name: bin,
      type: 'binary',
      source: refs.includes(`/${bin}`) ? 'external' : 'internal',
      documented: refs.includes(bin),
      installed: checkBinary(bin),
      tested: fs.existsSync(`test/integrations/${bin}.test.ts`),
      healthScore: 0,
    });
  }

  // MCP integrations
  const mcps = ['stitch', 'context-mode', 'memory', 'sequential-thinking'];
  for (const mcp of mcps) {
    integrations.push({
      name: mcp,
      type: 'mcp',
      source: 'external',
      documented: refs.includes(mcp),
      installed: checkMcp(mcp),
      tested: fs.existsSync(`test/integrations/mcp-${mcp}.test.ts`),
      healthScore: 0,
    });
  }

  // Calculate health scores
  for (const integration of integrations) {
    let score = 0;
    if (integration.documented) score += 20;
    if (integration.installed) score += 40;
    if (integration.tested) score += 40;
    integration.healthScore = score;
  }

  return integrations;
}

function generateDashboard(integrations: Integration[]): string {
  const total = integrations.length;
  const healthy = integrations.filter(i => i.healthScore >= 80).length;
  const unhealthy = integrations.filter(i => i.healthScore < 40).length;

  let md = `# Integration Health Dashboard\n\n`;
  md += `**Generated**: ${new Date().toISOString()}\n`;
  md += `**Overall Health**: ${Math.round((healthy / total) * 100)}%\n\n`;
  md += `- ✅ Healthy: ${healthy}\n`;
  md += `- ⚠️ Partial: ${total - healthy - unhealthy}\n`;
  md += `- ❌ Unhealthy: ${unhealthy}\n\n`;

  md += `## Integration Status\n\n`;
  md += `| Name | Type | Source | Doc | Installed | Tested | Health |\n`;
  md += `|------|------|--------|-----|-----------|--------|--------|\n`;

  for (const integration of integrations.sort((a, b) => b.healthScore - a.healthScore)) {
    const icon = integration.healthScore >= 80 ? '✅' : integration.healthScore >= 40 ? '⚠️' : '❌';
    md += `| ${integration.name} | ${integration.type} | ${integration.source} | ${integration.documented ? '✅' : '❌'} | ${integration.installed ? '✅' : '❌'} | ${integration.tested ? '✅' : '❌'} | ${icon} ${integration.healthScore}% |\n`;
  }

  md += `\n## Violations\n\n`;
  const violations = integrations.filter(i => i.documented && !i.installed);
  if (violations.length > 0) {
    md += `❌ **Documented but not installed**:\n`;
    for (const v of violations) {
      md += `- ${v.name} (${v.type})\n`;
    }
  } else {
    md += `✅ No violations\n`;
  }

  return md;
}

// Main
const integrations = auditIntegrations();
const dashboard = generateDashboard(integrations);
fs.writeFileSync('.context/integrations/DASHBOARD.md', dashboard);
console.log(dashboard);
```

**Usage**:
```bash
# 수동 실행
npm run integration:check

# 매주 월요일 자동 실행 (GitHub Actions)
# .github/workflows/integration-health.yml
```

---

## Checklist: 통합 완료 확인

**모든 체크 ✅ 전까지 "통합 완료" 선언 금지:**

- [ ] **Phase 0: 리서치**
  - [ ] GitHub 대안 조사 (3개 이상)
  - [ ] 비교 매트릭스 작성
  - [ ] 결정 근거 문서화

- [ ] **Phase 1: 계획**
  - [ ] `.context/integrations/[기능]-integration-plan.md` 작성
  - [ ] 설치 단계 명시 (구체적 명령)
  - [ ] 롤백 계획 명시

- [ ] **Phase 2: 구현**
  - [ ] Binary/MCP/Library 설치 완료
  - [ ] `which [binary]` 또는 설정 검증 성공
  - [ ] Smoke test 통과
  - [ ] `.context/integrations/[기능]-smoke-test.log` 저장

- [ ] **Phase 3: 문서화**
  - [ ] `governance/external-references.md` 업데이트
  - [ ] `.claude/commands/[기능].md` 작성 (Installation 섹션 필수)
  - [ ] Analytics 이벤트 추가 (권장)

- [ ] **Phase 4: 테스트**
  - [ ] 최소 1개 테스트 작성
  - [ ] `npm test` 통과
  - [ ] CI 통과

- [ ] **Phase 5: 유지보수**
  - [ ] Upstream watch 설정 (외부 통합)
  - [ ] 업데이트 모니터링 스크립트 (선택)
  - [ ] Deprecation 기준 명시

**Git Commit 시 포함:**
```bash
git add \
  .context/integrations/[기능]-integration-plan.md \
  .context/integrations/[기능]-smoke-test.log \
  governance/external-references.md \
  .claude/commands/[기능].md \
  test/integrations/[기능].test.ts \
  package.json  # (library 통합 시)

git commit -m "feat([기능]): Complete integration with evidence

- Research: 3 alternatives evaluated
- Installation: Verified at [path]
- Tests: [count] passing
- Documentation: external-references.md + command docs
- Health score: 100%

Evidence: .context/integrations/[기능]-smoke-test.log
"
```

---

## 안티패턴 예방

### ❌ Ralph 패턴 (Documented but Not Installed)

**증상:**
- `.claude/commands/ralph.md`: "production-ready 566 tests"
- `which ralph`: NOT FOUND
- Commit: "feat(ralph): Integrate frankbria/ralph-claude-code"

**근본 원인:**
- 문서 작성 ≠ 설치
- 커밋 메시지 과장
- 검증 생략

**예방:**
```bash
# Pre-commit hook
if git diff --cached .claude/commands/*.md | grep -q "Installation.*Installed"; then
  # Extract binary name
  BINARY=$(git diff --cached .claude/commands/*.md | grep -oP 'binary: \K\w+')
  if ! which "$BINARY" > /dev/null 2>&1; then
    echo "❌ FAIL: Binary $BINARY not found but marked as installed"
    exit 1
  fi
fi
```

### ❌ Postiz 패턴 (Misleading Commit)

**증상:**
- Commit: "feat: Postiz 가동"
- Reality: No Docker containers, no deployment

**근본 원인:**
- 의도 ≠ 실행
- "가동" (plan to activate) vs "가동됨" (activated)

**예방:**
```bash
# Commit message linter
if git log -1 --pretty=%B | grep -qE '가동|activated|deployed|installed'; then
  echo "⚠️ Commit claims deployment/activation. Verify:"
  echo "   - Binary: which [binary]"
  echo "   - Docker: docker ps | grep [container]"
  echo "   - Config: cat [config-file]"
  echo "   Add verification evidence to commit body or use 'planned' instead"
fi
```

### ❌ Analytics.jsonl 패턴 (Ghost File)

**증상:**
- 코드: `logEvent()` 호출 everywhere
- 파일: `analytics.jsonl` NOT EXISTS

**근본 원인:**
- 인프라 != 실사용
- 초기화 생략

**예방:**
```typescript
// lib/analytics.ts
const ANALYTICS_FILE = './analytics.jsonl';

export function logEvent(event: AnalyticsEvent) {
  if (!fs.existsSync(ANALYTICS_FILE)) {
    // Auto-initialize on first use
    fs.writeFileSync(ANALYTICS_FILE, '');
    console.warn('⚠️ analytics.jsonl created (was missing)');
  }
  fs.appendFileSync(ANALYTICS_FILE, JSON.stringify(event) + '\n');
}
```

---

## 성공 사례

### RTK (Rust Token Killer)

**Why it worked:**

1. ✅ **설치 증명**: `which rtk` → `/Users/noir/.local/bin/rtk`
2. ✅ **사용 증거**: `rtk gain` → 657 commands, 1.9M tokens
3. ✅ **정확한 문서**: RTK.md에 설치 명령 + 사용법
4. ✅ **Hooks 통합**: `.claude/settings.json` PreToolUse
5. ✅ **Analytics**: 실제 토큰 절감 데이터

**Lesson**: 통합은 설치 + 검증 + 사용 증거 3단계가 모두 완료되어야 "완료"

### Karpathy Autoresearch (Harness Engineering)

**What it is:**
- Andrej Karpathy의 프롬프트 자동 최적화 방법론
- 커뮤니티 표준: [awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering) (CC0)
- 9 카테고리: Agent Loop, Planning, Context, Tools, Skills/MCP, Permissions, Memory, Orchestration, Verification

**Integration approach:**
1. ✅ **Code Pattern** (not binary) — jangpm-meta-skills에서 포팅
2. ✅ **구현**: `.claude/commands/autoresearch.md` (428 lines)
3. ✅ **Shadow mode**: `governance/skills/autoresearch/shadow-evals.yaml`
4. ✅ **Validation**: `scripts/validate-blueprint.py`
5. ✅ **Attribution**: `governance/external-references.md` (MIT 라이선스 명시)

**Why it worked:**
- 패턴 차용 (binary 설치 불필요)
- A-Team 규격으로 재구현 (jangpm-meta-skills 포팅)
- Shadow tracking으로 실사용 검증
- Harness engineering 9 카테고리에 자가진단 매핑 (external-references.md)

**Harness Engineering 9-Category Framework:**

| 카테고리 | A-Team 통합 상태 | 평가 |
|---------|---------------|------|
| **Agent Loop** | orchestrator Phase 0-5 + ECS 원칙 | ✅ 충분 |
| **Planning** | pm.md + scope-validator | ✅ 충분 |
| **Context Delivery** | RTK 60-90% 압축 | ✅ 충분 (Headroom 검토 중) |
| **Tool Design** | 53 commands in governance/skills/ | ✅ 충분 |
| **Skills & MCP** | MCP plugins + /browse | ✅ 충분 |
| **Permissions** | governance/rules/guardrails.md | ✅ 충분 |
| **Memory & State** | RESUME.md + analytics.jsonl | 🔴 갭: cross-session 의미 메모리 |
| **Orchestration** | orchestrator + parallel-plan | ✅ 충분 |
| **Verification & CI** | quality-gate-stage2.sh | ✅ 충분 |

**Discovered Gap**: cross-session semantic memory (SimpleMem/Mem0) — Python 의존 + 개인정보 검토 필요 → Deferred

**Lesson**:
- **Harness engineering**은 통합의 메타프레임워크
- 9 카테고리로 자가진단 → 갭 발견 → 우선순위 결정
- 통합 전 "우리 시스템이 어디에 해당하나?" 먼저 매핑

---

## 요약

**통합 프로세스 5단계:**
1. **리서치** (외부 대안 조사, 비교)
2. **계획** (integration-plan.md 작성)
3. **구현** (설치 + smoke test)
4. **문서화** (external-references.md + command docs)
5. **테스트** (최소 1개 + CI)

**강제 조항:**
- 계획서 없으면 PR 거절
- 설치 검증 없으면 커밋 거절
- 테스트 없으면 "완료" 선언 금지

**Enforcement:**
- Pre-commit hook (문서 vs 설치 일치)
- Post-merge hook (설치 리마인더)
- `/integration-status` 대시보드
- 월간 health 리포트

**목표**: Integration Health 54% → 95%+
