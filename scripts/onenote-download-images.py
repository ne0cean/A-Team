#!/usr/bin/env python3
"""OneNote 이미지 일괄 다운로드 — Graph API URL → 로컬 파일 치환"""

import json
import os
import re
import sys
import time
import hashlib
import urllib.request
from pathlib import Path

CORTEX_DIR = Path(__file__).parent.parent / "cortex"
ATTACHMENTS_DIR = CORTEX_DIR / "attachments" / "onenote"
TOKEN_FILE = CORTEX_DIR / ".onenote-token.json"

GRAPH_IMG_RE = re.compile(
    r'!\[image\]\((https://graph\.microsoft\.com.+?/resources/(0-[a-f0-9]+).+?)\)'
)

SCAN_DIRS = [
    CORTEX_DIR / "hexagonal pillars_rocks_helm",
    CORTEX_DIR / "Archive" / "interstellar-onenote",
    CORTEX_DIR / "projects",
]


def get_token():
    if not TOKEN_FILE.exists():
        print("토큰 없음. onenote-auth.py 먼저 실행.")
        return None
    data = json.loads(TOKEN_FILE.read_text())
    return data.get("access_token")


def download_image(url, token, dest):
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content_type = resp.headers.get("Content-Type", "image/png")
            data = resp.read()
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            return len(data), content_type
    except urllib.error.HTTPError as e:
        if e.code == 429:
            retry = int(e.headers.get("Retry-After", 5))
            print(f"  429 rate limit, waiting {retry}s...")
            time.sleep(retry)
            return download_image(url, token, dest)
        print(f"  HTTP {e.code}: {url[:80]}")
        return 0, None
    except Exception as e:
        print(f"  Error: {e}")
        return 0, None


def get_extension(content_type):
    mapping = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/gif": ".gif",
        "image/bmp": ".bmp",
        "image/webp": ".webp",
    }
    return mapping.get(content_type, ".png")


def main():
    token = get_token()
    if not token:
        return

    ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)

    # Scan all md files for Graph API image URLs
    files_with_images = []
    total_images = 0
    for scan_dir in SCAN_DIRS:
        if not scan_dir.exists():
            continue
        for md_file in scan_dir.rglob("*.md"):
            content = md_file.read_text(encoding="utf-8", errors="ignore")
            matches = GRAPH_IMG_RE.findall(content)
            if matches:
                files_with_images.append((md_file, matches))
                total_images += len(matches)

    print(f"Found {total_images} images in {len(files_with_images)} files")
    if not files_with_images:
        return

    downloaded = 0
    failed = 0
    skipped = 0

    for md_file, matches in files_with_images:
        content = md_file.read_text(encoding="utf-8", errors="ignore")
        modified = False

        for full_url, resource_id in matches:
            # Deterministic filename from resource ID
            short_hash = hashlib.md5(resource_id.encode()).hexdigest()[:10]
            # Download first to determine extension
            temp_dest = ATTACHMENTS_DIR / f"{short_hash}.tmp"

            # Skip if already downloaded (check all extensions)
            existing = list(ATTACHMENTS_DIR.glob(f"{short_hash}.*"))
            existing = [e for e in existing if not e.suffix == ".tmp"]
            if existing:
                local_path = existing[0]
                rel_path = os.path.relpath(local_path, md_file.parent)
                content = content.replace(full_url, rel_path)
                modified = True
                skipped += 1
                continue

            size, ctype = download_image(full_url, token, temp_dest)
            if size > 0:
                ext = get_extension(ctype)
                final_dest = ATTACHMENTS_DIR / f"{short_hash}{ext}"
                temp_dest.rename(final_dest)
                rel_path = os.path.relpath(final_dest, md_file.parent)
                content = content.replace(full_url, rel_path)
                modified = True
                downloaded += 1
                print(f"  [{downloaded}/{total_images}] {short_hash}{ext} ({size//1024}KB)")
            else:
                temp_dest.unlink(missing_ok=True)
                failed += 1

            # Rate limit courtesy
            time.sleep(0.3)

        if modified:
            md_file.write_text(content, encoding="utf-8")

    print(f"\nDone: {downloaded} downloaded, {skipped} skipped, {failed} failed")


if __name__ == "__main__":
    main()
