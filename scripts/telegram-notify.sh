#!/usr/bin/env bash
# telegram-notify.sh — 범용 텔레그램 알림 스크립트
#
# 환경변수:
#   TELEGRAM_BOT_TOKEN  — BotFather에서 발급받은 토큰 (필수)
#   TELEGRAM_CHAT_ID    — 수신 채팅 ID (필수)
#   TELEGRAM_DRY_RUN    — "1" 이면 실제 전송 없이 stdout 출력
#
# 사용법:
#   telegram-notify.sh "메시지"
#   telegram-notify.sh "메시지" --parse-mode html
#   telegram-notify.sh "메시지" --parse-mode markdown
#   echo "메시지" | telegram-notify.sh
#   echo "메시지" | telegram-notify.sh --parse-mode html
#
# 예시:
#   export TELEGRAM_BOT_TOKEN="123456:ABC..."
#   export TELEGRAM_CHAT_ID="-100123456789"
#   telegram-notify.sh "배포 완료"
#   echo "에러 발생: $err" | telegram-notify.sh --parse-mode html
#
# macOS Keychain 사용 시 (토큰을 파일/env에 평문 저장 금지):
#   security add-generic-password -a telegram-bot -s telegram-bot-token -w "YOUR_TOKEN"
#   security add-generic-password -a telegram-bot -s telegram-chat-id  -w "YOUR_CHAT_ID"
#   TELEGRAM_BOT_TOKEN=$(security find-generic-password -a telegram-bot -s telegram-bot-token -w)
#   TELEGRAM_CHAT_ID=$(security find-generic-password -a telegram-bot -s telegram-chat-id -w)
#
# 기존 프로젝트 교체 가이드:
#   - Trading/bot/notifier/telegram.py 의 TelegramNotifier.send() 호출부:
#       Python 호출 유지 권장 (batch/retry/format 로직이 Python에 있음)
#       간단한 단발 알림만 이 스크립트로 교체 가능
#   - hsc-clicker: telegram 미구현 → 이 스크립트로 신규 추가
#   - t33a-remapper: termux-notification 사용 중 → 별도 알림 채널이므로 병행 사용 가능
#       t33a_boot.sh의 notify_adb_needed() 함수 뒤에 아래 추가:
#           bash /path/to/telegram-notify.sh "T33A: 무선 디버깅 토글 필요" 2>/dev/null || true

set -euo pipefail

# ── 상수 ────────────────────────────────────────────────────────────────────
readonly API_BASE="https://api.telegram.org"
readonly MAX_TEXT_LEN=4000   # Telegram 한도 4096, 여유분 96
readonly MAX_RETRIES=2
readonly RETRY_BACKOFF=1     # 초 (지수 백오프: 1s, 2s)

# ── 인자 파싱 ────────────────────────────────────────────────────────────────
PARSE_MODE="Markdown"
MESSAGE=""
STDIN_MODE=0

# stdin 파이프 감지
if [ ! -t 0 ]; then
    STDIN_MODE=1
fi

# 위치 인자 및 플래그 파싱
while [ $# -gt 0 ]; do
    case "$1" in
        --parse-mode)
            shift
            case "${1:-}" in
                html|HTML)        PARSE_MODE="HTML" ;;
                markdown|Markdown) PARSE_MODE="Markdown" ;;
                markdownv2|MarkdownV2) PARSE_MODE="MarkdownV2" ;;
                *)
                    echo "[telegram-notify] 알 수 없는 parse-mode: ${1:-}. html|markdown|markdownv2 중 선택" >&2
                    exit 1
                    ;;
            esac
            shift
            ;;
        --dry-run)
            TELEGRAM_DRY_RUN="1"
            shift
            ;;
        --)
            shift
            break
            ;;
        -*)
            echo "[telegram-notify] 알 수 없는 옵션: $1" >&2
            exit 1
            ;;
        *)
            MESSAGE="$1"
            shift
            ;;
    esac
done

# stdin 우선, 인자 차선
if [ "$STDIN_MODE" -eq 1 ]; then
    STDIN_MSG="$(cat)"
    # stdin이 있으면 인자 메시지에 붙임 (둘 다 있을 경우 newline 구분)
    if [ -n "$MESSAGE" ] && [ -n "$STDIN_MSG" ]; then
        MESSAGE="${MESSAGE}
${STDIN_MSG}"
    elif [ -n "$STDIN_MSG" ]; then
        MESSAGE="$STDIN_MSG"
    fi
fi

if [ -z "$MESSAGE" ]; then
    echo "[telegram-notify] 오류: 메시지가 없습니다." >&2
    echo "사용법: telegram-notify.sh '메시지' [--parse-mode html|markdown]" >&2
    exit 1
fi

# ── 환경변수 검증 ─────────────────────────────────────────────────────────────
TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT_ID="${TELEGRAM_CHAT_ID:-}"
DRY_RUN="${TELEGRAM_DRY_RUN:-0}"

if [ -z "$TOKEN" ] || [ -z "$CHAT_ID" ]; then
    if [ "$DRY_RUN" = "1" ]; then
        echo "[telegram-notify][DRY-RUN] TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 미설정 — stdout 출력" >&2
    else
        echo "[telegram-notify] 오류: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID 환경변수를 설정하세요." >&2
        echo "  export TELEGRAM_BOT_TOKEN='your_token'" >&2
        echo "  export TELEGRAM_CHAT_ID='your_chat_id'" >&2
        echo "" >&2
        echo "  macOS Keychain에서 로드:" >&2
        echo "  TELEGRAM_BOT_TOKEN=\$(security find-generic-password -a telegram-bot -s telegram-bot-token -w)" >&2
        exit 1
    fi
fi

# ── 텍스트 자르기 (4000자 초과 시) ──────────────────────────────────────────
if [ "${#MESSAGE}" -gt "$MAX_TEXT_LEN" ]; then
    MESSAGE="${MESSAGE:0:$((MAX_TEXT_LEN - 3))}..."
fi

# ── Dry-run 처리 ─────────────────────────────────────────────────────────────
if [ "$DRY_RUN" = "1" ]; then
    echo "[telegram-notify][DRY-RUN] parse_mode=${PARSE_MODE}"
    echo "[telegram-notify][DRY-RUN] chat_id=${CHAT_ID:-<unset>}"
    echo "[telegram-notify][DRY-RUN] message(${#MESSAGE}자):"
    echo "$MESSAGE"
    exit 0
fi

# ── 전송 (지수 백오프 재시도) ───────────────────────────────────────────────
URL="${API_BASE}/bot${TOKEN}/sendMessage"
attempt=0
last_err=""

while [ "$attempt" -le "$MAX_RETRIES" ]; do
    HTTP_CODE=$(curl -s -o /tmp/tg_response_$$.json -w "%{http_code}" \
        --max-time 10 \
        -X POST "$URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"chat_id\": \"${CHAT_ID}\",
            \"text\": $(printf '%s' "$MESSAGE" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
            \"parse_mode\": \"${PARSE_MODE}\"
        }" 2>/tmp/tg_curl_err_$$.txt)

    CURL_EXIT=$?

    if [ "$CURL_EXIT" -eq 0 ] && [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
        # ok: true 확인
        OK=$(python3 -c "import json,sys; d=json.load(open('/tmp/tg_response_$$.json')); print('1' if d.get('ok') else '0')" 2>/dev/null || echo "0")
        if [ "$OK" = "1" ]; then
            rm -f /tmp/tg_response_$$.json /tmp/tg_curl_err_$$.txt
            exit 0
        fi
        last_err=$(cat /tmp/tg_response_$$.json 2>/dev/null || echo "응답 파싱 실패")
        echo "[telegram-notify] API 오류 (시도 $((attempt+1))/$((MAX_RETRIES+1))): ${last_err}" >&2
    else
        last_err=$(cat /tmp/tg_curl_err_$$.txt 2>/dev/null || echo "HTTP ${HTTP_CODE}")
        echo "[telegram-notify] 전송 실패 (시도 $((attempt+1))/$((MAX_RETRIES+1))): HTTP ${HTTP_CODE} — ${last_err}" >&2
    fi

    attempt=$((attempt + 1))
    if [ "$attempt" -le "$MAX_RETRIES" ]; then
        wait_sec=$((RETRY_BACKOFF * (2 ** (attempt - 1))))
        echo "[telegram-notify] ${wait_sec}초 후 재시도..." >&2
        sleep "$wait_sec"
    fi
done

rm -f /tmp/tg_response_$$.json /tmp/tg_curl_err_$$.txt
echo "[telegram-notify] 오류: 최대 재시도 횟수 초과. 마지막 오류: ${last_err}" >&2
exit 1
