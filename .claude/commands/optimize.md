# /optimize — Post-Integration Optimization

메이저 통합 이후 자동 실행되는 최적화 프로토콜(PIOP).
새 모듈/스킬이 기존 시스템과 유기적으로 연결되고, 토큰 비용이 최적화되었는지 검증한다.

**자동 트리거**: lib/ 또는 .claude/agents/ 에 새 파일이 추가된 세션에서 자동 실행.
**수동 실행**: `/optimize` 또는 `/optimize --phase 1` (특정 Phase만)

## 실행

### Phase 1: Integration Map

변경 파일 목록을 수집하고 연결 지도를 생성한다.

```bash
# 최근 변경 파일 확인 (마지막 커밋 또는 미커밋 변경)
git diff --name-only HEAD~1..HEAD 2>/dev/null | grep -E '\.(ts|md|mjs|sh)$' || true
git diff --name-only 2>/dev/null | grep -E '\.(ts|md|mjs|sh)$' || true
git ls-files --others --exclude-standard 2>/dev/null | grep -E '\.(ts|md|mjs|sh)$' || true
```

변경된 lib/*.ts 파일 각각에 대해:
1. 해당 파일의 `export` 목록을 추출한다
2. 기존 에이전트(.claude/agents/*.md)와 커맨드(.claude/commands/*.md) 중 이 모듈을 참조해야 할 후보를 식별한다
3. 이미 참조하고 있는지 Grep으로 확인한다
4. 연결 매트릭스를 출력한다:

```
NEW/CHANGED MODULE    → SHOULD CONNECT TO          STATUS
──────────────────────────────────────────────────────────
lib/learnings.ts      → reviewer.md (학습 기록)     ✅
lib/learnings.ts      → orchestrator.md (MoA 학습)  ❌ TODO
```

### Phase 2: Cross-Module Wiring

Phase 1에서 ❌ 항목에 대해:
1. 연계 패턴 결정 (Import-and-Call / Data Flow / Event Trigger / Context Injection / Feedback Loop)
2. 기존 코드에 최소 침습으로 연결 코드 삽입
3. 삽입 후 빌드 검증

```bash
npm run build && npm run test
```

실패 시 즉시 롤백 (`git checkout -- <file>`).

### Phase 3: Trigger Optimization

각 모듈의 트리거 조건을 검증한다:
1. 호출 빈도가 적절한가? (매 세션 vs 조건부)
2. 중복 호출이 있는가?
3. 비용 대비 가치가 있는가?

불필요 트리거 제거, lazy loading 적용, once 플래그 추가.

### Phase 4: Token Cost Audit

```bash
# 에이전트 프롬프트 크기 측정
for f in .claude/agents/*.md; do
  words=$(wc -w < "$f")
  name=$(basename "$f")
  echo "$name: $words words"
done
```

타겟 크기 초과 시:
- On-demand Loading 전환 (상세 규칙을 외부 파일 참조로 교체)
- Example Pruning (예시 3개 → 1개)
- Shared Preamble 분리

MoA 비용 체크:
- Round 2+ 입력이 요약본인지 확인
- Early Stop 활성화 확인
- Judge 호출 조건이 최소인지 확인

### Phase 5: Validation & Report

```bash
npm run build
npm run test
```

최적화 보고서를 생성하고, `.context/CURRENT.md`에 기록한다.
발견된 개선 패턴은 `lib/learnings.ts`의 logLearning()으로 자동 축적한다.

$ARGUMENTS
