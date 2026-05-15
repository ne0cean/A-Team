# YouTube Ad Blocker Issue (2026)

## Problem
Chrome Manifest V3 breaks ad blockers on YouTube. Black screen or playback refused.

## Root Cause
- Google's MV3 limits network request interception (declarativeNetRequest only)
- YouTube uses SSAI (Server-Side Ad Insertion) — ads stitched into video stream
- Network-level ad/content distinction impossible

## Solutions (by effectiveness)

### 1. Use Firefox (best)
Firefox doesn't enforce MV3. uBlock Origin full version works perfectly.

### 2. Chrome workarounds
- uBlock Origin Lite (MV3) + Ad Speedup extension
- Blockify or ProBlocker (MV3-native)
- YouTube Anti-AdBlock Bypass extension

### 3. CLI playback (no browser needed)
```bash
yt-dlp -o - "URL" | mpv -
```
Best for Growth Engine / automated content extraction.

## A-Team Integration
- `/yt` command uses yt-dlp — unaffected by browser issues
- Growth Engine YouTube crawling: use yt-dlp for subtitles/metadata
- `yt-dlp --write-subs --sub-lang en,ko --skip-download "URL"` for text-only extraction
