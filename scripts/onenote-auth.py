#!/usr/bin/env python3
"""OneNote API - Live Connect OAuth2 (개인 Microsoft 계정 전용)
로컬 서버로 redirect 받아 토큰 획득. Azure AD 불필요.
"""

import json
import http.server
import sys
import time
import urllib.request
import urllib.parse
import webbrowser
import threading
from pathlib import Path

# Live Connect에서는 별도 앱 등록 없이 사용 가능한 공개 클라이언트 없음
# → https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps 대신
# → https://apps.dev.microsoft.com 또는 Entra admin center에서 등록
#
# 대안: Microsoft Graph에 직접 interactive login
# 아래는 localhost redirect 방식

TOKEN_FILE = Path(__file__).parent.parent / "cortex" / ".onenote-token.json"

# ── 방법 1: Interactive browser login (가장 단순) ──
# MSAL이 설치되어 있으므로 interactive flow 사용 (device code 대신)

import msal

CLIENT_ID = "1950a258-227b-4e31-a9cf-717495945fc2"
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPES = ["https://graph.microsoft.com/Notes.Read"]

PORT = 8400  # localhost redirect port


def interactive_login():
    """브라우저 팝업 → 로그인 → localhost로 redirect → 토큰 획득"""
    app = msal.PublicClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
    )

    # Interactive flow - 브라우저가 자동으로 열림
    print("브라우저에서 Microsoft 로그인 창이 열립니다...")
    print("로그인 후 자동으로 토큰을 받습니다.\n")

    result = app.acquire_token_interactive(
        scopes=SCOPES,
        port=PORT,
    )

    if "access_token" in result:
        token_data = {
            "access_token": result["access_token"],
            "token_type": result.get("token_type", "Bearer"),
            "expires_in": result.get("expires_in", 3600),
            "obtained_at": int(time.time()),
            "account": result.get("id_token_claims", {}).get("preferred_username", ""),
        }
        TOKEN_FILE.write_text(json.dumps(token_data, indent=2))
        print(f"인증 성공! 계정: {token_data['account']}")
        print(f"토큰 저장: {TOKEN_FILE}")
        return token_data
    else:
        error = result.get("error_description", result.get("error", "unknown"))
        print(f"인증 실패: {error}")
        return None


def get_access_token():
    """유효한 토큰 반환. 없거나 만료 시 재인증."""
    if TOKEN_FILE.exists():
        data = json.loads(TOKEN_FILE.read_text())
        elapsed = time.time() - data.get("obtained_at", 0)
        if elapsed < data.get("expires_in", 3600) - 300:
            print(f"캐시 토큰 사용 (만료까지 {int(data['expires_in'] - elapsed)}초)")
            return data["access_token"]
        print("토큰 만료. 재인증...")

    result = interactive_login()
    return result["access_token"] if result else None


if __name__ == "__main__":
    token = get_access_token()
    if token:
        # 토큰 검증 - Graph API 호출
        req = urllib.request.Request("https://graph.microsoft.com/v1.0/me")
        req.add_header("Authorization", f"Bearer {token}")
        try:
            with urllib.request.urlopen(req) as resp:
                me = json.loads(resp.read())
                print(f"\n로그인 확인: {me.get('displayName', '?')} ({me.get('userPrincipalName', '?')})")
        except Exception as e:
            print(f"\n프로필 조회 실패 (토큰은 저장됨): {e}")
