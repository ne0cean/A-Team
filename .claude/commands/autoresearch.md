---
description: /autoresearch — Karpathy식 프롬프트 자동 최적화 루프. target 커맨드를 반복 실행·채점·변형·keep/discard 하여 품질을 올린다. 산출물: 개선된 커맨드 + results.json + changelog.md + research-log.json + live HTML dashboard
---

> Analytics: `node scripts/log-event.mjs command_start name=autoresearch` — 실행 시작 시 반드시 호출

# Autoresearch for A-Team Commands

커맨드의 30% 쓰레기 출력을 자율 루프로 제거. 루프: 출력 생성 → evals로 채점 → 커맨드 변형 → 개선만 유지 → 반복.

> 출처: [byungjunjang/jangpm-meta-skills](https://github.com/byungjunjang/jangpm-meta-skills) (MIT)

## A-Team 규칙 준수 (필수)
자율 루프 시 `governance/rules/autonomous-loop.md` 6개 강제 조항 준수. 충돌 시 autonomous-loop 우선.

---

## Step 0: Gather Context (사용자와 확정 필수)

1. **Target 커맨드** — `.claude/commands/<name>.md` 경로
2. **Pipeline mode** — 단일/다중. 다중은 `governance/skills/autoresearch/pipeline-guide.md` 참조
3. **Test inputs** — 3~5개 시나리오
4. **Eval criteria** — binary 3~6 + comparative 0~5
5. **Runs per experiment** — 기본 5
6. **Budget cap** — 선택
7. **Termination** — 기본: 3회 연속 95%+ binary pass rate
8. **Human review** — 기본: first 3. `skip`으로 풀 자율

---

## Step 1: Read Target Command
전체 읽기 + 참조 파일 읽기 + 핵심 역할/스텝/출력 파악. 스킵 금지.

## Step 2: Build Eval Suite
**상세**: `Read governance/skills/autoresearch/eval-guide.md`

세 종류: Binary (규칙 yes/no), Comparative (품질 win/tie/loss), Fidelity (파이프라인 전용).
- Binary pass rate = `passes / (evals × runs)`
- Comparative win rate = `wins / (evals × runs)`
- **최소 50%는 Tier 1-2 (deterministic)**. Tier 3 LLM-as-judge는 최후 수단.

## Step 3: Dashboard Setup
`governance/skills/autoresearch/dashboard-guide.md` 참조. 데이터는 HTML inline (`<script>const RESULTS_DATA = ...;</script>`).

## Step 4: Run Harness
반복 가능한 실행 절차 정의 → `.autoresearch/[name]/run-harness.md` 저장.
상세: `governance/skills/autoresearch/execution-guide.md`

## Step 5: Baseline (or Resume)

`.autoresearch/[name]/` 존재 시 → **RESUME** (changelog + results.json 읽고 이어감).
없으면 → **NEW**: 폴더 생성, 원본 백업, AS-IS 실행·채점, git branch `autoresearch/[name]`.

## Step 6: Human Review (optional, 기본 3회)
`skip` 설정 시 건너뜀. 처음 3 실험을 사용자와 리뷰. 주관적 피드백은 `[HUMAN INSIGHT]`로 기록.

## Step 7: Autonomous Loop
**상세**: `Read governance/skills/autoresearch/mutation-guide.md`

**NEVER STOP** (autonomous-loop 안전 조건 제외). 루프:
1. 실패 분석 → 2. 가설 (L1 프롬프트/L2 asset/L3 eval) → 3. 변경 적용 → 4. commit → 5. 실행 → 6. 채점 → 7. Keep/Discard 결정 → 8. 로깅 → 반복

**Keep/Discard 결정표:**

| 점수 | 줄 수 | 결정 |
|------|-------|------|
| +2 이상 | 증가 | KEEP |
| +1 | 10+줄 증가 | DISCARD |
| ±0 | 감소 | KEEP |
| ±0 | 증가 | DISCARD |
| 악화 | 아무거나 | DISCARD |

DISCARD: `git reset --soft HEAD~1` + restore mutated files.
매 5실험마다 deletion mutation 시도. baseline 200% 초과 시 경고.

**Stop**: 사용자 중단 / budget cap / 3회 연속 95%+ / 시스템 제한.
**Stuck 시**: `governance/skills/autoresearch/mutation-guide.md` "when stuck" 참조.

## Step 8: Logs
- `changelog.md` — 모든 실험 keep/discard
- `research-log.json` — direction shifts만 (30 초과 시 최근 10 + 요약)
- `results.json` + `results.tsv` — 점수 데이터

## Step 9: Deliver Results
Baseline → Final 점수 (binary + comparative), 실험 수, Top 3 변경, 남은 실패, 프롬프트 크기 delta, git log.

## After the Run
- 1주 후 실사용 검증. Binary 높은데 출력 나쁘면 → eval 수정
- 모델 업그레이드 시 → changelog 참조해 이어감
- 월간: 같은 mutation 반복 discard → 접근 변경, deletion KEEP 반복 → bloating

## Output
```
.autoresearch/[name]/
├── dashboard.html, results.json, results.tsv
├── changelog.md, research-log.json
├── <target>.baseline, run-harness.md
└── runs/{baseline,exp-1,...,exp-N}/
```

## A-Team 메모

| 항목 | 규칙 |
|------|------|
| 대상 | `.claude/commands/<name>.md` |
| 참조 | `governance/skills/autoresearch/*.md` (on-demand) |
| 아티팩트 | `.autoresearch/` (gitignored) |
| 자율 충돌 | autonomous-loop.md 우선 |
| 브랜치 | `autoresearch/[name]` — merge는 사용자 승인 |

$ARGUMENTS
