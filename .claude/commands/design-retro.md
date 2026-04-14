# /design-retro — Design Subsystem 사용 후 회고 & 정리

> **목적**: Design Subsystem 배포 후 실 사용 데이터를 기반으로 **삭제·최적화 후보**를 식별. 이론상 설계를 실측으로 검증.
> **사용 시점**: 배포 후 1-2주 지난 시점, 또는 자동 크론 트리거. 혹은 AI smell score가 예상과 어긋날 때.
> **결과물**: `.context/design-retro-{date}.md` — 삭제/튜닝/추가 제안 리포트.

---

## 실행 프로토콜

### 1. 베이스라인 로드
- `.context/CURRENT.md` — 현재 상태
- `.context/SESSIONS.md` — 최근 7일 세션 로그
- `.context/benchmarks/2026-04-15.json` — Design Subsystem 도입 baseline
- `governance/design/anti-patterns.md` — 24 rule 카탈로그

### 2. 사용 데이터 수집

**Analytics JSONL** (design_audit 이벤트):
```bash
# 전체 design_audit 이벤트 카운트
find ~ -name "analytics.jsonl" 2>/dev/null -exec grep -l "design_audit" {} \; | \
  xargs -I{} sh -c 'echo "=== {} ==="; grep "design_audit" {}'
```
- 총 실행 횟수
- 평균/최저/최고 점수
- threshold fail 비율 (ship/craft/default 각각)
- tone별 사용 분포
- a11y 위반 빈도

**Learnings JSONL** (design-auditor 패턴):
```bash
find ~ -name "learnings.jsonl" 2>/dev/null -exec grep -l "design-auditor\|logDesignOutcome" {} \; | \
  xargs -I{} sh -c 'echo "=== {} ==="; grep "design-" {}'
```
- `userAction: accepted` — 제안 수용률
- `userAction: overridden` — 경고 무시 (rule별 카운트 → false positive 후보)
- `userAction: rejected` — design 체인 자체 거부 (전수조사 필요)
- `userAction: partial` — 일부 수용 (튜닝 기회)

**Git log** (UI 커밋 + design 트리거):
```bash
git log --since="2 weeks ago" --oneline --all | grep -iE "ui|design|style|css|tsx|jsx"
git log --since="2 weeks ago" --grep="design-auditor\|design score" --oneline
```

**`.design-override.md` 존재 확인** (downstream 프로젝트):
```bash
find ~/Projects -maxdepth 3 -name ".design-override.md" 2>/dev/null
```
- 파일 존재 = design 체인이 실제 트리거됨
- 부재 = UI 작업은 있으나 gate가 감지 실패 or opt-out

### 3. 분석

각 카테고리별로 판정:

**삭제 후보 (0회 fire, 2주 이상)**:
- anti-patterns.md의 24 rule 중 learnings / analytics에 한 번도 등장 안 한 rule
- refs/{brand}.md 중 designer가 한 번도 인용 안 한 brand (11개 중)
- reasoning.json 의 17 domain rule 중 한 번도 매칭 안 된 rule
- governance/design/variants.md 의 7 preset 중 한 번도 선택 안 된 variant

→ **삭제 제안** (maintenance 부담 vs 가치 판단)

**최적화 후보 (fire는 되지만 정확도 낮음)**:
- `overridden` > 3회 → false positive 의심 → regex 튜닝 or rule 완화
- `rejected` > 1회 → 프로젝트 단위 opt-out 흐름 정비
- 평균 score가 일관되게 50 이하 → threshold 하향 or 기준 재정의
- circuit breaker open이 빈번 → 안정성 이슈

→ **튜닝 제안**

**추가 후보 (user 피드백 기반)**:
- 사용자가 수동으로 PR에서 지적한 UI 문제가 detector가 못 잡은 경우
- 로드맵 9 rule (RD-01/03/05, A11Y-05, LS-02/03, AI-07 signal) 중 실전 miss 패턴

→ **구현 우선순위 재조정**

### 4. 리포트 작성

`.context/design-retro-{YYYY-MM-DD}.md`:

```markdown
---
created_at: ISO8601
period: 2 weeks (2026-04-15 → 2026-04-29)
total_audits: N
total_ui_commits: M
---

## Summary
- 사용률: <실제 fire 횟수 / 예상 횟수> = P%
- 평균 smell score: N/100
- False positive rate (overridden / total fire): F%
- A11y 위반 총: K건

## Delete (유지 비용 > 가치)
- [ ] rule: AI-06 (0회 fire, transition-all 사용자 많음 → noise)
- [ ] refs/bloomberg.md (0회 인용, 극단 케이스 불필요)
...

## Tune (유지하되 조정)
- [ ] rule: AI-03 (12회 fire, 8회 overridden → threshold 조정 or tone 예외)
- [ ] 2MB content guard → 1MB 조정 (성능)
...

## Add (실전에서 필요 확인)
- [ ] RD-03 Low contrast — 사용자 PR 3건에서 수동 지적
- [ ] RD-01 Long line — readability 이슈 반복
...

## Keep (건드리지 말 것)
- A11Y-01..04 (비협상, 검출률 100%)
- AI-01 (purple gradient, AI smell 최강 signal)
...

## 커밋 액션
- 삭제 PR 1개 (bloomberg.md, AI-06 rule, ...)
- 튜닝 PR 1개 (AI-03 threshold, reasoning.json fallback)
- 구현 PR 1개 (RD-03 contrast calc, RD-01 line length)
```

### 5. Next Action
- 리포트 작성 후 `CURRENT.md` Next Tasks에 PR 체크리스트 추가
- 3개 PR 병렬 작성 (orchestrator 활용 가능)
- 기존 커밋 체인 뒤에 post-retro 아카이브

---

## 자동 트리거

배포 직후 `/resume-on-reset` 로 **2주 후** 이 skill 자동 실행 예약:
```
CronCreate(
  cron: "M H D M *",      # 2주 뒤 업무시간
  durable: true,
  recurring: false,
  prompt: "/design-retro — 2주 실측 데이터 기반 삭제/튜닝/추가 판정"
)
```

크론이 세션-only로 소멸 가능성 있으므로 CURRENT.md Next Tasks에 **백업 마커** 남기기 (manual fallback).

---

## 회고 원칙

- **데이터 없으면 삭제 안 함** — "0회 fire"는 "미검증"이지 "불필요"가 아닐 수도
- **기간 2주 최소** — 1주는 노이즈. 2-4주 데이터가 안정적
- **반직관 검증** — "당연히 fire되어야 할 rule이 0회"면 gate 감지 문제지 rule 문제 아닐 수 있음
- **삭제는 신중** — refs/{brand}.md는 가벼운 텍스트, 삭제 이익 < 가치. 실제 비용이 있는 것(JSON 데이터, 복잡 로직, 빈번한 false positive)만 우선 삭제.
