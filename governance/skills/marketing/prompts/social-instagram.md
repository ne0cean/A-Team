# Instagram — 프롬프트 라이브러리

> 버전: v1.0 | Native social 전용 (블로그 리퍼포징 X)
> 포맷: Feed post / Carousel / Story / Reels script

---

## System Prompt

```
You are an Instagram strategist who has analyzed 50,000+ high-performing posts.
You understand that Instagram rewards SAVE rate above all else.

Format-specific rules:
- FEED post: Optimize for share + save (worth referencing later)
- CAROUSEL: Optimize for swipe completion (each slide must earn the next)
- STORY: Optimize for replies (DM is the ultimate currency)
- REELS: Optimize for watch-completion + rewatch (3s hook + loop-friendly ending)

Anti-patterns (NEVER):
- Generic "Tag a friend who needs this!" CTAs
- Quote graphics that say nothing specific
- Carousels that could be one image
- Hashtag spam (3-5 niche > 30 generic)
```

---

## Phase 1: Feed Post (단일 이미지/캐러셀)

```
Generate an Instagram feed post for this topic.

TOPIC: {TOPIC}
ANGLE: {SPECIFIC_INSIGHT or NEW_PERSPECTIVE}
ACCOUNT_NICHE: {WHAT_YOUR_ACCOUNT_IS_KNOWN_FOR}

DECIDE FORMAT:
- Single image + caption: Quick insight, doesn't need progression
- Carousel (3-7 slides): Needs progression, builds to revelation
- Carousel (8-10 slides): Reference content, designed to be saved

For SINGLE IMAGE:
- Visual concept: [specific, NOT "aesthetic background"]
- Caption hook (first line): [must work without "more" expansion]
- Caption body: 100-200 words, ONE clear takeaway
- CTA: [specific micro-action — comment with X, share to story]

For CAROUSEL (provide N slides):
SLIDE 1 (Cover):
- Hook: [creates curiosity gap, doesn't reveal answer]
- Visual: [single bold element + minimal text]

SLIDES 2-{N-1}:
- Each slide: ONE idea, max 30 words
- Visual continuity: same template, varied content
- Last line of each slide: hint at next

SLIDE {N} (Final):
- Resolution + CTA
- NOT "follow for more" — specific value offer
- Save trigger: "Save this for next time you {SCENARIO}"

CAPTION:
- First line: NOT a summary of the carousel — additional context
- Body: personal angle/story (carousel = facts, caption = personality)
- Hashtags: 3-5 specific niche tags (research what audience uses)
- Location tag: if relevant

EXPECTED PERFORMANCE:
- Save rate: aim 5%+ (industry: 1-2%)
- Engagement rate: aim 4%+ (industry: 1-3%)
```

---

## Phase 2: Story Sequence (3-5 frames)

```
Design an Instagram Story sequence.

PURPOSE: {build authority / drive to link / get replies / poll audience}
DURATION: 3-5 frames (attention drops sharply after frame 3)

PSYCHOLOGY:
- Story viewers are MORE engaged than feed scrollers
- Reply DMs > likes (algorithm + relationship)
- Vertical full-screen → can't be skimmed, must be designed for reading

PER-FRAME:
FRAME 1 (Hook):
- Visual: full-bleed photo or solid color
- Text: 6-12 words MAX (large type)
- Purpose: stop the scroll, set expectation

FRAME 2-{N-1} (Content):
- Build on frame 1 progressively
- Use stickers strategically: poll/quiz/slider for engagement
- Text remains SHORT (people tap through fast)

FINAL FRAME (CTA):
- ONE clear action
- Options: link sticker / "DM me X" / "Share to your story"
- Visual continuity with frame 1 for closure

INTERACTION ELEMENTS (use 1-2 per sequence):
- Poll: 2 options, low-friction
- Quiz: builds anticipation
- Slider: emoji response (heart, fire)
- Question box: highest engagement, but use sparingly

STORY HIGHLIGHTS:
After 24h, save best stories to highlight named: "{TOPIC}"
Highlights become evergreen content for new followers
```

---

## Phase 3: Reels Script (15-90초)

```
Write a Reels script that completes views and drives saves.

CONCEPT: {WHAT_YOU_WANT_TO_SHOW}
DURATION: 15s / 30s / 60s / 90s
GOAL: completion + save + comment

REELS ALGORITHM PRIORITY:
1. Watch-time / completion rate
2. Re-watches (loop-friendly endings)
3. Saves (reference value)
4. Shares (especially to DMs)

SCRIPT STRUCTURE:

HOOK (0-3 seconds) — most critical:
- Visual: movement + face if possible
- Audio: voice or trending sound
- Hook line: counterintuitive claim / question / promise of payoff
- BAD: "Hi guys, today I'm going to talk about..."
- GOOD: "I tracked every $1 for 90 days. Here's what surprised me."

BODY (3s - {N-3}s):
- ONE clear point, demonstrated visually
- Cuts every 1-3 seconds (faster = higher retention)
- Text overlays: Yes, but they should ADD information
- Pace: faster than feels comfortable

CTA / LOOP (last 3 seconds):
- Loop-friendly: ending visually connects to opening
- OR explicit "Save this for later" / "Comment X if you've tried this"

PRODUCTION SPEC:
- Aspect ratio: 9:16 vertical
- Audio: trending sound or original voice (caption can muted)
- Captions: ALWAYS (85% watch muted)
- Resolution: 1080×1920 minimum

CAPTION (under reel):
- First line: hook for those who watch with sound off
- 50-100 words: context + CTA
- Hashtags: 3-5 niche

SHOOTING/EDITING:
- App: CapCut (free, faster than Adobe)
- B-roll: have 30+ seconds raw footage to cut from
- Captions: auto-generate then manually edit (CapCut auto-caption)
```

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|---------|
| 2026-04-18 | v1.0 초기 버전 |
