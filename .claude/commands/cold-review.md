---
description: /cold-review — A-Team 냉철한 구조 감사. 월간 자동 실행 또는 수동 호출. 편향 없이 현재 구조의 맹점·미흡·낭비를 찾아 보고한다.
---

# /cold-review — 냉철한 구조 감사

> "지난 달 우리 팀은 정말 성장했는가? 아니면 바빴을 뿐인가?"

이 커맨드는 A-Team 자체를 외부인의 눈으로 감사한다.
편향 없이 결론을 도출하고, 사용자가 컨펌하면 개선사항을 `improvements/pending.md`에 등록한다.

---

## 언제 실행되나

- **월간 자동**: `/vibe` Step 0.5에서 마지막 cold-review 날짜가 30일 이상 경과 시
- **수동**: 사용자가 직접 `/cold-review` 호출 시

---

## Phase 1: 현황 수집 (데이터만, 판단 없이)

```bash
# 커맨드 수
ls .claude/commands/*.md | wc -l

# 에이전트 수
ls .claude/agents/*.md | wc -l

# 최근 30일 커밋 수
git log --oneline --since="30 days ago" | wc -l

# 최근 30일 어떤 파일이 가장 많이 바뀌었나
git log --since="30 days ago" --name-only --format="" | sort | uniq -c | sort -rn | head 20

# analytics.jsonl — 이벤트 수 및 분포
tail -100 .context/analytics.jsonl 2>/dev/null | node -e "
const lines=require('fs').readFileSync('/dev/stdin','utf8').trim().split('\n').filter(Boolean);
const counts={};
lines.forEach(l=>{try{const e=JSON.parse(l);counts[e.event]=(counts[e.event]||0)+1;}catch{}});
console.log(JSON.stringify(counts,null,2));
" 2>/dev/null || echo "analytics: 없음"

# friction-log — 마찰 패턴
wc -l .context/friction-log.jsonl 2>/dev/null || echo "friction-log: 없음"

# capability 점수
node scripts/capability.mjs 2>/dev/null | head -20 || echo "capability: 스크립트 없음"
```

---

## Phase 2: 냉철한 질문 7가지

수집한 데이터를 바탕으로 **편향 없이** 각 질문에 답한다:

1. **성장 증거**: 지난 30일 커밋 중 실질적 기능 추가는 몇 %인가? 문서/리팩토링/수정은?
2. **낭비 감지**: 사용 기록이 0인 커맨드/에이전트가 있는가? 있다면 왜 쓰이지 않는가?
3. **반복 실패**: friction-log에서 같은 패턴이 2회 이상 등장하는가?
4. **커버리지 공백**: capability-map에서 coverage 0.0인 항목 중 지금 당장 필요한 것은?
5. **복잡도 증가**: 커맨드/에이전트 수가 지난 분기 대비 증가했는가? 사용자 인지 부하는?
6. **자동화 역설**: Ralph/zzz 자율 루프가 실제로 사용되고 있는가? 아니면 기능만 있는가?
7. **미연결 자산**: governance/skills/ 하위 스킬 중 어떤 슬래시 커맨드와도 연결되지 않은 것은?

---

## Phase 3: 판정 테이블

| 영역 | 현재 점수 | 문제 | 심각도 |
|------|----------|------|--------|
| [영역] | [0-10] | [한 줄] | P0/P1/P2 |

심각도 기준:
- **P0**: 현재 사용자 작업에 직접 지장
- **P1**: 30일 내 문제 발생 가능
- **P2**: 장기 부채

---

## Phase 4: 개선안 생성 + 등록

P0/P1 항목에 대해 실행 가능한 개선안 생성:

```markdown
## Cold Review 개선안 — {날짜}

### P0 긴급
- [ ] [구체적 액션] — 예상 작업: [30분/2시간/반나절]

### P1 중요
- [ ] [구체적 액션]

### P2 장기
- [ ] [구체적 액션]
```

사용자 confirm 후 → `improvements/pending.md`에 append.

---

## Phase 5: 기록

```bash
# cold-review 완료 기록 (날짜 추적용)
node scripts/log-event.mjs cold_review \
  "p0_count={P0건수}" \
  "p1_count={P1건수}" \
  "command_count={커맨드수}" \
  "agent_count={에이전트수}"
```

완료 요약:
```
Cold Review 완료 — {날짜}
P0: {N}건 | P1: {N}건 | P2: {N}건
다음 자동 실행: 30일 후
개선안이 improvements/pending.md에 등록됨
```

---

## 원칙

- 칭찬 금지 — 잘된 것은 언급하지 않는다. 문제만 찾는다.
- 근거 없는 판단 금지 — 모든 판정은 수집한 데이터 기반.
- 실행 가능성 우선 — "전면 리팩토링" 같은 모호한 제안 금지. 구체적 파일/커맨드 단위로.
- 규모 경보 — 커맨드 60개 / 에이전트 20개 상한선에 근접하면 반드시 언급.
