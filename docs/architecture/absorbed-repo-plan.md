# a-team-absorbed 레포 설계 계획

> ADR-2026-06-01: 외부 프로젝트 분석/흡수 자산 별도 레포 관리
> 상태: PROPOSED
> 작성자: Architect Agent

---

## 1. 흡수 자산 전수 목록

CURRENT.md, SESSIONS.md, .gstack/projects/, docs/architecture/ 전수 조사 결과.

### 1-A. 확인된 외부 자산 (6종)

| # | 자산명 | 원본 | 현재 위치 | 상태 | 비고 |
|---|--------|------|-----------|------|------|
| 1 | **ralph-claude-code** | `github.com/frankbria/ralph-claude-code` | `external/ralph-claude-code/` (로컬 git clone) | 부분 흡수 | 핵심 패턴 3개 흡수 완료 (sleep-resume probe 3-tier, ralph-daemon.mjs hourly budget, Quality Gates 4-stage). 원본 레포 자체는 보존 중 |
| 2 | **Paperclip** | `github.com/paperclipai/paperclip` | `docs/architecture/paperclip-cherrypick-roadmap.md` (분석 문서만) | 분석 완료, 흡수 계획 수립 | 레드팀+이사회 심의 → 전면 도입 기각. cherry-pick 4종 로드맵 작성됨 (Phase 0-4, 10-14일 예상) |
| 3 | **gstack** | 비공개 (1인 보유) | `~/.gstack/projects/phase2-market-intel-2026-05-02.md` | 분석 완료, 설계 흡수 | Phase 2 시장·인텔리전스 설계 문서 1개 확인. `/intel` 커맨드 구현으로 흡수 완료 |
| 4 | **awesome-harness-engineering** | `github.com/...` | 분석 결과 CURRENT.md에 언급 | 분석 완료 | 9카테고리 등록, 갭 1개 식별 (cross-session 메모리). 별도 파일 없음 |
| 5 | **Headroom** | PyPI 패키지 시도 | 없음 (설치 실패) | 보류 | PyPI 미존재 확인. 흡수 불가 판정 |
| 6 | **Claude Code Routines 외 9종** | 공식 Anthropic 및 GitHub 오픈소스 | SESSIONS.md `[2026-04-15]` 섹션 | 패턴 흡수 완료 | Top 3 패턴 즉시 흡수 (sleep-resume/ralph-daemon/quality-gates). 나머지 7종은 회피 함정 분석 후 기각 |

### 1-B. 흡수 출처 분류

```
직접 흡수 (코드/패턴이 A-Team에 통합됨):
  - ralph-claude-code  → scripts/auto-switch/, governance/rules/quality-gates.md
  - gstack             → .claude/commands/intel.md, .claude/agents/intel-analyzer.md
  - Claude Code Routines Top 3 → sleep-resume.sh, ralph-daemon.mjs 유사 패턴

분석만 완료 (흡수 로드맵 존재, 미실행):
  - Paperclip          → docs/architecture/paperclip-cherrypick-roadmap.md

분석 완료 (흡수 없음, 기록만):
  - awesome-harness-engineering → CURRENT.md 언급만
  - Headroom           → 설치 실패로 기각

물리적 복사본 보존:
  - ralph-claude-code  → external/ralph-claude-code/ (git clone 전체)
```

---

## 2. 문제 정의

현재 구조의 문제:
1. **분산 저장**: ralph-claude-code는 `external/`에, Paperclip 로드맵은 `docs/architecture/`에, gstack 설계는 `~/.gstack/`에 흩어져 있다
2. **상태 불명확**: "분석만 완료"와 "코드 흡수 완료"가 혼재하며 단일 목록이 없다
3. **a-team 레포 오염**: 외부 원본 코드(ralph-claude-code 전체 git clone)가 a-team 메인 레포에 포함되어 있다
4. **재발견 비용**: 새 세션에서 "어떤 외부 레포를 이미 분석했는가"를 파악하려면 CURRENT.md/SESSIONS.md를 전수 검색해야 한다

---

## 3. 요구사항

### 기능적
- 외부 자산별 원본 URL, 분석 결과, 흡수 상태를 단일 위치에서 조회 가능
- 새 외부 자산 추가 시 일관된 형식으로 등록
- "이 외부 레포에서 A-Team 어디로 흡수됐는가" 추적 가능

### 비기능적
- a-team 메인 레포의 .git 히스토리 오염 방지 (외부 원본 코드 분리)
- 관리 오버헤드 최소화 (1인 운영)
- 신규 자산 추가 시 5분 이내 등록 가능한 템플릿

---

## 4. 옵션 검토

### 옵션 A: GitHub 별도 레포 (`a-team-absorbed`)

**장점**:
- a-team 메인 레포와 완전 분리
- GitHub UI에서 독립적으로 탐색 가능
- 외부 원본 코드를 git submodule 또는 직접 포함 가능

**단점**:
- 레포 추가로 관리 포인트 +1
- a-team과의 참조 링크가 URL 기반이라 오프라인 참조 불편
- `external/ralph-claude-code` 이동 시 a-team의 git 히스토리에 삭제 커밋 필요

**복잡도**: low

### 옵션 B: a-team 내 `external/` 디렉토리 구조화 (현재 구조 개선)

**장점**:
- 새 레포 불필요
- a-team 클론 하나로 모든 자산 접근 가능

**단점**:
- 외부 원본 코드가 a-team 레포에 계속 포함됨 (git 크기 증가)
- 논리적 분리 불명확

**복잡도**: low

### 옵션 C: GitHub 별도 레포 + a-team에 REGISTRY.md만 유지

**장점**:
- 완전한 물리적 분리
- a-team에는 간결한 레지스트리(링크)만 유지
- 별도 레포는 비공개 유지 가능 (분석 노트 보호)

**단점**:
- URL 링크 의존 (로컬에서 파일 직접 열기 불가)
- 두 레포 동기화 주의 필요

**복잡도**: low-medium

---

## 5. 권장안: 옵션 C (별도 레포 + a-team에 REGISTRY.md)

**선택 이유**: 외부 원본 코드와 분석 노트는 a-team 메인 레포에서 물리적으로 분리하는 것이 장기적으로 깔끔하다. a-team 레포는 REGISTRY.md 하나만 유지하여 "무엇이 어디에 있는지"를 안내하고, 실제 자산은 별도 레포에서 관리한다. 1인 운영이라 두 레포 동기화 부담은 낮다.

**수용한 트레이드오프**:
- a-team에서 외부 자산 파일을 직접 열 수 없음 (URL 클릭 필요)
- ralph-claude-code 이동 시 a-team에 삭제 커밋 1개 발생

---

## 6. 레포 구조 설계

```
a-team-absorbed/                        # GitHub: github.com/ne0cean/a-team-absorbed
  README.md                             # 레포 목적 + 사용법 (3-5줄)
  REGISTRY.md                           # 전체 자산 목록 + 상태 (마스터 인덱스)

  ralph-claude-code/
    SOURCE.md                           # 원본 URL + 버전(커밋 해시) + 수집일
    analysis.md                         # 분석 결과 요약
    cherry-pick-notes.md                # 흡수된 패턴 + A-Team 반영 위치
    _original/                          # 원본 레포 파일 (현재 external/에서 이동)

  paperclip/
    SOURCE.md
    analysis.md                         # 레드팀 + 이사회 심의 결과
    cherry-pick-roadmap.md              # 현재 docs/architecture/에서 이동

  gstack/
    SOURCE.md
    analysis.md
    design-notes/
      phase2-market-intel-2026-05-02.md # 현재 ~/.gstack/에서 이동

  awesome-harness-engineering/
    SOURCE.md
    analysis.md                         # 9카테고리 + 갭 분석 재구성

  claude-code-routines-research/        # 2026-04-15 외부 Top 10 리서치
    SOURCE.md
    analysis.md
    top3-absorbed.md                    # 흡수된 3개 패턴 상세

  _template/                            # 새 자산 추가 시 복사해서 사용
    SOURCE.md
    analysis.md
```

### SOURCE.md 표준 형식

```markdown
# SOURCE — [자산명]

- **원본 URL**: https://github.com/...
- **라이선스**: MIT / Apache-2.0 / 비공개 / 알 수 없음
- **수집일**: YYYY-MM-DD
- **버전/커밋**: [해시 또는 태그]
- **수집 방법**: git clone / 수동 다운로드 / 분석만

## 관련 A-Team 파일
- `scripts/...` — 흡수된 파일 경로
- `governance/...`

## 상태
[분석만 | 패턴 흡수 | 전면 기각 | 보류]
```

---

## 7. 실행 계획

### Phase 1: 레포 생성 + 골격 구축 (1시간)

```bash
# 1. 로컬에 디렉토리 생성
mkdir -p /Users/noir/Projects/a-team-absorbed
cd /Users/noir/Projects/a-team-absorbed
git init
git branch -M main

# 2. GitHub 비공개 레포 생성 (gh cli)
gh repo create ne0cean/a-team-absorbed \
  --private \
  --description "A-Team 외부 레포 분석/흡수 자산 저장소" \
  --source=. \
  --remote=origin

# 3. 디렉토리 골격 생성 (coder 에이전트 담당)
mkdir -p ralph-claude-code/_original
mkdir -p paperclip
mkdir -p gstack/design-notes
mkdir -p awesome-harness-engineering
mkdir -p claude-code-routines-research
mkdir -p _template
```

**생성 파일**: README.md, REGISTRY.md, _template/SOURCE.md, _template/analysis.md
**수정 파일**: 없음
**담당**: coder

### Phase 2: 기존 자산 이동 + 문서화 (2-3시간)

```bash
# ralph-claude-code 이동
cp -r /Users/noir/Projects/a-team/external/ralph-claude-code/ \
      /Users/noir/Projects/a-team-absorbed/ralph-claude-code/_original/

# paperclip 로드맵 이동 (복사 후 a-team에서는 링크 참조로 교체)
cp /Users/noir/Projects/a-team/docs/architecture/paperclip-cherrypick-roadmap.md \
   /Users/noir/Projects/a-team-absorbed/paperclip/cherry-pick-roadmap.md

# gstack 설계 문서 이동
cp /Users/noir/.gstack/projects/phase2-market-intel-2026-05-02.md \
   /Users/noir/Projects/a-team-absorbed/gstack/design-notes/
```

각 자산별 SOURCE.md + analysis.md 작성 (coder 담당).

**수정 파일 (a-team 레포)**:
- `docs/architecture/paperclip-cherrypick-roadmap.md` → 상단에 "본문은 a-team-absorbed 레포로 이동" 안내 + 링크로 교체 (또는 유지하고 REGISTRY.md에서 참조)
- `external/ralph-claude-code/` → Phase 2 이후 `git rm -r` (선택적, 사용자 판단)

**담당**: coder

### Phase 3: a-team REGISTRY.md 연결 (30분)

`/Users/noir/Projects/a-team/external/REGISTRY.md` 신규 생성.

```markdown
# 외부 자산 레지스트리

> 상세 분석 및 원본 파일: https://github.com/ne0cean/a-team-absorbed

| 자산 | 상태 | A-Team 반영 | 로드맵 |
|------|------|------------|--------|
| ralph-claude-code | 패턴 흡수 완료 | scripts/auto-switch/, quality-gates.md | — |
| paperclip | cherry-pick 로드맵 대기 | — | Phase 0-4 (10-14일) |
| gstack | 설계 흡수 완료 | commands/intel.md | — |
| awesome-harness | 분석 완료 | — | 갭: cross-session 메모리 |
| Headroom | 기각 (PyPI 미존재) | — | — |
| Claude Code Routines Top 10 | 패턴 흡수 완료 | sleep-resume.sh, ralph-daemon.mjs | — |
```

**담당**: coder

---

## 8. a-team과의 참조 방법 결정

### 선택: URL 참조 (git submodule 미사용)

**이유**: git submodule은 clone 시 `--recursive` 필요, 1인 운영에서 관리 오버헤드가 장점보다 크다. a-team에는 `external/REGISTRY.md`에 GitHub URL 링크만 유지하는 것으로 충분하다.

| 방법 | 채택 여부 | 이유 |
|------|-----------|------|
| git submodule | 미채택 | 관리 복잡도 증가, YAGNI |
| symlink | 미채택 | 다른 머신 호환 불가 |
| URL 참조 | 채택 | 단순, 충분 |

---

## 9. 레포 공개/비공개 설정

**비공개(private) 권장**.

이유:
- 분석 노트에 외부 레포의 코드/구조 요약이 포함됨 (저작권 회색지대)
- 기각 판정 이유 등 내부 의사결정 기록 포함
- a-team 메인 레포가 공개 전환 검토 중이므로 분리 관리가 안전

---

## 10. 리스크

| 리스크 | 심각도 | 완화 |
|--------|--------|------|
| ralph-claude-code `_original/` 포함 시 레포 크기 급증 | 중 | `.gitignore`로 `_original/` 제외하거나 git-lfs 사용. 또는 SOURCE.md에 URL만 기록하고 _original 미포함 |
| a-team에서 paperclip-cherrypick-roadmap.md 삭제 시 기존 CURRENT.md 참조 깨짐 | 저 | 파일 삭제 대신 상단에 "이동됨" 안내 추가. 원본 유지도 가능 |
| 두 레포 drift (REGISTRY.md 업데이트 누락) | 저 | `/end` Step에서 "새 외부 자산 흡수 시 REGISTRY.md 갱신" 체크리스트 1줄 추가 |

---

## 11. 성공 기준

1. 새 세션에서 `external/REGISTRY.md` 1파일만 읽어 모든 외부 자산 현황 파악 가능
2. 새 외부 자산 추가 시 `_template/` 복사 → 5분 이내 등록 완료
3. a-team 메인 레포에서 외부 원본 코드 전체 복사본이 제거됨 (ralph-claude-code 이동 완료 기준)

---

## 참조

- 현재 물리적 위치: `/Users/noir/Projects/a-team/external/ralph-claude-code/`
- Paperclip 로드맵: `/Users/noir/Projects/a-team/docs/architecture/paperclip-cherrypick-roadmap.md`
- gstack 설계 문서: `/Users/noir/.gstack/projects/phase2-market-intel-2026-05-02.md`
- a-team CURRENT.md: `/Users/noir/Projects/a-team/.context/CURRENT.md`
- a-team SESSIONS.md: `/Users/noir/Projects/a-team/.context/SESSIONS.md`
