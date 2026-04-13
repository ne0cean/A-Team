# A-Team Sovereignty — 독립성 & 계층 규칙

> **A-Team은 어떤 프로젝트의 하위도 아니다. 프로젝트가 A-Team을 "용병처럼" 호출해 쓰는 관계.**

---

## 제1원칙: 단방향 의존 (A-Team ← Projects)

```
┌─────────────────────────────────────────┐
│  A-Team (~/tools/A-Team)                │  ← 주권 레포 (Sovereign)
│  github.com/ne0cean/A-Team              │     · 독립 버전 관리
│  master 브랜치 = Source of Truth        │     · 프로젝트 비의존
└─────────────────────────────────────────┘
              ▲        ▲        ▲
              │        │        │  호출만 (단방향)
              │        │        │
      ┌───────┴──┐ ┌───┴────┐ ┌─┴──────┐
      │Project A │ │Project │ │Project │
      │(connect- │ │   B    │ │   C    │  ← 소비자 (Consumer)
      │ ome 등)  │ │        │ │        │     · A-Team을 "용병"으로 호출
      └──────────┘ └────────┘ └────────┘     · 자체 코드베이스에 A-Team 로직 넣지 않음
```

**금지 사항**:
- ❌ 프로젝트 레포 안에 A-Team 원본 소스를 넣는 것 (서브모듈, 서브트리, 복붙 모두 금지)
- ❌ 프로젝트 작업 중 A-Team 파일을 프로젝트 경로에서 직접 수정하는 것
- ❌ "이 프로젝트에서만 쓸" A-Team 변형/fork 생성
- ❌ A-Team 커맨드/에이전트/스킬을 프로젝트 .claude/ 하위에 override로 덮어쓰는 것

**허용 사항**:
- ✅ 프로젝트에서 A-Team 커맨드/스킬 **호출** (`/vibe`, `/end` 등)
- ✅ 프로젝트 CLAUDE.md에 A-Team 참조 경로 명시 (`~/tools/A-Team`)
- ✅ 프로젝트 `.claude/settings.json`에 A-Team hook 경로 참조 (심볼릭 링크 또는 절대경로)
- ✅ 프로젝트별 **설정**은 프로젝트 안에 (예: 프로젝트 고유 agent prompt)

---

## 제2원칙: 최신성은 A-Team에서만 갱신

**룰**: A-Team 관련 변경은 **반드시 `~/tools/A-Team`에서 시작**한다.

```
(올바른 순서)
1. ~/tools/A-Team 에서 편집
2. ~/tools/A-Team 에서 커밋 + push (github.com/ne0cean/A-Team)
3. 프로젝트에서는 pull / install-commands.sh 로 반영
```

```
(금지 순서 — 이미 3회+ 지적된 안티패턴)
1. 프로젝트/.claude/ 에서 A-Team 커맨드 수정
2. 프로젝트 커밋
3. A-Team 레포에 반영 안 됨 → drift 발생 → 다른 프로젝트는 옛 버전 사용
```

**예외 없음**: "빨리 고쳐야 해서 프로젝트에서 먼저 고침"도 금지. 반드시 A-Team 먼저.

---

## 제3원칙: 경로로 주권 확인 (Path Sovereignty Check)

A-Team 파일을 수정하기 전에 **반드시 경로를 검증**한다:

```bash
# 올바른 A-Team 작업 경로
pwd   # → /c/Users/SKTelecom/tools/A-Team 또는 절대경로 ~/tools/A-Team

# 주권 영역 확인
git remote -v   # → github.com/ne0cean/A-Team
git rev-parse --show-toplevel   # → .../tools/A-Team

# 금지 경로 예시
# /Desktop/Dev Projects/connectome/A-Team   ← 프로젝트 하위, 편집 금지
# /Desktop/Dev Projects/*/A-Team            ← 모든 프로젝트 하위 경로 금지
```

**Claude Code 세션이 프로젝트 CWD에 묶여 있을 때**:
- A-Team 파일 편집은 **절대경로로** (`c:/Users/SKTelecom/tools/A-Team/...`)
- Bash 호출은 `cd ~/tools/A-Team && ...` 로 명시적 이동
- 프로젝트 내 `A-Team/` 서브디렉토리가 있다면 그것은 **읽기 전용 스냅샷** (편집 금지)

---

## 제4원칙: 연구/문서도 A-Team 내부에 귀속

A-Team 최적화 리서치, RFC, 레슨런드, 회고 등 **A-Team 자체에 관한 모든 산출물**은:

- 위치: `~/tools/A-Team/docs/`
- 커밋 대상: A-Team 레포
- **절대 프로젝트 레포(connectome 등)에 남기지 않음**

이 규칙을 위반한 문서가 발견되면 즉시 A-Team으로 옮기고 원본 경로는 삭제한다.

---

## 제5원칙: 배포는 pull 기반

프로젝트가 A-Team 최신을 받는 방법은 **오직 pull**:

```bash
cd ~/tools/A-Team && git pull
bash ~/tools/A-Team/scripts/install-commands.sh   # ~/.claude/commands/ 갱신
# 프로젝트 CLAUDE.md가 ~/tools/A-Team 을 참조하므로 자동 적용
```

push는 A-Team 레포로만. 프로젝트에서 A-Team 변경을 push하는 역방향 금지.

---

## 제6원칙: 충돌 시 A-Team 우선

어떤 이유로 프로젝트 하위 A-Team 사본과 원본이 divergent해졌다면:
- **원본(`~/tools/A-Team`)이 Source of Truth**
- 프로젝트 사본은 재생성 (덮어쓰기)
- 프로젝트에만 있던 "유용한 변경"이 있다면 → 원본에 포팅 후 프로젝트 사본 삭제

---

## 제7원칙: 중앙집중 + 양방향 싱크 (Central Hub Contract)

**A-Team 레포(`~/tools/A-Team` / `github.com/ne0cean/A-Team`)는 유일한 중앙 허브.**

```
                  ┌──────────────────────┐
                  │   A-Team GitHub       │  ← 중앙 허브 (Single Source of Truth)
                  │   github.com/         │     · 모든 최신 업데이트 수렴
                  │   ne0cean/A-Team      │     · 이 레포만 직접 편집
                  └──────────▲──┬─────────┘
                             │  │
            ┌────────────────┘  └───────────────┐
            │ push (upstream)      pull (downstream)
            │ (발견/개선 즉시)      (최신 상태 주기 동기화)
            │                                    │
    ┌───────┴───────┐                   ┌────────▼──────┐
    │  작업 중 발견된 │                   │ 프로젝트 사본 │
    │  A-Team 개선안 │                   │ (connectome 등)│
    │  (프로젝트에서)│                   │ 읽기 전용 사용 │
    └────────────────┘                   └───────────────┘
```

### 양방향 싱크 계약

**Downstream (A-Team → Project)**: 프로젝트는 **pull만**
```bash
cd ~/tools/A-Team && git pull                     # 최신 받기
bash ~/tools/A-Team/scripts/install-commands.sh   # 커맨드 동기화
# 프로젝트는 ~/tools/A-Team 참조하므로 자동 적용
```
주기: 세션 시작(/vibe) + 주 1회 (Stage 10 weekly cron) + 수동 trigger

**Upstream (Project → A-Team)**: 프로젝트 작업 중 A-Team 관련 개선 발견 시 **즉시 A-Team 레포에 반영 + push**
```bash
# 프로젝트 작업 중 A-Team 개선 아이디어 발생
# (예: 새 hook 패턴, 효율적 서브에이전트 프롬프트, 버그 발견)

# 금지: 프로젝트 로컬에서 수정 → 프로젝트에 커밋
# 필수:
cd ~/tools/A-Team                                  # 먼저 이동
<변경 반영>
cd ~/tools/A-Team && git commit -m "..." && git push  # 즉시 upstream
cd <원래 프로젝트> && <작업 계속>
```

### 트리거 조건 (Upstream push 필수 케이스)
- 새로운 slash command / skill / subagent 설계
- 기존 커맨드의 버그 수정
- 프롬프트 개선 / 성능 튜닝
- 레슨런드 (실패/성공 교훈, docs/ 에 기록)
- Hook 개선
- 새 governance rule
- 도구/스크립트 개선

### 금지 (Drift 유발 안티패턴)
- ❌ 프로젝트 사본에서 A-Team 파일 직접 편집 → 프로젝트 커밋
- ❌ 프로젝트 전용 fork (예: `my-project/.claude/my-ateam/`)
- ❌ A-Team 변경을 "나중에 정리하자" 미루기
- ❌ 프로젝트 레포에 A-Team 레슨런드 기록 (docs/는 A-Team에만)

### 자동화 (Stage 10 이후)
- Weekly cron: A-Team 최신 pull + 로컬 적용 + 변경 감지 시 리포트
- 프로젝트 `/end` 훅: A-Team 관련 변경 감지 시 upstream 누락 경고

---

## Enforcement

- 세션 시작 시 이 문서 참조 (CLAUDE.md에서 로드)
- Claude가 A-Team 파일 수정하려 할 때, 경로가 `~/tools/A-Team`이 아니면 **즉시 중단**하고 사용자에게 보고
- 메모리 기록: `feedback_ateam_work_location.md`, `feedback_ateam_sync.md` 와 일관

---

## Why (이 규칙이 있는 이유)

1. **Drift 방지**: 여러 프로젝트가 A-Team을 각자 수정하면 버전이 분열 → 어느 게 최신인지 모름
2. **재사용성 유지**: A-Team이 프로젝트 지식에 오염되면 다른 프로젝트에서 못 씀
3. **레슨런드 집적**: 모든 경험이 한 곳에 쌓여야 미래 Claude 세션이 참조 가능
4. **책임 명확화**: A-Team 이슈는 A-Team 레포 issue로, 프로젝트 이슈는 프로젝트 레포로

---

**Last updated**: 2026-04-13 (제7원칙 Central Hub 추가)
**Related**: `CLAUDE.md`, `governance/rules/sync-and-commit.md`, `governance/rules/mirror-sync.md`

---

## 요약 (1줄)
> **A-Team은 중앙 허브. 모든 개선은 A-Team 레포에 먼저 push. 프로젝트는 pull만.**
