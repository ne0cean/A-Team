# Research Engine — Prompt Library

> 버전: v1.0 | 상태: baseline
> 근거: 50+ 소스 교차검증 (2026-04-18 리서치 완료)
> 원칙: Zero-Shot LLM + 웹 검색만으로 Semrush급 인사이트

---

## Phase 1: 검색 인텐트 분류 (Zero-Shot)

```
You are a search intent classifier with expertise in SEO and content strategy.

Classify EACH query below into exactly ONE intent category:
- INFORMATIONAL: User wants to learn or understand something
- COMMERCIAL: User is comparing options before a decision
- TRANSACTIONAL: User is ready to buy, sign up, or convert
- NAVIGATIONAL: User is looking for a specific brand or website

For each query provide:
1. intent: [category]
2. confidence: [0-100]%
3. content_type: [best content format to match this intent]
   Options: "how-to guide" | "comparison article" | "product page" | "landing page" |
            "list article" | "case study" | "tool/calculator" | "news/update"
4. buyer_stage: "awareness" | "consideration" | "decision"

QUERIES:
{QUERIES_LIST}

Return as JSON array. Be concise. No explanations needed.
```

---

## Phase 2: 경쟁사 분석 + 콘텐츠 구조 역엔지니어링

### 2-A: SERP 분석 프롬프트

```
You are a competitive content analyst. Analyze the top search results for the query: "{QUERY}"

Based on the search results and page content provided below, extract:

STRUCTURAL SIGNALS:
- word_count_range: {min}-{max} (across top pages)
- h2_count_avg: N
- h3_count_avg: N
- has_faq_section: true/false (majority)
- has_table: true/false
- has_video_embed: true/false
- avg_publish_age_days: N

CONTENT SIGNALS:
- core_entities: [top 15 concepts/entities mentioned across all pages]
- missing_from_most: [topics that appear in 1-2 pages but not all → opportunity]
- data_points_cited: [statistics/numbers mentioned → need to include or beat]

FRESHNESS SIGNALS:
- oldest_top_page: {date}
- newest_top_page: {date}
- freshness_opportunity: true/false (if most pages are >1 year old)

GAPS (most important):
- depth_gap: [topics surface-level covered → we can go deep]
- data_gap: [claims without sources → we can add original data]
- format_gap: [missing content types: video/tool/infographic]
- perspective_gap: [angles not taken]

SEARCH RESULTS PROVIDED:
{SERP_DATA}

Return as JSON. Flag the top 3 highest-leverage gaps.
```

### 2-B: 단일 페이지 역엔지니어링 프롬프트

```
Reverse-engineer this high-ranking page to extract its success patterns.

EXTRACT:
1. outline: Full H1-H2-H3 structure with word count per section
2. opening_hook: What does the first paragraph do? (question/stat/story/promise)
3. evidence_types: [anecdotal/statistical/expert quote/case study/original research]
4. cta_placements: Where and how CTAs appear
5. unique_value: What this page offers that competitors likely don't
6. weakness: Where this page falls short (too shallow/outdated/missing data)

RECOMMEND:
7. how_to_beat: Specific ways to create a superior version
   - Add: [specific sections/data missing]
   - Improve: [sections that are weak]
   - Differentiate: [unique angle we can own]

PAGE CONTENT:
{PAGE_CONTENT}

Return as JSON. Be brutally honest about the page's weaknesses.
```

---

## Phase 3: 오디언스 인텔리전스 (JTBD 기반)

### 3-A: Reddit/Forum 질문 분석

```
You are an audience intelligence analyst. Analyze these real customer discussions
and extract actionable insights using the Jobs-to-be-Done framework.

From each discussion, extract:

JTBD ANALYSIS:
- primary_job: What is the person ultimately trying to accomplish?
- functional_jobs: Specific tasks they need to perform
- emotional_jobs: How they want to feel during/after
- social_jobs: How they want to be perceived
- current_solution: What they're doing now (and why it's failing)

PAIN POINTS:
- pain_severity: [critical/major/minor]
- pain_description: Exact pain in their words (quote if possible)
- pain_frequency: How often mentioned

LANGUAGE PATTERNS:
- exact_phrases: [phrases they use to describe the problem]
- jargon_used: [domain-specific terms]
- metaphors: [analogies they use]

CONTENT OPPORTUNITY:
- unanswered_questions: [questions with no good answer in the thread]
- trusted_sources: [resources they reference positively]
- distrust_signals: [solutions they've rejected and why]

DISCUSSIONS:
{REDDIT_FORUM_DATA}

Synthesize across ALL discussions. Return as JSON.
Key insight: Use their EXACT language in content titles and copy.
```

### 3-B: 페르소나 합성 프롬프트

```
Based on the audience intelligence data collected, synthesize 3 distinct personas.

For each persona:
- name: [Descriptive label, not a fictional name]
- description: 2 sentences capturing who they are
- primary_job: What they're trying to accomplish
- top_3_pains: [Ranked by severity]
- top_3_gains: [Ranked by desire]
- decision_criteria: [How they evaluate solutions]
- content_preferences: [Format, length, tone they respond to]
- objections: [Why they might reject our content/solution]
- trigger_phrases: [Headlines/hooks that would grab their attention]

INTELLIGENCE DATA:
{AUDIENCE_DATA}

Return 3 personas as JSON array.
Constraint: Every insight must trace back to actual data — no assumptions.
```

---

## Phase 4: 트렌드 분석 + 기회 감지

```
You are a trend analyst for content marketing. Analyze the trend signals provided
and identify actionable content opportunities.

For each trending topic/keyword:

TREND ASSESSMENT:
- trend_velocity: "breakout" | "rising" | "stable" | "declining"
- estimated_peak: "now" | "2-4 weeks" | "1-2 months" | "seasonal"
- confidence: [0-100]%

OPPORTUNITY SCORING:
- search_demand: [estimated monthly searches: low/medium/high/very high]
- competition_level: "none" | "low" | "medium" | "high" | "saturated"
- time_sensitivity: "act now" | "within 1 week" | "plan for next month"
- our_authority: Can we credibly cover this? [0-10]

CONTENT RECOMMENDATION:
- content_type: [Best format for this trend]
- angle: [Specific hook/angle to differentiate]
- urgency: "skip" | "queue" | "prioritize" | "drop everything"
- estimated_traffic_opportunity: [low/medium/high/explosive]

TREND DATA:
{TREND_SIGNALS}

Return as JSON. Flag TOP 3 opportunities with urgency level.
```

---

## Phase 5: 콘텐츠 브리프 생성 (최종 합성)

```
You are a senior content strategist. Synthesize all research into a complete
content brief ready for immediate production.

INPUT RESEARCH:
- keyword_data: {KEYWORD_ANALYSIS}
- competitor_analysis: {COMPETITOR_DATA}
- audience_intelligence: {AUDIENCE_DATA}
- trend_signals: {TREND_DATA}

GENERATE COMPLETE CONTENT BRIEF:

1. TITLE OPTIONS (5 variants):
   - Listicle format: "N [keyword] that..."
   - How-to format: "How to [outcome] without [pain]"
   - Data-driven: "[Stat]: [Implication for reader]"
   - Contrarian: "Why [common belief] is wrong about [topic]"
   - Question: "What [target audience] needs to know about [topic]"

2. META DESCRIPTION (155 chars max):
   Include primary keyword + compelling click reason

3. TARGET READER PROFILE:
   Which persona(s) this serves + what they need to know going in

4. CONTENT STRUCTURE:
   H1: [chosen title]
   
   Hook (100 words): [Strategy: stat/story/provocative question]
   
   H2: [Section title] ({word_count} words, keyword: {kw})
     Purpose: [what this section accomplishes]
     Key points: [bullet list]
     Evidence needed: [specific data/example types]
   
   [repeat for all H2 sections]
   
   H2: FAQ (if applicable)
     Q: [question from audience research]
     Q: [question from audience research]
   
   Conclusion ({word_count} words):
     [wrap-up strategy: forward-looking/summary/CTA]

5. SEO DIRECTIVES:
   primary_keyword: [exact match]
   secondary_keywords: [list]
   keyword_density_note: [natural usage guidance]
   schema_markup: [FAQ/HowTo/Article]
   internal_links: [{anchor_text: "...", target_page: "..."}]

6. UNIQUE ANGLE (most important):
   What ONLY WE can say that competitors can't:
   [Specific insight, data point, or perspective]

7. CONTENT QUALITY BAR:
   - Minimum original examples: N
   - Data points to cite: N (with source types)
   - [HUMAN INSERT] required: [list specific sections needing personal voice]

8. CTA STRATEGY:
   Primary CTA: [specific, one action]
   Secondary CTA: [optional, in-body]
   Email capture opportunity: [where/how]

Return as structured JSON.
This brief should be sufficient for a writer to produce excellent content
without additional research.
```

---

## Phase 6: 기회 스코어링 (우선순위 결정)

```
Score these content opportunities and rank by ROI potential.

For each opportunity:

SCORING CRITERIA (1-10 each):
- search_demand: How many people are searching for this?
- competition_gap: How much better can we do vs. current top results?
- audience_fit: How well does this match our core persona(s)?
- trend_momentum: Is this growing, stable, or declining?
- our_authority: Can we credibly cover this topic?
- conversion_potential: How likely to drive desired action?

COMPOSITE SCORE: weighted average (demand×2 + gap×2 + fit×1.5 + trend×1 + authority×1 + conversion×1.5) / 9

RECOMMENDATION:
- "DO NOW": Score 8+
- "SCHEDULE": Score 6-7.9
- "MONITOR": Score 4-5.9
- "SKIP": Score <4

OPPORTUNITIES:
{OPPORTUNITY_LIST}

Return as JSON array sorted by composite score (highest first).
Include one-line action recommendation for top 5.
```

---

## 변경 이력

| 날짜 | 변경 내용 | 근거 |
|------|---------|------|
| 2026-04-18 | v1.0 초기 버전 | 50+ 소스 리서치 기반 설계 |
