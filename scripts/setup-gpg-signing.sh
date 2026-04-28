#!/usr/bin/env bash
# setup-gpg-signing.sh — GPG commit signing 설정 자동화
# Usage: bash scripts/setup-gpg-signing.sh [--global | --local]
#
# Prerequisites (user action required before running):
#   brew install gnupg pinentry-mac
#   gpg --full-generate-key  (또는 기존 키 import)

set -euo pipefail

SCOPE="${1:---global}"

# 1. GPG 존재 확인
if ! command -v gpg &>/dev/null; then
  echo "ERROR: GPG not installed."
  echo "  brew install gnupg pinentry-mac"
  exit 1
fi

# 2. 사용 가능한 키 목록
echo ""
echo "Available secret keys:"
gpg --list-secret-keys --keyid-format LONG 2>/dev/null
echo ""

# 3. 키 선택
read -rp "사용할 GPG Key ID (16자리 hex, 예: ABCD1234EFGH5678): " KEY_ID

if [ -z "$KEY_ID" ]; then
  echo "ERROR: Key ID를 입력해야 합니다."
  exit 1
fi

# 4. git 설정
git config "$SCOPE" user.signingkey "$KEY_ID"
git config "$SCOPE" commit.gpgsign true
git config "$SCOPE" tag.gpgsign true

# 5. pinentry-mac 설정 (macOS)
if [[ "$(uname)" == "Darwin" ]]; then
  GNUPGHOME="${GNUPGHOME:-$HOME/.gnupg}"
  mkdir -p "$GNUPGHOME"
  chmod 700 "$GNUPGHOME"
  AGENT_CONF="$GNUPGHOME/gpg-agent.conf"
  if ! grep -q "pinentry-program" "$AGENT_CONF" 2>/dev/null; then
    PINENTRY_PATH="$(brew --prefix 2>/dev/null)/bin/pinentry-mac"
    if [ -f "$PINENTRY_PATH" ]; then
      echo "pinentry-program $PINENTRY_PATH" >> "$AGENT_CONF"
      gpgconf --kill gpg-agent 2>/dev/null || true
      echo "pinentry-mac 설정 완료: $AGENT_CONF"
    else
      echo "WARNING: pinentry-mac not found at $PINENTRY_PATH"
      echo "  brew install pinentry-mac 후 재실행"
    fi
  fi
fi

# 6. 검증
echo ""
echo "설정 완료:"
git config "$SCOPE" --get user.signingkey
git config "$SCOPE" --get commit.gpgsign
git config "$SCOPE" --get tag.gpgsign 2>/dev/null || true

echo ""
echo "검증 (테스트 서명):"
echo "test" | gpg --clearsign --default-key "$KEY_ID" > /dev/null 2>&1 \
  && echo "  GPG 서명 작동 확인" \
  || echo "  WARNING: 서명 실패 — 키 ID 재확인 필요"

echo ""
echo "완료. 이후 커밋은 자동 서명됩니다."
echo "GitHub 등록: Settings > SSH and GPG keys > New GPG key"
echo "  gpg --armor --export $KEY_ID | pbcopy"
