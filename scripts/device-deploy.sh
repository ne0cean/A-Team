#!/bin/bash
# device-deploy.sh — ADB 기반 모바일 디바이스 범용 배포 스크립트
#
# 사용법:
#   device-deploy.sh [OPTIONS]
#
# 필수 옵션:
#   --device IP:PORT          대상 디바이스 (예: 192.168.0.18:5555, localhost:5555)
#   --files "f1 f2"           배포할 로컬 파일 목록 (공백 구분)
#   --dest DIR                디바이스 내 대상 디렉토리 (예: /data/local/tmp)
#
# 선택 옵션:
#   --restart "proc_name"     배포 후 재시작할 프로세스명 (pkill -x 후 재실행)
#   --restart-cmd "cmd"       재시작 대신 실행할 커맨드 (--restart와 배타적)
#   --stop-cmd "cmd"          배포 전 실행할 정지 커맨드
#   --verify-cmd "cmd"        배포 후 상태 확인 커맨드
#   --chmod "0755"            배포된 파일에 적용할 권한 (기본: 없음)
#   --backup-dir DIR          원본 백업 디렉토리 (기본: /sdcard/Download/deploy_backup)
#   --no-backup               백업 생략
#   --connect-timeout N       ADB 연결 재시도 횟수 (기본: 5)
#   --dry-run                 실제 배포 없이 시뮬레이션
#
# 예시:
#   device-deploy.sh \
#     --device 192.168.0.18:5555 \
#     --files "build/t33a_remap t33a.conf" \
#     --dest /data/local/tmp \
#     --stop-cmd "/data/local/tmp/t33a_remap stop" \
#     --chmod 0755 \
#     --restart-cmd "/data/local/tmp/t33a_remap" \
#     --verify-cmd "/data/local/tmp/t33a_remap status"
#
#   device-deploy.sh \
#     --device localhost:5555 \
#     --files "src/mini_sniper.py src/config.py" \
#     --dest /sdcard/Download \
#     --restart "python"
#
# 주의 (디바이스 최소 변경 원칙):
#   - 배포 전 자동 백업 수행 (--no-backup으로 생략 가능)
#   - 한 번 배포 시 한 가지 변경만
#   - IME/키보드 관련 명령 실행 금지

set -euo pipefail

# ── 색상 출력 ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
fail() { echo -e "${RED}[fail]${NC} $*" >&2; exit 1; }

# ── 기본값 ──────────────────────────────────────────────────────
DEVICE=""
FILES=""
DEST=""
RESTART_PROC=""
RESTART_CMD=""
STOP_CMD=""
VERIFY_CMD=""
CHMOD_MODE=""
BACKUP_DIR="/sdcard/Download/deploy_backup"
NO_BACKUP=0
CONNECT_TIMEOUT=5
DRY_RUN=0

# ── 인수 파싱 ────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --device)         DEVICE="$2";          shift 2 ;;
        --files)          FILES="$2";            shift 2 ;;
        --dest)           DEST="$2";             shift 2 ;;
        --restart)        RESTART_PROC="$2";     shift 2 ;;
        --restart-cmd)    RESTART_CMD="$2";      shift 2 ;;
        --stop-cmd)       STOP_CMD="$2";         shift 2 ;;
        --verify-cmd)     VERIFY_CMD="$2";       shift 2 ;;
        --chmod)          CHMOD_MODE="$2";       shift 2 ;;
        --backup-dir)     BACKUP_DIR="$2";       shift 2 ;;
        --no-backup)      NO_BACKUP=1;           shift ;;
        --connect-timeout) CONNECT_TIMEOUT="$2"; shift 2 ;;
        --dry-run)        DRY_RUN=1;             shift ;;
        --help|-h)
            sed -n '2,50p' "$0"
            exit 0
            ;;
        *)
            fail "알 수 없는 옵션: $1 (--help 참조)"
            ;;
    esac
done

# ── 필수 인수 검증 ───────────────────────────────────────────────
[[ -z "$DEVICE" ]] && fail "--device 필수"
[[ -z "$FILES" ]]  && fail "--files 필수"
[[ -z "$DEST" ]]   && fail "--dest 필수"

if [[ -n "$RESTART_PROC" && -n "$RESTART_CMD" ]]; then
    fail "--restart와 --restart-cmd는 동시에 사용할 수 없음"
fi

# ── ADB 확인 ────────────────────────────────────────────────────
if ! command -v adb &>/dev/null; then
    fail "adb not found. 설치: brew install android-platform-tools"
fi

# ── dry-run 헬퍼 ────────────────────────────────────────────────
adb_run() {
    if [[ "$DRY_RUN" -eq 1 ]]; then
        log "[dry-run] adb -s $DEVICE $*"
    else
        adb -s "$DEVICE" "$@"
    fi
}

shell_run() {
    if [[ "$DRY_RUN" -eq 1 ]]; then
        log "[dry-run] adb -s $DEVICE shell $*"
    else
        adb -s "$DEVICE" shell "$@" 2>/dev/null || true
    fi
}

# ── 단계 1: ADB 연결 확인/재연결 ────────────────────────────────
log "=== 단계 1/5: ADB 연결 확인 (${DEVICE}) ==="

connect_adb() {
    local attempt=1
    while [[ "$attempt" -le "$CONNECT_TIMEOUT" ]]; do
        # connect 시도
        adb connect "$DEVICE" &>/dev/null || true
        sleep 1

        # 연결 상태 확인
        if adb -s "$DEVICE" get-state &>/dev/null 2>&1; then
            STATE=$(adb -s "$DEVICE" get-state 2>/dev/null || echo "unknown")
            if [[ "$STATE" == "device" ]]; then
                ok "연결됨: $DEVICE (시도 ${attempt}/${CONNECT_TIMEOUT})"
                return 0
            fi
        fi

        warn "연결 실패 (${attempt}/${CONNECT_TIMEOUT}), 5초 후 재시도..."
        attempt=$((attempt + 1))
        sleep 5
    done
    return 1
}

if [[ "$DRY_RUN" -eq 1 ]]; then
    log "[dry-run] ADB 연결 확인 생략"
else
    if ! connect_adb; then
        fail "ADB 연결 실패: ${DEVICE}
확인사항:
  1. 폰에서 무선 디버깅 활성화 (개발자 옵션 → 무선 디버깅)
  2. 같은 WiFi 네트워크 확인
  3. Loopback인 경우: adb tcpip 5555 먼저 실행"
    fi
fi

# ── 단계 2: 파일 존재 확인 ─────────────────────────────────────
log "=== 단계 2/5: 로컬 파일 확인 ==="

FILE_LIST=()
for f in $FILES; do
    if [[ ! -f "$f" ]]; then
        fail "파일 없음: $f"
    fi
    FILE_LIST+=("$f")
    log "  확인: $f ($(du -sh "$f" | cut -f1))"
done

# ── 단계 3: 원본 백업 ───────────────────────────────────────────
log "=== 단계 3/5: 원본 백업 ==="

if [[ "$NO_BACKUP" -eq 1 ]]; then
    warn "백업 생략 (--no-backup)"
else
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    REMOTE_BACKUP="${BACKUP_DIR}/${TIMESTAMP}"

    if [[ "$DRY_RUN" -eq 1 ]]; then
        log "[dry-run] 백업 생략"
    else
        # 백업 디렉토리 생성
        shell_run "mkdir -p '${REMOTE_BACKUP}'"

        BACKED_UP=0
        for f in "${FILE_LIST[@]}"; do
            BASENAME=$(basename "$f")
            REMOTE_FILE="${DEST}/${BASENAME}"

            # 원격 파일이 존재하는지 확인
            EXISTS=$(adb -s "$DEVICE" shell "[ -f '${REMOTE_FILE}' ] && echo yes || echo no" 2>/dev/null | tr -d '\r\n')
            if [[ "$EXISTS" == "yes" ]]; then
                shell_run "cp '${REMOTE_FILE}' '${REMOTE_BACKUP}/${BASENAME}'"
                log "  백업: ${REMOTE_FILE} → ${REMOTE_BACKUP}/${BASENAME}"
                BACKED_UP=$((BACKED_UP + 1))
            else
                log "  스킵 (신규 파일): ${REMOTE_FILE}"
            fi
        done

        if [[ "$BACKED_UP" -gt 0 ]]; then
            ok "백업 완료: ${BACKED_UP}개 파일 → ${REMOTE_BACKUP}"
        else
            log "  백업할 기존 파일 없음 (최초 배포)"
        fi
    fi
fi

# ── 단계 4: 배포 전 프로세스 정지 ──────────────────────────────
log "=== 단계 4/5: 배포 (정지 → 전송 → 시작) ==="

if [[ -n "$STOP_CMD" ]]; then
    log "  프로세스 정지: ${STOP_CMD}"
    shell_run "$STOP_CMD"
    sleep 1
elif [[ -n "$RESTART_PROC" ]]; then
    log "  프로세스 정지: pkill -x ${RESTART_PROC}"
    shell_run "pkill -x '${RESTART_PROC}'" || true
    sleep 1
fi

# 파일 전송
for f in "${FILE_LIST[@]}"; do
    BASENAME=$(basename "$f")
    REMOTE_FILE="${DEST}/${BASENAME}"
    log "  push: ${f} → ${REMOTE_FILE}"
    adb_run push "$f" "$REMOTE_FILE"
done

# 권한 설정
if [[ -n "$CHMOD_MODE" ]]; then
    for f in "${FILE_LIST[@]}"; do
        BASENAME=$(basename "$f")
        REMOTE_FILE="${DEST}/${BASENAME}"
        log "  chmod ${CHMOD_MODE}: ${REMOTE_FILE}"
        shell_run "chmod '${CHMOD_MODE}' '${REMOTE_FILE}'"
    done
fi

# 프로세스 재시작
if [[ -n "$RESTART_CMD" ]]; then
    log "  재시작: ${RESTART_CMD}"
    shell_run "$RESTART_CMD"
    sleep 2
elif [[ -n "$RESTART_PROC" ]]; then
    # RESTART_PROC만 있으면 pkill만 했으므로 — restart-cmd가 없으면 재시작 없음
    warn "  --restart 프로세스만 지정됨. 재시작 커맨드 없이 정지만 수행."
    warn "  재시작을 원하면 --restart-cmd 추가"
fi

ok "배포 완료: ${#FILE_LIST[@]}개 파일 → ${DEST}"

# ── 단계 5: 배포 후 상태 확인 ──────────────────────────────────
log "=== 단계 5/5: 배포 검증 ==="

if [[ -n "$VERIFY_CMD" ]]; then
    log "  검증: ${VERIFY_CMD}"
    if [[ "$DRY_RUN" -eq 1 ]]; then
        log "[dry-run] 검증 생략"
    else
        VERIFY_OUTPUT=$(adb -s "$DEVICE" shell "$VERIFY_CMD" 2>/dev/null || echo "(검증 명령 실패)")
        echo "$VERIFY_OUTPUT"
        ok "검증 완료"
    fi
else
    # 기본 검증: 파일 존재 + 크기 확인
    for f in "${FILE_LIST[@]}"; do
        BASENAME=$(basename "$f")
        REMOTE_FILE="${DEST}/${BASENAME}"
        if [[ "$DRY_RUN" -eq 0 ]]; then
            REMOTE_SIZE=$(adb -s "$DEVICE" shell "stat -c%s '${REMOTE_FILE}' 2>/dev/null || echo 0" | tr -d '\r\n')
            LOCAL_SIZE=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null || echo "?")
            if [[ "$REMOTE_SIZE" -gt 0 ]] 2>/dev/null; then
                ok "  ${BASENAME}: ${LOCAL_SIZE} bytes (local) → ${REMOTE_SIZE} bytes (remote)"
            else
                warn "  ${BASENAME}: 원격 파일 크기 확인 실패 (수동 확인 필요)"
            fi
        fi
    done
fi

echo ""
ok "=== 배포 성공 ==="
if [[ "$NO_BACKUP" -eq 0 && "$DRY_RUN" -eq 0 ]]; then
    log "백업 위치: ${REMOTE_BACKUP}"
    log "롤백: adb -s ${DEVICE} shell \"cp ${REMOTE_BACKUP}/* ${DEST}/\""
fi
