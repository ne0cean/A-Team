# Tool Search — MCP defer_loading 정책

> RFC-003 ToolSearch 수용분. `.mcp.json`에 `defer_loading: true` 속성으로 MCP tool을 on-demand 로드하여 시스템 프롬프트 93% 절감.

---

## 언제 적용

- 프로젝트 `.mcp.json`에 **5개 이상 MCP tool** 등록 시 권장
- Sonnet 4.6 / Opus 4.6 사용 시 (Haiku 미지원)
- 프롬프트 캐싱(RFC-001)과 결합 시 시너지 극대화

## 핵심 규칙

### 1. Hot tools (non-deferred) — 3~5개 고정
매 턴 필요한 기본 tool만 미리 로드:
- `exec` — shell 명령
- `read_file` — 파일 읽기
- `search_code` — 코드 검색

프로젝트별 2~3개 추가 허용.

### 2. Deferred tools — 나머지 전부
```json
{ "name": "github_search", "description": "...", "defer_loading": true }
```

Claude가 필요 시 `tool_search_tool_regex` 호출 → regex로 매칭되는 tool만 on-demand 로드.

### 3. Search tool은 절대 defer 금지
`tool_search_tool_regex` 자체에 `defer_loading: true` 설정 시 API 400 에러 (자기참조 순환).

### 4. Tool description 품질
Regex 매칭 정확도는 description 키워드 풍부함에 비례:
- ❌ `"description": "Search"`
- ✅ `"description": "Search GitHub repos, issues, PRs by keyword or author"`

### 5. Variant 선택: regex 권장
- **regex_20251119** (권장): Claude가 deterministic 패턴 생성
- **bm25_20251119**: NL query, 편차 큼

### 6. Haiku 미지원 — fallback
Cascade Routing(RFC-006) + Haiku tier-2 활성 시:
- Haiku는 tool_search 미호출 → **non-deferred 전체 catalog fallback**
- A-Team 자동 처리 (별도 설정 불필요)
- Haiku 분포 비율 높을수록 ToolSearch 효과 감소

## Linter (미래 구현)

`scripts/validate-mcp-json.js`가 다음 검증:
- search tool에 defer_loading=true 여부 (위반 시 에러)
- Hot tools 수 (≤5 권고, 초과 시 경고)
- Deferred tools의 description 최소 길이 (≥30자 권고)

## 템플릿

참조: `templates/mcp.json.example`

복사 방법:
```bash
cp ~/tools/A-Team/templates/mcp.json.example <project-root>/.mcp.json
# 주석(_*) 필드 제거 후 프로젝트 tool 맞춤 수정
```

## 예상 효과

| 항목 | Before | After |
|------|--------|-------|
| 시스템 프롬프트 | 14–16k tokens | ~968 tokens |
| 절감률 | — | −93% |
| Prompt caching 호환 | ✓ | ✓ (prefix 유지) |
| Latency | baseline | +100ms (tool search 최초 호출) |
| 효과 범위 | — | Sonnet/Opus tier (Haiku 제외) |

**⚠️ 실측 전 추정**. Wave 1 Gate G5 통과 필수.

## 크로스 RFC

- **RFC-001 Prompt Caching**: tool_search 결과 inline 확장은 prefix 영향 없음 → cache 유지
- **RFC-006 Cascade Routing**: Haiku tier-2와 충돌, fallback 정책 본문 §6
- **RFC-005 promptfoo + Langfuse**: tool discovery trace는 observability 가시화 대상

## Related
- RFC: `docs/research/2026-04-optimization/rfc/RFC-003-toolsearch-artifact.md`
- Template: `templates/mcp.json.example`
- Spec: [Anthropic Tool Search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
