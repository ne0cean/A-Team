#!/usr/bin/env python3
"""OneNote API - MSAL Device Code Flow 인증 + 토큰 저장"""

import json
import sys
import time
from pathlib import Path
import msal

# Microsoft public client for native apps (supports personal accounts + device code)
CLIENT_ID = "1950a258-227b-4e31-a9cf-717495945fc2"  # Azure PowerShell
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPES = ["Notes.Read", "User.Read"]

TOKEN_FILE = Path(__file__).parent.parent / "cortex" / ".onenote-token.json"
CACHE_FILE = Path(__file__).parent.parent / "cortex" / ".onenote-msal-cache.json"


def get_cache():
    cache = msal.SerializableTokenCache()
    if CACHE_FILE.exists():
        cache.deserialize(CACHE_FILE.read_text())
    return cache


def save_cache(cache):
    if cache.has_state_changed:
        CACHE_FILE.write_text(cache.serialize())


def get_app(cache=None):
    return msal.PublicClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        token_cache=cache,
    )


def device_code_flow():
    cache = get_cache()
    app = get_app(cache)

    # 캐시에서 기존 계정 확인
    accounts = app.get_accounts()
    if accounts:
        print(f"기존 계정 발견: {accounts[0]['username']}")
        result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if result and "access_token" in result:
            save_cache(cache)
            save_token(result)
            print("캐시에서 토큰 획득 성공!")
            return result

    # Device code flow 시작
    flow = app.initiate_device_flow(scopes=SCOPES)
    if "user_code" not in flow:
        print(f"Device flow 실패: {flow.get('error_description', flow)}")
        return None

    print("\n" + "=" * 50)
    print(f"  브라우저에서 열기: {flow['verification_uri']}")
    print(f"  코드 입력:        {flow['user_code']}")
    print("=" * 50)
    print(f"\n{flow.get('message', '')}\n")

    result = app.acquire_token_by_device_flow(flow)

    if "access_token" in result:
        save_cache(cache)
        save_token(result)
        print(f"\n인증 성공! 토큰 저장: {TOKEN_FILE}")
        return result
    else:
        print(f"\n인증 실패: {result.get('error_description', result.get('error', 'unknown'))}")
        return None


def save_token(result):
    token_data = {
        "access_token": result["access_token"],
        "token_type": result.get("token_type", "Bearer"),
        "expires_in": result.get("expires_in", 3600),
        "obtained_at": int(time.time()),
    }
    TOKEN_FILE.write_text(json.dumps(token_data, indent=2))


def refresh_token():
    cache = get_cache()
    app = get_app(cache)
    accounts = app.get_accounts()

    if not accounts:
        print("저장된 계정 없음. 재인증 필요.")
        return device_code_flow()

    result = app.acquire_token_silent(SCOPES, account=accounts[0])
    if result and "access_token" in result:
        save_cache(cache)
        save_token(result)
        print(f"토큰 갱신 성공! ({accounts[0]['username']})")
        return result
    else:
        print("Silent 갱신 실패. 재인증...")
        return device_code_flow()


def get_access_token():
    cache = get_cache()
    app = get_app(cache)
    accounts = app.get_accounts()

    if accounts:
        result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if result and "access_token" in result:
            save_cache(cache)
            save_token(result)
            return result["access_token"]

    result = device_code_flow()
    if result:
        return result["access_token"]
    return None


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "refresh":
        refresh_token()
    else:
        token = get_access_token()
        if token:
            print(f"\naccess_token (앞 50자): {token[:50]}...")
