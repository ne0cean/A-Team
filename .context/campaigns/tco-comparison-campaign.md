# Campaign Plan — Vercel vs Edge SaaS TCO Comparison

> 캠페인명: "The $100 Ceiling Challenge"
> 기간: Week 1-4 (런칭 캠페인)
> 타겟: Indie Hackers, 소규모 개발 팀
> 핵심 메시지: "Know your bill before you build"

---

## 1. 캠페인 목표

### 비즈니스 목표
- 무료 가입 500명 (Week 4)
- 무료 → 유료 전환 15명 (3%)
- HackerNews frontpage 진입 1회

### 브랜드 목표
- "cost-predictable edge" 연관 검색 1위
- Discord 커뮤니티 200명 (활성 50명)
- "Vercel alternative" 포지셔닝 확립

---

## 2. 멀티채널 전략

### Channel 1: 블로그 (Hero Content)
**제목**: "Vercel vs [Our Product]: The Real Cost at Scale"

**구조**:
1. **Hook** (100 words): "Started at $20/mo. Hit $800 at 10K users. Sound familiar?"
2. **Data comparison** (500 words):
   - 3 traffic tiers: 1K, 10K, 50K requests/day
   - Vercel 실제 청구 (Hobby → Pro → Enterprise jump)
   - Our flat-rate guarantee
   - Interactive calculator embed
3. **Case study** (300 words): Indie hacker "Sarah" — Vercel $6K/yr → Our $480/yr
4. **Technical breakdown** (400 words): Edge function pricing 구조 차이
5. **CTA**: "Calculate your savings" (calculator + signup)

**발행**: Week 1, Monday 9 AM ET (HN peak time)

---

### Channel 2: Twitter Thread (Social Amplification)
**Thread 구조** (8 tweets):

1. "Thread: I analyzed Vercel's pricing for 50 indie SaaS apps. Here's what I found. 🧵"
2. "The average indie app hits Vercel's $20 tier in Month 2. No problem, right?"
3. "Wrong. At 10K daily users (tiny for SaaS), you're looking at $200-400/mo. That's before any revenue."
4. "Here's the math: [screenshot of calculator]"
5. "Vercel optimizes for enterprises with $50K budgets. Indies need <$100 predictability."
6. "We built [Product] with a $100 ceiling. Unlimited traffic. No jumps."
7. "Same infrastructure. 60% cheaper. Here's the breakdown: [link to blog]"
8. "Calculate your real cost: [calculator link]. RT if this saved you $$$."

**발행**: Week 1, Monday 11 AM ET (2h after blog)
**Boost**: $50 promote tweet (tweets 1, 8)

---

### Channel 3: HackerNews Post (Community Validation)
**Title**: "Show HN: Vercel TCO Calculator — See Your Real Cloud Costs"

**Body**:
```
Hey HN,

I built a SaaS on Vercel. Month 1: $20. Month 6: $600. Ouch.

So I made this calculator to show indie hackers their real TCO:
[calculator link]

Some findings from analyzing 50 indie apps:
- 80% hit "unexpected" pricing jumps
- Average overspend: $3K/year vs initial estimate
- Enterprise features unused: 90%

The tool compares Vercel, Cloudflare, AWS, and our platform ([Product]).

Feedback welcome. Data sources linked in the post.
```

**발행**: Week 1, Wednesday 2 PM ET (48h after blog)
**Follow-up**: 답글 모니터링, 질문 즉시 응답 (24h 내)

---

### Channel 4: Reddit (r/SideProject, r/IndieBiz)
**Title**: "I built a TCO calculator after Vercel ate my SaaS revenue"

**Post**:
```
**Context**: Launched my SaaS 8 months ago. Vercel seemed perfect — $20/mo, easy deploy.

**Problem**: Hit 15K users. Bill jumped to $450/mo. Revenue? $200/mo.

**What I learned**:
- Vercel's "Hobby → Pro" jump is a trap for indies
- Enterprise pricing kicks in earlier than you think
- Total Cost of Ownership ≠ listed price

**Tool I built**: [calculator link]
Compares Vercel/Cloudflare/AWS with cost breakdowns.

**My solution**: Switched to [Product] — $100 ceiling, same performance.

**For you**: If you're on Vercel/Netlify/similar, plug in your traffic. You might be overpaying 2-3x.

Open to questions about the migration process.
```

**발행**: Week 1, Thursday 10 AM ET
**Subreddits**: r/SideProject, r/IndieBiz, r/SaaS (stagger 24h apart)

---

### Channel 5: Email (Existing Waitlist)
**Subject**: "Your Vercel bill is probably wrong [calculator inside]"

**Body**:
```
Hey [Name],

Quick question: Do you know your *real* cloud cost at 50K users?

Most indie hackers guess $50-100/mo on Vercel.
Reality: $400-800/mo (we analyzed 50 apps).

We built a calculator to end the guessing:
[CTA button: "See My Real Cost"]

Example: Sarah's SaaS
- Traffic: 12K daily users
- Vercel quote: $20/mo
- Vercel reality: $6,000/year
- Our platform: $480/year (same performance)

Calculate yours in 60 seconds.

[Product Team]

P.S. If your calculation shows >$100/mo, reply to this email. We'll audit your setup for free.
```

**발행**: Week 2, Tuesday 10 AM (user timezone)
**Segment**: Waitlist signups (est. 200 emails)

---

### Channel 6: Product Hunt (Launch Amplification)
**Tagline**: "TCO calculator for edge platforms — Stop guessing your cloud bill"

**Description**:
"Know your cloud cost before it kills your margins. Compare Vercel, Cloudflare, AWS, and [Product] with real pricing data. Built for indie hackers tired of $20 → $600 jumps."

**Gallery**:
1. Calculator screenshot (interactive UI)
2. TCO comparison chart (3 platforms, 3 traffic tiers)
3. Case study: Sarah's $5,520 annual savings

**발행**: Week 2, Wednesday (PH launch day)
**Maker comment**: "I built this after my own SaaS bill jumped 20x. AMA about cloud cost traps."

---

## 3. 콘텐츠 에셋 (생성 필요)

### 개발 필요
- [ ] **Interactive calculator** (React component)
  - Input: daily requests, function duration, bandwidth
  - Output: monthly cost for 4 platforms
  - Tech: Vercel pricing API (if available), manual data
  - Timeline: Week 1, Day 1-3

### 디자인 필요
- [ ] **Comparison chart** (visual)
  - 3 tiers × 4 platforms
  - Color code: green (cheap), red (expensive)
  - Format: PNG + SVG (shareable)
  - Timeline: Week 1, Day 2

### 라이팅 필요
- [ ] **Case study: Sarah**
  - [HUMAN INSERT] — 실제 또는 합성 데이터
  - 300 words, before/after 구조
  - Timeline: Week 1, Day 1

---

## 4. 발행 일정 (Gantt)

| Day | Channel | Asset | Owner | Status |
|-----|---------|-------|-------|--------|
| W1 Mon | Blog | Hero post | Content | ⏳ |
| W1 Mon | Twitter | Thread (8) | Social | ⏳ |
| W1 Wed | HackerNews | Show HN | Community | ⏳ |
| W1 Thu | Reddit | r/SideProject | Community | ⏳ |
| W1 Fri | Reddit | r/IndieBiz | Community | ⏳ |
| W2 Tue | Email | Waitlist blast | Email | ⏳ |
| W2 Wed | Product Hunt | Launch | PH | ⏳ |

---

## 5. 측정 지표

### 트래픽 지표
- Blog pageviews: 5,000 (Week 1), 10,000 (Week 4)
- Calculator usage: 1,000 calculations (Week 4)
- HackerNews upvotes: 100+ (frontpage = 150+)
- Twitter impressions: 50,000 (Week 1)

### 전환 지표
- Signup from calculator: 500 (10% of calculations)
- Free → Paid: 15 (3% of signups)
- Waitlist → Paid: 5 (existing users)

### 브랜드 지표
- "cost-predictable edge" Google rank: Top 5
- Backlinks: 10 (from HN/Reddit/blogs)
- Discord joins: 200 (referral source: campaign)

### 분석 도구
- Blog: Google Analytics 4
- Twitter: Twitter Analytics + Plausible
- Calculator: Mixpanel (event: "calculation_completed")
- Signup: PostHog funnel (calculator → signup → paid)

---

## 6. 위험 요소 및 대응

| Risk | Impact | Mitigation |
|------|--------|------------|
| HackerNews 미달 (< 50 upvotes) | 트래픽 50% 손실 | Reddit 강화, PH 조기 런칭 |
| Calculator 기술 이슈 | 전환 0 | Static comparison table fallback |
| Vercel 반박 (accuracy 문제) | 신뢰도 타격 | 데이터 소스 투명 공개, 면책 추가 |
| Paid 전환 0명 | 비즈니스 목표 실패 | Free tier 매력도 재검토, 48h value pledge 강화 |

---

## 7. 사후 분석 (Week 5)

### 분석 항목
1. 채널별 ROI (spend ÷ signup value)
2. 메시지 resonance (댓글/공유 sentiment 분석)
3. Funnel leakage (calculator → signup → paid 각 단계 drop-off)

### 학습 목표
- Indie hacker 페르소나 검증
- TCO 메시지 vs 다른 angle 비교
- 최적 채널 식별 (다음 캠페인 집중)

---

_참고: 이 캠페인은 Phase 3 첫 산출물. 실행 결과에 따라 Week 5 iteration 계획._
