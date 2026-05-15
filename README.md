# A-Team

> The AI team that works while you sleep.

![Tests](https://img.shields.io/badge/tests-537%20passing-brightgreen)
![Commands](https://img.shields.io/badge/commands-74-blue)
![License](https://img.shields.io/badge/license-MIT-green)

A-Team is a business operating system built on top of Claude Code. While other tools stop at coding workflows, A-Team covers the full business loop: planning → development → marketing → deployment → analytics.

You write the direction. A-Team handles the rest — including overnight.

---

## Why A-Team?

| Feature | SuperClaude | BMAD | spec-kit | **A-Team** |
|---------|:-----------:|:----:|:--------:|:----------:|
| Slash commands | ~20 | ~15 | ~10 | **74** |
| Specialized agents | — | — | — | **28** |
| Session continuity | partial | — | — | **CURRENT.md** |
| Autonomous overnight mode | — | — | — | **/zzz** |
| Multi-model cost routing | — | — | — | **Opus→Haiku→Groq** |
| Marketing / content | — | — | — | **8 commands** |
| Design audit | — | — | — | **AI smell detection** |
| Business analytics | — | — | — | **/insights /dashboard** |
| Legal / compliance | — | — | — | **/legal-check** |
| OKR / strategy | — | — | — | **/okr /board** |
| Governance rules | — | — | — | **31 rules** |
| Test coverage | — | — | — | **537 tests** |

### Five things that set A-Team apart

**1. The AI team that works while you sleep (`/zzz`)**
Autonomous overnight mode. When you go to bed, A-Team keeps working. If Claude hits a token limit, it saves state, waits for reset, and resumes exactly where it left off.

**2. Zero-gap session continuity**
`/pickup` restores the exact state from your last session in seconds. `CURRENT.md` is the single source of truth. You never re-explain context.

**3. Multi-model cost optimization**
Tasks are automatically routed to the cheapest capable model. Complex architecture → Opus. Implementation → Sonnet. Summaries → Haiku. Formatting/translation → Groq (free). Typical savings: 60–90% vs. running everything on Opus.

**4. Full business coverage**
Not just code. A-Team runs marketing campaigns, audits designs for AI smell, generates OKR reviews, checks legal compliance, and produces weekly analytics reports — all from slash commands.

**5. Self-governing with 31 rules**
Dangerous commands are blocked automatically. Builds must pass before sessions close. Security audits follow OWASP + STRIDE. Every agent outputs a structured status code (`DONE` / `BLOCKED` / `DONE_WITH_CONCERNS`).

---

## Quick Start

```bash
git clone https://github.com/ne0cean/A-Team.git ~/Projects/a-team
cd ~/Projects/a-team
bash scripts/install-commands.sh
```

Then open Claude Code in any project and run `/vibe`.

---

## Core Commands

| Command | What it does |
|---------|-------------|
| `/vibe` | Start a session — loads context, identifies next action, ready in seconds |
| `/pickup` | Resume after token reset — reads `RESUME.md`, continues exactly where you stopped |
| `/end` | Close a session — updates `CURRENT.md`, validates build, commits |
| `/zzz` | Autonomous overnight mode — works while you sleep, auto-resumes after token reset |
| `/blueprint` | Architecture planning before touching code |
| `/review` | 7-step pre-landing review pipeline |
| `/ship` | Automated verification before PR: tests → doc-sync → review → version → PR |
| `/daily-brief` | Morning briefing — trends, project status, suggested priorities |

---

## Full Command Reference

<details>
<summary><strong>Session (5)</strong></summary>

| Command | Description |
|---------|-------------|
| `/vibe` | New session start — load context, plan tasks |
| `/pickup` | Resume interrupted session |
| `/end` | Close session — commit + update CURRENT.md |
| `/zzz` | Autonomous overnight mode with auto-resume |
| `/handoff` | Transfer context when switching models |

</details>

<details>
<summary><strong>Planning (6)</strong></summary>

| Command | Description |
|---------|-------------|
| `/office-hours` | Validate ideas before writing a line of code |
| `/blueprint` | Architecture diagram + implementation roadmap |
| `/autoplan` | CEO → Design → Engineering pipeline, auto-decides 6 principles |
| `/plan-ceo` | Challenge assumptions, scope analysis, failure mode table |
| `/plan-eng` | Architecture diagram, test coverage map, implementation roadmap |
| `/prd` | Product requirements document generator |

</details>

<details>
<summary><strong>Implementation (8)</strong></summary>

| Command | Description |
|---------|-------------|
| `/tdd` | Test-driven development workflow |
| `/investigate` | Systematic root cause analysis for bugs |
| `/optimize` | Performance optimization with baseline tracking |
| `/benchmark` | Performance baseline system — auto-detects tools, tracks regression |
| `/doc-sync` | Detect and fix documentation drift |
| `/browse` | Browser automation via ARIA @ref |
| `/qa` | 8-category web app QA + health score |
| `/craft` | Code quality deep review |

</details>

<details>
<summary><strong>Quality (6)</strong></summary>

| Command | Description |
|---------|-------------|
| `/review` | Manual 7-step pre-landing review |
| `/ship` | Automated pre-PR verification pipeline |
| `/adversarial` | 4-perspective adversarial code review |
| `/cso` | OWASP Top 10 + STRIDE 8-step security audit (read-only) |
| `/cold-review` | Blind review with no prior context |
| `/pmi` | Post-merge inspection |

</details>

<details>
<summary><strong>Marketing (8)</strong></summary>

| Command | Description |
|---------|-------------|
| `/marketing-generate` | Generate blog posts, articles, copy |
| `/marketing-repurpose` | 1 piece of content → 15 formats |
| `/marketing-social` | Twitter/LinkedIn/Instagram post generation |
| `/marketing-publish` | Publish to 22 platforms via Postiz |
| `/marketing-analytics` | Content performance analysis |
| `/marketing-research` | Audience and trend research |
| `/card-news` | Instagram card news generation |
| `/intel` | Competitor and market intelligence |

</details>

<details>
<summary><strong>Design (6)</strong></summary>

| Command | Description |
|---------|-------------|
| `/design-audit` | AI smell detection — 22 rules against generic AI aesthetics |
| `/design-brief` | Design brief generator |
| `/design-generate` | AI-assisted design generation |
| `/design-retro` | Design retrospective |
| `/design-thumbnail` | Thumbnail generation for content |
| `/thinking-partner` | Visual thinking and design ideation |

</details>

<details>
<summary><strong>Analytics (5)</strong></summary>

| Command | Description |
|---------|-------------|
| `/insights` | Weekly insights report from project data |
| `/dashboard` | Project health dashboard |
| `/daily-brief` | Morning briefing with trends and priorities |
| `/capability` | Capability assessment and gap analysis |
| `/retro` | Git-based periodic retrospective |

</details>

<details>
<summary><strong>Operations (8)</strong></summary>

| Command | Description |
|---------|-------------|
| `/okr` | OKR review and tracking |
| `/board` | AI board of directors monthly review |
| `/legal-check` | License and compliance check |
| `/incident` | Incident response workflow |
| `/prjt` | Full project status overview |
| `/prioritize` | Feature prioritization framework |
| `/land` | Post-deploy health check + smoke tests + rollback readiness |
| `/github-review` | GitHub PR review workflow |

</details>

---

## Architecture

```
a-team/
├── .claude/commands/    # 74 slash commands
├── .claude/agents/      # 28 specialized agents
├── governance/          # 31 rules + 18 skill packs
├── scripts/             # 78 automation scripts
├── templates/           # 18 project templates
└── test/                # 40 test suites (537 tests)
```

### Agent roles

| Agent | Role | Model |
|-------|------|-------|
| orchestrator | Coordinates all agents — plans, distributes, consolidates | Sonnet |
| researcher | Investigation only — reads, never modifies code | Haiku |
| coder | Implementation and bug fixes | Sonnet |
| reviewer | Quality validation — 2-pass: Critical → Informational | Sonnet |
| architect | System design and architecture decisions | Opus |

All agents output structured status codes: `DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`.

---

## The Sleep Mode (`/zzz`)

The most distinctive feature of A-Team. When you go to sleep, the work continues.

```
You: /zzz
     │
     ▼
A-Team writes RESUME.md ──► commits current state
     │
     ▼
Works autonomously ──► hits token limit
     │
     ▼
Waits for reset ──────────► resumes via /pickup
     │
     ▼
Continues until done ──────► morning summary (≤10 lines)
```

**How it handles token resets:**
1. Before limit: saves full state to `RESUME.md`, commits
2. After reset: `/pickup` reads `RESUME.md`, restores exact context
3. Repeats until task is complete or a stop condition is met

**Stop conditions:** task complete / blocked on decision / destructive action required / budget exceeded.

---

## Multi-Model Routing

A-Team routes every task to the cheapest model that can handle it reliably.

```
Task complexity        Model           Cost
─────────────────────────────────────────────
Architecture, design   Opus            $$$
Implementation, bugs   Sonnet          $$
Summaries, search      Haiku           $
Format, translate      Groq (free)     free
```

**How it works:** Before each subtask, the system evaluates complexity against four criteria. If none require Opus, it proposes a model switch. You approve or override. Over a typical session, this reduces API costs by 60–90% compared to running everything on Opus.

---

## Safety Harness

Four hooks run automatically on every action:

| Hook | What it blocks |
|------|---------------|
| `pre-bash.sh` | `rm -rf *`, `git push --force`, and other destructive commands |
| `pre-write.sh` | `.env` files, SSH keys, git internals |
| `stop-check.sh` | Session close when build is failing |
| `subagent-dod.sh` | Agent completion without meeting definition of done |

Optional risk-scoring hook:
```bash
touch .careful   # enables risk score ≥ 40 confirmation prompt
```

---

## Growth Engine

A-Team improves itself. The `/daily-brief` command pulls external trends, compares them against current capabilities, and surfaces specific improvement suggestions. The autoresearch system (`/autoresearch`) runs shadow evaluations on tracked commands over time, measures binary pass rates, and generates weekly reports with upgrade recommendations.

This means A-Team gets better the more you use it — not through retraining, but through structured self-observation.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

For architecture decisions and design rationale, see:
- [governance/rules/ateam-sovereignty.md](governance/rules/ateam-sovereignty.md) — 8 core principles
- [docs/HISTORY.md](docs/HISTORY.md) — full methodology history (Phase 0–14)
- [PROTOCOL.md](PROTOCOL.md) — complete document map

---

## License

MIT
