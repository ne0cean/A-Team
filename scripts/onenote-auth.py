#!/usr/bin/env python3
"""OneNote API - Device Code Flow (커스텀 앱)"""

import json
import os
import sys
import time
from pathlib import Path
import msal

CLIENT_ID = "85a74e27-01ee-4c99-991f-1a86b46bdc09"
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPES = ["Notes.Read"]

TOKEN_FILE = Path(os.environ.get(
    "ONENOTE_TOKEN_FILE",
    Path.home() / ".config" / "a-team" / "onenote-token.json",
))
CACHE_FILE = Path(os.environ.get(
    "ONENOTE_MSAL_CACHE_FILE",
    Path.home() / ".config" / "a-team" / "onenote-msal-cache.json",
))


def write_private(path, text):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.write_text(text)
    path.chmod(0o600)


def get_app():
    cache = msal.SerializableTokenCache()
    if CACHE_FILE.exists():
        cache.deserialize(CACHE_FILE.read_text())
    app = msal.PublicClientApplication(CLIENT_ID, authority=AUTHORITY, token_cache=cache)
    return app, cache


def save_cache(cache):
    if cache.has_state_changed:
        write_private(CACHE_FILE, cache.serialize())


def save_token(result):
    data = {
        "access_token": result["access_token"],
        "expires_in": result.get("expires_in", 3600),
        "obtained_at": int(time.time()),
    }
    write_private(TOKEN_FILE, json.dumps(data, indent=2))


def get_access_token():
    env_token = os.environ.get("ONENOTE_ACCESS_TOKEN")
    if env_token:
        return env_token

    app, cache = get_app()

    # 캐시 확인
    accounts = app.get_accounts()
    if accounts:
        result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if result and "access_token" in result:
            save_cache(cache)
            save_token(result)
            print(f"캐시 토큰 사용: {accounts[0]['username']}")
            return result["access_token"]

    # Device code flow
    flow = app.initiate_device_flow(scopes=SCOPES)
    if "user_code" not in flow:
        print(f"실패: {flow.get('error_description', flow)}")
        return None

    print(f"\n{'='*50}")
    print(f"  URL:  {flow['verification_uri']}")
    print(f"  코드: {flow['user_code']}")
    print(f"{'='*50}\n")
    sys.stdout.flush()

    result = app.acquire_token_by_device_flow(flow)
    save_cache(cache)

    if "access_token" in result:
        save_token(result)
        print("인증 성공!")
        return result["access_token"]
    else:
        print(f"실패: {result.get('error_description', result.get('error'))}")
        return None


if __name__ == "__main__":
    token = get_access_token()
    if token:
        import urllib.request
        req = urllib.request.Request("https://graph.microsoft.com/v1.0/me")
        req.add_header("Authorization", f"Bearer {token}")
        try:
            with urllib.request.urlopen(req) as resp:
                me = json.loads(resp.read())
                print(f"확인: {me.get('displayName')} ({me.get('userPrincipalName')})")
        except Exception as e:
            print(f"프로필 조회 실패 (토큰은 저장됨): {e}")
