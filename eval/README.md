# A-Team Eval Templates (RFC-005)

> B1–B6 benchmark templates for `promptfoo eval`.

## Setup
```bash
npm install -g promptfoo
export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage
```bash
# Single benchmark
npx promptfoo eval -c eval/templates/b1-small-fix.yml

# All (shell loop)
for f in eval/templates/*.yml; do npx promptfoo eval -c "$f"; done
```

## Benchmarks
- **b1-small-fix**: Bug detection + test generation (≤50 LOC)
- **b2-tdd-feature**: RED→GREEN→REFACTOR 엄수
- **b6-debug**: Root cause analysis from stack trace

## Gate Integration
`eval:gate` npm script (TBD) aggregates scores and exits non-zero on G5 violation.

## Status (Phase 1)
- 3/6 skeleton templates (b1, b2, b6)
- Remaining (b3 multi-file, b4 UI, b5 research): Phase 2 작업
- Langfuse OTEL integration: 미구현

## Opt-in
`PROMPTFOO_SKIP=1` env로 전체 스킵 가능. Default ON (명시적 실행 필요).

## Related
- `docs/research/2026-04-optimization/rfc/RFC-005-eval-obs.md`
- `docs/research/2026-04-optimization/BASELINE_SPEC.md`
- Performance Gate G5: `MANIFEST.md`
