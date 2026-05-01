# Governance Trigger Index — On-Demand Rule Loading

> **매 세션 전체 로드 금지.** 이 인덱스만 로드 + 특정 상황 감지 시 해당 rule grep → 필요 본문만 로드.
> 목표: 메인 컨텍스트 토큰 소비 최소화 (Phase 14 Earned Integration 원칙).

---

## 사용 패턴

### 키워드 grep
```bash
grep -i "키워드" ~/tools/A-Team/governance/rules/TRIGGER-INDEX.md
# 매칭된 rule → 해당 .md만 Read
```

### Trigger 조건 매칭
아래 조건 감지 시에만 해당 rule 본문 로드:

---

## Rule Trigger Matrix

| Rule | Lines | Trigger 조건 | 키워드 |
|------|-------|-------------|--------|
| `ateam-sovereignty.md` | 236 | A-Team 파일 수정 시 / 프로젝트 ↔ A-Team 동기화 시 | sovereignty, 독립, central hub, survey, 제8원칙 |
| `ateam-first.md` | 99 | 새 기능/메커니즘 설계 요청 / 사용자 A-Team 용어 언급 | survey before invent, 기존 자원, 용어 매핑 |
| `autonomous-loop.md` | 140 | "자동", "밤새", "/loop", "/ralph" 등 자율 모드 표현 감지 | 자율 루프, execute-before-describe, wakeup, 강제 조항 |
| `truth-contract.md` | 121 | **상시 적용** (최우선) — 말-실행 괴리 위험 상황 | 거짓말 금지, tool call 선행, 검증 |
| `tool-search.md` | 86 | `.mcp.json` 편집 / RFC-003 활성 / defer_loading 언급 | ToolSearch, defer_loading, MCP, RFC-003 |
| `checkpointing.md` | 116 | `/end`, `/handoff`, 세션 종료 | checkpoint, 세션 상태 보존 |
| `claude-code.md` | 61 | Claude Code 훅/커맨드 관련 | Claude Code, 훅, 커맨드 |
| `coding-safety.md` | 16 | 코드 수정 시 | 코딩 안전, 파일 전체 읽기, 빌드 검증 |
| `guardrails.md` | 105 | 위험 명령 / 민감 파일 접근 | guardrail, 위험 명령 차단 |
| `mirror-sync.md` | 24 | CURRENT.md 변경 / 핸드오프 | mirror, 동기화, 자동 저장 |
| `preamble.md` | 69 | 세션 시작 시 권장 읽기 (짧음, 부담 적음) | preamble, 세션 시작 |
| `sync-and-commit.md` | 26 | git 작업 시 | sync, commit, push |
| `turbo-auto.md` | 12 | 자동 모드 활성 시 | turbo, 자동 |
| `vibe-rules.md` | 20 | `/vibe` 실행 시 | vibe, 세션 시작 |
| `visual-verification.md` | 74 | UI 파일 수정 / 시각 검증 필요 시 | UI, Playwright, 시각 검증 |
| `lifecycle.md` | 40 | 새 커맨드/에이전트 추가 시 / 커맨드 수 60개 근접 시 | lifecycle, zombie, 상한선, deprecated |
| `model-allocation.md` | 70 | **상시 적용** — 매 사용자 메시지 직후 모델 적정성 자가평가 | 모델 적정성, opus, sonnet, 위임, 비용 |

**합계**: ~1,245 lines. **트리거 매칭 없이 기본 로드하지 말 것**.

---

## 예외: 상시 적용 규칙

다음 규칙은 **항상 적용**되지만, 본문 로드 없이 **한 줄 요약**만 메모리에 유지:

| Rule | 1-line summary |
|------|----------------|
| `truth-contract.md` | 모든 "완료/실행" 단어는 tool output 확인 후에만. 말로만 예고 금지. |
| `ateam-sovereignty.md` | A-Team은 중앙 허브. 모든 변경 A-Team 레포에, 프로젝트는 pull만. |
| `coding-safety.md` | 파일 전체 읽고 수정, 수정 후 빌드 검증. |

이 3개만 `~/.claude/memory/feedback_*.md`로 영구 주입 (이미 완료).

---

## 문서 카테고리별 트리거

### Research docs (`docs/research/2026-04-optimization/`)
| 문서 | 크기 | Trigger |
|------|-----|---------|
| `MANIFEST.md` | large | Phase 14 RFC 관련 논의 / Selection Criteria 언급 |
| `RESUME_STATE.md` | medium | 세션 이어받기 / 자율 루프 재개 |
| `BASELINE_SPEC.md` | medium | 벤치마크 실행 / B1-B6 언급 |
| `rfc/RFC-00X.md` | large × 7 | 해당 RFC 작업 시만 |
| `final/EXECUTIVE_SUMMARY.md` | medium | 사용자 첫 리뷰 시 |
| `final/INTEGRATION_ROADMAP.md` | medium | Wave 활성화 / 통합 계획 |
| `final/PRIORITY_MATRIX.md` | medium | 우선순위 결정 |
| `final/REJECTED.md` | small | 거부 후보 재평가 |
| `final/ADVERSARIAL_REVIEW.md` | medium | 리뷰 / F-findings 추적 |
| `final/PERFORMANCE_LEDGER.md` | medium | 벤치 결과 기록 / G7 검증 |
| `final/STAGE9_HOLISTIC.md` | medium | Stage 9 진입 시 |

**기본 로드 대상: 없음.** 상황별 Read.

### Top-level docs
| 문서 | 크기 | Trigger |
|------|-----|---------|
| `README.md` | small | GitHub 방문자 / 최초 설정 |
| `USER_GUIDE.md` | medium | 사용자 가이드 요청 |
| `MIGRATION.md` | medium | Wave 활성화 / RFC 적용 |
| `docs/HISTORY.md` | large | Phase 추적 / 의사결정 근거 |
| `PROTOCOL.md` | medium | 워크플로우 질문 |

---

## Session Start 권장 로드 (최소)

```
1. CLAUDE.md (25 lines) ✓ 이미 자동
2. .context/CURRENT.md (상태) ✓ 이미 관습
3. AGENTS.md 또는 governance/rules/TRIGGER-INDEX.md (이 파일)
4. 필요 시 preamble.md (69 lines) — 세션 룰 요약
```

**총 ~200 lines** (1205 lines 전체 대비 **83% 절감**).

---

## 프로젝트 CLAUDE.md 권장 pattern

```markdown
# {Project} — Claude Code Governance

## 세션 시작 시 필수 로드
1. `.context/CURRENT.md` — 현재 상태
2. `AGENTS.md` — 에이전트 역할 (있으면)

## A-Team rules 참조 패턴
- `grep -i "키워드" ~/tools/A-Team/governance/rules/TRIGGER-INDEX.md` → 필요 rule grep
- 기본 로드 금지: 1,205 lines의 rules 전체 투입은 토큰 낭비

## 상시 적용 (본문 없이도 준수)
- truth-contract: 말-실행 일치
- sovereignty: A-Team 외부 변경 금지
- coding-safety: 파일 전체 읽고 빌드 검증
```

---

## 자가 체크

새 rule 추가 시 반드시:
- [ ] 이 TRIGGER-INDEX.md에 1줄 등록
- [ ] Trigger 조건 명시 (상시 적용인지, 조건부인지)
- [ ] 본문 100 lines 초과 시 요약 1줄 버전 별도 제공
- [ ] 매 세션 로드 필요성 재검토

---

**Last updated**: 2026-04-14 (Phase 14, 사용자 토큰 효율성 지적 반영)
