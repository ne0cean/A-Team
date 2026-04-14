---
description: /autoresearch — Karpathy식 프롬프트 자동 최적화 루프. target 커맨드를 반복 실행·채점·변형·keep/discard 하여 품질을 올린다. 산출물: 개선된 커맨드 + results.json + changelog.md + research-log.json + live HTML dashboard
---

# Autoresearch for A-Team Commands

대부분의 커맨드는 70% 정도만 안정적이다. 나머지 30%는 쓰레기가 나온다. 해법은 처음부터 다시 쓰는 게 아니라 에이전트에게 수십 번 돌리게 하고, 매 출력을 채점한 뒤, 30%가 사라질 때까지 프롬프트를 조이는 것이다.

이 커맨드는 Andrej Karpathy의 autoresearch 방법론(autonomous experimentation loops)을 A-Team 슬래시 커맨드 최적화에 적용한다. ML 학습 코드 대신 커맨드 프롬프트를 최적화한다.

> 출처: [byungjunjang/jangpm-meta-skills](https://github.com/byungjunjang/jangpm-meta-skills) (MIT) — A-Team 규격으로 포팅

---

## ⚠️ A-Team 규칙 준수 (필수)

이 커맨드는 `NEVER STOP` 조항(step 7)을 포함한다. 자율 루프 실행 시 반드시 `governance/rules/autonomous-loop.md`의 **6개 강제 조항**을 함께 로드하고 준수한다. 특히:

- **강제 조항 6 (나레이션 금지)**: 실험 진행 중 사용자 대상 텍스트는 최소화
- 충돌 시 `autonomous-loop.md` 규칙이 우선

---

## the core job

루프를 돌린다: 출력 생성 → evals로 채점 → 커맨드 변형 → 개선만 유지 → 반복.

**Output:** 개선된 target 커맨드 파일 + `results.json` + `results.tsv` + `changelog.md` + `research-log.json` + 라이브 HTML 대시보드.

---

## project setup (required)

autoresearch는 매 실험마다 target 커맨드 파일을 수정한다. Claude Code가 매번 승인을 물어보지 않도록 `~/.claude/settings.json`에 다음 권한을 추가한다.

```json
{
  "permissions": {
    "allow": [
      "Edit(.claude/commands/**)",
      "Write(.claude/commands/**)",
      "Edit(governance/skills/**)",
      "Write(governance/skills/**)",
      "Edit(~/.claude/commands/**)",
      "Write(~/.claude/commands/**)"
    ]
  }
}
```

프로젝트 로컬 경로(`.claude/commands/**`, `governance/skills/**`)는 이 레포 안의 커맨드와 참조 문서를 다룰 때 안전하며 공유 settings에 커밋 가능하다. 글로벌 경로(`~/.claude/commands/**`)는 **로컬에만** 추가하고 커밋하지 않는다 — 동료 머신의 모든 설치 커맨드에 대한 광범위한 쓰기 권한이 되기 때문이다.

`~/.claude/settings.json`이 이미 존재하면 `permissions.allow` 배열에 필요한 항목만 추가한다. 이 권한이 없으면 autoresearch는 매 수정마다 수동 승인을 요구하여 자율 루프가 깨진다.

---

## step 0: gather context

**STOP. 아래 모든 필드를 사용자와 확정하기 전에 어떤 실험도 실행하지 마라.**

1. **Target 커맨드** — 어떤 커맨드를 최적화할 것인가? (target `.claude/commands/<name>.md` 정확한 경로). 파이프라인이면 실행 순서대로 모든 커맨드를 나열.
2. **Pipeline mode** — 단일 커맨드 또는 다중 커맨드 파이프라인? 기본: 단일. 파이프라인 상세는 `governance/skills/autoresearch/pipeline-guide.md` 참조.
3. **Test inputs** — 다양한 use case를 커버하는 3~5개의 프롬프트/시나리오. 좋은 test input 설계는 `governance/skills/autoresearch/eval-guide.md` (Test prompt design 섹션) 참조.
4. **Eval criteria** — 규칙을 위한 binary checks (3~6) + 품질 차원을 위한 comparative checks (0~5). `governance/skills/autoresearch/eval-guide.md` 참조.
5. **Runs per experiment** — 한 변형당 커맨드를 몇 번 실행? 기본: 5.
6. **Budget cap** — 선택. 중단 전 최대 실험 사이클. 기본: 없음.
7. **Termination conditions** — 언제 auto 모드를 멈출지. 기본: 3회 연속 95%+ binary pass rate. 커스텀은 `governance/skills/autoresearch/mutation-guide.md` 참조.
8. **Human review mode** — 풀 auto 전에 처음 몇 실험을 리뷰할 것인가? 기본: yes (first 3). 완전 자율은 `skip`.

사용자가 `evals.json` 파일을 제공하면 3~4번 대신 그 파일을 사용한다.

---

## step 1: read the target command

뭔가를 바꾸기 전에 target 커맨드를 완전히 읽고 이해한다.

1. target 커맨드 파일 전체를 읽는다
2. target 커맨드가 링크하는 `governance/skills/` 또는 `governance/` 하위 참조 파일도 모두 읽는다
3. 커맨드의 핵심 역할, 처리 스텝, 출력 형식을 파악한다
4. 이미 존재하는 품질 체크나 anti-pattern을 노트한다

이 단계를 스킵하지 마라. 커맨드가 뭘 하는지 이해하지 않고는 개선할 수 없다.

**파이프라인 모드**에서는 `governance/skills/autoresearch/pipeline-guide.md`를 읽고 모든 커맨드에 걸친 데이터 흐름을 매핑한다.

---

## step 2: build the eval suite

사용자 eval criteria를 구조화된 테스트로 변환한다. 전체 템플릿/예시/assertion taxonomy는 `governance/skills/autoresearch/eval-guide.md` 참조.

**세 종류의 eval:**

- **Binary evals** — 객관적 규칙 준수 (yes/no). 하드 규칙에 사용.
- **Comparative evals** — 주관적 품질 개선. 변형이 특정 차원에서 품질을 개선했는지 판단 (win=1, tie=0.5, loss=0). 모든 커맨드는 최소 1~2개 comparative eval을 binary 옆에 둬야 한다 — binary만으로는 빠르게 plateau 한다.
- **Fidelity evals** — 파이프라인 단계 일관성 (파이프라인 모드 전용). `governance/skills/autoresearch/pipeline-guide.md` 참조.

**Scoring — 두 축, 별도 보고:**

- **Binary pass rate** = `binary_passes / (binary_evals × runs)` → 규칙 준수 추적
- **Comparative win rate** = `comparative_wins / (comparative_evals × runs)` (ties = 0.5) → 품질 개선 추적

두 숫자를 모두 보고한다. Binary pass rate를 유지하면서 comparative win rate가 오르면 총합이 평평해 보여도 win이다. Termination 조건은 기본적으로 binary pass rate에 적용.

### Eval type hierarchy (결정성 순)

Eval 작성 시 가능한 가장 높은 tier를 사용한다. LLM-as-judge는 최후 수단.

**Tier 1 — Deterministic checks (1순위)**
grep, regex, 파일 존재, JSON/YAML parse 성공, 글자수 범위, 필수 섹션 존재 등.
같은 입력 → 항상 같은 결과. 가장 안정적.

예:
- "출력에 `## 요약` 섹션이 있는가?" → `grep -q "^## 요약" output.md`
- "유효한 JSON인가?" → `python -c "import json; json.load(open('output.json'))"`
- "500~2000자 사이인가?" → `wc -c output.txt | awk '{exit ($1<500 || $1>2000)}'`

**Tier 2 — Structural validation**
출력의 구조적 속성을 프로그램적으로 검증. 약간의 파싱 로직이 필요하지만 여전히 deterministic.

예:
- 마크다운 heading이 올바른 계층을 따르는가? (H1 → H2 → H3)
- 테이블이 모든 행에서 같은 컬럼 수를 가지는가?
- 코드 블록이 언어 지정자를 가지는가?

**Tier 3 — LLM-as-judge (최후 수단)**
프로그램적으로 검증 불가능한 항목에만 사용 — 콘텐츠 품질, 톤, 정확도.

**목표: 전체 eval의 최소 50%는 Tier 1-2여야 한다.** Tier 3로만 구성된 eval suite는 변형의 효과를 안정적으로 감지하기엔 노이즈가 너무 많다.

### 모든 eval의 규칙

- 일관성이 유지될 만큼 구체적일 것. "텍스트가 읽기 쉬운가?"는 너무 모호. "모든 단어의 철자가 올바르고 잘린 문장이 없는가?"는 테스트 가능.
- 커맨드가 eval을 game 할 정도로 narrow하지는 말 것.
- 각 eval은 별개의 것을 테스트 — 중복 금지.

**최종 확정 전 각 eval에 3-질문 테스트:**

1. 두 에이전트가 같은 출력을 독립 채점해도 일치할까? (아니면 → 조임)
2. 커맨드가 실제로 개선하지 않고도 이 eval을 game 할 수 있을까? (가능하면 → 너무 narrow)
3. 이 eval이 사용자가 실제로 신경 쓰는 걸 테스트하나? (아니면 → 폐기)

---

## step 3: define the live dashboard

전체 대시보드 스펙은 `governance/skills/autoresearch/dashboard-guide.md` 참조. 여기서는 파일을 만들지 않는다 — `.autoresearch/[command-name]/dashboard.html`은 step 5 폴더 셋업에서 생성된다.

**대시보드 HTML 핵심 규칙:** 브라우저에서 `fetch()` 또는 XHR로 데이터를 로드하지 마라. 매 실험 후 최신 데이터를 `<script>const RESULTS_DATA = ...;</script>`로 dashboard.html 안에 inline 한다. 이렇게 해야 `file://` 프로토콜로 서버 없이 열 수 있다. 이 규칙은 dashboard HTML에만 적용 — 에이전트 스텝으로 `results.json`을 읽는 건 당연하고 필수.

---

## step 4: define the run harness

어떤 실험을 실행하기 전에 "target 커맨드를 실행한다"가 정확히 무엇인지 반복 가능한 절차로 정의한다. harness 내용은 여기서 작성하고 파일은 step 5에서 `.autoresearch/[command-name]/run-harness.md`에 저장한다.

**신뢰 가능한 harness는 다음을 명시한다:**
1. **Input** — 어떤 test 프롬프트, 어떤 형식, 어떻게 전달하는지
2. **Execution** — 어떤 명령 또는 에이전트 invocation이 커맨드를 실행하는지
3. **Output capture** — artifact가 어디에 떨어지고 `runs/exp-N/<prompt-id>/`에 어떻게 저장되는지

**수용 가능한 harness:**
- 워크플로우를 end-to-end로 실행하는 로컬 스크립트 또는 명령
- 고정된 프롬프트와 deterministic artifact 캡처를 가진 제한된 agent invocation
- 매뉴얼 프로토콜 — 절차가 기록되고 매 실행마다 동일하게 따라지면 OK

신뢰 가능한 harness를 정의할 수 없다면 autoresearch를 진행하지 마라. 대신 "커맨드 재작성 + 수동 리뷰" 모드로 전환.

실행 패턴(subagent vs direct) 및 핵심 규칙은 `governance/skills/autoresearch/execution-guide.md` 참조.

---

## step 5: establish baseline (or resume)

**먼저 `.autoresearch/[command-name]/`가 이미 존재하는지 확인한다.**

### 폴더가 이미 존재하면 → RESUME

새 폴더를 만들거나 baseline을 다시 설정하지 마라. 이전 실행에서 이어간다:

1. `changelog.md`와 `research-log.json`을 읽고 뭐가 시도됐는지 파악
2. `results.json`을 로드해 현재 best 점수와 다음 실험 번호 확인
3. `<target-command-filename>.baseline`을 읽고 원본 시작점 이해
4. autoresearch 브랜치가 있으면 `git checkout autoresearch/[command-name]`
5. 사용자에게 `dashboard.html` 경로 안내 — 브라우저에서 `file://`로 열어 진행 상황 추적
6. step 6 또는 step 7로 바로 점프해 실험 루프 재개
7. 새 실험 번호는 마지막 번호 다음부터 (마지막이 exp-7이면 다음은 exp-8)

새 모델을 사용한다면 research log를 읽고 마지막 방향에서 이어간다.

### 폴더가 존재하지 않으면 → NEW BASELINE

뭘 바꾸기 전에 커맨드를 AS-IS로 실행한다. 이게 experiment #0.

1. `.autoresearch/[command-name]/` + `runs/baseline/` 생성
2. `results.json`, `changelog.md`, `research-log.json`, `dashboard.html`, `run-harness.md` (step 4 내용) 생성 → 사용자에게 `dashboard.html` 경로 안내 (브라우저 `file://`로 열도록)
3. 원본 커맨드를 `<target-command-filename>.baseline`로 백업
4. test inputs로 커맨드를 실행, 모든 출력을 `runs/baseline/<prompt-id>/`에 복사
5. 모든 출력을 모든 eval로 채점, baseline 점수 기록
6. `git checkout -b autoresearch/[command-name]` (브랜치가 이미 있으면 `-N` suffix)
7. `.autoresearch/`가 `.gitignore`에 이미 있는지 확인 — A-Team에선 Phase 1에서 이미 추가됨. 없으면 추가.
8. `git add <target-command-path> && git commit -m "autoresearch: baseline ([score]/[max])"`

**중요:** baseline이 90%+이면 추가 최적화 가치를 사용자와 확인.

프롬프트 로테이션 및 헤비 파이프라인은 `governance/skills/autoresearch/pipeline-guide.md` 참조.

---

## step 6: human review phase (optional)

> 사용자가 human review 모드를 `skip`으로 설정했다면 이 스텝 전체 건너뜀.

처음 3 실험은 human review와 함께 돌린다. 여기서 주관적 판단 — 톤, 미적 감각, 브랜드 적합성, 개인 선호 — 이 자율 루프가 넘겨받기 전 최적화 방향에 구워진다.

**각 human-reviewed 실험:**

1. **실패 분석** 및 가설 형성 (step 7과 동일)
2. target 커맨드 파일에 **한 번의 변경**
3. **변경 commit:** `git add <mutated-files> && git commit -m "autoresearch: [one-line description]"`
4. **실험 실행** 및 채점
5. **결과 제시**: 변경 + 이유, before/after 점수, 2~3 샘플 출력, keep/discard 권고
6. **사용자에게 질문:** "이 방향이 맞나요?" / "evals가 잡지 못하는 게 있나요?"
7. **주관적 피드백이 있으면**, `changelog.md`에 `[HUMAN INSIGHT]`로 노트 후 target 커맨드 파일에 반영. 새 eval로 추가하지 마라.
8. **Keep 또는 discard** (step 7과 동일 규칙). DISCARD → 먼저 관련 없는 uncommitted 변경 확인 (`git status --porcelain`). 체크포인트된 target 파일 밖에 뭔가 있으면 stash: `git stash`. 그 다음 `git reset --soft HEAD~1`. Mutated 파일만 명시적 경로로 복구, 예: `git restore <target-command-path> <reference-path>`. stash가 있었으면 `git stash pop`.
9. 결과를 `human-reviewed` 상태로 **로깅**.

**3 human-reviewed 실험 후 (또는 "go auto"):** auto 모드로 전환. 사용자에게: "auto 모드로 전환합니다. 언제든 대시보드를 확인하세요."

---

## step 7: run the autonomous experiment loop

**이 시점부터 확정 phase (step 0)과 human review phase (step 6)가 끝났다. 다음 자율 루프 규칙이 이 시점 이후 적용된다.**

이게 autoresearch의 핵심 루프. 시작되면 중단될 때까지 자율적으로 실행한다.

**NEVER STOP.** 루프가 시작되면 확인을 위해 멈추지 마라. 사용자가 자리를 비웠을 수 있다. 사용자가 수동으로 멈추거나 중단 조건에 도달할 때까지 계속 실행한다.

> ⚠️ **A-Team 예외**: `governance/rules/autonomous-loop.md`의 강제 조항과 충돌할 경우 autonomous-loop 규칙이 우선. 특히 토큰 한계/안전 조건에서는 멈춘다.

**LOOP:**

1. **실패 분석.** 어떤 eval이 가장 많이 실패하는지 본다. 실제 실패 출력을 읽는다. 패턴을 식별한다.

2. **가설 형성.** 적절한 레벨의 변형을 고른다. 세 mutation 레벨(L1: 프롬프트 규칙, L2: 참조 asset, L3: eval calibration), good/bad 변형 예시, 번들 변형, L1→L2 전환 신호는 `governance/skills/autoresearch/mutation-guide.md` 참조.

3. **변경 적용.** 선택된 mutation 레벨에서 target 파일(들) 편집.

4. **변경 commit:** `git add <mutated-files> && git commit -m "autoresearch: [one-line description]"`

5. **실험 실행.** test inputs로 커맨드를 실행. **모든 출력을 `runs/exp-N/`에 저장** — 커맨드가 생성하는 모든 artifact를 `runs/exp-N/<prompt-id>/`로 복사/이동해 각 실험이 self-contained, 비교 가능하게.

6. **채점.** 모든 출력을 모든 eval에 통과. 총 점수 계산. `skill_lines`는 `wc -l <target-command-path>`로 측정.

7. **결정: keep 또는 discard.**

   target 커맨드 파일의 줄 수 변화를 점수와 함께 고려:

   | 점수 변화 | 줄 수 변화 | 결정 |
   |-----------|-----------|------|
   | 개선 (+2 이상) | 증가 | **KEEP** — 의미 있는 개선은 복잡성 증가를 정당화 |
   | 미미한 개선 (+1) | 10+ 줄 증가 | **DISCARD** — 복잡성 대비 개선 부족 |
   | 동일 (±0) | 감소 | **KEEP** — 더 짧은 프롬프트로 동일 성능 |
   | 동일 (±0) | 증가 | **DISCARD** — 복잡성만 증가, 이득 없음 |
   | 악화 | 아무거나 | **DISCARD** |

   두 버전이 같은 점수면 항상 더 짧은 쪽.

   - **KEEP** → 이 commit 유지. 새 baseline.
   - **DISCARD** → 먼저 관련 없는 uncommitted 변경 확인 (`git status --porcelain`). 체크포인트된 target 파일 밖에 뭔가 있으면 stash: `git stash`. 그 다음 `git reset --soft HEAD~1`. Mutated 파일만 명시적 경로로 복구. stash가 있었으면 `git stash pop`.

   **개별 eval 회귀 감지:** 총 점수가 올라가도, 이전에 통과하던 eval이 새로 실패하면 강력히 DISCARD 고려. 한 영역의 gain이 다른 영역의 회귀를 숨기면 장기 품질이 저하된다.

8. 결과 **로깅** 및 results.json / dashboard 업데이트.

9. **direction-level 변경**이었다면 research-log.json에 로깅 (step 8 참조).

10. **반복.** step 1로 돌아감.

### 주기적 deletion 실험

매 5번째 실험마다 의도적으로 "deletion mutation"을 시도. 최근 추가된 규칙 중 실제로 점수에 기여하지 않는 것을 찾아 제거. 규칙 제거 후 점수가 유지되면 그게 가능한 최고의 실험 결과다. target 커맨드 파일이 baseline 크기의 200%를 넘기면 changelog에 경고 기록.

### stop conditions

- 사용자가 수동으로 멈춤
- Budget cap 도달
- 3회 연속 95%+ pass rate (또는 커스텀 — `governance/skills/autoresearch/mutation-guide.md` 참조)
- 시스템 레벨 timeout 또는 리소스 제한

아이디어가 떨어지는 건 멈출 이유가 아니다 → 아래 "when stuck" 전략 참조.

### when stuck — 커맨드 프롬프트 최적화 전용 전략

3회 연속 discard 또는 아이디어가 말랐을 때:

1. **지시 재배치**: 가장 자주 실패하는 eval과 가장 관련된 지시를 target 커맨드 파일 맨 위로 이동. LLM은 프롬프트 초반 지시를 더 강하게 따른다.
2. **부정형 → 긍정형 전환**: "X 하지 마라"를 "항상 Y 하라"로 변환. 예: "리스트에 번호를 매기지 마라" → "모든 리스트 항목을 불릿(•)으로 시작하라"
3. **예시 교체**: 새 예시를 추가하는 대신 기존 예시를 실패 패턴을 직접 다루는 예시로 교체. 예시 총 개수는 늘리지 마라.
4. **삭제 실험**: 지시 하나 제거 후 점수 측정. 두 지시가 충돌하면 하나 제거 자체가 개선.
5. **구체성 증가**: 모호한 지시에 구체적 숫자/형식 추가. 예: "간결하게 써라" → "각 섹션을 3~5 문장으로 제한하라"
6. **페르소나 조정**: 커맨드 상단의 역할 설명 변경. 예: "당신은 전문 기술 작가입니다" → "당신은 비개발자를 위한 기술 가이드 작가입니다"
7. **이전 near-miss 결합**: changelog에서 각각 discard 됐지만 baseline과 가까웠던 두 mutation을 동시에 적용. (이게 "한 번에 한 변경" 규칙의 유일한 예외)

---

## step 8: maintain the logs

세 파일, 세 역할. 분리 유지. 템플릿과 스키마는 `governance/skills/autoresearch/logging-guide.md` 참조.

- **changelog.md** — 모든 실험, keep 또는 discard. 점수, 변경, 이유, 결과, 실패 출력, human insight.
- **research-log.json** — direction shifts 만. 모델 업그레이드를 넘어 생존. 30 엔트리 초과 시 최근 10개 + 패턴 요약만 유지.
- **results.json** — 기계 판독 가능한 점수 파일, 실험당 하나의 object. results.tsv와 같은 필드 + 전체 eval breakdown. 매 실험 후 dashboard.html에 inline 된다.
- **results.tsv** — tab 구분, 실험당 한 row. 컬럼: `experiment	score	max_score	pass_rate	skill_lines	status	description`. 외부 분석과 정본 점수 로그로 사용.

---

## step 9: deliver results

사용자가 돌아오거나 루프가 멈추면 제시:

1. **점수:** Baseline → Final, 두 축 모두 보고:
   - Binary pass rate: `X% → Y%` (규칙 준수)
   - Comparative win rate: `X% → Y%` (품질 개선, comparative eval 사용 시)
2. **실험 수:** 총 시도, keep rate
3. **가장 도움된 Top 3 변경** (changelog에서)
4. **반영된 human insights** (있으면)
5. **남은 실패** (있으면)
6. **프롬프트 크기:** baseline → final 줄 수
7. **Git log:** `git log --oneline autoresearch/[command-name]`
8. 모든 출력 파일의 **경로**

---

## after the run

루프 스텝이 아님 — autoresearch 완료 또는 일시정지 후 적용.

### Real-world validation (1주 후 권장)

개선된 커맨드의 실사용 출력 품질 확인. binary pass rate가 높지만 실제 출력이 기대에 못 미치면 eval criteria가 틀린 것.
→ evals 고치고 새 baseline에서 재시작.

### 모델 업그레이드 시

`changelog.md`와 `results.tsv`를 참조해 이전 모델이 멈춘 지점부터 최적화 계속.

### 커맨드 구조 변경 시

기존 autoresearch 폴더를 아카이브하고 새 baseline에서 시작. 이전 changelog를 어떤 방향이 먹혔는지에 대한 참고 자료로 사용.

### 주기적 리뷰 (월간 권장)

`changelog.md`의 패턴 리뷰:
- 같은 타입의 mutation이 반복 discard → 접근 자체 변경
- deletion 실험이 계속 KEEP → 커맨드 bloating 신호
- 최근 5 실험이 모두 ±0 → eval criteria 재검토

### False positive tracking

eval 점수는 높은데 실제 출력 품질이 낮으면 false positive. 10+ 실사용 출력 축적 후 월간 리뷰. 전체 프로세스는 `governance/skills/autoresearch/eval-guide.md` (false positive tracking 섹션) 참조.

---

## output format

```
.autoresearch/[command-name]/
├── dashboard.html          # 라이브 브라우저 대시보드 (inline 데이터, 서버 불필요)
├── results.json            # 데이터 파일 (dashboard에도 inline)
├── results.tsv             # raw 점수 로그, skill_lines 컬럼 포함
├── changelog.md            # 모든 mutation 상세 로그
├── research-log.json       # direction shifts와 전략 패턴만
├── <target-command-filename>.baseline       # 최적화 전 원본 커맨드
├── run-harness.md          # 커맨드 실행 반복 절차
└── runs/                   # 실험당 폴더 하나
    ├── baseline/
    ├── exp-1/
    └── exp-N/
```

추가로 개선된 target 커맨드가 원래 위치에 저장.
git 브랜치 `autoresearch/[command-name]`은 수락된 모든 mutation의 선형 히스토리를 유지.

---

## worked example

git ratcheting, skill_lines, simplicity 결정, deletion 실험, 혼합 Tier 1/2/3 evals가 실제 실험에서 어떻게 맞물리는지 구체적 5-실험 walkthrough는 `governance/skills/autoresearch/worked-example.md` 참조.

---

## the test

좋은 autoresearch 실행:

1. **baseline에서 시작** — 측정 전 아무것도 바꾸지 않음
2. **run harness 정의** — 실험 전 반복 가능한 실행 절차를 기록
3. **적절한 eval 타입 사용** — binary는 규칙, comparative는 품질, fidelity는 파이프라인; 최소 50% Tier 1-2 evals
4. **초기 human input** — 자율 전에 방향 검증
5. **적절한 레벨에서 변형** — 규칙은 L1, asset은 L2, eval calibration은 L3
6. **완전한 로그** — skill_lines와 함께 모든 실험 기록
7. **git ratcheting** — 모든 mutation commit, discard 시 reset, 깨끗한 선형 히스토리
8. **단순성 유지** — 프롬프트 bloating 안 함; 주기적 deletion 실험 실행
9. **research log 유지** — 미래 모델을 위한 direction shifts 캡처
10. **두 축 모두 보고** — binary pass rate + comparative win rate 별도 표시
11. **overfit 안 함** — 실제 작업에서 나아짐, 단지 테스트 통과가 아님
12. **품질 개선, 단지 compliance 아님** — before/after 비교로 실제 개선 확인

모든 eval을 통과하는데 실제 출력 품질이 개선 안 됐다면 — eval이 나쁜 거지 커맨드가 나쁜 게 아니다. After the Run 섹션의 "False positive tracking"으로 가서 eval을 고쳐라.

---

## A-Team 전용 메모

| 항목 | A-Team 규칙 |
|------|------------|
| 대상 파일 | `.claude/commands/<name>.md` 전용 (jangpm 원본의 `.claude/skills/<name>/SKILL.md` 대체) |
| 참조 문서 | `governance/skills/autoresearch/*.md` (on-demand 로드) |
| 런타임 아티팩트 | `.autoresearch/[command-name]/` — `.gitignore`에 이미 등록됨 |
| 자율 모드 충돌 시 | `governance/rules/autonomous-loop.md` 6 강제 조항 우선 |
| 실험 브랜치 | `autoresearch/[command-name]` — merge는 사용자 수동 승인 후 |
| 관련 커맨드 | `/benchmark` (시스템 성능), `/improve` (개선 추적), `/re` (정보 리서치), `/ralph` (코드 구현) — 모두 독립 운영 |

$ARGUMENTS
