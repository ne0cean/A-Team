# Slide Workflow — Deck Type × Slide Type × Asset Decision

Source of truth for how to go from "content" to "slides" reliably.
Reads alongside SKILL.md. Covers pitch deck AND academic deck conventions.

---

## 1. Deck types (pick one)

| Deck type | When | Structure (canonical order) |
|---|---|---|
| **Pitch deck** (Sequoia / YC) | Investor, sales, product launch | cover → problem → why_now → solution → product → moat → competitor_matrix → market → traction → team → ask → closing |
| **Academic deck** | Defense, conference, seminar, grant | cover → motivation → research_question → related_work → method_diagram → results_chart → discussion → conclusions → references → thank_you |
| **Internal report** | Weekly review, all-hands | cover → tldr → metrics_grid → narrative (sections) → decisions → next_steps |
| **Teaching / talk** | Tech sharing, lecture | cover → agenda → concept × N → demo → summary → q_and_a |

**Rule:** Pick the deck type first, then slot content into its canonical order. Don't invent a bespoke order per deck.

---

## 2. Slide type taxonomy (18 canonical types)

Each type has a prescribed layout AND an asset profile. Builders live in `slide_kit.py`.

### Narrative / Structural

| Type | Layout | Asset |
|---|---|---|
| `cover` | logomark + kicker + 2-line headline + lede + chips | Geometric decoration |
| `section_header` | Giant numeral + section title + rule | Watermark number |
| `agenda` | Numbered list with section titles | — |
| `closing` | Centered statement + CTA + contact | Accent decoration |
| `thank_you` | Quote-style + contact | — |

### Pitch-deck core

| Type | Layout | Asset |
|---|---|---|
| `problem` | Action-title + lede + 3-4 data cards | Watermark number |
| `solution` | Title + lede + **product mockup right** | Telegram/UI mockup (shapes) |
| `why_now` | 3 columns with icon chips + trend line | Icon chips |
| `bento_features` | 1 flagship card + 3 stacked cards (mixed sizes) | — |
| `moat_columns` | 3 equal columns with watermark numbers | Watermark numbers |
| `competitor_matrix` | 2×2 quadrant with plotted dots | Dots + labels |
| `stats_grid` | 4 big-number cards in a row | Big typography |
| `traction_chart` | Line chart showing growth over time | **Chart (python-pptx)** |
| `timeline` | Horizontal milestone bar with dots | Shapes (connectors) |
| `team` | Photo grid + name + role + one-line bio | **Photos (user-supplied)** |
| `ask` | Large raise amount + 3 progress bars (use of funds) | Progress bars (shapes) |

### Academic-specific

| Type | Layout | Asset |
|---|---|---|
| `motivation` | Problem statement + evidence from prior work | Optional citation inline |
| `research_question` | Bold question / hypothesis | — |
| `related_work` | 2-column comparison with prior methods | Inline citations |
| `method_diagram` | Full-width concept diagram + caption | **Gemini-generated image** |
| `results_chart` | Chart + "so what" annotation | **Chart (python-pptx)** |
| `ablation_table` | Comparison table | python-pptx Table |
| `discussion` | 3 takeaways + limitations | — |
| `conclusions` | Recap (3 bullets) + impact | — |
| `references` | Numbered bibliography | — |

### Shared utility

| Type | Layout | Asset |
|---|---|---|
| `quote` | Giant serif quote + attribution | Typography-as-art |
| `table` | Generic data table | python-pptx Table |
| `two_content` | 50/50 split, text-left / visual-right | Mixed |

---

## 3. Asset decision matrix (the core question: chart / image / shape / photo?)

**Iron rule:** never generate an asset before asking "can a chart or shape do this better?"

| Content characteristic | Best asset | Generator | Why |
|---|---|---|---|
| Precise numbers over time | **Line chart** | `python-pptx` CHART | Editable, precise, client can update data |
| Precise numbers across categories | **Bar chart** | `python-pptx` CHART | Editable, clean |
| Share-of-total (3-6 slices) | **Pie / donut chart** | `python-pptx` CHART | Fine for 3-6 slices; use bar if >6 |
| Relationship between 2 axes | **Scatter / 2×2 matrix** | `python-pptx` shapes | Positioning is the point |
| System architecture / pipeline | **Boxes + arrows diagram** | `python-pptx` shapes (rectangles, connectors) | Editable, crisp |
| Concept / metaphor illustration | **Illustrated scene** | **Gemini (nano-banana-pro)** | Text rendering accurate, on-brand |
| Scientific / research diagram | **Technical illustration** | **Gemini (nano-banana-pro)** | Accurate labels, clean |
| Photo of person / product / place | **Photograph** | User upload OR Gemini photo-realistic | Authentic requires real; stock OK for concept |
| UI / app screenshot | **Actual screenshot** | User capture | Never generate — trust is lost |
| Abstract concept as row of 3-4 items | **Icon grid** | Emoji / Unicode / SVG / shape | Lightweight |
| Process with 3-7 steps | **Chevron / arrow flow** | `python-pptx` shapes | Clear reading order |
| Comparison (2-4 items × N attributes) | **Table** | `python-pptx` Table | Dense info, scannable |
| Hero image for section divider | **Mood image** | Gemini photo-realistic | Emotional anchor |

### When NOT to generate an image

- User will need to edit it later (Gemini image = raster, not editable shapes)
- Precision matters (data, UI, team photos)
- Brand consistency critical (stock/Gemini drifts)
- File size sensitive (images bloat .pptx)

### Gemini Nano Banana Pro — recommended prompts

Use `gemini-3-pro-image-preview` (Nano Banana Pro) when:
- Need text rendered accurately inside image (diagrams with labels)
- Infographic-style visual with multiple labeled components
- On-brand illustration matching deck palette

**Prompt template for method diagram:**
```
"Clean technical diagram showing [system name]. [component A] on the left
connected via arrows to [component B] in the center and [component C] on
the right. Flat vector style, palette {primary_hex}, {accent_hex}, white
background. Labels: '[component A]', '[component B]', '[component C]'.
Minimalist, suitable for academic presentation. 16:9."
```

**Prompt template for hero/mood image:**
```
"Cinematic photograph representing [concept]. [scene description].
Soft lighting, shallow depth of field. Color grading: {palette}. No text.
16:9 aspect ratio, horizontal composition."
```

Use `gemini-3.1-flash-image-preview` (Nano Banana 2) for quick iterations —
cheaper, 90% quality. Pro for final.

---

## 4. End-to-end workflow (6 steps)

```
1. INTAKE
   ├─ Source: LaTeX / PDF / outline / free text
   └─ Parse: title, sections, data tables, figures

2. ROUTE deck type
   └─ pitch / academic / report / talk → load canonical slide order

3. MAP content → slide types
   └─ For each section, pick the right slide type from taxonomy
   └─ Action-title check: "if reader sees only titles, do they get the argument?"

4. ASSET PLAN
   └─ For each slide needing visual, apply decision matrix
   └─ Write a tiny ASSETS.md: { slide_5: "bar_chart, TAM by segment",
                                slide_8: "gemini: method diagram" }

5. ASSEMBLE
   ├─ slide_kit.py builders take (slide, content, theme)
   ├─ Assets: charts via python-pptx Chart; images via Gemini API → cached PNG
   └─ Write .pptx

6. QA
   ├─ Render to PDF (soffice --headless --convert-to pdf)
   ├─ Check every slide: overflow? overlap? palette consistent? action title?
   └─ Fix and re-render
```

---

## 5. Ghost-deck test (MANDATORY before assembly)

Write out only the **titles** in order. They must tell the argument alone.

Good:
```
1. AI design tools produce inconsistent brand output.
2. Teams spend $12B/yr remediating this.
3. CanArt's Style Genome solves it with persistent memory.
4. Our 20-step agent beats single-shot competitors on 72% of tasks.
5. Seed $1.5M to reach $30K MRR in 12 months.
```

Bad (topic labels, not assertions):
```
1. Introduction
2. The problem
3. Our solution
4. Results
5. Ask
```

If the titles don't flow as an argument, stop and rewrite before touching any slide.

---

## 6. File structure

```
<deck-project>/
├── content.py          (or content.json — the facts)
├── theme.py            (colors / fonts for this deck)
├── assets/
│   ├── cached/         (Gemini-generated images, cached by prompt hash)
│   ├── photos/         (user-supplied: team, product, etc)
│   └── charts/         (optional: pre-rendered chart PNGs if not live)
├── build.py            (imports slide_kit, assembles the deck)
└── output/
    └── deck.pptx
```

---

## 7. Quality bar

A finished deck passes these checks (run after every generation):

- [ ] Every content slide has an action title (complete sentence, assertion)
- [ ] Ghost-deck test passes
- [ ] No text overflow (render PDF, inspect every page)
- [ ] No shape overlap
- [ ] Max 3 font sizes per slide, max 2 accent colors
- [ ] Every borrowed image has attribution
- [ ] Every chart has axis labels and source
- [ ] Contact slide is last (not a blank "Thank you")
- [ ] Footer visible on every non-cover slide
- [ ] Body text ≥ 14pt (academic ≥ 20pt for defense)

Fail any check → fix before shipping.
