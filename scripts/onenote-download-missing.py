#!/usr/bin/env python3
"""InterStellar 누락 섹션 다운로드 — level/order 포함"""

import json
import re
import sys
import time
import urllib.request
from pathlib import Path

CORTEX = Path(__file__).parent.parent / "cortex"
TOKEN_FILE = CORTEX / ".onenote-token.json"
MSAL_CACHE = CORTEX / ".onenote-msal-cache.json"
BASE = "https://graph.microsoft.com/v1.0/me/onenote"

CLIENT_ID = "85a74e27-01ee-4c99-991f-1a86b46bdc09"
SCOPES = ["Notes.Read"]


def refresh_token_via_msal():
    """MSAL 캐시의 refresh_token으로 access_token 자동 갱신"""
    try:
        import msal
    except ImportError:
        print("msal 미설치. pip3 install msal")
        return None

    cache = msal.SerializableTokenCache()
    if MSAL_CACHE.exists():
        cache.deserialize(MSAL_CACHE.read_text())

    app = msal.PublicClientApplication(CLIENT_ID, token_cache=cache)
    accounts = app.get_accounts()

    if accounts:
        result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if result and "access_token" in result:
            # 캐시 저장
            MSAL_CACHE.write_text(cache.serialize())
            # token.json도 갱신
            TOKEN_FILE.write_text(json.dumps({
                "access_token": result["access_token"],
                "expires_in": result.get("expires_in", 3599),
                "obtained_at": int(time.time()),
            }))
            print("토큰 자동 갱신 완료 (MSAL refresh)")
            return result["access_token"]

    # refresh 실패 → 디바이스 코드 플로우
    print("자동 갱신 실패. 디바이스 코드 인증 시작...")
    flow = app.initiate_device_flow(scopes=SCOPES)
    if "user_code" not in flow:
        print(f"디바이스 코드 생성 실패: {flow}")
        return None

    print(f"\n{'='*50}")
    print(f"  브라우저에서: {flow['verification_uri']}")
    print(f"  코드 입력:   {flow['user_code']}")
    print(f"{'='*50}\n")

    result = app.acquire_token_by_device_flow(flow)
    if "access_token" in result:
        MSAL_CACHE.write_text(cache.serialize())
        TOKEN_FILE.write_text(json.dumps({
            "access_token": result["access_token"],
            "expires_in": result.get("expires_in", 3599),
            "obtained_at": int(time.time()),
        }))
        print("토큰 발급 완료 (디바이스 코드)")
        return result["access_token"]

    print(f"인증 실패: {result.get('error_description', result)}")
    return None


def get_token():
    """토큰 반환. 만료 시 자동 갱신 시도."""
    if TOKEN_FILE.exists():
        data = json.loads(TOKEN_FILE.read_text())
        obtained = data.get("obtained_at", 0)
        expires_in = data.get("expires_in", 3599)
        if time.time() < obtained + expires_in - 60:
            return data["access_token"]
        print("토큰 만료. 자동 갱신 시도...")

    token = refresh_token_via_msal()
    if token:
        return token

    print("토큰 갱신 실패. --auth 플래그로 재인증 필요.")
    sys.exit(1)


def api(url, token, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url)
            req.add_header("Authorization", f"Bearer {token}")
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(int(e.headers.get("Retry-After", 10)))
            elif i == retries - 1:
                print(f"  ERR {e.code}: {e.read().decode()[:100]}")
                return None
        except Exception:
            if i < retries - 1:
                time.sleep(3)
            else:
                return None


def api_html(url, token, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url)
            req.add_header("Authorization", f"Bearer {token}")
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception:
            if i < retries - 1:
                time.sleep(3)
            else:
                return None


def html_to_md(html):
    if not html:
        return ""
    t = html
    t = re.sub(r'<br\s*/?>', '\n', t)
    t = re.sub(r'<p[^>]*>', '\n', t)
    t = re.sub(r'</p>', '', t)
    t = re.sub(r'<h1[^>]*>(.*?)</h1>', r'\n# \1\n', t)
    t = re.sub(r'<h2[^>]*>(.*?)</h2>', r'\n## \1\n', t)
    t = re.sub(r'<h3[^>]*>(.*?)</h3>', r'\n### \1\n', t)
    t = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', t)
    t = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', t)
    t = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r'[\2](\1)', t)
    t = re.sub(r'<li[^>]*>', '\n- ', t)
    t = re.sub(r'<img[^>]*src="([^"]*)"[^>]*/>', r'\n![image](\1)\n', t)
    t = re.sub(r'<[^>]+>', '', t)
    t = re.sub(r'\n{3,}', '\n\n', t)
    return t.strip()


def sanitize(name):
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    return name[:100].strip() if name else "untitled"


def get_existing_ids():
    ids = set()
    for f in CORTEX.rglob("*.md"):
        try:
            content = f.read_text(errors="replace")[:500]
            m = re.search(r'onenote_id:\s*"([^"]+)"', content)
            if m:
                ids.add(m.group(1))
        except Exception:
            pass
    return ids


def get_all_pages(token, section_id):
    pages = []
    url = (f"{BASE}/sections/{section_id}/pages?$top=100"
           f"&$select=id,title,createdDateTime,lastModifiedDateTime,level,order"
           f"&$orderby=order")
    while url:
        data = api(url, token)
        if not data:
            break
        pages.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
        time.sleep(0.3)
    return pages


def download_section(token, section_id, section_name, section_group, parent_group, dest_dir, existing_ids):
    pages = get_all_pages(token, section_id)
    print(f"  [{section_group}/{section_name}] {len(pages)} pages")

    dest_dir.mkdir(parents=True, exist_ok=True)
    downloaded = 0

    for p in pages:
        pid = p["id"]
        if pid in existing_ids:
            continue

        title = p.get("title", "untitled")
        level = p.get("level", 0)
        order = p.get("order", "")
        fname = sanitize(title)

        html = api_html(f"{BASE}/pages/{pid}/content", token)
        md = html_to_md(html)

        fm = (
            f'---\n'
            f'title: "{title.replace(chr(34), chr(39))}"\n'
            f'notebook: "InterStellar"\n'
            f'section_group: "{parent_group}"\n'
            f'section: "{section_name}"\n'
            f'onenote_id: "{pid}"\n'
            f'level: {level}\n'
            f'order: "{order}"\n'
            f'created: "{p.get("createdDateTime", "")}"\n'
            f'modified: "{p.get("lastModifiedDateTime", "")}"\n'
            f'---\n\n'
        )

        out = dest_dir / f"{fname}.md"
        c = 1
        while out.exists():
            out = dest_dir / f"{fname}_{c}.md"
            c += 1
        out.write_text(fm + md, encoding="utf-8")
        downloaded += 1
        existing_ids.add(pid)
        time.sleep(0.3)

    return downloaded


def main():
    token = get_token()
    existing_ids = get_existing_ids()
    print(f"기존 ID: {len(existing_ids)}개\n")

    # Find InterStellar notebook
    nbs = api(f"{BASE}/notebooks", token)
    if not nbs or "value" not in nbs:
        print("API 응답 없음. 30초 후 재시도...")
        time.sleep(30)
        nbs = api(f"{BASE}/notebooks", token)
        if not nbs or "value" not in nbs:
            print("API 여전히 불가. 토큰 만료 또는 서비스 장애.")
            return
    inter = [n for n in nbs["value"] if n["displayName"] == "InterStellar"][0]
    nid = inter["id"]

    # Get section groups
    sgs = api(f"{BASE}/notebooks/{nid}/sectionGroups?$top=100", token)
    total = 0

    for sg in sgs["value"]:
        sg_name = sg["displayName"]

        # Direct sections in this group
        secs = api(f"{BASE}/sectionGroups/{sg['id']}/sections?$top=100", token)
        if secs:
            for sec in secs["value"]:
                dest = CORTEX / "InterStellar" / sg_name / sec["displayName"]
                count = download_section(
                    token, sec["id"], sec["displayName"],
                    sg_name, sg_name, dest, existing_ids
                )
                total += count

        # Nested section groups (3_Archive has numbered sub-groups)
        nested = api(f"{BASE}/sectionGroups/{sg['id']}/sectionGroups?$top=100", token)
        if nested:
            for nsg in nested.get("value", []):
                nsg_name = nsg["displayName"]
                nsecs = api(f"{BASE}/sectionGroups/{nsg['id']}/sections?$top=100", token)
                if nsecs:
                    for ns in nsecs["value"]:
                        dest = CORTEX / "InterStellar" / sg_name / ns["displayName"]
                        count = download_section(
                            token, ns["id"], ns["displayName"],
                            sg_name, f"{sg_name}/{nsg_name}", dest, existing_ids
                        )
                        total += count
        time.sleep(1)

    print(f"\n총 다운로드: {total}개")


if __name__ == "__main__":
    main()
