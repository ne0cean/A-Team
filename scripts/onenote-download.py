#!/usr/bin/env python3
"""OneNote 페이지 다운로드 - 미완료 360페이지 가져오기"""

import json
import os
import re
import time
import urllib.request
import urllib.parse
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
CORTEX_DIR = SCRIPT_DIR.parent / "cortex"
STAGING_DIR = CORTEX_DIR / "staging"
INDEX_FILE = CORTEX_DIR / ".onenote-page-index.json"
TOKEN_FILE = CORTEX_DIR / ".onenote-token.json"
DOWNLOAD_LOG = CORTEX_DIR / ".onenote-download-log.json"

GRAPH_BASE = "https://graph.microsoft.com/v1.0/me/onenote"

# onenote-auth.py와 동일한 client_id
import importlib.util
spec = importlib.util.spec_from_file_location("auth", str(Path(__file__).parent / "onenote-auth.py"))
auth_mod = importlib.util.module_from_spec(spec)


def get_token():
    """저장된 access_token 로드"""
    if not TOKEN_FILE.exists():
        print("토큰 없음. 먼저 onenote-auth.py 실행.")
        return None
    tokens = json.loads(TOKEN_FILE.read_text())
    return tokens.get("access_token")


def graph_get(url, token):
    """Graph API GET 요청"""
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 429:
            retry = int(e.headers.get("Retry-After", 10))
            print(f"  Rate limited. {retry}s 대기...")
            time.sleep(retry)
            return graph_get(url, token)
        print(f"  HTTP {e.code}: {e.read().decode()[:200]}")
        return None


def graph_get_html(url, token):
    """Graph API GET - HTML 콘텐츠"""
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "text/html")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        if e.code == 429:
            retry = int(e.headers.get("Retry-After", 10))
            print(f"  Rate limited. {retry}s 대기...")
            time.sleep(retry)
            return graph_get_html(url, token)
        print(f"  HTTP {e.code}: {e.read().decode()[:200]}")
        return None


def sanitize_filename(name):
    """파일명 안전 변환"""
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name[:100] if name else "untitled"


def html_to_markdown(html):
    """간단한 HTML→Markdown 변환"""
    if not html:
        return ""
    text = html
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<p[^>]*>', '\n', text)
    text = re.sub(r'</p>', '', text)
    text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'\n# \1\n', text)
    text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'\n## \1\n', text)
    text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'\n### \1\n', text)
    text = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', text)
    text = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', text)
    text = re.sub(r'<i[^>]*>(.*?)</i>', r'*\1*', text)
    text = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', text)
    text = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r'[\2](\1)', text)
    text = re.sub(r'<li[^>]*>', '\n- ', text)
    text = re.sub(r'</li>', '', text)
    text = re.sub(r'<[^>]+>', '', text)  # 나머지 태그 제거
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def load_download_log():
    """다운로드 로그 로드"""
    if DOWNLOAD_LOG.exists():
        return json.loads(DOWNLOAD_LOG.read_text())
    return {"downloaded": [], "failed": [], "total": 0}


def save_download_log(log):
    """다운로드 로그 저장"""
    DOWNLOAD_LOG.write_text(json.dumps(log, indent=2, ensure_ascii=False))


def list_all_pages(token):
    """모든 OneNote 페이지 목록 (페이지네이션 포함)"""
    pages = []
    url = f"{GRAPH_BASE}/pages?$top=100&$select=id,title,createdDateTime,lastModifiedDateTime,parentSection&$expand=parentSection($select=displayName)&$orderby=lastModifiedDateTime desc"

    while url:
        data = graph_get(url, token)
        if not data:
            break
        pages.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
        print(f"  {len(pages)}페이지 수집...")

    return pages


def download_pages(token, limit=None):
    """미다운로드 페이지 다운로드"""
    STAGING_DIR.mkdir(parents=True, exist_ok=True)
    log = load_download_log()
    downloaded_ids = set(log["downloaded"])

    # 기존 cortex 파일명에서 이미 있는 것 확인
    existing_files = set()
    for f in CORTEX_DIR.rglob("*.md"):
        existing_files.add(f.stem.lower())

    print("OneNote 페이지 목록 가져오는 중...")
    all_pages = list_all_pages(token)
    print(f"전체 {len(all_pages)}페이지 발견")

    # 미다운로드 필터
    pending = [p for p in all_pages if p["id"] not in downloaded_ids]
    print(f"미다운로드: {len(pending)}페이지")

    if limit:
        pending = pending[:limit]
        print(f"  (limit {limit} 적용)")

    success = 0
    fail = 0

    for i, page in enumerate(pending, 1):
        page_id = page["id"]
        title = page.get("title", "untitled")
        section = page.get("parentSection", {}).get("displayName", "unknown")
        filename = sanitize_filename(title)

        print(f"[{i}/{len(pending)}] {title[:50]}... ({section})")

        # 콘텐츠 다운로드
        content_url = f"{GRAPH_BASE}/pages/{page_id}/content"
        html = graph_get_html(content_url, token)

        if html:
            md = html_to_markdown(html)

            # frontmatter 추가
            frontmatter = f"""---
title: "{title.replace('"', "'")}"
section: "{section}"
onenote_id: "{page_id}"
created: "{page.get('createdDateTime', '')}"
modified: "{page.get('lastModifiedDateTime', '')}"
---

"""
            out_path = STAGING_DIR / f"{filename}.md"
            # 중복 방지
            counter = 1
            while out_path.exists():
                out_path = STAGING_DIR / f"{filename}_{counter}.md"
                counter += 1

            out_path.write_text(frontmatter + md, encoding="utf-8")
            downloaded_ids.add(page_id)
            log["downloaded"].append(page_id)
            success += 1
        else:
            log["failed"].append({"id": page_id, "title": title})
            fail += 1

        # 10페이지마다 로그 저장
        if i % 10 == 0:
            log["total"] = len(all_pages)
            save_download_log(log)
            print(f"  -- 중간 저장 (성공: {success}, 실패: {fail})")

        # API 속도 제한 방지
        time.sleep(0.5)

    log["total"] = len(all_pages)
    save_download_log(log)

    print(f"\n완료: 성공 {success}, 실패 {fail}")
    print(f"staging 디렉토리: {STAGING_DIR}")
    print(f"다운로드 로그: {DOWNLOAD_LOG}")
    return success, fail


if __name__ == "__main__":
    import sys
    token = get_token()
    if not token:
        sys.exit(1)

    limit = None
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
            print(f"limit: {limit}페이지만 다운로드")
        except ValueError:
            if sys.argv[1] == "list":
                pages = list_all_pages(token)
                print(f"\n전체 {len(pages)}페이지:")
                for p in pages[:20]:
                    section = p.get("parentSection", {}).get("displayName", "?")
                    print(f"  [{section}] {p.get('title', '?')[:60]}")
                if len(pages) > 20:
                    print(f"  ... 외 {len(pages)-20}개")
                sys.exit(0)

    download_pages(token, limit)
