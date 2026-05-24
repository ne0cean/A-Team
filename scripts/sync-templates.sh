#!/usr/bin/env bash
# sync-templates.sh — A-Team CLAUDE.md 공통 섹션 전파 도구
#
# 사용법:
#   bash sync-templates.sh --dry-run          # 변경사항 미리보기 (실제 수정 없음)
#   bash sync-templates.sh --apply            # 실제 적용 (사용자 확인 필수)
#   bash sync-templates.sh --project mole     # 특정 프로젝트만 대상
#   bash sync-templates.sh --dry-run --diff   # unified diff 형식으로 출력
#
# 주의: 이 스크립트는 기존 파일을 자동으로 덮어쓰지 않습니다.
#       --apply 플래그 + 대화형 확인이 있어야만 실제 수정됩니다.

set -euo pipefail

PROJECTS_ROOT="/Users/noir/Projects"
ATEAM_CLAUDE="$PROJECTS_ROOT/a-team/CLAUDE.md"
SCRIPT_VERSION="1.0.0"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# 플래그
DRY_RUN=true
SHOW_DIFF=false
TARGET_PROJECT=""
VERBOSE=false
INSTALL_CMD=false

# ─── 인자 파싱 ─────────────────────────────────────────────────────────────────

usage() {
  echo "사용법: $0 [옵션]"
  echo ""
  echo "옵션:"
  echo "  --dry-run           변경사항 미리보기 (기본값, 실제 수정 없음)"
  echo "  --apply             실제 적용 (대화형 확인 필요)"
  echo "  --project <name>    특정 프로젝트만 대상 (예: --project mole)"
  echo "  --diff              unified diff 형식으로 출력"
  echo "  --install           ~/.claude/commands/sync-templates.md 스킬 커맨드 설치"
  echo "  --verbose           상세 출력"
  echo "  --help              이 도움말 출력"
  echo ""
  echo "예시:"
  echo "  $0 --dry-run                     # 모든 프로젝트 드라이런"
  echo "  $0 --dry-run --diff              # diff 형식으로 미리보기"
  echo "  $0 --dry-run --project mole      # mole 프로젝트만 확인"
  echo "  $0 --apply                       # 대화형 적용"
  echo "  $0 --install                     # /sync-templates 커맨드 설치"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)   DRY_RUN=true; shift ;;
    --apply)     DRY_RUN=false; shift ;;
    --diff)      SHOW_DIFF=true; shift ;;
    --project)   TARGET_PROJECT="$2"; shift 2 ;;
    --install)   INSTALL_CMD=true; shift ;;
    --verbose)   VERBOSE=true; shift ;;
    --help|-h)   usage ;;
    *) echo "알 수 없는 옵션: $1"; usage ;;
  esac
done

# ─── --install 처리 ──────────────────────────────────────────────────────────────
# ~/.claude/commands/sync-templates.md 스킬 커맨드 설치

if [[ "$INSTALL_CMD" == true ]]; then
  COMMANDS_DIR="$HOME/.claude/commands"
  CMD_FILE="$COMMANDS_DIR/sync-templates.md"

  mkdir -p "$COMMANDS_DIR"

  cat > "$CMD_FILE" << 'CMD_EOF'
# /sync-templates — CLAUDE.md 템플릿 동기화

A-Team의 CLAUDE.md 공통 섹션을 다른 프로젝트에 전파합니다.
**항상 --dry-run 먼저 실행. 실제 적용은 사용자 확인 후.**

## 실행 절차

### Step 1: 드라이런으로 변경사항 확인
```bash
bash ~/Projects/a-team/scripts/sync-templates.sh --dry-run
```

### Step 2: diff 형식으로 상세 확인 (선택)
```bash
bash ~/Projects/a-team/scripts/sync-templates.sh --dry-run --diff
```

### Step 3: 특정 프로젝트만 확인 (선택)
```bash
bash ~/Projects/a-team/scripts/sync-templates.sh --dry-run --project <프로젝트명>
```

### Step 4: 사용자 승인 후 실제 적용
```bash
bash ~/Projects/a-team/scripts/sync-templates.sh --apply
```
각 프로젝트마다 y/N/q 선택 프롬프트가 나옵니다.

---

## 전파되는 공통 섹션

| 섹션 | 내용 |
|------|------|
| `## 핵심 원칙` | DDD, Coding Safety, Commit Format, 컨텍스트 갱신, 파일 소유권 |
| `## A-Team (글로벌 툴킷)` | a-team 정본 위치, 글로벌 명령어 위치 |
| `## A-Team 서브에이전트` | orchestrator/researcher/coder/reviewer/architect 5개 에이전트 |

---

## 절대 건드리지 않는 프로젝트별 고유 섹션

| 프로젝트 | 고유 섹션 | 이유 |
|---------|----------|------|
| t33a-remapper | `🚨 절대 금지` | ADB loopback 구조 — 2026-05-02 사고로 확정 |
| connectome | `창업자 승인 게이트` | UI/카피 3단계 체크포인트 — 기억 조작 방지 |
| longform | `🎯 프로젝트 비전` | SellPop Studio 철학 (AI 티 없는 영상) |
| do-better-workspace | `사용자 프로필`, `워크스페이스 목적` | 개인 지식관리 시스템 |
| vibe-toolkit / morning-rave | `거버넌스 로드 순서` | .agent/ 기반 워크플로우 체계 |
| cross-pc-kit | 세션 종료 로그 구조 | 복수 PC/OS 환경 전용 |
| Trading | `빌드 & 실행` | Python .venv 기반 실행 명령 |

---

## 스크립트 위치
`~/Projects/a-team/scripts/sync-templates.sh`

## 주의사항
- `--apply` 없이는 절대 파일을 수정하지 않음
- `.claude/settings.json`, `.claude/settings.local.json` 절대 건드리지 않음
- a-team 자신과 _archive는 항상 스킵
- 새 프로젝트 추가 시: 스크립트의 `PRESERVE_MARKERS` 배열 검토 후 분류 확인
CMD_EOF

  echo -e "${GREEN}[OK]${RESET}   스킬 커맨드 설치 완료: $CMD_FILE"
  echo -e "       Claude Code에서 ${BOLD}/sync-templates${RESET} 로 호출 가능"
  exit 0
fi

# ─── 공통 섹션 정의 ─────────────────────────────────────────────────────────────
# 각 프로젝트의 CLAUDE.md에 전파할 공통 블록.
# 섹션 헤더로 시작하고 다음 섹션 헤더 직전까지를 블록으로 인식.
# 프로젝트별 고유 섹션은 절대 덮어쓰지 않음.

# 전파할 공통 섹션 마커 (섹션 헤더 텍스트 기준)
COMMON_SECTIONS=(
  "## 핵심 원칙"
  "## A-Team (글로벌 툴킷)"
  "## A-Team 서브에이전트"
)

# 프로젝트별 고유 섹션 마커 — 이 섹션이 있으면 해당 섹션은 절대 건드리지 않음
PRESERVE_MARKERS=(
  "## 🚨 절대 금지"          # t33a-remapper: ADB loopback 구조
  "## 창업자 승인 게이트"     # connectome: Founder Gate
  "## 🎯 프로젝트 비전"       # longform: SellPop 비전
  "## 워크스페이스 목적"      # do-better: 개인 워크스페이스
  "## 사용자 프로필"          # do-better: Dean 프로필
  "## 거버넌스 로드 순서"     # vibe-toolkit 계열
  "## 빌드"                   # 빌드 명령 (프로젝트별 다름)
  "## 프로젝트 구조"          # 구조 설명 (프로젝트별 다름)
  "## 주요 커맨드"            # do-better 커맨드 목록
)

# ─── 공통 섹션 컨텐츠 (a-team CLAUDE.md 기반 표준화 버전) ─────────────────────
# 각 프로젝트에 주입할 섹션 컨텐츠를 here-doc으로 정의

common_section_core_principles() {
cat << 'SECTION'
## 핵심 원칙
- **DDD**: 코드 전에 문서/계획 먼저
- **Coding Safety**: 파일 전체 읽고 수정, 수정 후 빌드 검증
- **Commit Format**: `[type]: 요약` + NOW/NEXT/BLOCK 구조
- **컨텍스트 갱신**: 태스크 완료마다 CURRENT.md 갱신
- **파일 소유권 준수**: PARALLEL_PLAN.md에 명시된 영역만 수정
SECTION
}

common_section_ateam_ref() {
cat << 'SECTION'
## A-Team (글로벌 툴킷)
- **정본 위치**: `~/Projects/a-team` (독립 레포)
- `/vibe` 등 글로벌 명령어는 `~/.claude/commands/`에 symlink로 설치됨
- 복잡한 멀티에이전트 작업 시 A-Team 오케스트레이터 활용 가능
SECTION
}

common_section_ateam_agents() {
cat << 'SECTION'
## A-Team 서브에이전트
`.claude/agents/`에 5개 전문 에이전트가 설치되어 있습니다:
- **orchestrator** — 멀티에이전트 작업 총괄 (Supervisor 패턴)
- **researcher** — 리서치/조사 전문 (Haiku, 비용 효율)
- **coder** — 구현/수정 전문 (Sonnet)
- **reviewer** — 품질 검증 전문 (Sonnet)
- **architect** — 설계/아키텍처 전문 (Opus)

## 빠른 시작
복잡한 작업 → "이 작업을 A-Team으로 처리해줘" → orchestrator 자동 호출
단순 작업 → 직접 진행 (에이전트 불필요)
SECTION
}

# ─── 유틸 함수 ─────────────────────────────────────────────────────────────────

log_info()    { echo -e "${BLUE}[INFO]${RESET} $*"; }
log_ok()      { echo -e "${GREEN}[OK]${RESET}   $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }
log_change()  { echo -e "${CYAN}[DIFF]${RESET} $*"; }
log_skip()    { echo -e "${RESET}[SKIP] $*"; }

section_exists_in_file() {
  local file="$1"
  local marker="$2"
  grep -qF "$marker" "$file" 2>/dev/null
}

has_preserve_marker() {
  local file="$1"
  for marker in "${PRESERVE_MARKERS[@]}"; do
    if grep -qF "$marker" "$file" 2>/dev/null; then
      echo "$marker"
      return 0
    fi
  done
  return 1
}

# 파일에서 특정 섹션의 현재 내용 추출
extract_section() {
  local file="$1"
  local section_header="$2"
  python3 - "$file" "$section_header" << 'PYEOF'
import sys, re

filepath = sys.argv[1]
target = sys.argv[2]

with open(filepath, 'r') as f:
    content = f.read()

lines = content.split('\n')
in_section = False
result = []
section_level = 0

for i, line in enumerate(lines):
    if line.strip() == target.strip():
        in_section = True
        # 섹션 레벨 파악 (## = 2, ### = 3 등)
        section_level = len(re.match(r'^(#+)', line).group(1)) if re.match(r'^(#+)', line) else 0
        result.append(line)
        continue
    if in_section:
        # 같은 레벨 이상의 다음 헤더가 나오면 종료
        m = re.match(r'^(#+)\s', line)
        if m and len(m.group(1)) <= section_level:
            break
        result.append(line)

print('\n'.join(result))
PYEOF
}

# 프로젝트 분류
classify_project() {
  local file="$1"

  # vibe-toolkit 계열 (거버넌스 로드 순서가 있는)
  if grep -q "거버넌스 로드 순서" "$file" 2>/dev/null; then
    echo "vibe-toolkit"
    return
  fi

  # do-better-workspace: 완전히 다른 성격
  if grep -q "워크스페이스 목적\|사용자 프로필" "$file" 2>/dev/null; then
    echo "workspace"
    return
  fi

  # longform (SellPop): 비전 중심
  if grep -q "프로젝트 비전\|SellPop" "$file" 2>/dev/null; then
    echo "vision-doc"
    return
  fi

  # t33a-remapper: 하드웨어 절대금지 규칙
  if grep -q "절대 금지\|ADB loopback" "$file" 2>/dev/null; then
    echo "hardware-critical"
    return
  fi

  # mole: 극단적으로 간결한 파일
  local line_count
  line_count=$(wc -l < "$file")
  if [[ $line_count -lt 15 ]]; then
    echo "minimal"
    return
  fi

  # 표준 거버넌스 파일
  echo "standard"
}

# ─── 섹션 업데이트 로직 ─────────────────────────────────────────────────────────

# 표준 섹션을 파일에서 업데이트 (파일 내용 반환, 실제 쓰기는 호출자가 함)
compute_updated_content() {
  local file="$1"
  local project_type="$2"
  local content
  content=$(cat "$file")

  python3 - "$file" "$project_type" << 'PYEOF'
import sys, re

filepath = sys.argv[1]
project_type = sys.argv[2]

with open(filepath, 'r') as f:
    original = f.read()

content = original

# 표준 "핵심 원칙" 섹션 표준화
STANDARD_PRINCIPLES = """## 핵심 원칙
- **DDD**: 코드 전에 문서/계획 먼저
- **Coding Safety**: 파일 전체 읽고 수정, 수정 후 빌드 검증
- **Commit Format**: `[type]: 요약` + NOW/NEXT/BLOCK 구조
- **컨텍스트 갱신**: 태스크 완료마다 CURRENT.md 갱신
- **파일 소유권 준수**: PARALLEL_PLAN.md에 명시된 영역만 수정"""

# 표준 "A-Team (글로벌 툴킷)" 섹션
STANDARD_ATEAM_REF = """## A-Team (글로벌 툴킷)
- **정본 위치**: `~/Projects/a-team` (독립 레포)
- `/vibe` 등 글로벌 명령어는 `~/.claude/commands/`에 symlink로 설치됨
- 복잡한 멀티에이전트 작업 시 A-Team 오케스트레이터 활용 가능"""

# 표준 "A-Team 서브에이전트" 섹션
STANDARD_ATEAM_AGENTS = """## A-Team 서브에이전트
`.claude/agents/`에 5개 전문 에이전트가 설치되어 있습니다:
- **orchestrator** — 멀티에이전트 작업 총괄 (Supervisor 패턴)
- **researcher** — 리서치/조사 전문 (Haiku, 비용 효율)
- **coder** — 구현/수정 전문 (Sonnet)
- **reviewer** — 품질 검증 전문 (Sonnet)
- **architect** — 설계/아키텍처 전문 (Opus)

## 빠른 시작
복잡한 작업 → "이 작업을 A-Team으로 처리해줘" → orchestrator 자동 호출
단순 작업 → 직접 진행 (에이전트 불필요)"""

def replace_section(text, header, new_section):
    """헤더로 시작하는 섹션을 new_section으로 교체. 없으면 그대로."""
    # 섹션 레벨 파악
    m = re.match(r'^(#+)', header)
    if not m:
        return text
    level = len(m.group(1))

    lines = text.split('\n')
    result = []
    i = 0
    found = False

    while i < len(lines):
        line = lines[i]
        # 헤더 매치 (공백 trim 후 비교)
        if line.strip() == header.strip():
            found = True
            # 섹션 끝 탐색
            j = i + 1
            while j < len(lines):
                m2 = re.match(r'^(#+)\s', lines[j])
                if m2 and len(m2.group(1)) <= level:
                    break
                j += 1
            # new_section 삽입
            result.append(new_section)
            i = j
        else:
            result.append(line)
            i += 1

    return '\n'.join(result)

# 프로젝트 타입별 처리
if project_type in ('standard',):
    # 핵심 원칙 표준화
    if '## 핵심 원칙' in content:
        content = replace_section(content, '## 핵심 원칙', STANDARD_PRINCIPLES)

    # A-Team 참조 표준화
    if '## A-Team (글로벌 툴킷)' in content:
        content = replace_section(content, '## A-Team (글로벌 툴킷)', STANDARD_ATEAM_REF)

    # A-Team 서브에이전트 표준화
    if '## A-Team 서브에이전트' in content:
        content = replace_section(content, '## A-Team 서브에이전트', STANDARD_ATEAM_AGENTS)

elif project_type == 'minimal':
    # mole처럼 극도로 간결한 파일 — 핵심 원칙만 추가 (없으면)
    if '## 핵심 원칙' not in content:
        content = content.rstrip() + '\n\n' + STANDARD_PRINCIPLES + '\n'

elif project_type in ('hardware-critical', 'workspace', 'vision-doc', 'vibe-toolkit'):
    # 고유 성격이 강한 프로젝트 — 손대지 않음
    pass

print(content, end='')
PYEOF
}

# ─── 메인 처리 ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}=== vibe-template-sync v${SCRIPT_VERSION} ===${RESET}"
echo -e "모드: $([ "$DRY_RUN" = true ] && echo "${YELLOW}DRY-RUN (실제 변경 없음)${RESET}" || echo "${RED}APPLY (실제 파일 수정)${RESET}")"
echo ""

# 대상 프로젝트 목록 수집
if [[ -n "$TARGET_PROJECT" ]]; then
  PROJECT_DIRS=("$PROJECTS_ROOT/$TARGET_PROJECT")
else
  PROJECT_DIRS=()
  for d in "$PROJECTS_ROOT"/*/; do
    [[ -d "$d" ]] && PROJECT_DIRS+=("${d%/}")
  done
fi

# 결과 집계
declare -i TOTAL=0 UPDATED=0 SKIPPED=0 NO_CHANGE=0 ERRORS=0

echo -e "${BOLD}── 프로젝트별 분석 ──────────────────────────────────────────${RESET}"
echo ""

for proj_dir in "${PROJECT_DIRS[@]}"; do
  proj_name=$(basename "$proj_dir")
  claude_md="$proj_dir/CLAUDE.md"

  # a-team 자신은 소스이므로 스킵
  [[ "$proj_name" == "a-team" ]] && continue
  # _archive 스킵
  [[ "$proj_name" == "_archive" ]] && continue

  # CLAUDE.md 없으면 스킵
  if [[ ! -f "$claude_md" ]]; then
    [[ "$VERBOSE" == true ]] && log_skip "$proj_name (CLAUDE.md 없음)"
    continue
  fi

  TOTAL=$((TOTAL + 1))

  # 프로젝트 분류
  proj_type=$(classify_project "$claude_md")

  # 고유 섹션 보존 대상 확인
  preserve_reason=""
  if preserve_reason=$(has_preserve_marker "$claude_md"); then
    log_skip "$proj_name [${proj_type}] — 고유 섹션 보존: \"$preserve_reason\""
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # 업데이트 계산 (compute_updated_content 실패 시 원본 유지)
  original_content=$(cat "$claude_md")
  updated_content=$(compute_updated_content "$claude_md" "$proj_type" 2>/dev/null) || updated_content="$original_content"

  if [[ "$original_content" == "$updated_content" ]]; then
    log_ok "$proj_name [${proj_type}] — 변경 없음"
    NO_CHANGE=$((NO_CHANGE + 1))
    continue
  fi

  # 변경 있음
  echo -e "${CYAN}[DIFF]${RESET} ${BOLD}$proj_name${RESET} [${proj_type}]"

  if [[ "$SHOW_DIFF" == true ]]; then
    # unified diff 출력 (diff는 변경 시 exit 1 반환 — || true로 무력화)
    diff <(echo "$original_content") <(echo "$updated_content") \
      --unified=3 \
      --label "a/$proj_name/CLAUDE.md (현재)" \
      --label "b/$proj_name/CLAUDE.md (업데이트 후)" \
      | head -80 || true
    echo ""
  else
    # 변경 요약만 출력 (unified diff, grep 매치 없을 때 exit 1 → || true)
    diff_out=$(diff --unified=0 <(echo "$original_content") <(echo "$updated_content") || true)
    added=$(echo "$diff_out" | { grep '^+' || true; } | { grep -v '^+++' || true; } | wc -l | tr -d ' ')
    removed=$(echo "$diff_out" | { grep '^-' || true; } | { grep -v '^---' || true; } | wc -l | tr -d ' ')
    echo "  +${added} / -${removed} 라인"
  fi

  UPDATED=$((UPDATED + 1))

  # --apply 모드에서 실제 적용
  if [[ "$DRY_RUN" == false ]]; then
    echo -ne "  이 파일을 업데이트하시겠습니까? [y/N/q] "
    read -r answer
    case "$answer" in
      y|Y)
        echo "$updated_content" > "$claude_md"
        log_ok "  $claude_md 업데이트 완료"
        ;;
      q|Q)
        echo "중단합니다."
        break
        ;;
      *)
        log_warn "  건너뜀"
        ;;
    esac
  fi
done

# ─── 요약 ───────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}── 요약 ─────────────────────────────────────────────────────${RESET}"
echo -e "  전체 프로젝트: $TOTAL"
echo -e "  ${CYAN}변경 필요${RESET}:    $UPDATED"
echo -e "  ${GREEN}변경 없음${RESET}:    $NO_CHANGE"
echo -e "  ${YELLOW}스킵 (보존)${RESET}: $SKIPPED"
[[ $ERRORS -gt 0 ]] && echo -e "  ${RED}오류${RESET}:        $ERRORS"
echo ""

if [[ "$DRY_RUN" == true && $UPDATED -gt 0 ]]; then
  echo -e "${YELLOW}DRY-RUN 완료. 실제 적용하려면:${RESET}"
  echo -e "  bash scripts/sync-templates.sh --apply"
  echo ""
fi

# ─── 프로젝트별 고유 섹션 목록 ─────────────────────────────────────────────────

echo -e "${BOLD}── 보존된 프로젝트별 고유 섹션 ────────────────────────────────${RESET}"
echo ""
echo -e "  ${BOLD}t33a-remapper${RESET}"
echo "  └─ '🚨 절대 금지': ADB loopback 구조 변경 금지 (2026-05-02 사고로 확정)"
echo "  └─ '거버넌스 로드 순서': .agent/ 워크플로우 체계"
echo ""
echo -e "  ${BOLD}connectome${RESET}"
echo "  └─ '창업자 승인 게이트': UI/카피 3단계 체크포인트, 기억 조작 금지"
echo ""
echo -e "  ${BOLD}longform (SellPop Studio)${RESET}"
echo "  └─ '🎯 프로젝트 비전': AI 티 없는 고품질 롱폼 영상 제작 철학"
echo "  └─ '🚫 하지 말 것': 품질 게이트 (더미 이미지/TTS 결과물 금지)"
echo ""
echo -e "  ${BOLD}do-better-workspace${RESET}"
echo "  └─ '사용자 프로필': Dean, 회사원+빌더 역할"
echo "  └─ '워크스페이스 목적': 제2의 뇌 개념, 폴더 구조"
echo "  └─ '주요 커맨드': /daily-note, /thinking-partner 등 워크스페이스 전용"
echo ""
echo -e "  ${BOLD}vibe-toolkit / morning-rave${RESET}"
echo "  └─ '거버넌스 로드 순서': .agent/ 기반 워크플로우 (vibe-rules.md 등)"
echo "  └─ 'Memory System': memory/MEMORY.md 자동 로드 체계"
echo ""
echo -e "  ${BOLD}cross-pc-kit${RESET}"
echo "  └─ 세션 종료 시 SESSIONS.md 로그: 복수 PC/OS 환경 맥락 유실 방지"
echo ""
echo -e "  ${BOLD}Trading${RESET}"
echo "  └─ '빌드 & 실행': PYTHONPATH .venv 기반 bot 실행 명령 (Python 특화)"
echo ""
