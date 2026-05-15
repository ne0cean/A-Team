#!/usr/bin/env bash
# A-Team PPT Wizard — gum 기반 인터랙티브 생성기
# 사용: bash scripts/ppt/ppt-wizard.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$(command -v python3 2>/dev/null || command -v python 2>/dev/null || \
  ls /c/Users/*/AppData/Local/Programs/Python/Python31*/python.exe 2>/dev/null | head -1)"

# ── gum 설치 확인 & 자동 설치 ────────────────────────────────
GUM_BIN_DIR="/c/Users/$USERNAME/bin"

ensure_gum() {
  # PATH에 ~/bin 추가 (gum이 거기 있을 수 있음)
  export PATH="$PATH:$GUM_BIN_DIR"

  if command -v gum &>/dev/null; then return; fi

  echo "gum을 설치합니다 (GitHub Releases)..."
  mkdir -p "$GUM_BIN_DIR"

  local ver
  ver=$(curl -sf "https://api.github.com/repos/charmbracelet/gum/releases/latest" \
        | grep -o '"tag_name": "[^"]*"' | grep -o 'v[0-9.]*' | head -1)
  ver="${ver:-v0.17.0}"

  local zip="/tmp/gum_${ver}.zip"
  curl -sL "https://github.com/charmbracelet/gum/releases/download/${ver}/gum_${ver#v}_Windows_x86_64.zip" \
    -o "$zip"
  unzip -q "$zip" "gum_${ver#v}_Windows_x86_64/gum.exe" -d /tmp/gum_dl/
  mv "/tmp/gum_dl/gum_${ver#v}_Windows_x86_64/gum.exe" "$GUM_BIN_DIR/gum.exe"
  rm -rf /tmp/gum_dl "$zip"

  if ! command -v gum &>/dev/null; then
    echo "오류: gum 설치 실패. 수동 설치: https://github.com/charmbracelet/gum/releases"
    exit 1
  fi
  echo "gum ${ver} 설치 완료."
}

# ── 스타일 상수 ───────────────────────────────────────────────
BORDER_STYLE="--border rounded --border-foreground 240 --padding '0 1'"
HEADER_STYLE="--foreground 136 --bold"
HINT_STYLE="--foreground 238"
CHOSEN_STYLE="--foreground 75 --bold"

header() {
  local step="$1" title="$2" hint="${3:-}"
  clear
  gum style \
    --border rounded --border-foreground 240 \
    --padding "0 2" --margin "1 0" \
    "$(gum style --foreground 244 'A-Team  PPT 생성')"

  # 진행 도트
  local dots=""
  for i in 1 2 3 4; do
    if [ "$i" -lt "$step" ]; then
      dots+="$(gum style --foreground 46 '●')  "
    elif [ "$i" -eq "$step" ]; then
      dots+="$(gum style --foreground 75 '●')  "
    else
      dots+="$(gum style --foreground 238 '○')  "
    fi
  done
  echo "  $dots"
  gum style --foreground 244 "  Step $step / 4"
  echo ""
  gum style --bold "  $title"
  [ -n "$hint" ] && gum style --foreground 238 "  $hint"
  echo ""
}

# ── Wizard 단계 ───────────────────────────────────────────────

# Step 1: 주제
header 1 "어떤 내용의 PPT인가요?" "제목이 구체적일수록 슬라이드 내용이 정교해집니다."
TOPIC=$(gum input \
  --placeholder "예: Q1 영업 성과 보고 / Series A 투자 제안서" \
  --prompt "  주제 › " \
  --prompt.foreground "136" \
  --width 60)

if [ -z "$TOPIC" ]; then
  echo "주제를 입력해주세요."; exit 1
fi

# Step 2: 발표 유형
header 2 "어떤 목적의 발표인가요?" ""
PTYPE=$(gum choose \
  --header "  발표 유형 선택 (↑↓ 이동, Enter 확정)" \
  --header.foreground "244" \
  --selected.foreground "75" \
  --selected.bold \
  --cursor "  › " \
  --cursor.foreground "136" \
  "보고형  — 실적·현황·결과 보고" \
  "기획형  — 제안·계획·전략 수립" \
  "교육형  — 내부 교육·온보딩·설명" \
  "설득형  — 투자 유치·경영진 승인")

# 값 추출 (앞 단어만)
PTYPE_VAL=$(echo "$PTYPE" | awk '{print $1}')

# Step 3: 청중
header 3 "누가 보는 PPT인가요?" "여러 명이면 쉼표로 구분해 직접 입력하세요."
AUDIENCE=$(gum choose \
  --header "  청중 선택 (↑↓ 이동, Enter 확정)" \
  --header.foreground "244" \
  --selected.foreground "75" \
  --selected.bold \
  --cursor "  › " \
  --cursor.foreground "136" \
  "임원진" \
  "팀원" \
  "외부 고객" \
  "투자자" \
  "전체" \
  "직접 입력")

if [ "$AUDIENCE" = "직접 입력" ]; then
  AUDIENCE=$(gum input \
    --placeholder "예: 개발팀, 파트너사" \
    --prompt "  청중 › " \
    --prompt.foreground "136" \
    --width 40)
fi

# Step 4: 슬라이드 수
header 4 "슬라이드 몇 장으로 만들까요?" "10장이 기본값입니다."
SLIDES_CHOICE=$(gum choose \
  --header "  슬라이드 수 선택" \
  --header.foreground "244" \
  --selected.foreground "75" \
  --selected.bold \
  --cursor "  › " \
  --cursor.foreground "136" \
  " 8장  (간결)" \
  "10장  (기본)" \
  "12장  (표준)" \
  "15장  (상세)")

SLIDES=$(echo "$SLIDES_CHOICE" | grep -o '[0-9]\+')

# ── 검토 화면 ────────────────────────────────────────────────
clear
gum style \
  --border rounded --border-foreground 46 \
  --padding "1 3" --margin "1 0" \
  "$(gum style --foreground 46 --bold '검토')" \
  "" \
  "$(gum style --foreground 136 '주제      ')  $TOPIC" \
  "$(gum style --foreground 136 '유형      ')  $PTYPE_VAL" \
  "$(gum style --foreground 136 '청중      ')  $AUDIENCE" \
  "$(gum style --foreground 136 '슬라이드  ')  ${SLIDES}장" \
  "$(gum style --foreground 136 '테마      ')  dark_editorial (기본)"

echo ""
gum confirm "  이대로 생성할까요?" \
  --prompt.foreground "244" \
  --selected.background "24" \
  || { echo "  취소됨."; exit 0; }

# ── 생성 ────────────────────────────────────────────────────
echo ""
gum spin --spinner dot --title "  PPT 생성 중..." -- \
  "$PYTHON" "$SCRIPT_DIR/generate_via_intake.py" \
    --topic "$TOPIC" \
    --ptype "$PTYPE_VAL" \
    --audience "$AUDIENCE" \
    --slides "$SLIDES" \
    --theme "dark_editorial"
