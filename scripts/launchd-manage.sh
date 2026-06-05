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

# interval 파싱 → 전역 변수로 결과 반환 (eval/subshell 없이 XML 안전 처리)
# 설정: _IV_TYPE=interval|calendar, _IV_SECONDS, _IV_CAL_PRETTY
_IV_TYPE=""
_IV_SECONDS=""
_IV_CAL_PRETTY=""

parse_interval() {
  local spec="$1"
  _IV_TYPE="" _IV_SECONDS="" _IV_CAL_PRETTY=""

  # every Xm / every Xh
  if [[ "$spec" =~ ^every[[:space:]]+([0-9]+)(m|h)$ ]]; then
    local n="${BASH_REMATCH[1]}" unit="${BASH_REMATCH[2]}"
    _IV_TYPE="interval"
    if [[ "$unit" == "m" ]]; then
      _IV_SECONDS=$(( n * 60 ))
    else
      _IV_SECONDS=$(( n * 3600 ))
    fi
    return 0
  fi

  # daily HH:MM
  if [[ "$spec" =~ ^daily[[:space:]]+([0-9]{1,2}):([0-9]{2})$ ]]; then
    _IV_TYPE="calendar"
    _IV_CAL_PRETTY="        <key>Hour</key>
        <integer>${BASH_REMATCH[1]}</integer>
        <key>Minute</key>
        <integer>${BASH_REMATCH[2]}</integer>"
    return 0
  fi

  # weekly WEEKDAY HH:MM  (0=일 ... 6=토)
  if [[ "$spec" =~ ^weekly[[:space:]]+([0-6])[[:space:]]+([0-9]{1,2}):([0-9]{2})$ ]]; then
    _IV_TYPE="calendar"
    _IV_CAL_PRETTY="        <key>Weekday</key>
        <integer>${BASH_REMATCH[1]}</integer>
        <key>Hour</key>
        <integer>${BASH_REMATCH[2]}</integer>
        <key>Minute</key>
        <integer>${BASH_REMATCH[3]}</integer>"
    return 0
  fi

  # cron MIN HOUR DOM MON DOW  (5-field)
  if [[ "$spec" =~ ^cron[[:space:]]+(.+)$ ]]; then
    local IFS=' '
    set -f  # glob 확장 비활성화 (* 문자 보호)
    local fields=( ${BASH_REMATCH[1]} )
    set +f  # glob 확장 복원
    if [[ "${#fields[@]}" -ne 5 ]]; then
      echo "ERROR: cron spec must have exactly 5 fields (min hour dom mon dow)" >&2
      exit 1
    fi
    local min="${fields[0]}" hour="${fields[1]}" dom="${fields[2]}" mon="${fields[3]}" dow="${fields[4]}"
    _IV_TYPE="calendar"
    local xml=""
    [[ "$min"  != "*" ]] && xml+="        <key>Minute</key>\n        <integer>${min}</integer>\n"
    [[ "$hour" != "*" ]] && xml+="        <key>Hour</key>\n        <integer>${hour}</integer>\n"
    [[ "$dom"  != "*" ]] && xml+="        <key>Day</key>\n        <integer>${dom}</integer>\n"
    [[ "$mon"  != "*" ]] && xml+="        <key>Month</key>\n        <integer>${mon}</integer>\n"
    [[ "$dow"  != "*" ]] && xml+="        <key>Weekday</key>\n        <integer>${dow}</integer>\n"
    # printf %b로 \n 변환 후 마지막 빈 줄 제거
    _IV_CAL_PRETTY="$(printf '%b' "$xml")"
    _IV_CAL_PRETTY="${_IV_CAL_PRETTY%$'\n'}"
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

  # interval 파싱 (전역 변수 _IV_* 에 결과 저장)
  parse_interval "$interval"

  # 로그 디렉토리 보장
  mkdir -p "$LOG_DIR"

  local log_out err_out
  log_out=$(log_path "$name")
  err_out=$(err_log_path "$name")

  # XML 특수문자 이스케이프 (& < > " 순서 중요: &가 먼저)
  local cmd_xml
  cmd_xml="${cmd//&/&amp;}"
  cmd_xml="${cmd_xml//</&lt;}"
  cmd_xml="${cmd_xml//>/&gt;}"
  cmd_xml="${cmd_xml//\"/&quot;}"

  # plist 생성
  if [[ "$_IV_TYPE" == "interval" ]]; then
    cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>${cmd_xml}</string>
    </array>
    <key>StartInterval</key>
    <integer>${_IV_SECONDS}</integer>
    <key>StandardOutPath</key>
    <string>${log_out}</string>
    <key>StandardErrorPath</key>
    <string>${err_out}</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
PLIST
  else
    cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>${cmd_xml}</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
${_IV_CAL_PRETTY}
    </dict>
    <key>StandardOutPath</key>
    <string>${log_out}</string>
    <key>StandardErrorPath</key>
    <string>${err_out}</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
PLIST
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
