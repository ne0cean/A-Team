# Context Engineering — No Vibes Allowed

> **출처**: "No Vibes Allowed: Solving Hard Problems in Complex Codebases" (Dex Horthy, HumanLayer, 2024)
> **분석**: `.research/notes/2026-05-04-no-vibes-allowed-dex-horthy.md`

---

## 핵심 원칙

**AI는 stateless다.** 다음 액션 결정은 오직 "현재 컨텍스트"에만 의존한다.
→ 컨텍스트 = 성과. Better tokens in → Better tokens out.

---

## Smart Zone vs Dumb Zone

### Context Window 구조 (Claude Code 기준)

```
Total: 168,000 tokens
├─ Smart Zone (0-40%): 67,200 tokens — 최적 작업 영역
├─ Dumb Zone (40-100%): 100,800 tokens — 성과 저하
└─ Reserved: Output + Compaction (varies)
```

### 40% 임계값 원칙

**40% 초과 사용 시 성과 급격히 저하** (Jeff Huntley 연구)
- 복잡한 태스크일수록 임계값 낮아짐 (30-40%)
- MCP 과다 설치 = 전체 작업이 Dumb Zone에서 진행

**Guideline**:
- **Easy task** (버튼 색상 변경): 임계값 무관
- **Medium task** (3-5 파일 수정): 40% 엄수
- **Hard task** (리팩토링, 신규 기능): 30% 권장

---

## Compaction (압축)

### 정의

"Compaction = Context Engineering"

현재 컨텍스트를 마크다운으로 압축해서 새 세션에 전달.
→ 긴 탐색/시행착오 제거 → 핵심만 전달 → Smart Zone 유지.

### Intentional Compaction

**언제**: 진행 중이든 실패든 무관하게 정기적으로 압축

**압축 대상**:
1. 파일 검색 과정
2. 코드 흐름 이해
3. 파일 편집 내역
4. 테스트/빌드 출력

**압축 결과 (Good)**:
```markdown
## Research Summary
- File: `src/hooks/useConnectionStatus.ts:45`
- Issue: Health status not tracked separately from connection
- Dependencies: `api/health.ts`, `types/Connection.ts`
```

**압축 결과 (Bad)**:
- JSON dumps with UUIDs
- MCP 전체 출력
- 전체 파일 내용 (라인 번호 없이)

---

## Compaction Triggers (자동화)

### Trigger 1: 40% 초과
```
if context_usage > 40%:
    trigger /handoff (compress + new session)
```

### Trigger 2: Phase 전환
```
Research → Plan: compress research
Plan → Implement: compress research + plan
```

### Trigger 3: 사용자 요청
```
"지금까지 압축해줘"
"/handoff"
```

---

## Sub-Agents = Context Control (NOT Roles)

### ❌ 잘못된 사용 (역할 분리)
```
- frontend-agent (프론트 담당)
- backend-agent (백엔드 담당)
- qa-agent (QA 담당)
```
→ **Anthropomorphizing roles** (역할 의인화) = 안티패턴

### ✅ 올바른 사용 (컨텍스트 관리)
```
- research-agent: 긴 탐색 작업 → 간결한 요약만 반환
- search-agent: 파일 찾기 → 파일 경로만 반환
```

**원칙**: Sub-agent는 **독립 컨텍스트에서 긴 작업** 수행 후 **parent에 압축된 결과만** 반환.

---

## Trajectory Management

### Negative Trajectory (피해야 할 패턴)

```
User: "이거 틀렸어"
AI: [수정]
User: "또 틀렸어"
AI: [수정]
User: "왜 자꾸 틀려?"
AI: [다음 most likely token = "틀린 걸 또 하기"]
```

**LLM이 보는 패턴**: "내가 틀리면 → 사람이 화내면 → 내가 또 틀리면 → ..."

### Positive Trajectory

```
User: "Research phase 시작"
AI: [research]
User: "Plan phase 시작 (research 압축 첨부)"
AI: [plan]
User: "Implement phase 시작 (plan 압축 첨부)"
AI: [implement]
```

**원칙**: 컨텍스트에 "성공 경로"만 남기기.

---

## A-Team 적용

### 현재 구현 상태

| 개념 | 상태 | 파일/도구 |
|------|------|-----------|
| Research-Plan-Implement | ✅ | orchestrator.md Phase 1-5 |
| Compaction (manual) | ✅ | `/handoff` |
| Compaction (automatic) | ⏳ | orchestrator Phase 2.8 (신규) |
| Smart Zone 40% | ⏳ | 이 문서 (신규) |
| Sub-agent for context | ✅ | Task tool |
| Progressive Disclosure | ✅ | CLAUDE.md 계층 |

### 자동 Compaction 트리거

**orchestrator.md Phase 2.8** (신규):
- 40% 초과 감지 → `/handoff` 자동 호출
- Research 완료 → plan 시작 전 compress
- Plan 완료 → implement 시작 전 compress

---

## References

- `.research/notes/2026-05-04-no-vibes-allowed-dex-horthy.md`
- Dex Horthy, "No Vibes Allowed" (AI Engineer Conference, Dec 2024)
- Jeff Huntley, "Context Window Usage vs Outcomes" (연구)
- `/handoff` command (A-Team)
- `orchestrator.md` Phase 1-5
