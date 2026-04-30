# /yt — YouTube 영상 풀 추출 + 분석

영상 컨텐츠를 텍스트(자막) + 이미지(키프레임) + 오디오로 풀리 추출해 분석한다.

## 언제 사용하나
- 사용자가 YouTube URL을 주며 "이거 분석해줘", "리뷰해줘", "반영할 거 있는지 봐" 등 요청
- 영상 컨텐츠를 a-team / 프로젝트에 어떻게 흡수할지 결정 필요
- 강의/세미나/튜토리얼 영상에서 핵심 인사이트 추출

## 실행 흐름

### Step 1: URL 파싱
사용자 메시지에서 YouTube URL 추출. 여러 개면 한 개씩 처리.

### Step 2: 영상 추출 (`scripts/yt-extract.sh`)

```bash
# 자막만 (가장 빠름, 슬라이드 적은 영상)
bash scripts/yt-extract.sh <URL>

# 자막 + 키프레임 N개 (슬라이드 영상 — 추천)
bash scripts/yt-extract.sh <URL> --frames 6

# 자막 없는 영상 (Whisper 입력용 오디오)
bash scripts/yt-extract.sh <URL> --audio
# 그 후: whisper /tmp/yt-{ID}/audio.mp3 --output_dir /tmp/yt-{ID} --output_format txt
```

**추출 결과** (`/tmp/yt-{ID}/`):
- `meta.txt` — 제목/채널/길이/업로드일/조회수/설명
- `transcript.txt` — 자막 (중복 제거, 한 줄)
- `frames/frame-NN.jpg` — 키프레임 (--frames 지정 시)
- `audio.mp3` — 오디오 (--audio 지정 시)

### Step 3: 컨텐츠 분석

1. **메타 확인** — `Read /tmp/yt-{ID}/meta.txt` 로 제목/채널/길이 확인
2. **자막 분석** — `Read transcript.txt` 로 핵심 주장 추출
3. **키프레임 확인** (있으면) — `Read frame-NN.jpg` 로 슬라이드/다이어그램 확인
4. **자막에 노이즈 많으면** — 중복 표현/말 흐림 무시하고 핵심 추론

### Step 4: a-team 적용성 판단

영상에서 추출한 인사이트를 다음 카테고리로 분류:

| 카테고리 | 처리 |
|---------|------|
| **즉시 반영 가능 + 작은 변경** | 지금 즉시 적용 (orchestrator.md / 룰 파일 1줄 추가 등) |
| **나중에 빌드 (큰 변경)** | `.context/CURRENT.md` Low Priority에 영상 URL + 인사이트 요약 추가 |
| **a-team과 무관** | 패스, 사용자에게 보고 |

### Step 5: 사용자 확인

추출 + 분석 후 다음 형식으로 보고:
```
영상: {제목} by {채널}
핵심 주장: ... (3-5줄)
a-team 적용:
  - 즉시 반영: ...
  - 나중에 빌드: ...
  - 무관: ...
```

사용자 confirm 후 실제 반영 진행.

## 의존성

- `yt-dlp` — `pip3 install --user --break-system-packages yt-dlp`
- `ffmpeg` — `brew install ffmpeg` (키프레임 추출용)
- `whisper` (선택) — `pip install openai-whisper` (자막 없는 영상용)

## 노트

- **자동 자막은 노이즈 있음** — 한국어 자동 자막은 단어 반복/오류 흔함. transcript에서 의미 단위로 재구성해 분석.
- **--frames 추천**: 슬라이드 위주 영상은 6-8개, 라이브 코딩은 12+, 토크 위주는 2-4개
- **저장 위치**: 기본 `/tmp/yt-{video_id}/`. `--out DIR`로 변경 가능
- **컨텍스트 절약**: 자막+키프레임만 Read. video.mp4는 Read 불가능하므로 무시.
- **Tracked 큐 통신 (Phase 2.7 ECS 원칙)**: 추출 결과는 파일로 저장. 분석 에이전트가 직접 호출되지 않고 결과 파일만 읽음.
