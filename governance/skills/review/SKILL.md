# /review — AST-aware Code Review & Refactor (RFC-004 Phase 2)

> ast-grep 기반 구조 패턴 매칭으로 LLM 환각 없는 정확한 refactor. Opt-in.

## Name
review

## Description
AST-aware code review and refactoring using ast-grep. Locates structural patterns
(functions, imports, classes) before modification. Zero false positives vs regex.
Falls back to Grep if ast-grep not installed.

## Tools
Bash, Grep, Read, Edit

## Opt-in Env
- `A_TEAM_CLASSICAL_TOOLS=1` (RFC-004 활성화 필수)
- ast-grep 설치: `bash scripts/install-classical-tools.sh --with-ast-grep`
- `AST_GREP_LANGUAGES`: 활성화할 언어 (default="typescript,python")

## Usage Patterns

### Function rename
```bash
sg -p 'function $OLD_NAME($_) { $$$ }' --rewrite 'function $NEW_NAME($_) { $$$ }' --lang typescript src/
```

### Import consolidation
```bash
sg -p 'import { $X } from "$MOD"' --lang typescript src/ | \
  sg --rewrite 'import { $X } from "@/lib/$MOD"'
```

### Hook extraction (React)
```bash
sg -p 'const [$STATE, $SETTER] = useState($INIT)' --lang typescript src/
```

## Fallback (ast-grep 부재 시)
- Grep으로 패턴 검색 → manual review → Edit 도구 사용
- LOC 500+ 리팩터는 worktree-exec.sh 권장

## Integration with other RFCs
- RFC-004 coder routing: `A_TEAM_CLASSICAL_TOOLS=1` 필요
- RFC-007 worktree: high-risk 리팩터는 worktree 격리 권장

## 상태
- Phase 2 opt-in
- 실제 실행 검증: Wave 3 착수 시
- ast-grep 의존성 선택적 (없으면 Grep fallback)

## Related
- RFC: `docs/research/2026-04-optimization/rfc/RFC-004-classical-tools.md`
- Install: `scripts/install-classical-tools.sh --with-ast-grep`
- Routing: `.claude/agents/coder.md` (Classical Tools Routing section)
