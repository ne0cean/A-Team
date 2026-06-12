---
description: /mesh — Mesh Health. 스킬·에이전트·훅·체인 연결 전수 감사 + 자동 보강. 월 1회 또는 수동 호출.
---

> Analytics: `node scripts/log-event.mjs command_start name=mesh`

# /mesh — Mesh Health

흩어진 스킬·에이전트·훅·launchd·체인을 점검하고 끊어진 연결을 복구한다.

**핵심**: 맥락에 맞는 스킬이 연달아 자동 실행되는 구조 유지.
`governance/skill-chains.yaml` — 체인 레지스트리 (편집 가능)
`scripts/hooks/chain-suggester.sh` — Stop 훅 (세션 종료 시 다음 스텝 제안)

---

## 언제 실행되나

- **월간 자동**: `/vibe` Step 0.5에서 30일 이상 경과 시 자동 제안
- **수동**: `/mesh` 직접 호출
- **야간**: `launchd com.ateam.mesh-monthly` (매월 1일)

---

## 서브모드

| 호출 | 동작 |
|------|------|
| `/mesh` | 전체 — chains + audit + patch + report |
| `/mesh chains` | 체인 레지스트리 조회 + v2 스키마 검증 |
| `/mesh audit` | 연결 상태 감사만 (패치 없음) |
| `/mesh patch` | 자동 패치만 실행 |
| `/mesh reset` | chain-state.json 초기화 (체인 리셋) |
| `/mesh trace` | mesh-trace.jsonl 분석 (체인 완주율, 실패 조건 Top 3) |
| `/mesh ctx` | 현재 체인 상태 + 컨텍스트 표시 |

---

## Phase 1: Skill Chain Status

```bash
node scripts/mesh-scan.mjs --chains
```

각 체인의 스텝들이 실제 커맨드 파일로 존재하는지 확인한다.
- v2 스키마 검증: pattern/conditions/on_fail 필드 유효성
- 고장난 스텝 (`.claude/commands/<name>.md` 없음) → 빨간 표시
- parallel/loop/hierarchical 패턴 배지 표시

현재 활성 체인 + 컨텍스트:
```bash
node scripts/mesh-engine.mjs --status
```

컨텍스트 업데이트 (스텝 완료 후 결과 기록):
```bash
node scripts/mesh-engine.mjs --set-context tdd.passed=true tdd.coverage=87
node scripts/mesh-engine.mjs --set-context craft.score=85
```

Trace 분석 (체인 완주율, 자주 실패하는 조건):
```bash
node scripts/mesh-scan.mjs --trace
```

**체인 레지스트리 조회**:
`governance/skill-chains.yaml`의 chains 목록을 테이블로 출력한다.

---

## Phase 2: Hook Connectivity Audit

```bash
node scripts/mesh-scan.mjs --hooks
```

감사 항목:
- 훅 스크립트 파일 존재 + 실행 가능 확인
- launchd 상태: `launchctl list | grep com.ateam`
- autoresearch shadow: `.autoresearch/_shadow/*/log.jsonl` 마지막 기록 날짜
- chain-suggester 훅 등록 여부

---

## Phase 3: Auto-Patch

```bash
# dry-run 먼저
node scripts/mesh-patch.mjs --dry-run

# 사용자 확인 후
node scripts/mesh-patch.mjs --apply
```

자동 패치 목록:
1. `daily-brief-collect` launchd — `node` PATH 수정 (절대경로)
2. `com.ateam.mesh-monthly` launchd — 월 1일 알림 신규 등록
3. `chain-suggester` 훅 — `~/.claude/settings.json` Stop hooks에 추가
4. `vibe-init.sh` — mesh 체크 라인 추가

---

## Phase 4: Manual Queue

자동 패치 불가 항목 → `improvements/pending.md`에 등록한다.

```bash
node scripts/log-event.mjs mesh_complete health_score=$(cat governance/mesh-health.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('health_score',0))" 2>/dev/null || echo 0)
```

---

## Phase 5: Mesh Health Report

```bash
node scripts/mesh-scan.mjs --report
```

`governance/mesh-health.md` 업데이트 (히스토리 테이블에 행 추가).

출력 형식:
```
━━━ Mesh Health ━━━
헬스 스코어: 78/100
체인 커버리지: 14/16 스텝 정상
훅 커버리지: 12/14 정상
launchd: 5/7 정상 (daily-brief ❌, cold-review ❌)

자동 패치 가능: 3개
수동 처리 필요: 4개
━━━━━━━━━━━━━━━━━━━
```

---

## 체인 편집 가이드

`governance/skill-chains.yaml`을 직접 편집해서 새 체인을 추가하거나 기존 체인을 수정할 수 있다.

```yaml
- id: my-chain
  name: "내 워크플로우"
  trigger_after: [blueprint]        # 이 커맨드 완료 후 감지
  steps: [blueprint, tdd, ship]     # 실행 순서 (/ 없이)
  auto_advance: false               # false=제안만, true=자동실행(zzz모드에서만)
  description: "설명"
```

변경 후 `/mesh chains`로 유효성 확인.

---

## ADVISOR MODE

`/mesh` 실행 시:
- 각 갭: "30일 후 영향" + "개선 가능성 점수(0-10)" 포함
- 체인 품질 평가: 스텝이 너무 많거나(>6) 적은(1개) 체인 경고
- 미사용 에이전트 + 커맨드 목록 (최근 30일 analytics에서 호출 기록 없는 것)
