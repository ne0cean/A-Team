# TikTok / Shorts — 프롬프트 라이브러리

> 버전: v1.0 | TikTok / Instagram Reels / YouTube Shorts 공통
> 핵심: 첫 1초 결정. 알고리즘은 watch-time + completion이 전부.

---

## System Prompt

```
You are a short-form video strategist who understands the TikTok algorithm
beats Instagram and YouTube algorithms in raw distribution per follower.

CORE TRUTH about short-form:
- The first 1 second decides everything (not 3 seconds, not the hook)
- Loop is more important than ending
- Niche specificity beats broad appeal (algorithm rewards strong audience signal)
- Trends are vehicles, not destinations — use trending audio for distribution,
  put YOUR content on top

Format priorities:
1. TikTok: full algorithm distribution, niche-friendly
2. Instagram Reels: piggyback on Insta audience, slightly more polished feel
3. YouTube Shorts: lower competition, slower growth, longer audience retention

Avoid:
- Talking head with no visual variation (low completion)
- Slow openings ("Today I'm going to...")
- Recycled content without platform adaptation
- Watermarked TikTok exports to Reels (algorithmically demoted)
```

---

## Phase 1: 콘셉트 + 훅 생성

```
Generate 5 short-form video concepts for this topic.

TOPIC: {TOPIC}
NICHE: {YOUR_NICHE}
TARGET_DURATION: 15s / 30s / 60s

For each concept:

CONCEPT_NAME: [internal label]

HOOK (first 1 second — visual + audio + text):
- Visual: [what's on screen at frame 1]
- Audio: [trending sound name or original voice line]
- Text overlay: [first 3-7 words]
- Why this stops the scroll: [specific psychological mechanism]

PAYOFF (the rest of the video):
- Type: [tutorial / reveal / before-after / list / story]
- Specific value: [what viewer learns or feels]
- Visual progression: [how it changes through the video]

LOOP_OR_END:
- Loop strategy: [if applicable, how ending connects to opening]
- OR ending: [memorable line / visual button]

PRODUCTION_DIFFICULTY: 1-5 (how hard to film/edit)
ESTIMATED_PERFORMANCE: low/medium/high (based on hook strength)

Recommend the TOP 2 to produce first.
```

---

## Phase 2: 풀 스크립트 (선택된 콘셉트)

```
Write a full short-form script for this concept.

CONCEPT: {CHOSEN_CONCEPT}
DURATION: {SECONDS}

Script format:
[TIME] [VISUAL] | [AUDIO/VOICE] | [TEXT_OVERLAY]

Example:
[0.0-1.0s] [Close-up of hands typing on keyboard] | "I made $0 for 6 months." | "$0 for 6 months"
[1.0-2.5s] [Cut to bank account screenshot] | "Then I changed ONE thing." | "Then this happened"
[2.5-5.0s] [Slow zoom on growing chart] | "Here's exactly what." | "↓"
...

REQUIREMENTS:
- Cut every 1-3 seconds (compulsory for retention)
- Text overlays: ADD info, don't repeat audio verbatim
- Last frame: loop-friendly OR explicit save/comment trigger

POST-PRODUCTION CHECKLIST:
□ Captions: auto-generated then manually corrected
□ Audio: trending sound or original voice (clear)
□ Cover frame: select moment that makes scroll stop
□ Hashtags: 3-5 niche, not trending generic
□ Caption text: opens curiosity loop the video doesn't fully close

CROSS-PLATFORM ADAPTATION:
- TikTok: original cut, trending audio, niche hashtags
- Reels: SAME video, remove TikTok watermark using SnapTik or similar
- YouTube Shorts: SAME video, longer caption with timestamps if applicable
```

---

## Phase 3: 시리즈화 전략

```
Convert this single video concept into a series of 5-10 related videos.

ORIGINAL_CONCEPT: {CONCEPT}
WHY_SERIES: Algorithm rewards consistency. Viewers who like one expect another.

SERIES STRUCTURE:
- Common element: [recurring visual / phrase / format that ties them]
- Sequence logic: [Part 1 → Part 2 → ... or independent episodes?]
- Frequency: [post 1 per day / 1 per week — be honest about capacity]

EPISODE LIST:

EP 1: {original concept}
EP 2: [title] — [hook concept]
EP 3: [title] — [hook concept]
...
EP N: [title] — [hook concept]

CALLBACK SYSTEM:
How does each episode reference earlier ones without losing new viewers?
- Pinned comment with playlist link
- "Part 3 of [series]" overlay
- Verbal callback in first second

DISTRIBUTION:
- All on same platform first → algorithm trains on niche signal
- Then cross-post to Reels and Shorts
```

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|---------|
| 2026-04-18 | v1.0 초기 버전 |
