#!/usr/bin/env bash
# yt-extract.sh — YouTube 영상 풀 추출 (자막 + 메타데이터 + 선택적 키프레임/오디오)
# 사용법:
#   bash scripts/yt-extract.sh <URL> [--frames N] [--audio] [--out DIR]
#
# 출력:
#   $OUT/transcript.txt       자막 텍스트 (중복 제거, 한 줄)
#   $OUT/meta.txt             제목/채널/길이/설명
#   $OUT/frames/*.jpg         키프레임 (--frames N 지정 시, N개 균등 추출)
#   $OUT/audio.mp3            오디오 (--audio 지정 시, 자막 없을 때 Whisper 입력용)
#
# 의존성: yt-dlp (pip), ffmpeg (brew). Whisper 자동 호출 안 함 — 별도 단계.

set -euo pipefail

URL=""
FRAMES=0
AUDIO=0
OUT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --frames) FRAMES="$2"; shift 2 ;;
    --audio)  AUDIO=1; shift ;;
    --out)    OUT="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,12p' "$0"; exit 0 ;;
    *)        URL="$1"; shift ;;
  esac
done

if [[ -z "$URL" ]]; then
  echo "Error: URL required. Use --help for usage." >&2
  exit 1
fi

# yt-dlp 경로 자동 탐색
YT_DLP=""
for cand in "yt-dlp" "/opt/homebrew/bin/yt-dlp" "$HOME/Library/Python/3.14/bin/yt-dlp" "$HOME/Library/Python/3.13/bin/yt-dlp" "$HOME/Library/Python/3.12/bin/yt-dlp" "$HOME/.local/bin/yt-dlp"; do
  if command -v "$cand" >/dev/null 2>&1 || [[ -x "$cand" ]]; then
    YT_DLP="$cand"; break
  fi
done
if [[ -z "$YT_DLP" ]]; then
  echo "Error: yt-dlp not found. Install: pip3 install --user --break-system-packages yt-dlp" >&2
  exit 1
fi

# 영상 ID 추출
VIDEO_ID=$("$YT_DLP" --skip-download --print "%(id)s" "$URL" 2>/dev/null | head -1)
if [[ -z "$VIDEO_ID" ]]; then
  echo "Error: Failed to extract video ID from $URL" >&2
  exit 1
fi

# 출력 디렉토리 결정
if [[ -z "$OUT" ]]; then
  OUT="/tmp/yt-$VIDEO_ID"
fi
mkdir -p "$OUT"

echo "→ Video ID: $VIDEO_ID"
echo "→ Output:   $OUT"

# 1. 메타데이터
echo "→ Extracting metadata..."
"$YT_DLP" --skip-download \
  --print "title:%(title)s" \
  --print "channel:%(channel)s" \
  --print "duration:%(duration)s" \
  --print "upload_date:%(upload_date)s" \
  --print "view_count:%(view_count)s" \
  --print "description:%(description).500s" \
  "$URL" 2>/dev/null > "$OUT/meta.txt"
cat "$OUT/meta.txt"

# 2. 자막 (한국어 우선, 없으면 영어, 둘 다 없으면 자동 생성)
echo "→ Extracting subtitles..."
"$YT_DLP" --skip-download \
  --write-auto-sub --write-sub \
  --sub-lang "ko,en,en-US" \
  --sub-format vtt \
  -o "$OUT/sub.%(ext)s" \
  "$URL" 2>&1 | tail -3 || true

# vtt → 정리된 텍스트 (중복 제거, 태그 제거, 한 줄)
SUB_FILE=$(ls "$OUT"/sub.*.vtt 2>/dev/null | head -1 || true)
if [[ -n "$SUB_FILE" ]]; then
  sed 's/<[^>]*>//g' "$SUB_FILE" \
    | grep -v "^WEBVTT\|^Kind:\|^Language:\|-->\|^$" \
    | awk '!seen[$0]++' \
    | tr '\n' ' ' \
    | sed 's/  */ /g' > "$OUT/transcript.txt"
  WORD_COUNT=$(wc -w < "$OUT/transcript.txt" | tr -d ' ')
  echo "✓ Transcript: $WORD_COUNT words → $OUT/transcript.txt"
else
  echo "⚠ No subtitles available. Use --audio + Whisper for transcript."
  : > "$OUT/transcript.txt"
fi

# 3. 키프레임 (균등 N개 추출)
if [[ "$FRAMES" -gt 0 ]]; then
  echo "→ Extracting $FRAMES keyframes..."
  mkdir -p "$OUT/frames"

  # 영상 다운로드 (저화질로 빠르게)
  VIDEO_FILE="$OUT/video.mp4"
  if [[ ! -f "$VIDEO_FILE" ]]; then
    "$YT_DLP" -f "best[height<=480]" -o "$VIDEO_FILE" "$URL" 2>&1 | tail -3
  fi

  # 영상 길이 가져오기
  DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" | cut -d. -f1)
  INTERVAL=$((DURATION / (FRAMES + 1)))

  for i in $(seq 1 "$FRAMES"); do
    TIMESTAMP=$((INTERVAL * i))
    OUT_FRAME=$(printf "$OUT/frames/frame-%02d.jpg" "$i")
    ffmpeg -y -ss "$TIMESTAMP" -i "$VIDEO_FILE" -frames:v 1 -q:v 3 "$OUT_FRAME" 2>/dev/null
    echo "  frame-$i (t=${TIMESTAMP}s)"
  done
  echo "✓ Frames: $OUT/frames/"
fi

# 4. 오디오 (Whisper 입력용)
if [[ "$AUDIO" -eq 1 ]]; then
  echo "→ Extracting audio..."
  "$YT_DLP" -x --audio-format mp3 -o "$OUT/audio.%(ext)s" "$URL" 2>&1 | tail -3
  echo "✓ Audio: $OUT/audio.mp3"
  echo "  → Run Whisper: whisper $OUT/audio.mp3 --output_dir $OUT --output_format txt"
fi

echo ""
echo "✅ Done. Files in $OUT/"
ls -la "$OUT" | tail -n +2
