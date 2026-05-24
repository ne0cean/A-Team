#!/bin/bash
# launchd-manage.sh — A-Team 범용 launchd job 관리
# 네임스페이스: ~/Library/LaunchAgents/com.ateam.*
# 사용법: bash launchd-manage.sh <create|list|remove|status> [options]

set -euo pipefail

NAMESPACE="com.ateam"
PLIST_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs"

# ────────────────────────────────────────────
# 헬퍼
# ────────────────────────────────────────────

usage() {
  cat <<EOF
Usage: launchd-manage.sh <subcommand> [options]

Subcommands:
  create  --name <name> --cmd <command> --interval <spec> [--force]
  list
  remove  --name <name> [--force]
  status  [--name <name>]

Interval spec examples:
  every 30m        — 30분마다 (StartInterval)
  every 2h         — 2시간마다
  daily 05:00      — 매일 05:00 (StartCalendarInterval)
  weekly 0 23:00   — 매주 일요일 23:00 (0=일, 1=월 ... 6=토)
  cron 30 7 * * *  — cron 5-field 표현식 (분 시 일 월 요일)

EOF
  exit 1
}

label_for() {
  echo "${NAMESPACE}.$1"
}

plist_path() {
  echo "${PLIST_DIR}/$(label_for "$1").plist"
}

log_path() {
  local label
  label=$(label_for "$1")
  echo "${LOG_DIR}/${label}.log"
}

err_log_path() {
  local label
  label=$(label_for "$1")
  echo "${LOG_DIR}/${label}.error.log"
}

# interval 파싱 → plist XML 스니펫 반환
# 출력: TYPE=interval|calendar  VALUE=<seconds>|<xml-dict-body>
parse_interval() {
  local spec="$1"

  # every Xm / every Xh
  if [[ "$spec" =~ ^every[[:space:]]+([0-9]+)(m|h)$ ]]; then
    local n="${BASH_REMATCH[1]}"
    local unit="${BASH_REMATCH[2]}"
    local seconds
    if [[ "$unit" == "m" ]]; then
      seconds=$(( n * 60 ))
    else
      seconds=$(( n * 3600 ))
    fi
    echo "TYPE=interval"
    echo "SECONDS=${seconds}"
    return 0
  fi

  # daily HH:MM
  if [[ "$spec" =~ ^daily[[:space:]]+([0-9]{1,2}):([0-9]{2})$ ]]; then
    local hour="${BASH_REMATCH[1]}"
    local minute="${BASH_REMATCH[2]}"
    echo "TYPE=calendar"
    echo "CALENDAR_XML=<key>Hour</key><integer>${hour}</integer><key>Minute</key><integer>${minute}</integer>"
    return 0
  fi

  # weekly WEEKDAY HH:MM  (0=일 ... 6=토)
  if [[ "$spec" =~ ^weekly[[:space:]]+([0-6])[[:space:]]+([0-9]{1,2}):([0-9]{2})$ ]]; then
    local weekday="${BASH_REMATCH[1]}"
    local hour="${BASH_REMATCH[2]}"
    local minute="${BASH_REMATCH[3]}"
    echo "TYPE=calendar"
    echo "CALENDAR_XML=<key>Weekday</key><integer>${weekday}</integer><key>Hour</key><integer>${hour}</integer><key>Minute</key><integer>${minute}</integer>"
    return 0
  fi

  # cron MIN HOUR DOM MON DOW  (5-field)
  if [[ "$spec" =~ ^cron[[:space:]]+(.+)$ ]]; then
    local fields=( ${BASH_REMATCH[1]} )
    if [[ "${#fields[@]}" -ne 5 ]]; then
      echo "ERROR: cron spec must have exactly 5 fields (min hour dom mon dow)" >&2
      exit 1
    fi
    local min="${fields[0]}"
    local hour="${fields[1]}"
    local dom="${fields[2]}"
    local mon="${fields[3]}"
    local dow="${fields[4]}"

    local xml=""

    [[ "$min"  != "*" ]] && xml+="<key>Minute</key><integer>${min}</integer>"
    [[ "$hour" != "*" ]] && xml+="<key>Hour</key><integer>${hour}</integer>"
    [[ "$dom"  != "*" ]] && xml+="<key>Day</key><integer>${dom}</integer>"
    [[ "$mon"  != "*" ]] && xml+="<key>Month</key><integer>${mon}</integer>"
    [[ "$dow"  != "*" ]] && xml+="<key>Weekday</key><integer>${dow}</integer>"

    echo "TYPE=calendar"
    echo "CALENDAR_XML=${xml}"
    return 0
  fi

  echo "ERROR: 인식할 수 없는 interval spec: ${spec}" >&2
  echo "       예: 'every 30m', 'daily 05:00', 'weekly 0 23:00', 'cron 30 7 * * *'" >&2
  exit 1
}

# ────────────────────────────────────────────
# create_job
# ────────────────────────────────────────────

create_job() {
  local name="" cmd="" interval="" force=0

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name)     name="$2";     shift 2 ;;
      --cmd)      cmd="$2";      shift 2 ;;
      --interval) interval="$2"; shift 2 ;;
      --force)    force=1;       shift   ;;
      *) echo "Unknown option: $1" >&2; usage ;;
    esac
  done

  [[ -z "$name" ]]     && { echo "ERROR: --name 필수" >&2; usage; }
  [[ -z "$cmd" ]]      && { echo "ERROR: --cmd 필수" >&2; usage; }
  [[ -z "$interval" ]] && { echo "ERROR: --interval 필수" >&2; usage; }

  # 이름 검증 (영숫자, 하이픈, 언더스코어만)
  if [[ ! "$name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "ERROR: name은 영숫자, 하이픈, 언더스코어만 허용합니다: ${name}" >&2
    exit 1
  fi

  local plist
  plist=$(plist_path "$name")
  local label
  label=$(label_for "$name")

  # 기존 plist 덮어쓰기 방지
  if [[ -f "$plist" ]] && [[ "$force" -eq 0 ]]; then
    echo "ERROR: 이미 존재합니다: ${plist}" >&2
    echo "       덮어쓰려면 --force 옵션을 사용하세요." >&2
    exit 1
  fi

  # 기존 job unload (force 시)
  if [[ -f "$plist" ]] && [[ "$force" -eq 1 ]]; then
    launchctl unload "$plist" 2>/dev/null || true
  fi

  # interval 파싱
  local parsed
  parsed=$(parse_interval "$interval")
  eval "$parsed"

  # 로그 디렉토리 보장
  mkdir -p "$LOG_DIR"

  # command를 ProgramArguments 배열로 분해
  # bash -c "..." 형태로 래핑하여 파이프/리다이렉트 지원
  local prog_args
  prog_args="$(printf '        <string>/bin/bash</string>\n        <string>-c</string>\n        <string>%s</string>' "$cmd")"

  # plist 생성
  if [[ "${TYPE:-}" == "interval" ]]; then
    cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
${prog_args}
    </array>
    <key>StartInterval</key>
    <integer>${SECONDS}</integer>
    <key>StandardOutPath</key>
    <string>$(log_path "$name")</string>
    <key>StandardErrorPath</key>
    <string>$(err_log_path "$name")</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF
  else
    # calendar 타입 — XML을 pretty하게 변환
    local cal_xml="${CALENDAR_XML}"
    local cal_pretty=""
    # 각 key/integer 쌍을 줄바꿈으로 분리
    cal_pretty=$(echo "$cal_xml" | sed \
      -e 's|<key>|\n        <key>|g' \
      -e 's|<integer>|\n        <integer>|g' \
      -e 's|</integer>|</integer>|g' \
      | grep -v '^$')

    cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
${prog_args}
    </array>
    <key>StartCalendarInterval</key>
    <dict>
${cal_pretty}
    </dict>
    <key>StandardOutPath</key>
    <string>$(log_path "$name")</string>
    <key>StandardErrorPath</key>
    <string>$(err_log_path "$name")</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF
  fi

  # launchctl load
  launchctl load "$plist"

  echo "OK  created  ${label}"
  echo "    plist  : ${plist}"
  echo "    log    : $(log_path "$name")"
  echo "    cmd    : ${cmd}"
  echo "    interval: ${interval}"
}

# ────────────────────────────────────────────
# list_jobs
# ────────────────────────────────────────────

list_jobs() {
  echo "com.ateam.* LaunchAgents:"
  echo "────────────────────────────────────────"

  local found=0
  for plist in "${PLIST_DIR}/${NAMESPACE}."*.plist; do
    [[ -f "$plist" ]] || continue
    found=1
    local name
    name=$(basename "$plist" .plist | sed "s/^${NAMESPACE}\.//")
    local label
    label=$(label_for "$name")

    # launchctl list로 실행 상태 확인
    local pid status
    if pid=$(launchctl list "$label" 2>/dev/null | awk '/PID/{print $3}' | tr -d '",' ); then
      if [[ -n "$pid" && "$pid" != "-" && "$pid" != "0" ]]; then
        status="running (pid=${pid})"
      else
        local exit_code
        exit_code=$(launchctl list "$label" 2>/dev/null | grep '"LastExitStatus"' | awk '{print $3}' | tr -d ';') || exit_code="?"
        if [[ "$exit_code" == "0" || -z "$exit_code" ]]; then
          status="idle"
        else
          status="last_exit=${exit_code}"
        fi
      fi
    else
      status="not loaded"
    fi

    printf "  %-30s  %s\n" "$name" "$status"
  done

  if [[ "$found" -eq 0 ]]; then
    echo "  (없음)"
  fi
  echo ""
}

# ────────────────────────────────────────────
# remove_job
# ────────────────────────────────────────────

remove_job() {
  local name="" force=0

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name)  name="$2"; shift 2 ;;
      --force) force=1;   shift   ;;
      *) echo "Unknown option: $1" >&2; usage ;;
    esac
  done

  [[ -z "$name" ]] && { echo "ERROR: --name 필수" >&2; usage; }

  local plist
  plist=$(plist_path "$name")
  local label
  label=$(label_for "$name")

  if [[ ! -f "$plist" ]]; then
    echo "ERROR: plist 없음: ${plist}" >&2
    exit 1
  fi

  if [[ "$force" -eq 0 ]]; then
    read -r -p "삭제하시겠습니까? ${label} [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { echo "취소됨."; exit 0; }
  fi

  launchctl unload "$plist" 2>/dev/null || true
  rm -f "$plist"

  echo "OK  removed  ${label}"
}

# ────────────────────────────────────────────
# status_job
# ────────────────────────────────────────────

status_job() {
  local name=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name) name="$2"; shift 2 ;;
      *) echo "Unknown option: $1" >&2; usage ;;
    esac
  done

  if [[ -z "$name" ]]; then
    # 전체 상태
    list_jobs
    return
  fi

  local plist
  plist=$(plist_path "$name")
  local label
  label=$(label_for "$name")

  if [[ ! -f "$plist" ]]; then
    echo "ERROR: plist 없음: ${plist}" >&2
    exit 1
  fi

  echo "Label   : ${label}"
  echo "Plist   : ${plist}"
  echo "Log     : $(log_path "$name")"
  echo "ErrLog  : $(err_log_path "$name")"
  echo ""
  echo "launchctl info:"
  launchctl list "$label" 2>/dev/null || echo "  (not loaded)"
  echo ""

  local log
  log=$(log_path "$name")
  if [[ -f "$log" ]]; then
    echo "Last 10 log lines:"
    tail -n 10 "$log"
  else
    echo "Log file not found (아직 실행 안 됨)"
  fi
}

# ────────────────────────────────────────────
# 진입점
# ────────────────────────────────────────────

if [[ "$(uname)" != "Darwin" ]]; then
  echo "ERROR: macOS 전용 스크립트입니다 (launchd)." >&2
  exit 1
fi

mkdir -p "$PLIST_DIR"

[[ $# -eq 0 ]] && usage

subcommand="$1"
shift

case "$subcommand" in
  create) create_job "$@" ;;
  list)   list_jobs       ;;
  remove) remove_job "$@" ;;
  status) status_job "$@" ;;
  *)
    echo "ERROR: 알 수 없는 서브커맨드: ${subcommand}" >&2
    usage
    ;;
esac
