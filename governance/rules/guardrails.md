# GUARDRAILS — 3-Tier 가드레일 규약

A-Team의 모든 에이전트와 orchestrator가 따르는 3단계 안전망.
**출처**: OpenAI Agents SDK 3-tier guardrail 패턴 + 기존 harness-engineering(docs/12) 통합.

---

## 구조

```
Tier 1 — Input Guardrail  (실행 전, orchestrator/caller 담당)
Tier 2 — Tool Guardrail   (실행 중, hooks/harness 담당)  ← 기존 구현됨
Tier 3 — Output Guardrail (실행 후, reviewer 담당)
```

---

## Tier 1 — Input Guardrail (실행 전)

### 보안 트리거 스캔
태스크 설명에 아래 키워드가 포함되면 → **Reviewer 필수 통과** 플래그 세팅

```
보안 키워드: auth, crypto, sql, token, password, session, secret, key, cert, jwt, oauth
민감 작업: delete, drop, truncate, rm -rf, force push, reset --hard
```

### 파일 소유권 충돌 감지
PARALLEL_PLAN.md에 동일 파일이 2개 이상 에이전트에 등록 → 직렬 처리 블록으로 이동

### 민감 파일 접근 차단 목록
아래 파일/패턴은 쓰기 금지 (읽기는 허용):
```
.env, .env.*, *.pem, *.key, *secret*, *credential*, *password*
~/.ssh/*, ~/.aws/credentials, ~/.config/gcloud/*
```

### Input Guardrail 체크리스트 (orchestrator가 Phase 2에서 확인)
- [ ] 보안 키워드 포함 여부 → 포함 시 `security_review: required` 플래그
- [ ] 파일 소유권 중복 없음
- [ ] 민감 파일 쓰기 태스크 없음
- [ ] 태스크당 파일 소유권 명시 (PARALLEL_PLAN.md)

---

## Tier 2 — Tool Guardrail (실행 중)

> **이미 구현됨** — `templates/hooks/` + `docs/12-harness-engineering.md` 참조

핵심 hooks:
- `templates/hooks/pre-bash.sh` — 위험 명령 차단 (rm -rf, force push, drop table 등)
- `templates/hooks/pre-write.sh` — 민감 파일 쓰기 차단
- `templates/hooks/stop-check.sh` — 비정상 종료 감지
- `templates/hooks/subagent-dod.sh` — DoD 체크리스트 미완료 에이전트 차단

새 프로젝트 설치:
```bash
# templates/init.sh 실행 시 자동 설치
bash A-Team/templates/init.sh
```

---

## Tier 3 — Output Guardrail (실행 후)

> **이미 구현됨** — `.claude/agents/reviewer.md` 참조

reviewer.md의 2-pass 구조:
- **Critical Pass**: 보안, 데이터 무결성, 빌드 검증
- **Informational Pass**: 기능 정확성, 코드 품질, 테스트 커버리지

### Tier 3 자동 트리거 조건
orchestrator가 아래 조건 충족 시 reviewer 자동 호출:
```
1. 변경 파일 10개 이상
2. Input Guardrail에서 security_review: required 플래그
3. DB 스키마 변경 (migration 파일 포함)
4. 공개 API 엔드포인트 추가/변경
5. 인증/권한 로직 변경
```

---

## Guardrail 상태 전파

orchestrator의 Phase 4 에이전트 실행 시 governance 객체에 포함:

```json
{
  "guardrails": {
    "tier1_passed": true,
    "security_review_required": false,
    "sensitive_files_blocked": [".env"],
    "ownership_conflicts": [],
    "tier3_auto_trigger": false
  }
}
```

---

## 참조
- `docs/12-harness-engineering.md` — Tier 2 상세 설정
- `.claude/agents/reviewer.md` — Tier 3 실행 주체
- `governance/rules/preamble.md` — 에스컬레이션 프로토콜
