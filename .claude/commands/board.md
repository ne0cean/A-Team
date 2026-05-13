---
description: /board — AI 이사회 시뮬레이션. 월 1회 전략 감사. CEO 의사결정 검증 + 사각지대 지적.
---

# /board — AI 이사회 시뮬레이션

> CEO(사용자)의 판단을 검증하는 독립 기구. `/cold-review`가 구조 감사라면, `/board`는 **전략 감사**.
> 참고: MIT Sloan GenAI Board 패턴 + EOS Quarterly Review + Company of One MVPr

```bash
node scripts/log-event.mjs command_start name=board
```

---

## 언제 실행되나

- **월간**: `/vibe`에서 마지막 board 날짜 30일+ 경과 시 제안
- **수동**: `/board` 직접 호출
- **분기말**: OKR/Rocks 리뷰와 연동

---

## Phase 1 — 데이터 수집 (자동, 판단 없이)

```bash
# 지난 30일 커밋
git log --since="30 days ago" --oneline | wc -l

# analytics 이벤트 집계
node scripts/weekly-report.mjs --json --weeks-ago 0

# anomaly 스캔
node scripts/anomaly-detect.mjs --json --days 30

# capability 현황
node -e "const c=require('./lib/capability-map.json'); const d=c.departments; for(const[k,v] of Object.entries(d)){const caps=Object.values(v.capabilities||{}); const avg=caps.reduce((a,c)=>a+(c.coverage||0),0)/caps.length; console.log(k, Math.round(avg*100)+'%', 'weight:'+v.weight)}"

# 매출/외부 지표 (있으면)
cat .context/revenue.json 2>/dev/null || echo '{"mrr":0,"arr":0,"customers":0,"churn_rate":null}'

# 최근 OKR 상태
cat .context/okr-current.json 2>/dev/null || echo "OKR 미설정"
```

## Phase 2 — 4인 이사회 소집

4명의 AI 페르소나가 **독립적으로** 데이터를 분석. 각자 다른 렌즈:

| 이사 | 렌즈 | 핵심 질문 |
|------|------|----------|
| **CFO** (재무) | 돈 | "수익은? 번레이트는? 언제 흑자?" |
| **CMO** (마케팅) | 시장 | "고객이 우릴 아나? 퍼널은 작동하나?" |
| **CTO** (기술) | 기술 부채 | "인프라 과잉 아닌가? 제품에 집중하고 있나?" |
| **외부 이사** (독립) | 기회비용 | "이거 안 하고 다른 걸 해야 하는 건 아닌가?" |

각 이사는 **반드시 1개 이상 불편한 질문**을 제기해야 함. 칭찬만 하는 이사는 실패.

## Phase 3 — 충돌 토론

4명의 의견이 충돌하는 지점을 식별:
- CFO "비용 줄여라" vs CTO "기술 투자 필요"
- CMO "마케팅 먼저" vs 외부 이사 "제품이 먼저"

**충돌 해소 규칙**: 데이터가 있는 쪽이 이김. 데이터 없으면 **실험 설계**를 제안.

## Phase 4 — Board Consensus 산출

```markdown
## 이사회 결의 — YYYY-MM-DD

### 경영 성적표
| 지표 | 수치 | 판정 |
|------|------|------|
| MRR | $X | 🔴/🟡/🟢 |
| 고객 수 | N | 🔴/🟡/🟢 |
| 발행 콘텐츠 | N건 | 🔴/🟡/🟢 |
| 커버리지 | X% | 🟢 |
| 테스트 | N PASS | 🟢 |

### 불편한 질문 (각 이사 1개씩)
1. CFO: "..."
2. CMO: "..."
3. CTO: "..."
4. 외부: "..."

### 이번 달 가장 큰 실수
(회피하고 있던 결정 또는 잘못된 시간 배분)

### 다음 30일 필수 액션 (최대 3개)
1. ...
2. ...
3. ...

### 90일 Rocks 점검
| Rock | 진척 | On Track? |
|------|------|-----------|

### CEO에게 보내는 편지 (3줄)
(솔직하고 건설적인 피드백)
```

## Phase 5 — 저장 + 추적

```bash
mkdir -p .context/board-reviews
# 저장
Write .context/board-reviews/YYYY-MM-DD-board.md

# analytics 기록
node scripts/log-event.mjs board_review \
  "mrr=$MRR" "customers=$N" "coverage=$PCT" \
  "actions=$ACTION_COUNT"
```

사용자에게 결의 요약 제시 → 승인 시 다음 30일 액션을 CURRENT.md Next Tasks에 반영.

---

## 원칙

1. **데이터 기반** — 감 아닌 숫자로 판단
2. **불편해야 정상** — 칭찬만 하는 이사회는 무가치
3. **기회비용 항상 묻기** — "이거 하느라 못한 건 뭔가?"
4. **실행 가능한 결론** — "좋겠다" 아닌 "다음 30일 이걸 해라"
5. **짧게** — 전체 출력 ≤ 50줄. 장황함 금지.
