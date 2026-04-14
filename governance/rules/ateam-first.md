# A-Team First — Survey Before Invent

> **새 메커니즘 설계 전 A-Team 자체 자원을 반드시 먼저 조사한다. 발명은 최후 수단.**

---

## 규칙

사용자가 자동화/워크플로우/도구/에이전트 설계를 요청하면, 다음 순서로 진행:

### Step 1 — Inventory (의무)
```bash
# A-Team 커맨드
ls ~/tools/A-Team/.claude/commands/

# 스킬
ls ~/tools/A-Team/governance/skills/

# 스크립트
ls ~/tools/A-Team/scripts/

# 레슨런드 인덱스
cat ~/tools/A-Team/docs/INDEX.md
```

또는 `bash ~/tools/A-Team/scripts/session-preflight.sh` 한번에 실행.

### Step 2 — 용어 매핑 (의무)
사용자 메시지에 아래 용어 포함 시 해당 A-Team 자원을 **먼저** 확인:

| 용어 | A-Team 자원 | 확인 위치 |
|-----|------------|----------|
| 랄프/ralph/랄프 모드/Ralph Loop | `/ralph` 커맨드 | `.claude/commands/ralph.md` + `scripts/ralph-daemon.mjs` |
| vibe/바이브 | `/vibe` 커맨드 | `.claude/commands/vibe.md` |
| PIOP | PIOP 프로토콜 | `PROTOCOL.md` + `governance/` |
| mirror/미러 | Mirror Sync | `governance/rules/mirror-sync.md` |
| handoff/핸드오프 | `/handoff` 커맨드 | `.claude/commands/handoff.md` |
| end/종료 | `/end` 커맨드 | `.claude/commands/end.md` |
| 체크포인트 | Checkpointing | `governance/rules/checkpointing.md` |
| A-Team/에이팀 | 모든 자원 | `README.md` + `USER_GUIDE.md` |

### Step 3 — 적합성 판정
기존 A-Team 자원이 요구사항에 **완전 부합** → 그대로 사용.
**부분 부합** → 자원을 기반으로 확장 제안.
**완전 부적합 + 근거 명시** → 새 메커니즘 발명 (이때도 A-Team 구조와 정합성 유지).

### Step 4 — 제안 문서화
사용자에게 제안 시 다음 포맷 필수:
```
1. 확인한 A-Team 자원: [목록]
2. 왜 그대로 안 되는가: [근거]
3. 제안: [A-Team 자원 활용 or 발명]
```

---

## 위반 사례 (2026-04-14 사건)

**요청**: "리서치+랄프 모드로 밤새 조사해"

**잘못된 흐름**:
- "랄프 모드" = Ralph Wiggum 일반 패턴으로 해석
- ScheduleWakeup으로 자율 루프 설계 (발명)
- `/ralph` 커맨드 + `scripts/ralph-daemon.mjs` 존재 **미확인**

**올바른 흐름 (재구성)**:
1. `ls ~/tools/A-Team/.claude/commands/ | grep ralph` → `ralph.md` 발견
2. `cat .claude/commands/ralph.md` → `/ralph start --check "cmd"` 확인
3. 이번 태스크는 "기계 검증 불가" (주관적 리서치) → pure Ralph 부적합
4. **그 판정 결과를 사용자에게 보고**: "랄프 데몬은 check 명령 필요, 이 태스크는 ScheduleWakeup + 체크포인트로 대안 제안"
5. 사용자 승인 후 대안 진행

Step 4 "왜 그대로 안 되는가" 근거를 사용자에게 명시했어야 했음.

---

## 근거 (Why)

1. **Sovereignty 원칙 정합**: A-Team 자원은 이미 검증됨 (153 tests, 프로덕션 사용). 발명은 미검증.
2. **Drift 방지**: 각 세션에서 새 메커니즘 발명 → 표준화 깨짐 → 유지보수 폭증.
3. **사용자 기대 부합**: 사용자가 "랄프"라고 하면 A-Team의 Ralph를 의미. 다른 해석은 오해.
4. **Claude 기억 불신뢰**: 세션마다 재조사가 기본. "이전 세션에서 알았다"로 skip 금지.

---

## Enforcement

- 세션 시작 시 `scripts/session-preflight.sh` 자동 실행 (hook)
- `/vibe`의 Step 0에 "A-Team inventory" 단계 추가
- 새 메커니즘 설계 시 PR 템플릿에 "Step 1–4 수행 증명" 체크박스 의무

---

**Last updated**: 2026-04-14 (A-Team First 원칙 신설, 구조적 실패 사건 후속 조치)
**Related**:
- `governance/rules/ateam-sovereignty.md` (7원칙 + 제8원칙 Survey-Before-Invent)
- `governance/rules/autonomous-loop.md`
- `docs/INDEX.md`
- `.claude/commands/ralph.md`
