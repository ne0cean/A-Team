#!/usr/bin/env python3
"""OneNote API - Device Code Flow 인증 + 토큰 저장"""

import json
import time
import urllib.request
import urllib.parse
from pathlib import Path

# Microsoft Graph - 공용 클라이언트 (device code flow용)
# Azure AD > App registrations에서 직접 등록한 앱이 있으면 교체
CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46"  # Azure CLI public client
TENANT = "common"
SCOPE = "Notes.Read Notes.Read.All User.Read offline_access"

TOKEN_FILE = Path(__file__).parent.parent / "cortex" / ".onenote-token.json"

DEVICE_CODE_URL = f"https://login.microsoftonline.com/{TENANT}/oauth2/v2.0/devicecode"
TOKEN_URL = f"https://login.microsoftonline.com/{TENANT}/oauth2/v2.0/token"


def device_code_flow():
    """Device code flow로 인증 시작"""
    data = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "scope": SCOPE,
    }).encode()

    req = urllib.request.Request(DEVICE_CODE_URL, data=data)
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())

    print("\n" + "=" * 50)
    print(f"  브라우저에서 열기: {result['verification_uri']}")
    print(f"  코드 입력:        {result['user_code']}")
    print("=" * 50 + "\n")

    # 폴링으로 토큰 대기
    interval = result.get("interval", 5)
    device_code = result["device_code"]
    expires_in = result.get("expires_in", 900)
    start = time.time()

    while time.time() - start < expires_in:
        time.sleep(interval)
        try:
            token_data = urllib.parse.urlencode({
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "client_id": CLIENT_ID,
                "device_code": device_code,
            }).encode()

            token_req = urllib.request.Request(TOKEN_URL, data=token_data)
            with urllib.request.urlopen(token_req) as token_resp:
                tokens = json.loads(token_resp.read())

            tokens["obtained_at"] = int(time.time())
            TOKEN_FILE.write_text(json.dumps(tokens, indent=2))
            print(f"인증 성공! 토큰 저장: {TOKEN_FILE}")
            return tokens

        except urllib.error.HTTPError as e:
            error_body = json.loads(e.read())
            error_code = error_body.get("error", "")
            if error_code == "authorization_pending":
                print(".", end="", flush=True)
                continue
            elif error_code == "slow_down":
                interval += 5
                continue
            else:
                print(f"\n인증 실패: {error_body.get('error_description', error_code)}")
                return None

    print("\n시간 초과. 다시 시도해주세요.")
    return None


def refresh_token():
    """저장된 refresh_token으로 갱신"""
    if not TOKEN_FILE.exists():
        print("저장된 토큰 없음. device_code_flow 먼저 실행.")
        return None

    tokens = json.loads(TOKEN_FILE.read_text())
    rt = tokens.get("refresh_token")
    if not rt:
        print("refresh_token 없음. 재인증 필요.")
        return None

    data = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "grant_type": "refresh_token",
        "refresh_token": rt,
        "scope": SCOPE,
    }).encode()

    req = urllib.request.Request(TOKEN_URL, data=data)
    try:
        with urllib.request.urlopen(req) as resp:
            new_tokens = json.loads(resp.read())
        new_tokens["obtained_at"] = int(time.time())
        TOKEN_FILE.write_text(json.dumps(new_tokens, indent=2))
        print(f"토큰 갱신 성공! 저장: {TOKEN_FILE}")
        return new_tokens
    except urllib.error.HTTPError as e:
        print(f"갱신 실패: {e.read().decode()}")
        return None


def get_access_token():
    """유효한 access_token 반환 (만료 시 자동 갱신)"""
    if not TOKEN_FILE.exists():
        return device_code_flow()

    tokens = json.loads(TOKEN_FILE.read_text())
    obtained = tokens.get("obtained_at", 0)
    expires_in = tokens.get("expires_in", 3600)

    if time.time() - obtained > expires_in - 300:
        print("토큰 만료 임박, 갱신 중...")
        tokens = refresh_token()
        if not tokens:
            return device_code_flow()

    return tokens


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "refresh":
        refresh_token()
    else:
        result = get_access_token()
        if result:
            print(f"\naccess_token (앞 50자): {result['access_token'][:50]}...")
