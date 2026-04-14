# jangpm-meta-skills → A-Team 통합 설계서

> 작성일: 2026-04-15
> 목적: 외부 레포 [byungjunjang/jangpm-meta-skills](https://github.com/byungjunjang/jangpm-meta-skills) 분석 → A-Team 통합 실행 계획
> 상태: **DESIGN ONLY** — 구현 착수 전 사용자 승인 필요

---

## 0. 요약 (TL;DR)

| 스킬 | 판정 | 1-line 이유 |
|------|------|-------------|
| `autoresearch` | **ADOPT** (최우선) | Karpathy식 프롬프트 최적화 루프. A-Team 전체에 동등물 없음 |
| `blueprint` | **MERGE** (제한적) | `validate_blueprint_doc.py` + design-principles만 흡수. skill-creator 의존성 제거 필요 |
| `reflect` | **LEARN** (코드 버림) | 4-parallel→dedup 패턴만 `improvements/pending.md`에 등록. 스킬 추가 X |
| `deep-dive` | **SKIP** | `office-hours` + `plan-eng` + `autoplan` 조합에 완전히 커버됨 |

**실행 순서**: autoresearch 도입 → 실전 1회 이상 사용 → blueprint 도입 → reflect 패턴 적용 검토

**총 추가 파일**: 커맨드 2 + 거버넌스 1 + 스크립트 1 + 참조 7. 기존 파일 수정은 `.gitignore`와 `CLAUDE.md`만.

---

## 1. 원칙 (Non-negotiables)

A-Team 통합은 다음 규칙을 **반드시** 지킨다.

1. **중복 금지** — 기존 A-Team 스킬과 기능이 겹치면 흡수가 아니라 SKIP 또는 기존 스킬에 병합
2. **외래 의존성 최소화** — 외부 레포가 전제하는 `skill-creator` 같은 미설치 도구 의존성은 제거하거나 대체
3. **A-Team 거버넌스 적용** — 새 커맨드도 `CLAUDE.md` Autonomous 규칙, `coding-safety`, `sync-and-commit`를 그대로 따른다
4. **롤백 가능성** — 각 통합 항목은 단일 commit으로 되돌릴 수 있어야 함 (파일 단위 격리)
5. **검증 게이트** — 통합 후 반드시 실 사용 1회 이상 + 회귀 테스트 확인

---

## 2. 경로 및 구조 매핑

### 외부 레포 → A-Team 매핑

| jangpm 경로 | A-Team 대응 | 비고 |
|-------------|------------|------|
| `.claude/skills/<name>/SKILL.md` | `.claude/commands/<name>.md` | A-Team은 슬래시 커맨드 기반 |
| `.claude/skills/<name>/references/` | `governance/skills/<name>/` | on-demand 참조 로드 |
| `.claude/skills/<name>/scripts/` | `scripts/<name>/` | 실행 스크립트 |
| `.claude/settings.json` (permissions) | `.claude/settings.json` (병합) | 이미 존재 |
| `autoresearch-[skill-name]/` (런타임) | `.autoresearch/[skill-name]/` | `.gitignore`에 추가 |

### A-Team의 "skill"은 "command"

jangpm 레포의 `skill` 개념은 A-Team에서는 `/command`이다. `Skill` tool의 사용자 호출 스킬 목록에 자동 등록되며 별도 스킬 파일 구조는 없다. 따라서 **SKILL.md frontmatter(`name`, `description`)를 A-Team 커맨드 frontmatter(`description`)로 단순화**한다.

---

## 3. 항목별 상세 설계

### 3.1. autoresearch — ADOPT (최우선)

#### 3.1.1. 무엇을 가져오는가

| 파일 | 원본 | A-Team 경로 | 수정 여부 |
|------|------|------------|-----------|
| 메인 커맨드 | `.claude/skills/autoresearch/SKILL.md` (399줄) | `.claude/commands/autoresearch.md` | **수정** (경로 어댑테이션) |
| 참조 1 | `references/pipeline-guide.md` | `governance/skills/autoresearch/pipeline-guide.md` | 그대로 |
| 참조 2 | `references/eval-guide.md` | `governance/skills/autoresearch/eval-guide.md` | 그대로 |
| 참조 3 | `references/mutation-guide.md` | `governance/skills/autoresearch/mutation-guide.md` | 그대로 |
| 참조 4 | `references/execution-guide.md` | `governance/skills/autoresearch/execution-guide.md` | 그대로 |
| 참조 5 | `references/dashboard-guide.md` | `governance/skills/autoresearch/dashboard-guide.md` | 그대로 |
| 참조 6 | `references/logging-guide.md` | `governance/skills/autoresearch/logging-guide.md` | 그대로 |
| 참조 7 | `references/worked-example.md` | `governance/skills/autoresearch/worked-example.md` | 그대로 |

#### 3.1.2. SKILL.md → commands/autoresearch.md 변환

**필수 수정 사항** (패치 형태로 기록):

| 섹션 | 원본 | A-Team 수정 |
|------|------|------------|
| frontmatter | `name: autoresearch` + long desc | `description:` 1줄 + 본문은 그대로 |
| 섹션 "project setup" (L24~41) | `.claude/settings.json`에 `Edit(.claude/skills/**)` 추가 | **`.claude/commands/**` + `~/.claude/commands/**`로 교체**. `governance/skills/**`도 함께 허용 (autoresearch는 참조 파일도 mutate할 수 있어야 함) |
| 섹션 "step 1 read the skill" (L62~75) | "target skill의 `SKILL.md`" | "target 커맨드의 `.claude/commands/<name>.md`" |
| Resume check (L164~176) | `autoresearch-[skill-name]/` | `.autoresearch/[skill-name]/` |
| Step 5 "establish baseline" (L180~194) | 동일 경로 | `.autoresearch/`로 일괄 변경 |
| Step 8 로그 (L296~302) | 동일 | 그대로 유지 |

#### 3.1.3. `.gitignore` 패치

A-Team `.gitignore`에 추가:
```
# autoresearch 실험 아티팩트 (레포마다 생성)
.autoresearch/
```

#### 3.1.4. Settings 병합

기존 `/Users/noir/.claude/settings.json` 확인 후 `permissions.allow`에 추가:
```json
{
  "permissions": {
    "allow": [
      "Edit(.claude/commands/**)",
      "Write(.claude/commands/**)",
      "Edit(~/.claude/commands/**)",
      "Write(~/.claude/commands/**)",
      "Edit(governance/skills/**)",
      "Write(governance/skills/**)"
    ]
  }
}
```
(글로벌 경로는 로컬에만 — 공유 settings에 넣지 않음. 주석 추가)

#### 3.1.5. A-Team 기존 커맨드와의 관계

| 기존 | 관계 | 조치 |
|------|------|------|
| `/improve` | autoresearch가 개선을 반영, improve가 추적 | 상호 참조 (improve로 autoresearch 결과를 등록) |
| `/benchmark` | 서로 다른 레이어 (benchmark=시스템, autoresearch=프롬프트) | 독립 운영 |
| `/re` | 정보 리서치 vs 스킬 최적화 | 독립 운영 |
| `/ralph` | 코드 구현 루프 vs 프롬프트 최적화 루프 | autoresearch 완료 후 ralph로 실전 배포 파이프라인 미래 검토 (본 설계 범위 밖) |
| `/craft` (PRO Tier) | 품질 파이프라인의 상위 개념 | craft 내부에서 autoresearch 호출 가능 (미래) |

#### 3.1.6. 검증 게이트

1. **스모크 테스트** — 기존 커맨드 1개(예: `/end`)를 target으로 baseline만 실행 (experiment 0까지만)
2. **파일 구조** — `.autoresearch/end/{results.json, changelog.md, research-log.json, dashboard.html, runs/baseline/}` 생성 확인
3. **대시보드** — `open .autoresearch/end/dashboard.html` 로 브라우저에서 baseline 표시 확인
4. **롤백** — `rm -rf .autoresearch/` 로 깨끗이 제거 가능 확인

---

### 3.2. blueprint — MERGE (제한적)

#### 3.2.1. 무엇을 가져오는가 (선별)

| 파일 | 원본 | A-Team 경로 | 판정 |
|------|------|------------|------|
| 메인 SKILL.md | `.claude/skills/blueprint/SKILL.md` | `.claude/commands/blueprint.md` | **ADOPT** (skill-creator 의존성 제거 후) |
| design-principles.md | `references/design-principles.md` | `governance/skills/blueprint/design-principles.md` | **ADOPT** (Skill Creation Standards 섹션 교체) |
| document-template.md | `references/document-template.md` | `governance/skills/blueprint/document-template.md` | **ADOPT** (Skill 생성 규칙 섹션 A-Team 방식으로 교체) |
| example-blueprint.md | `references/example-blueprint.md` | — | **SKIP** (파일 미확보, 용량 대비 가치 불분명 — 필요 시 v2에서 추가) |
| validate_blueprint_doc.py | `scripts/validate_blueprint_doc.py` (132줄) | `scripts/validate-blueprint.py` | **ADOPT** (경로만 수정) |

#### 3.2.2. skill-creator 의존성 제거

`skill-creator`는 A-Team에 미설치. blueprint 원본은 설계서에 `skill-creator` 문자열 강제(validator L108)까지 포함한다. 다음으로 대체:

- **validator 수정**: L108의 `"skill-creator" not in text_no_code` 체크를 `"A-Team 표준 커맨드" not in text_no_code`로 교체 (또는 옵션화)
- **design-principles.md "Skill Creation Standards" 섹션 교체**: 
  - 기존: "`skill-creator` 스킬로 생성"
  - A-Team: "`.claude/commands/<name>.md` 형식으로 작성 후 `scripts/install-commands.sh` 로 배포. frontmatter는 `description:` 1줄만"
- **document-template.md "스킬 생성 규칙" 섹션**: A-Team 배포 규칙으로 교체

#### 3.2.3. A-Team 기존 플래닝 스킬과의 관계

| 기존 | 관계 | 조치 |
|------|------|------|
| `/office-hours` | 아이디어 발견/검증 | 선행 단계. blueprint 앞에 호출 |
| `/plan-eng` | 엔지니어링 계획 검토 | blueprint 결과물을 plan-eng로 검토 |
| `/plan-ceo` | CEO 관점 검토 | 선택적 병렬 |
| `/autoplan` | 3단계(CEO→Design→Eng) 자동 검토 | blueprint 결과물을 autoplan으로 일괄 검토 가능 |
| `architect` 서브에이전트 | 아키텍처 설계 (코드 없음) | blueprint는 더 구체적 산출물(스펙 .md) 생성 → 역할 명확히 구분 |

**추천 흐름**:
```
/office-hours → /blueprint → /autoplan (또는 /plan-eng) → /ralph 또는 /craft → /autoresearch (skill 최적화)
```

#### 3.2.4. blueprint 변환 요점

| 섹션 | 수정 |
|------|------|
| frontmatter | `description:` 1줄로 축약 |
| "Before Starting" L12~19 | 참조 경로를 `governance/skills/blueprint/`로 변경 |
| Phase 2.5 Validate (L72~92) | `python ~/.claude/skills/blueprint/scripts/...` → `python scripts/validate-blueprint.py` (A-Team 레포 로컬 경로) |
| "스킬 생성 규칙" 문자열 강제 | A-Team 커맨드 생성 규칙으로 교체 (3.2.2 참고) |

#### 3.2.5. 검증 게이트

1. **validator 단독 테스트** — 기존 `governance/experimental/` 문서 중 하나에 대해 실행 → 실패 사유가 합리적인지 확인
2. **blueprint 실사용 1회** — A-Team의 다음 기능(예: Wave 2 개선 설계) 하나를 blueprint로 문서화
3. **install-commands.sh 동작** — `bash scripts/install-commands.sh` 후 `/blueprint`가 글로벌에서 호출되는지 확인

---

### 3.3. reflect — LEARN (코드 버림)

#### 3.3.1. 왜 흡수 안 하는가

| 기능 | A-Team 대응 | 중복도 |
|------|------------|--------|
| 세션 마무리 (커밋/push) | `/end` | **완전 중복** |
| 문서 업데이트 감지 | `/doc-sync` | **완전 중복** |
| 학습 기록 저장 | `/end` Step 3.5 + `.context/SESSIONS.md` | **완전 중복** |
| 후속 태스크 제안 | `/retro` + `CURRENT.md Next Tasks` | **대부분 중복** |
| 자동화 기회 스카우트 | `/improve` | **부분 중복** |

reflect 스킬을 통째로 추가하면 `/end`/`/doc-sync`/`/retro`/`/improve`와 기능이 4중 중첩된다.

#### 3.3.2. 배울 가치 있는 패턴

**Parallel Analysis → Duplicate Checker → Dynamic Options** 구조:
- Step 2: 4개 독립 에이전트 동시 실행 (단일 응답에 4 Agent tool call)
- Step 3: 결과를 1개 duplicate-checker 에이전트에 전달 → 중복 병합
- Step 4: 각 에이전트가 결과 낸 카테고리에만 `AskUserQuestion` 옵션 생성 (빈 에이전트는 옵션 제외)

이 패턴은 A-Team의 `/retro`와 `/end`가 현재 순차 분석하는 부분에 적용하면 가치가 있다.

#### 3.3.3. 조치

1. `improvements/pending.md`에 **IMP 티켓 1건 등록**:
   - ID: `IMP-20260415-01`
   - 카테고리: `command`
   - 우선순위: `P2`
   - 내용: "/retro + /end에 reflect의 parallel-then-consolidate 패턴 적용. 4 에이전트 병렬 → dedup → 동적 옵션 생성. 출처: jangpm-meta-skills/reflect"
2. **본 통합에서는 파일 추가 없음**. 향후 `/improve apply` 시 `/retro`를 리팩토링할 때 이 패턴을 참고

---

### 3.4. deep-dive — SKIP

조치 없음. A-Team의 `office-hours` + `plan-eng` + `plan-ceo` + `autoplan` 조합이 deep-dive의 모든 기능(다회차 인터뷰, 8라운드 제한, 카테고리 질문, 기존 문서 감지·업데이트)을 이미 커버한다.

---

## 4. 실행 계획 (Phase별)

### Phase 1 — autoresearch 단독 도입 (최우선, 독립 commit)

**파일 변경 매트릭스**:

| 작업 | 파일 | 액션 |
|------|------|------|
| 1.1 | `.claude/commands/autoresearch.md` | **CREATE** (변환 규칙 §3.1.2 적용) |
| 1.2 | `governance/skills/autoresearch/pipeline-guide.md` | **CREATE** (원본 복사) |
| 1.3 | `governance/skills/autoresearch/eval-guide.md` | **CREATE** (원본 복사) |
| 1.4 | `governance/skills/autoresearch/mutation-guide.md` | **CREATE** (원본 복사) |
| 1.5 | `governance/skills/autoresearch/execution-guide.md` | **CREATE** (원본 복사) |
| 1.6 | `governance/skills/autoresearch/dashboard-guide.md` | **CREATE** (원본 복사) |
| 1.7 | `governance/skills/autoresearch/logging-guide.md` | **CREATE** (원본 복사) |
| 1.8 | `governance/skills/autoresearch/worked-example.md` | **CREATE** (원본 복사) |
| 1.9 | `.gitignore` | **EDIT** (+`.autoresearch/`) |
| 1.10 | `~/.claude/settings.json` | **EDIT** (permissions 병합, 로컬에만) |
| 1.11 | `scripts/install-commands.sh` | **확인** (새 커맨드 자동 배포되는지) |
| 1.12 | `CLAUDE.md` (A-Team) | **EDIT** (`.claude/commands/` 설명에 autoresearch 추가 — 선택) |

**검증 게이트 (Phase 1 완료 조건)**:
- [ ] autoresearch.md frontmatter에서 `description` 1줄 확인
- [ ] `Skill` tool 목록에 autoresearch 등장 (install-commands.sh 실행 후)
- [ ] 스모크 테스트: 임의 커맨드 1개를 target으로 `/autoresearch` 호출 → step 0 인터뷰만 완료 후 중단
- [ ] `.autoresearch/` 가 `.gitignore`에 의해 untracked 되는지 확인

**Commit message**:
```
feat(skills): autoresearch 통합 — Karpathy식 프롬프트 최적화 루프

NOW: .claude/commands/autoresearch.md + governance/skills/autoresearch/ 7 refs
NEXT: 실 커맨드 1개에 autoresearch 시범 적용
BLOCK: 없음
출처: byungjunjang/jangpm-meta-skills@main
```

### Phase 2 — 실사용 1회 (검증)

**목적**: 설계가 실제로 통하는지 검증. 가설이 틀렸으면 Phase 3 전에 중단.

**대상 후보**:
- `/end` — 사용 빈도 최고 → 회귀 시 즉시 감지
- `/office-hours` — 인터뷰 품질 평가 가능 → 비교 eval이 의미 있음
- `/autoresearch` 자체 — 메타 (자기 자신을 최적화) — 재귀적이나 첫 실험으론 위험

**권고**: `/office-hours`를 target으로 5 experiments까지 실행.

**검증 게이트**:
- [ ] baseline 측정 성공
- [ ] 최소 1 experiment에서 KEEP 판정
- [ ] dashboard.html이 `file://`로 정상 표시
- [ ] git branch `autoresearch/office-hours` 히스토리 linear

### Phase 3 — blueprint 통합 (Phase 2 성공 시)

**파일 변경 매트릭스**:

| 작업 | 파일 | 액션 |
|------|------|------|
| 3.1 | `.claude/commands/blueprint.md` | **CREATE** (§3.2.4 변환) |
| 3.2 | `governance/skills/blueprint/design-principles.md` | **CREATE** (Skill Creation Standards 섹션 교체) |
| 3.3 | `governance/skills/blueprint/document-template.md` | **CREATE** ("스킬 생성 규칙" 섹션 교체) |
| 3.4 | `scripts/validate-blueprint.py` | **CREATE** (L108 패치 적용) |
| 3.5 | `.claude/commands/office-hours.md` | **EDIT** (말미에 "다음: `/blueprint`" 안내 추가 — 선택) |

**검증 게이트**:
- [ ] `python scripts/validate-blueprint.py` 실행 가능 (존재하지 않는 파일에 대해서도 graceful)
- [ ] blueprint 스모크: `/blueprint 테스트 에이전트 설계` → blueprint-*.md 생성 → validator PASS

### Phase 4 — reflect 패턴 IMP 등록 (간단)

**파일 변경 매트릭스**:

| 작업 | 파일 | 액션 |
|------|------|------|
| 4.1 | `improvements/pending.md` | **APPEND** (IMP 티켓 §3.3.3) |

---

## 5. 리스크 & 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| autoresearch가 settings.json에 광범위 쓰기 권한 요구 | 글로벌 스킬까지 의도치 않게 수정 가능 | 글로벌 경로(`~/.claude/...`)는 로컬 settings에만. 공유 settings엔 `.claude/commands/**`만 |
| autoresearch 루프가 "NEVER STOP" 조항을 포함 (L227) | autonomous-loop 규칙과 상충 가능 | A-Team `governance/rules/autonomous-loop.md` 6개 강제 조항 준수 의무를 `.claude/commands/autoresearch.md` 서두에 재명기 |
| blueprint validator가 Python3 요구 | CI 환경 호환성 | macOS 기본 Python3 사용. 없으면 graceful skip (SKILL.md L87 원본이 이미 그렇게 처리) |
| 용량 증가 | governance/skills/autoresearch/ 7 refs = 수 KB 추가 | 미미. progressive disclosure로 on-demand 로드되므로 컨텍스트 부담 없음 |
| jangpm 레포 영문/한글 혼용 | A-Team은 한글 위주 | 섹션 헤딩은 원본 유지, 필요 시 worked-example만 확실히 한글 버전 (이미 한글) |
| autoresearch의 .gitignore 자동 추가 코드 (SKILL.md L190) | `.gitignore` 자동 수정 | 통합 시 Phase 1.9에서 미리 수동 추가 → 자동 수정 단계 스킵 지시 |

---

## 6. 롤백 계획

각 Phase는 **단일 commit**으로 정리한다. 롤백 절차:

| Phase | 롤백 커맨드 |
|-------|-------------|
| 1 | `git revert <phase1-sha>` (autoresearch 제거) |
| 2 | `rm -rf .autoresearch/` (실험 결과만 제거, 커맨드 유지) |
| 3 | `git revert <phase3-sha>` (blueprint 제거) |
| 4 | `improvements/pending.md`에서 IMP 항목 삭제 |

**긴급 전체 롤백**: `git revert phase1..phase3` 가능하도록 Phase들 사이에 다른 변경 commit 혼입 금지.

---

## 7. 성공 기준 (통합 종료 판정)

다음이 전부 충족되면 통합 완료:

1. **autoresearch**
   - [ ] 1개 target 커맨드에 대해 baseline + 3 experiments 이상 완료
   - [ ] binary pass rate **baseline → final** 최소 +10%p 또는 comparative win rate 측정값 생성
   - [ ] dashboard.html이 개발자가 1회 이상 실제로 열어 확인

2. **blueprint**
   - [ ] 1개 실 과제를 blueprint로 문서화 → validator PASS
   - [ ] 해당 blueprint 문서가 후속 `/plan-eng` 또는 `/autoplan` 검토 통과

3. **reflect**
   - [ ] IMP 티켓이 `/improve list`에 노출됨

4. **전체**
   - [ ] `CURRENT.md` Next Tasks에서 통합 관련 항목 모두 제거
   - [ ] `docs/INDEX.md`에 autoresearch 1줄 링크 추가 (선택)

---

## 8. 오픈 질문 (사용자 승인 필요)

착수 전 다음을 확인:

1. **Phase 우선순위 확정** — "autoresearch 먼저"에 동의하는지? 아니면 "blueprint 먼저"?
2. **autoresearch 첫 target** — `/office-hours`에 시범 적용 OK? 아니면 다른 커맨드?
3. **blueprint의 `skill-creator` 대체** — "A-Team 표준 커맨드 규칙"으로 교체 OK? (§3.2.2)
4. **reflect 패턴 — 즉시 적용?** — 본 설계는 IMP 등록만 하지만, 원하시면 `/retro` 리팩토링도 Phase 4에 추가 가능
5. **글로벌 vs 프로젝트 로컬** — autoresearch를 `~/.claude/commands/`에 전역 배포? 아니면 A-Team 레포에만?
6. **영문 원본 유지 vs 번역** — 참조 문서(7개)를 원본 영문 유지? 주요 섹션만 한글 병기?
7. **Settings 병합 범위** — `~/.claude/settings.json` 수정을 A-Team 통합의 일부로 할지, 별도 사용자 작업으로 남길지?

---

## 9. 참고

- **원본 레포**: https://github.com/byungjunjang/jangpm-meta-skills (MIT)
- **Clone 위치**: `/tmp/jangpm-meta-skills/` (분석용 임시)
- **Karpathy autoresearch 방법론**: autoresearch SKILL.md L10 각주
- **관련 A-Team 문서**:
  - `governance/rules/autonomous-loop.md` (6 강제 조항)
  - `CLAUDE.md` (레포 루트)
  - `improvements/pending.md` (IMP 추적)

---

## 10. Next Action

사용자 승인 대기. §8의 7개 질문에 답하면 Phase 1 착수.
