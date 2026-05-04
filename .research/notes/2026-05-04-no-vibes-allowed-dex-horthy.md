# YouTube 분석 — No Vibes Allowed (Dex Horthy, HumanLayer)

**URL**: https://youtu.be/rmvDxxNubIg
**분석일**: 2026-05-04
**방법**: youtube-transcript-api (23,639 chars) + 8 keyframes

---

## 핵심 주장 10가지

### 1. Research-Plan-Implement (RPI) 워크플로우
- **Research**: 시스템 작동 방식 이해, 파일 찾기
- **Plan**: 파일명 + 라인 스니펫 + 테스트 단계
- **Implement**: 계획 실행 (dumbest model could follow)

### 2. Compaction = Context Engineering
- Intentional compaction: 진행 중이든 아니든 마크다운으로 압축
- 압축 대상: 파일 검색, 코드 흐름, 편집, 테스트 출력
- 결과: 정확한 파일 + 라인 번호만

### 3. Smart Zone (0-40%) vs Dumb Zone (40-100%)
- Claude Code: 168K tokens
- 40% 초과 시 성과 저하
- MCP 과다 = Dumb Zone 작업

### 4. Sub-agents = Context Control (not roles)
- ❌ Frontend/Backend/QA agent (역할)
- ✅ Research/Search agent (컨텍스트 분리)
- Parent에 간결한 요약만 반환

### 5. Frequent Intentional Compaction
- 3-phase 전체가 compaction 중심
- 매 단계 압축 → Smart Zone 유지

### 6. Progressive Disclosure
- Root context + sub-context (계층적)
- 문제: out-of-date
- 해결: on-demand compression

### 7. On-Demand Compressed Context > Static Docs
- 거짓말 순서: 코드 < 주석 < 문서
- "Compressing truth, not maintaining lies"
- 실시간 코드 압축 추천

### 8. Mental Alignment
- Code review 목적: 정확성 < 팀 동기화
- Plans as documentation
- Mitchell's pattern: AMP thread on PRs

### 9. Don't Outsource Thinking
- "AI amplifies thinking, not replaces it"
- Bad research = 100 bad lines
- Human at highest leverage points

### 10. Spec-Driven Dev is Dead
- Semantic diffusion (Martin Fowler 2006)
- "Spec" = 100가지 의미
- RPI가 대안

---

## A-Team 적용

### ✅ 이미 구현됨
1. **RPI** → orchestrator Phase 1-5
2. **Compaction** → `/handoff`
3. **Progressive Disclosure** → CLAUDE.md 계층
4. **Mental Alignment** → PARALLEL_PLAN.md
5. **Don't Outsource Thinking** → `/office-hours`, `/blueprint`

### ⚠️ 부분 구현
1. **Compaction** → 수동만, automatic 없음
2. **Sub-agents** → 역할+컨텍스트 혼재 (과잉)

### ❌ 미구현
1. **Smart Zone 40% 추적** → context usage tracker 필요
2. **On-demand compression** → static docs만
3. **Automatic compaction trigger**

---

## 즉시 반영 가능

1. **governance/rules/context-engineering.md** 신설
   - Smart Zone 40% 원칙
   - Compaction trigger 조건

2. **orchestrator.md** Phase 2.8 추가
   - 40% 초과 시 `/handoff` 자동

3. **Sub-agent 용도 명시**
   - agents/README.md에 "컨텍스트 관리용" 명시

---

## 나중에 빌드

1. **Context Usage Tracker** (Phase 1 확장)
   - 실시간 토큰 추적
   - 40% 경고
   - `.context/context-usage.jsonl`

2. **On-Demand Context Compressor** (Phase 2/4)
   - AST 파싱 + 의존성 그래프
   - 실시간 코드 압축

3. **Plan Quality Scorer** (Phase 1/QA)
   - 계획서 평가: 파일명, 라인 번호, 테스트 단계

---

## 토큰 효율성 발견

**youtube-transcript-api** (Python 라이브러리):
- ✅ API 키 불필요
- ✅ 자막 즉시 추출 (Whisper 대비 100x 빠름)
- ✅ 23,639 chars in < 5초
- ❌ 자막 없는 영상은 Whisper 필요

**MCP YouTube Transcript Server** (미사용, 향후 검토):
- kimtaeyoon83/mcp-server-youtube-transcript
- jkawamoto/mcp-youtube-transcript
- Claude Code 직접 통합 가능
- 설정 필요 (`~/.config/claude/claude_desktop_config.json`)

---

## Sources

- [GitHub - kimtaeyoon83/mcp-server-youtube-transcript](https://github.com/kimtaeyoon83/mcp-server-youtube-transcript)
- [YouTube MCP Server Comparison 2026](https://www.ekamoira.com/blog/youtube-mcp-server-comparison-2026-which-one-should-you-use)
- [youtube-transcript-api · PyPI](https://pypi.org/project/youtube-transcript-api/)
- [How to Extract YouTube Transcripts Without the YouTube API (2026)](https://use-apify.com/blog/how-to-extract-youtube-transcripts-2026)
