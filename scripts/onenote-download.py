#!/usr/bin/env python3
"""OneNote 페이지 다운로드 - 미완료 페이지 가져오기"""

import json
import re
import sys
import time
import urllib.request
from pathlib import Path

CORTEX_DIR = Path(__file__).parent.parent / "cortex"
STAGING_DIR = CORTEX_DIR / "staging"
TOKEN_FILE = CORTEX_DIR / ".onenote-token.json"
DOWNLOAD_LOG = CORTEX_DIR / ".onenote-download-log.json"

GRAPH_BASE = "https://graph.microsoft.com/v1.0/me/onenote"


def get_token():
    if not TOKEN_FILE.exists():
        print("토큰 없음. onenote-auth.py 먼저 실행.")
        return None
    return json.loads(TOKEN_FILE.read_text())["access_token"]


def graph_get(url, token):
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
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
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        if e.code == 429:
            retry = int(e.headers.get("Retry-After", 10))
            time.sleep(retry)
            return graph_get_html(url, token)
        print(f"  HTTP {e.code}")
        return None


def sanitize_filename(name):
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name[:100] if name else "untitled"


def html_to_markdown(html):
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
    text = re.sub(r'<img[^>]*data-fullres-src="([^"]*)"[^>]*/>', r'\n![image](\1)\n', text)
    text = re.sub(r'<img[^>]*src="([^"]*)"[^>]*/>', r'\n![image](\1)\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def load_log():
    if DOWNLOAD_LOG.exists():
        return json.loads(DOWNLOAD_LOG.read_text())
    return {"downloaded": [], "failed": []}


def save_log(log):
    DOWNLOAD_LOG.write_text(json.dumps(log, indent=2, ensure_ascii=False))


def list_notebooks(token):
    data = graph_get(f"{GRAPH_BASE}/notebooks", token)
    return data.get("value", []) if data else []


def list_sections(token, notebook_id):
    sections = []
    url = f"{GRAPH_BASE}/notebooks/{notebook_id}/sections?$top=100"
    while url:
        data = graph_get(url, token)
        if not data:
            break
        sections.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
    return sections


def list_pages_in_section(token, section_id):
    pages = []
    url = (f"{GRAPH_BASE}/sections/{section_id}/pages?$top=100"
           f"&$select=id,title,createdDateTime,lastModifiedDateTime")
    while url:
        data = graph_get(url, token)
        if not data:
            break
        pages.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
    return pages


def list_all_pages(token):
    all_pages = []
    notebooks = list_notebooks(token)
    print(f"노트북 {len(notebooks)}개 발견")
    for nb in notebooks:
        nb_name = nb["displayName"]
        sections = list_sections(token, nb["id"])
        for sec in sections:
            sec_name = sec["displayName"]
            pages = list_pages_in_section(token, sec["id"])
            for p in pages:
                p["_notebook"] = nb_name
                p["_section"] = sec_name
            all_pages.extend(pages)
            if pages:
                print(f"  [{nb_name}/{sec_name}] {len(pages)}페이지", flush=True)
    print(f"전체 {len(all_pages)}페이지 수집 완료")
    return all_pages


def get_existing_ids():
    """이미 cortex에 있는 onenote_id 수집"""
    ids = set()
    for f in CORTEX_DIR.rglob("*.md"):
        try:
            content = f.read_text(errors="replace")[:500]
            m = re.search(r'onenote_id:\s*"([^"]+)"', content)
            if m:
                ids.add(m.group(1))
        except Exception:
            pass
    return ids


def download_pages(token, limit=None):
    STAGING_DIR.mkdir(parents=True, exist_ok=True)
    log = load_log()
    downloaded_ids = set(log["downloaded"])

    # 기존 cortex 파일의 onenote_id
    existing_ids = get_existing_ids()
    skip_ids = downloaded_ids | existing_ids
    print(f"이미 처리된 ID: {len(skip_ids)}개")

    print("OneNote 페이지 목록 가져오는 중...")
    all_pages = list_all_pages(token)
    print(f"전체 {len(all_pages)}페이지")

    pending = [p for p in all_pages if p["id"] not in skip_ids]
    print(f"다운로드 대상: {len(pending)}페이지")

    if limit:
        pending = pending[:limit]

    success = 0
    fail = 0

    for i, page in enumerate(pending, 1):
        pid = page["id"]
        title = page.get("title", "untitled")
        section = page.get("_section", "unknown")
        notebook = page.get("_notebook", "unknown")
        filename = sanitize_filename(title)

        print(f"[{i}/{len(pending)}] [{notebook}/{section}] {title[:50]}", flush=True)

        html = graph_get_html(f"{GRAPH_BASE}/pages/{pid}/content", token)
        if html:
            md = html_to_markdown(html)
            frontmatter = (
                f'---\n'
                f'title: "{title.replace(chr(34), chr(39))}"\n'
                f'notebook: "{notebook}"\n'
                f'section: "{section}"\n'
                f'onenote_id: "{pid}"\n'
                f'created: "{page.get("createdDateTime", "")}"\n'
                f'modified: "{page.get("lastModifiedDateTime", "")}"\n'
                f'---\n\n'
            )
            out = STAGING_DIR / f"{filename}.md"
            c = 1
            while out.exists():
                out = STAGING_DIR / f"{filename}_{c}.md"
                c += 1
            out.write_text(frontmatter + md, encoding="utf-8")
            log["downloaded"].append(pid)
            success += 1
        else:
            log["failed"].append({"id": pid, "title": title})
            fail += 1

        if i % 10 == 0:
            save_log(log)
            print(f"  -- 중간 저장 (성공: {success}, 실패: {fail})", flush=True)

        time.sleep(0.3)

    save_log(log)
    print(f"\n완료: 성공 {success}, 실패 {fail}")
    print(f"staging: {STAGING_DIR}")


if __name__ == "__main__":
    token = get_token()
    if not token:
        sys.exit(1)

    limit = None
    if len(sys.argv) > 1:
        if sys.argv[1] == "list":
            pages = list_all_pages(token)
            notebooks = {}
            for p in pages:
                nb = p.get("_notebook", "?")
                notebooks.setdefault(nb, []).append(p)
            for nb, ps in sorted(notebooks.items()):
                print(f"\n[{nb}] {len(ps)}페이지")
                for p in ps[:5]:
                    print(f"  - {p.get('title', '?')[:60]}")
                if len(ps) > 5:
                    print(f"  ... 외 {len(ps)-5}개")
            print(f"\n총 {len(pages)}페이지")
            sys.exit(0)
        else:
            try:
                limit = int(sys.argv[1])
            except ValueError:
                pass

    download_pages(token, limit)
