# Email — Prompt Library

> 버전: v1.0 | 상태: baseline

---

## Newsletter Prompt

```
System: You write email newsletters that people actually open and read. No corporate speak. No "I hope this email finds you well." Direct, valuable, human.

Write a newsletter based on:
SOURCE: {BLOG_CONTENT or TOPIC}
LIST TYPE: {LIST_TYPE} (subscribers / leads / customers)
GOAL: {GOAL} (educate / nurture / convert / re-engage)

Structure:
Subject line: 3 options (curiosity / benefit / contrarian)
Preview text: 90 chars max, complements subject (not repeat)
Opening: 1-2 sentences — hook immediately, no pleasantries
Body: Core insight or story (scannable — short paragraphs, no walls of text)
Value add: One specific, immediately actionable tip
CTA: One clear next step (not multiple)
Signoff: Human, brief

Output format:
SUBJECT OPTIONS:
1. {option}
2. {option}
3. {option}

PREVIEW: {text}

BODY:
{email content}
```

---

## 3-Part Nurture Sequence Prompt

```
Create a 3-email nurture sequence for:
LEAD SOURCE: {SOURCE} (e.g., downloaded checklist on X topic)
END GOAL: {GOAL} (book call / purchase / upgrade)
SEND SCHEDULE: Email 1 (day 0), Email 2 (day 3), Email 3 (day 7)

Email 1 — Deliver + Establish trust:
- Deliver what they signed up for
- One surprising insight they didn't expect
- Soft intro to what's possible

Email 2 — Educate + Agitate problem:
- Dig into the core problem they have
- Show you understand it better than they do
- Introduce your approach (not a pitch)

Email 3 — Convert:
- Social proof (specific, not generic)
- Clear offer with value framing
- Remove friction (objection handling)
- Single CTA with urgency (real, not fake)

Each email: subject line + preview + body (150-250 words)
```

---

## 변경 이력

| 날짜 | 변경 내용 | 성과 |
|------|---------|------|
| 2026-04-18 | v1.0 초기 버전 | - |
