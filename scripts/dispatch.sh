#!/bin/bash
# dispatch.sh — 멀티터미널 디스패치 셋업 + 명령어 생성
#
# Usage: dispatch.sh <parallel-plan-path> [options]
#   --permission-mode <mode>  권한 모드 (기본: acceptEdits)
#   --dry-run                 worktree 생성 없이 명령어만 출력
#   --model <model>           기본 모델 (기본: sonnet)
#
# 기능:
#   1. PARALLEL_PLAN.md에서 에이전트 구성 테이블 파싱
#   2. 에이전트별 git worktree 생성
#   3. DISPATCH_PROMPT.md 템플릿 기반 프롬프트 생성
#   4. 터미널별 실행 명령어 출력

set -euo pipefail

# ── 색상 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── 인자 파싱 ──
PLAN_PATH=""
PERMISSION_MODE="auto"
DRY_RUN=false
DEFAULT_MODEL="sonnet"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --permission-mode) PERMISSION_MODE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --model) DEFAULT_MODEL="$2"; shift 2 ;;
    -*) echo "Unknown option: $1"; exit 1 ;;
    *) PLAN_PATH="$1"; shift ;;
  esac
done

if [[ -z "$PLAN_PATH" ]]; then
  echo -e "${RED}Error: PARALLEL_PLAN.md 경로를 지정하세요${NC}"
  echo "Usage: dispatch.sh <parallel-plan-path> [--permission-mode <mode>] [--dry-run]"
  exit 1
fi

if [[ ! -f "$PLAN_PATH" ]]; then
  echo -e "${RED}Error: $PLAN_PATH 파일을 찾을 수 없습니다${NC}"
  exit 1
fi

# ── 프로젝트 루트 감지 ──
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [[ -z "$PROJECT_ROOT" ]]; then
  echo -e "${RED}Error: git 저장소가 아닙니다${NC}"
  exit 1
fi

MAIN_BRANCH=$(git rev-parse --abbrev-ref HEAD)
WORKTREE_BASE="$PROJECT_ROOT/.claude/worktrees"
DISPATCH_DIR="$PROJECT_ROOT/.context/dispatch"
SIGNAL_DIR="$PROJECT_ROOT/.context/signals"

# ── A-Team 템플릿 경로 감지 ──
ATEAM_DIR=""
if [[ -d "$PROJECT_ROOT/A-Team" ]]; then
  ATEAM_DIR="$PROJECT_ROOT/A-Team"
elif [[ -d "$HOME/tools/A-Team" ]]; then
  ATEAM_DIR="$HOME/tools/A-Team"
elif [[ -f "$PROJECT_ROOT/templates/DISPATCH_PROMPT.md" ]]; then
  ATEAM_DIR="$PROJECT_ROOT"
fi

TEMPLATE_PATH="${ATEAM_DIR:+$ATEAM_DIR/templates/DISPATCH_PROMPT.md}"
if [[ -z "$TEMPLATE_PATH" || ! -f "$TEMPLATE_PATH" ]]; then
  echo -e "${YELLOW}Warning: DISPATCH_PROMPT.md 템플릿을 찾을 수 없습니다. 기본 프롬프트 사용.${NC}"
  TEMPLATE_PATH=""
fi

# ── 에이전트 파싱 ──
# PARALLEL_PLAN.md 에이전트 구성 테이블에서 파싱
# 형식: | 에이전트명 | 모델 | 역할 | 집중 영역 |
parse_agents() {
  local agents=()
  local in_table=false
  local header_skipped=false

  while IFS= read -r line; do
    # "에이전트 구성" 테이블 감지
    if [[ "$line" =~ "## 에이전트 구성" ]]; then
      in_table=true
      continue
    fi

    # 다음 ## 섹션에서 종료
    if $in_table && [[ "$line" =~ ^## && ! "$line" =~ "에이전트 구성" ]]; then
      break
    fi

    if $in_table; then
      # 헤더 행과 구분선 스킵
      if [[ "$line" =~ ^\|.*에이전트 ]] || [[ "$line" =~ ^\|-+ ]]; then
        header_skipped=true
        continue
      fi

      # Leader/orchestrator 행 스킵
      if [[ "$line" =~ Leader|orchestrator|Orchestrator ]]; then
        continue
      fi

      # 데이터 행 파싱
      if $header_skipped && [[ "$line" =~ ^\| ]]; then
        local name=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
        local model=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
        local role=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $4); print $4}')

        if [[ -n "$name" && "$name" != "" ]]; then
          # 모델명 정규화
          case "$model" in
            *[Ss]onnet*) model="sonnet" ;;
            *[Oo]pus*)   model="opus" ;;
            *[Hh]aiku*)  model="haiku" ;;
            *)           model="$DEFAULT_MODEL" ;;
          esac

          agents+=("${name}|${model}|${role}")
        fi
      fi
    fi
  done < "$PLAN_PATH"

  printf '%s\n' "${agents[@]}"
}

# ── 파일 소유권 파싱 ──
parse_file_ownership() {
  local agent_name="$1"
  local in_section=false
  local files=()

  while IFS= read -r line; do
    # "### {agent_name} 파일 소유권" 감지
    if [[ "$line" =~ "### $agent_name" && "$line" =~ "소유권" ]]; then
      in_section=true
      continue
    fi

    # 다음 ### 섹션에서 종료
    if $in_section && [[ "$line" =~ ^### ]]; then
      break
    fi

    if $in_section && [[ "$line" =~ ^- ]]; then
      local file=$(echo "$line" | sed 's/^- `\(.*\)`.*/\1/' | sed 's/^- //')
      files+=("$file")
    fi
  done < "$PLAN_PATH"

  printf '%s\n' "${files[@]}"
}

# ── 태스크 파싱 ──
parse_tasks() {
  local agent_name="$1"
  local in_section=false
  local tasks=""

  while IFS= read -r line; do
    if [[ "$line" =~ "### $agent_name" && ! "$line" =~ "소유권" ]]; then
      in_section=true
      continue
    fi

    if $in_section && [[ "$line" =~ ^### ]]; then
      break
    fi

    if $in_section; then
      tasks+="$line"$'\n'
    fi
  done < "$PLAN_PATH"

  echo "$tasks"
}

# ── 디렉토리 준비 ──
setup_directories() {
  mkdir -p "$WORKTREE_BASE"
  mkdir -p "$DISPATCH_DIR"
  mkdir -p "$SIGNAL_DIR"

  # .gitignore에 dispatch 관련 경로 추가 (중복 방지)
  local gitignore="$PROJECT_ROOT/.gitignore"
  if [[ -f "$gitignore" ]]; then
    grep -q ".context/dispatch/" "$gitignore" 2>/dev/null || echo ".context/dispatch/" >> "$gitignore"
    grep -q ".context/signals/" "$gitignore" 2>/dev/null || echo ".context/signals/" >> "$gitignore"
    grep -q ".claude/worktrees/" "$gitignore" 2>/dev/null || echo ".claude/worktrees/" >> "$gitignore"
  fi
}

# ── Worktree 생성 ──
create_worktree() {
  local name="$1"
  local worktree_path="$WORKTREE_BASE/dispatch-${name}"
  local branch_name="dispatch/${name}"

  if [[ -d "$worktree_path" ]]; then
    echo -e "${YELLOW}  worktree 이미 존재: $worktree_path (재사용)${NC}"
    return 0
  fi

  # 브랜치가 이미 있으면 삭제 후 재생성
  if git show-ref --verify --quiet "refs/heads/$branch_name" 2>/dev/null; then
    git branch -D "$branch_name" 2>/dev/null || true
  fi

  git worktree add "$worktree_path" -b "$branch_name" 2>/dev/null
  echo -e "${GREEN}  worktree 생성: $worktree_path (branch: $branch_name)${NC}"
}

# ── 프롬프트 생성 ──
generate_prompt() {
  local name="$1"
  local model="$2"
  local role="$3"
  local output_path="$DISPATCH_DIR/${name}.md"

  # 소유 파일
  local owned_files=$(parse_file_ownership "$name")
  if [[ -z "$owned_files" ]]; then
    owned_files="(PARALLEL_PLAN.md에서 확인)"
  fi

  # 태스크
  local tasks=$(parse_tasks "$name")
  if [[ -z "$tasks" ]]; then
    tasks="(PARALLEL_PLAN.md에서 $name 섹션 참조)"
  fi

  # 프로젝트 이름
  local project_name=$(basename "$PROJECT_ROOT")

  # 빌드 명령 (CLAUDE.md에서 추출 시도)
  local build_cmd="npm run build"
  if [[ -f "$PROJECT_ROOT/CLAUDE.md" ]]; then
    local extracted=$(grep -A1 "빌드" "$PROJECT_ROOT/CLAUDE.md" 2>/dev/null | grep -oP '`[^`]+`' | head -1 | tr -d '`')
    [[ -n "$extracted" ]] && build_cmd="$extracted"
  fi

  # 템플릿 기반 생성
  cat > "$output_path" << PROMPT
# 디스패치 미션 — ${name}

> A-Team orchestrator가 자동 생성한 프롬프트입니다.
> 당신은 독립 터미널의 git worktree에서 실행 중입니다.
> 다른 에이전트가 동시에 다른 worktree에서 작업 중일 수 있습니다.

## 미션

역할: ${role}

${tasks}

## 프로젝트 컨텍스트

- 프로젝트: ${project_name}
- 메인 워킹 디렉토리: ${PROJECT_ROOT}
- 메인 브랜치: ${MAIN_BRANCH}
- 작업 브랜치: dispatch/${name}
- PARALLEL_PLAN: ${PLAN_PATH}

## 파일 소유권 (엄격 준수)

### 수정 가능 (내 소유)
${owned_files}

### 수정 금지
PARALLEL_PLAN.md에 명시된 다른 에이전트의 소유 파일은 절대 수정하지 마세요.
소유권 위반 시 머지 충돌이 발생합니다.

## 거버넌스 규칙

- 파일 전체 읽기 → 수정 → 빌드 검증 (순서 변경 금지)
- 빌드 명령: \`${build_cmd}\`
- 빌드 실패 2회 → BLOCKED 상태로 중단
- 보안 키워드(auth/crypto/sql/token) 관련 수정 → DONE_WITH_CONCERNS
- 과도한 추상화 금지 — 요청된 것만 구현
- 기존 코드 스타일 100% 따름

## 시작 시 행동

1. 이 프롬프트를 정독
2. PARALLEL_PLAN.md를 읽어 전체 작업 맥락 파악
3. 소유 파일 영역 확인 후 작업 시작

## 완료 시 자동 행동 (반드시 순서대로 실행)

### Step 1: 빌드 검증
\`\`\`bash
${build_cmd}
\`\`\`

### Step 2: 소유 파일만 스테이징 + 커밋
\`\`\`bash
git add -A
git commit -m "[type]: ${name} 태스크 완료

NOW: [완료 내용]
NEXT: orchestrator 머지 대기
BLOCK: 없음"
\`\`\`

### Step 3: 완료 시그널 생성
\`\`\`bash
touch ${SIGNAL_DIR}/${name}.done
\`\`\`

### Step 4: 완료 보고
아래 JSON 형식으로 최종 출력 후 세션을 종료합니다:
\`\`\`json
{
  "task_id": "${name}",
  "agent": "${name}",
  "status": "DONE | DONE_WITH_CONCERNS | BLOCKED",
  "summary": "[한 문장 요약]",
  "files_modified": ["[파일 목록]"],
  "build_result": "passed | failed",
  "branch": "dispatch/${name}",
  "signal": "${SIGNAL_DIR}/${name}.done"
}
\`\`\`

## BLOCKED 시 행동

빌드 2회 실패 또는 진행 불가 시:
1. 현재 상태 커밋 (WIP)
2. 블록 시그널 생성: \`echo "BLOCKED: [사유]" > ${SIGNAL_DIR}/${name}.blocked\`
3. BLOCKED JSON 출력 후 세션 종료
PROMPT

  echo -e "${GREEN}  프롬프트 생성: $output_path${NC}"
}

# ── 메인 실행 ──
echo -e "${BOLD}═══ A-Team Dispatch Setup ═══${NC}"
echo -e "Plan: $PLAN_PATH"
echo -e "Project: $PROJECT_ROOT"
echo ""

# 에이전트 파싱
mapfile -t AGENTS < <(parse_agents)

if [[ ${#AGENTS[@]} -eq 0 ]]; then
  echo -e "${RED}Error: PARALLEL_PLAN.md에서 에이전트를 찾을 수 없습니다${NC}"
  echo "에이전트 구성 테이블이 올바른 형식인지 확인하세요."
  exit 1
fi

echo -e "${CYAN}감지된 에이전트: ${#AGENTS[@]}개${NC}"

# 디렉토리 준비
if ! $DRY_RUN; then
  setup_directories
fi

# 이전 시그널 정리
if ! $DRY_RUN; then
  rm -f "$SIGNAL_DIR"/*.done "$SIGNAL_DIR"/*.blocked 2>/dev/null || true
fi

# permission mode 허용목록 검증
ALLOWED_MODES="auto bypassPermissions acceptEdits plan"
if ! echo "$ALLOWED_MODES" | grep -qw "$PERMISSION_MODE"; then
  echo -e "${RED}Error: 유효하지 않은 permission mode: $PERMISSION_MODE${NC}"
  echo "허용: $ALLOWED_MODES"
  exit 1
fi

# auto mode 가용성 체크 (dispatch.sh는 쉘이므로 별도 검증)
if [[ "$PERMISSION_MODE" == "auto" ]]; then
  CLAUDE_BIN=$(command -v claude 2>/dev/null || echo "claude")
  if ! "$CLAUDE_BIN" --help 2>&1 | grep -q 'permission-mode.*auto\|auto.*permission'; then
    echo -e "${YELLOW}Warning: auto mode 미지원 — bypassPermissions로 폴백${NC}"
    PERMISSION_MODE="bypassPermissions"
  fi
fi

# 결정된 permission mode를 하위 프로세스에 전파
export CLAUDE_PERMISSION_MODE="$PERMISSION_MODE"

# 에이전트별 처리
TERMINAL_NUM=1
echo ""
echo -e "${BOLD}═══ Worktree + 프롬프트 생성 ═══${NC}"

for agent_entry in "${AGENTS[@]}"; do
  IFS='|' read -r name model role <<< "$agent_entry"
  echo -e "\n${CYAN}[$name] model=$model role=$role${NC}"

  if ! $DRY_RUN; then
    create_worktree "$name"
    generate_prompt "$name" "$model" "$role"
  fi

  TERMINAL_NUM=$((TERMINAL_NUM + 1))
done

# 실행 명령어 출력
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  아래 명령어를 각 터미널에 붙여넣으세요${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo ""

TERMINAL_NUM=1
for agent_entry in "${AGENTS[@]}"; do
  IFS='|' read -r name model role <<< "$agent_entry"
  local_worktree="$WORKTREE_BASE/dispatch-${name}"
  local_prompt="$DISPATCH_DIR/${name}.md"

  echo -e "${YELLOW}═══ Terminal ${TERMINAL_NUM}: ${name} (${role}) ═══${NC}"
  echo ""
  echo "cd \"${local_worktree}\" && claude --model \"${model}\" --permission-mode \"${PERMISSION_MODE}\" --name \"dispatch-${name}\" \"\$(cat '${local_prompt}')\""
  echo ""

  TERMINAL_NUM=$((TERMINAL_NUM + 1))
done

# 머지 안내
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  모든 에이전트 완료 후${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "상태 확인:"
echo "  bash ${ATEAM_DIR:-$PROJECT_ROOT}/scripts/merge-dispatch.sh --check"
echo ""
echo -e "머지 실행:"
echo "  bash ${ATEAM_DIR:-$PROJECT_ROOT}/scripts/merge-dispatch.sh --merge"
echo ""
echo -e "정리:"
echo "  bash ${ATEAM_DIR:-$PROJECT_ROOT}/scripts/merge-dispatch.sh --cleanup"
