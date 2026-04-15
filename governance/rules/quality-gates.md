# Quality Gates — 4-Stage 검증 계단

> **출처**: alfredolopez80/multi-agent-ralph-loop (Aristotle First Principles methodology) + 2026-04-15 외부 리서치.
> **목적**: 자율 모드에서 "돌긴 돌았다" 착각 차단. 각 단계별 다른 검증 깊이로 **실제 유의미한 작업**만 통과.
> **적용**: ralph-daemon.mjs, /craft, /ship, /review, coder 서브에이전트 완료 후 자동 호출.

---

## 4 Stage 개요

| Stage | 이름 | 비용 | 차단? | 대상 |
|---|---|---|---|---|
| 1 | **Correctness** | 무료 | ✅ Block | 모든 자율 iteration |
| 2 | **Quality** | 무료 | ✅ Block | 모든 커밋 before push |
| 3 | **Security** | 초저비용 (grep) | ⚠️ Warn | UI/API/auth 변경 시 |
| 4 | **Consistency** | 무료 | ℹ️ Advisory | PR/release 전 |

**원칙**:
- 하위 stage 실패 → 즉시 중단, 상위 stage 실행 안 함
- Stage 3/4 는 차단력 낮음 — 완벽주의로 진전 막지 않음
- 각 stage는 독립 (의존성 X, 병렬 실행 가능)
- Automated-first: 사람 판정 최소화

---

## Stage 1 — Correctness (기존 Pre-check)

**질문**: "명령대로 수행됐는가?"
**비용**: 무료 (기존 `--check` 명령 재사용)
**차단**: 실패 시 즉시 iteration 종료

**구현**:
```bash
# ralph-daemon.mjs: runPreCheck(frozenCheckCommand)
npm test                    # 전체 테스트 통과
npx tsc --noEmit            # 타입 에러 0
grep -c "TODO FIXME" src/   # 금지 키워드 없음
```

**통과 조건**: 사용자 정의 `--check` exit 0
**실패 시**: stallCount++ → 2회 연속 실패 시 데몬 중단 (기존 동작 유지)

---

## Stage 2 — Quality (신규)

**질문**: "출력이 합리적인가? 쓸모 있는가?"
**비용**: 무료 (로컬 정적 검사)
**차단**: 심각 위반 시 commit revert

### 체크리스트

**2A. Git Diff Sanity**
- [ ] diff 크기 < 5000 lines (huge diff = 실수 or 의도된 리팩토링)
- [ ] binary 파일 변경 0 (예외: assets/, public/ 명시적 허용)
- [ ] `.env`, `*.key`, `*.pem`, `id_rsa*` 등 비밀 파일 미포함
- [ ] 예상치 못한 파일 타입 0 (예: `.DS_Store`, `Thumbs.db`)

**2B. JSON/YAML Schema 검증** (해당 파일 변경 시만)
- [ ] `package.json` parse OK + `main`/`scripts` 필드 존재
- [ ] `.claude/agents/*.md` frontmatter parse OK (`name`, `description`, `tools`, `model`)
- [ ] `governance/design/*.json` schema 매칭

**2C. Token/라인 sanity**
- [ ] Agent prompt < 1500 words (orchestrator 예외)
- [ ] Command prompt < 1200 words (sleep 예외 — 메타 디스패처)
- [ ] 신규 lib/*.ts 파일 < 500 lines (넘으면 분할 후보)

**2D. Test-to-Impl 비율**
- [ ] lib/foo.ts 변경 시 test/foo.test.ts 도 변경 (단독 lib 변경 시 경고)
- [ ] 신규 lib → 신규 test 1:1

**구현**:
```bash
# scripts/quality-gate-stage2.sh (신설 예정)
bash scripts/quality-gate-stage2.sh <commit_sha> || {
  git reset --soft HEAD~1  # commit revert, changes 유지
  echo "Stage 2 failed. Fix or amend."
  exit 1
}
```

---

## Stage 3 — Security (신규, optional)

**질문**: "보안 위협 추가 안 됐는가?"
**비용**: 초저비용 (grep 기반, semgrep/gitleaks 설치 시 사용)
**차단**: Warn only (자동 차단 X — false positive 많음). CRITICAL은 block.

### 체크리스트

**3A. Secret Scanner**
- [ ] hardcoded API keys (`sk-ant-`, `ghp_`, `AKIA` 등)
- [ ] hardcoded passwords (`password = "..."`)
- [ ] `.env` / credentials 파일 신규 추가 X

**3B. Injection Vectors**
- [ ] `eval(`, `new Function(`, `exec(` 신규 추가 (코드리뷰 필요 경고)
- [ ] `spawn(..., shell: true)` 신규 추가 (argv 기반 권장)
- [ ] SQL template string concat (파라미터 쿼리 권장)

**3C. Known Vulnerability Patterns**
- [ ] `process.env` user-controlled (auth bypass)
- [ ] `fs.readFileSync(userInput)` path traversal
- [ ] `child_process` 에 user input 직접 전달

**구현 (경량)**:
```bash
# scripts/quality-gate-stage3.sh (신설 예정)
git diff --cached | grep -iE "sk-ant-|ghp_|AKIA|password\s*=\s*['\"]" && {
  echo "⚠️ Secret 패턴 감지 — 커밋 전 확인 필요"
  exit 2  # warn (not fail)
}
# CRITICAL 패턴만 차단
git diff --cached | grep -E "eval\s*\(\s*\bprocess\.env\b" && exit 1
```

**심화 (semgrep 설치 시)**:
```bash
semgrep --config=p/security-audit --error --json | jq '.results | length'
```

---

## Stage 4 — Consistency (신규, advisory)

**질문**: "A-Team 컨벤션 준수하는가?"
**비용**: 무료 (grep + git log)
**차단**: **차단 안 함**. 조언만 출력. 사람이 판단.

### 체크리스트

**4A. Commit Message Format**
- [ ] `[type]: 요약` 헤더 (type: feat/fix/docs/chore/refactor/test/perf/style)
- [ ] NOW/NEXT/BLOCK 섹션 존재 (A-Team 전용 포맷)
- [ ] Co-Authored-By trailer 포함

**4B. Next Tasks 동기화**
- [ ] CURRENT.md Next Tasks 에 이번 커밋 관련 항목 제거됨 (진전 추적)
- [ ] 완료된 작업이 CURRENT.md에 여전히 pending으로 남아있지 않음

**4C. SESSIONS.md**
- [ ] 오늘 날짜 세션 entry 존재 (/end 사용 시)
- [ ] 빌드 상태 (✅/❌) 명시

**4D. 관련 문서 갱신**
- [ ] `lib/foo.ts` 신규 → `docs/INDEX.md` 또는 관련 governance 문서에 언급
- [ ] 새 스킬 → `install-commands.sh` 호환성 (자동 symlink 가능한가?)

**구현**:
```bash
# scripts/quality-gate-stage4.sh (신설 예정) — 경고만
bash scripts/quality-gate-stage4.sh <commit_sha>
# exit 0 항상 (advisory)
# stderr 로 조언 출력
```

---

## 통합 포인트

### ralph-daemon.mjs (자율 iteration)
```javascript
// Stage 1: runPreCheck() — 이미 구현
// Stage 2: 이번 iteration 커밋 직후 (신규 연결 필요)
if (hasProgress) {
  const stage2 = runQualityGate(2, postHead);
  if (stage2.code !== 0 && stage2.severity === 'block') {
    // Revert + stall
    execSync(`git reset --soft HEAD~1`);
    s.stallCount++;
  }
}
// Stage 3/4 는 iteration 단위 아닌 종료 시점에만
```

### /ship (PR 생성 전)
```bash
# .claude/commands/ship.md 에 Step 5.8 신설 예정
bash scripts/quality-gate.sh --stage 2,3,4 --target HEAD
# Stage 2 block → abort ship
# Stage 3 warn → AskUserQuestion
# Stage 4 advisory → PR body 에 첨부만
```

### /craft (PRO tier)
```bash
# STEP 4 Verification 에 통합
# Stage 1-4 전부 PASS 필수 (PRO tier 강화)
```

### coder 서브에이전트
```markdown
# 완료 반환 시 Stage 2 자체 실행
# 실패 면 status: "blocked", reason: "stage2-failed"
```

---

## 로드맵

### Phase 1 (단기, 1-2시간)
- [ ] `scripts/quality-gate-stage2.sh` 구현 (diff sanity + schema + token 검증)
- [ ] ralph-daemon.mjs 연결 (hasProgress 후 호출)
- [ ] 테스트: 의도적 huge diff → block 확인

### Phase 2 (중기, 2-3시간)
- [ ] `scripts/quality-gate-stage3.sh` (secret scanner + injection vectors)
- [ ] /ship Step 5.8 통합
- [ ] Optional: semgrep 설치 체크

### Phase 3 (장기, 이번 달)
- [ ] `scripts/quality-gate-stage4.sh` (consistency advisory)
- [ ] /craft STEP 4 강화 (4-stage ALL pass 필수)
- [ ] coder 서브에이전트 자체 Stage 2 실행

---

## 원칙 (왜 이렇게 나눴는가)

1. **Stage 별 비용 계단화**: 무료 → 저비용 → 중비용 → 고비용 순. 실패 확률 높은 것부터 체크.
2. **차단력 계단화**: Block → Block → Warn → Advisory. 완벽주의 방지.
3. **독립 실행**: 각 stage 개별 의미 있음. 3 스킵해도 4 실행 가능.
4. **False positive 허용**: Stage 3 은 warn only — 실제 위협만 block (CRITICAL 명시).
5. **조언 vs 차단 구분**: Stage 4 는 조언만 — 사람 판단 존중.

---

## 레퍼런스

- **alfredolopez80/multi-agent-ralph-loop**: 4-stage gates 원형 (925+ tests)
- **Aristotle First Principles**: correctness → quality → security → consistency 철학
- **A-Team autonomous-loop.md 조항 7**: End-to-End 검증 의무 (이 4-stage의 상위 메타)
- **.research/notes/2026-04-15-overnight-autonomous-research.md**: 회피 함정 8개
